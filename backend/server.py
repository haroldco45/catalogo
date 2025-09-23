from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta, date
import hashlib
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = "prestamos_oportunos_secret_key_2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 24 * 60  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="PRESTAMOS OPORTUNOS API")
api_router = APIRouter(prefix="/api")

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    cedula: str
    cellphone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientCreate(BaseModel):
    name: str
    cedula: str
    cellphone: Optional[str] = None

class Loan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    amount: float
    modality: int  # 1, 2, or 3
    start_date: date
    duration_months: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoanCreate(BaseModel):
    client_id: str
    amount: float
    modality: int
    start_date: date
    duration_months: Optional[int] = None

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    loan_id: str
    payment_date: date
    amount: float
    type: str  # 'capital' or 'interest'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    loan_id: str
    payment_date: date
    amount: float
    type: str

class DebtInfo(BaseModel):
    loan_id: str
    client_name: str
    client_cedula: str
    amount: float
    modality: int
    start_date: date
    remaining_capital: float
    interest_due: float
    total_due: float
    days_overdue: int

class ClientDebtSummary(BaseModel):
    client_id: str
    client_name: str
    client_cedula: str
    total_capital: float
    total_interest: float
    total_due: float
    active_loans: int

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user = await db.users.find_one({"username": username})
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return User(**user)

def prepare_for_mongo(data):
    """Convert date objects to ISO strings for MongoDB storage"""
    if isinstance(data.get('start_date'), date):
        data['start_date'] = data['start_date'].isoformat()
    if isinstance(data.get('payment_date'), date):
        data['payment_date'] = data['payment_date'].isoformat()
    return data

def parse_from_mongo(item):
    """Parse ISO strings back to date objects"""
    if isinstance(item.get('start_date'), str):
        item['start_date'] = datetime.fromisoformat(item['start_date']).date()
    if isinstance(item.get('payment_date'), str):
        item['payment_date'] = datetime.fromisoformat(item['payment_date']).date()
    return item

def calculate_debt(loan_data, payments_data):
    """Calculate remaining debt for a loan"""
    today = date.today()
    start_date = loan_data['start_date']
    if isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date).date()
    
    modality = loan_data['modality']
    amount = loan_data['amount']
    duration_months = loan_data.get('duration_months', 0)
    
    # Calculate paid amounts
    paid_capital = sum(p['amount'] for p in payments_data if p['type'] == 'capital')
    paid_interest = sum(p['amount'] for p in payments_data if p['type'] == 'interest')
    
    remaining_capital = amount - paid_capital
    interest_due = 0
    days_overdue = 0
    
    if modality == 1:
        # 6.7% every 8 days
        days_since_start = (today - start_date).days
        periods = days_since_start // 8
        total_interest_due = 0
        current_principal = amount
        
        for _ in range(periods):
            total_interest_due += current_principal * 0.067
        
        interest_due = max(0, total_interest_due - paid_interest)
        
        # Check if overdue (should pay every 8 days)
        last_payment_period = days_since_start % 8
        if last_payment_period > 0 and remaining_capital > 0:
            days_overdue = last_payment_period
    
    elif modality == 2:
        # 10% monthly, pay every 15 days
        days_since_start = (today - start_date).days
        months_elapsed = days_since_start / 30.0
        total_interest_due = amount * 0.10 * months_elapsed
        interest_due = max(0, total_interest_due - paid_interest)
        
        # Check overdue (should pay every 15 days)
        days_since_last_payment = days_since_start % 15
        if days_since_last_payment > 0 and (remaining_capital > 0 or interest_due > 0):
            days_overdue = days_since_last_payment
    
    elif modality == 3:
        # 10% monthly interest, capital at end
        if duration_months:
            end_date = start_date + timedelta(days=30 * duration_months)
            months_elapsed = min(duration_months, (today - start_date).days / 30.0)
            total_interest_due = amount * 0.10 * months_elapsed
            interest_due = max(0, total_interest_due - paid_interest)
            
            # Check if past end date
            if today > end_date:
                days_overdue = (today - end_date).days
            elif (today - start_date).days % 30 > 0:
                # Monthly payment overdue
                days_overdue = (today - start_date).days % 30
    
    return remaining_capital, interest_due, days_overdue

# Initialize admin user (only if no users exist)
@api_router.post("/auth/init-admin", response_model=User)
async def init_admin():
    user_count = await db.users.count_documents({})
    if user_count > 0:
        raise HTTPException(status_code=400, detail="Admin user already exists")
    
    admin_data = UserCreate(username="admin", password="admin123")
    hashed_password = hash_password(admin_data.password)
    user = User(username=admin_data.username)
    user_dict = user.dict()
    user_dict['password_hash'] = hashed_password
    
    await db.users.insert_one(user_dict)
    return user

# Authentication endpoints
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if user limit reached (max 3 users)
    user_count = await db.users.count_documents({})
    if user_count >= 3:
        raise HTTPException(status_code=400, detail="Maximum number of users (3) reached")
    
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create user
    hashed_password = hash_password(user_data.password)
    user = User(username=user_data.username)
    user_dict = user.dict()
    user_dict['password_hash'] = hashed_password
    
    await db.users.insert_one(user_dict)
    return user

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user['password_hash']):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user['username']})
    user_obj = User(**user)
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

