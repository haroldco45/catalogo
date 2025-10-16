from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET', 'superarroz-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

class Admin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminResponse(BaseModel):
    id: str
    username: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminResponse

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Super Arroz 25x500g"
    description: str = "Arroz blanco clasificado electrónicamente - Grano largo extrafino"
    price: float
    image_url: str = ""
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductUpdate(BaseModel):
    price: float

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    customer_phone: str
    customer_address: str
    quantity: int
    unit_price: float
    total_price: float
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=2)
    customer_phone: str = Field(..., min_length=10)
    customer_address: str = Field(..., min_length=5)
    quantity: int = Field(..., gt=0)

# ============ SECURITY FUNCTIONS ============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id: str = payload.get("sub")
        if admin_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        admin = await db.admins.find_one({"id": admin_id}, {"_id": 0})
        if admin is None:
            raise HTTPException(status_code=401, detail="Administrador no encontrado")
        
        return Admin(**admin)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ============ ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "Super Arroz API - Sistema de Ventas"}

# AUTH ROUTES
@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: AdminLogin):
    admin = await db.admins.find_one({"username": credentials.username}, {"_id": 0})
    
    if not admin or not verify_password(credentials.password, admin["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
    
    access_token = create_access_token(data={"sub": admin["id"]})
    
    admin_response = AdminResponse(
        id=admin["id"],
        username=admin["username"],
        created_at=datetime.fromisoformat(admin["created_at"]) if isinstance(admin["created_at"], str) else admin["created_at"]
    )
    
    return TokenResponse(access_token=access_token, admin=admin_response)

@api_router.get("/auth/me", response_model=AdminResponse)
async def get_current_user(current_admin: Admin = Depends(get_current_admin)):
    return AdminResponse(
        id=current_admin.id,
        username=current_admin.username,
        created_at=current_admin.created_at
    )

# PRODUCT ROUTES
@api_router.get("/products/main", response_model=Product)
async def get_main_product():
    product = await db.products.find_one({"name": "Super Arroz 25x500g"}, {"_id": 0})
    
    if not product:
        # Create default product if not exists
        default_product = Product(
            price=50000,  # Precio inicial por defecto
            image_url="https://customer-assets.emergentagent.com/job_en-que-te-ayudo/artifacts/lx4ah6oa_WhatsApp%20Image%202025-10-14%20at%207.46.54%20AM.jpeg"
        )
        doc = default_product.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.products.insert_one(doc)
        return default_product
    
    if isinstance(product['updated_at'], str):
        product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    
    return Product(**product)

@api_router.put("/products/main", response_model=Product)
async def update_main_product(
    update_data: ProductUpdate,
    current_admin: Admin = Depends(get_current_admin)
):
    product = await db.products.find_one({"name": "Super Arroz 25x500g"}, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    updated_product = Product(**product)
    updated_product.price = update_data.price
    updated_product.updated_at = datetime.now(timezone.utc)
    
    doc = updated_product.model_dump()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.products.update_one(
        {"name": "Super Arroz 25x500g"},
        {"$set": doc}
    )
    
    return updated_product

# ORDER ROUTES
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    # Get current product price
    product = await db.products.find_one({"name": "Super Arroz 25x500g"}, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    unit_price = product["price"]
    total_price = unit_price * order_data.quantity
    
    order = Order(
        customer_name=order_data.customer_name,
        customer_phone=order_data.customer_phone,
        customer_address=order_data.customer_address,
        quantity=order_data.quantity,
        unit_price=unit_price,
        total_price=total_price
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.orders.insert_one(doc)
    
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_admin: Admin = Depends(get_current_admin)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for order in orders:
        if isinstance(order['created_at'], str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_admin: Admin = Depends(get_current_admin)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    if isinstance(order['created_at'], str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    return Order(**order)

# ============ STARTUP ============

@app.on_event("startup")
async def startup_event():
    # Create default admin if not exists
    admin_exists = await db.admins.find_one({"username": "admin"})
    
    if not admin_exists:
        default_admin = Admin(
            username="admin",
            password_hash=get_password_hash("admin123")
        )
        doc = default_admin.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.admins.insert_one(doc)
        logger.info("✅ Admin por defecto creado: username='admin', password='admin123'")
    
    # Create default product if not exists
    product_exists = await db.products.find_one({"name": "Super Arroz 25x500g"})
    
    if not product_exists:
        default_product = Product(
            price=50000,
            image_url="https://customer-assets.emergentagent.com/job_en-que-te-ayudo/artifacts/lx4ah6oa_WhatsApp%20Image%202025-10-14%20at%207.46.54%20AM.jpeg"
        )
        doc = default_product.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.products.insert_one(doc)
        logger.info("✅ Producto por defecto creado")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

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