# Client endpoints
@api_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, current_user: User = Depends(get_current_user)):
    # Check if cedula exists
    existing_client = await db.clients.find_one({"cedula": client_data.cedula})
    if existing_client:
        raise HTTPException(status_code=400, detail="Cedula already exists")
    
    client = Client(**client_data.dict())
    await db.clients.insert_one(client.dict())
    return client

@api_router.get("/clients", response_model=List[Client])
async def get_clients(current_user: User = Depends(get_current_user)):
    clients = await db.clients.find().to_list(length=None)
    return [Client(**client) for client in clients]

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str, current_user: User = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return Client(**client)

# Loan endpoints
@api_router.post("/loans", response_model=Loan)
async def create_loan(loan_data: LoanCreate, current_user: User = Depends(get_current_user)):
    # Validate client exists
    client = await db.clients.find_one({"id": loan_data.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Validate modality and duration
    if loan_data.modality in [2, 3] and not loan_data.duration_months:
        raise HTTPException(status_code=400, detail="Duration required for modality 2 and 3")
    
    loan = Loan(**loan_data.dict())
    loan_dict = prepare_for_mongo(loan.dict())
    await db.loans.insert_one(loan_dict)
    return loan

@api_router.get("/loans", response_model=List[Loan])
async def get_loans(current_user: User = Depends(get_current_user)):
    loans = await db.loans.find().to_list(length=None)
    return [Loan(**parse_from_mongo(loan)) for loan in loans]

@api_router.get("/loans/client/{client_id}", response_model=List[Loan])
async def get_client_loans(client_id: str, current_user: User = Depends(get_current_user)):
    loans = await db.loans.find({"client_id": client_id}).to_list(length=None)
    return [Loan(**parse_from_mongo(loan)) for loan in loans]

# Payment endpoints
@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, current_user: User = Depends(get_current_user)):
    # Validate loan exists
    loan = await db.loans.find_one({"id": payment_data.loan_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    payment = Payment(**payment_data.dict())
    payment_dict = prepare_for_mongo(payment.dict())
    await db.payments.insert_one(payment_dict)
    return payment

@api_router.get("/payments/loan/{loan_id}", response_model=List[Payment])
async def get_loan_payments(loan_id: str, current_user: User = Depends(get_current_user)):
    payments = await db.payments.find({"loan_id": loan_id}).to_list(length=None)
    return [Payment(**parse_from_mongo(payment)) for payment in payments]

# Reports endpoints
@api_router.get("/reports/client-debt/{client_id}", response_model=ClientDebtSummary)
async def get_client_debt_report(client_id: str, current_user: User = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    loans = await db.loans.find({"client_id": client_id}).to_list(length=None)
    
    total_capital = 0
    total_interest = 0
    active_loans = 0
    
    for loan in loans:
        loan = parse_from_mongo(loan)
        payments = await db.payments.find({"loan_id": loan['id']}).to_list(length=None)
        payments = [parse_from_mongo(payment) for payment in payments]
        
        remaining_capital, interest_due, _ = calculate_debt(loan, payments)
        if remaining_capital > 0 or interest_due > 0:
            active_loans += 1
            total_capital += remaining_capital
            total_interest += interest_due
    
    return ClientDebtSummary(
        client_id=client_id,
        client_name=client['name'],
        client_cedula=client['cedula'],
        total_capital=total_capital,
        total_interest=total_interest,
        total_due=total_capital + total_interest,
        active_loans=active_loans
    )

@api_router.get("/reports/all-debts", response_model=List[DebtInfo])
async def get_all_debts_report(current_user: User = Depends(get_current_user)):
    loans = await db.loans.find().to_list(length=None)
    debt_infos = []
    
    for loan in loans:
        loan = parse_from_mongo(loan)
        client = await db.clients.find_one({"id": loan['client_id']})
        payments = await db.payments.find({"loan_id": loan['id']}).to_list(length=None)
        payments = [parse_from_mongo(payment) for payment in payments]
        
        remaining_capital, interest_due, days_overdue = calculate_debt(loan, payments)
        
        if remaining_capital > 0 or interest_due > 0:
            debt_infos.append(DebtInfo(
                loan_id=loan['id'],
                client_name=client['name'],
                client_cedula=client['cedula'],
                amount=loan['amount'],
                modality=loan['modality'],
                start_date=loan['start_date'],
                remaining_capital=remaining_capital,
                interest_due=interest_due,
                total_due=remaining_capital + interest_due,
                days_overdue=days_overdue
            ))
    
    return debt_infos

@api_router.get("/dashboard/summary")
async def get_dashboard_summary(current_user: User = Depends(get_current_user)):
    total_clients = await db.clients.count_documents({})
    total_loans = await db.loans.count_documents({})
    
    # Calculate total portfolio
    loans = await db.loans.find().to_list(length=None)
    total_capital_outstanding = 0
    total_interest_due = 0
    overdue_loans = 0
    
    for loan in loans:
        loan = parse_from_mongo(loan)
        payments = await db.payments.find({"loan_id": loan['id']}).to_list(length=None)
        payments = [parse_from_mongo(payment) for payment in payments]
        
        remaining_capital, interest_due, days_overdue = calculate_debt(loan, payments)
        total_capital_outstanding += remaining_capital
        total_interest_due += interest_due
        
        if days_overdue > 0:
            overdue_loans += 1
    
    return {
        "total_clients": total_clients,
        "total_loans": total_loans,
        "total_capital_outstanding": total_capital_outstanding,
        "total_interest_due": total_interest_due,
        "total_portfolio": total_capital_outstanding + total_interest_due,
        "overdue_loans": overdue_loans
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()