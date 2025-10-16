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
import pytz
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
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Colombia timezone
colombia_tz = pytz.timezone('America/Bogota')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def get_colombia_time():
    return datetime.now(colombia_tz)

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str  # admin, dentista, recepcionista
    created_at: str = Field(default_factory=lambda: get_colombia_time().isoformat())

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Patient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: Optional[str] = None
    birth_date: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: get_colombia_time().isoformat())

class PatientCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    birth_date: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    notes: Optional[str] = None

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    birth_date: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    notes: Optional[str] = None

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    patient_name: str
    dentist_id: str
    dentist_name: str
    date: str
    time: str
    duration: int = 60  # minutes
    reason: str
    status: str = "programada"  # programada, completada, cancelada
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: get_colombia_time().isoformat())

class AppointmentCreate(BaseModel):
    patient_id: str
    dentist_id: str
    date: str
    time: str
    duration: int = 60
    reason: str
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    duration: Optional[int] = None
    reason: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class MedicalHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    appointment_id: Optional[str] = None
    date: str = Field(default_factory=lambda: get_colombia_time().isoformat())
    treatment: str
    diagnosis: str
    notes: Optional[str] = None
    cost: Optional[float] = None
    created_by: str
    created_at: str = Field(default_factory=lambda: get_colombia_time().isoformat())

class MedicalHistoryCreate(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    treatment: str
    diagnosis: str
    notes: Optional[str] = None
    cost: Optional[float] = None

# Auth endpoints
@api_router.post("/auth/register")
async def register(user: UserCreate):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    hashed_password = hash_password(user.password)
    user_obj = User(email=user.email, name=user.name, role=user.role)
    user_dict = user_obj.model_dump()
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token({"sub": user_obj.id, "email": user_obj.email, "role": user_obj.role})
    return {"token": token, "user": user_obj}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_access_token({"sub": user["id"], "email": user["email"], "role": user["role"]})
    user.pop("password", None)
    return {"token": token, "user": user}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# Patient endpoints
@api_router.post("/patients", response_model=Patient)
async def create_patient(patient: PatientCreate, current_user: dict = Depends(get_current_user)):
    patient_obj = Patient(**patient.model_dump())
    doc = patient_obj.model_dump()
    await db.patients.insert_one(doc)
    return patient_obj

@api_router.get("/patients", response_model=List[Patient])
async def get_patients(current_user: dict = Depends(get_current_user)):
    patients = await db.patients.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return patients

@api_router.get("/patients/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return patient

@api_router.put("/patients/{patient_id}", response_model=Patient)
async def update_patient(patient_id: str, patient_update: PatientUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in patient_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.patients.update_one({"id": patient_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    updated_patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    return updated_patient

@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar pacientes")
    
    result = await db.patients.delete_one({"id": patient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return {"message": "Paciente eliminado exitosamente"}

# Appointment endpoints
@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(appointment: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": appointment.patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    dentist = await db.users.find_one({"id": appointment.dentist_id, "role": "dentista"}, {"_id": 0})
    if not dentist:
        raise HTTPException(status_code=404, detail="Dentista no encontrado")
    
    appointment_obj = Appointment(
        **appointment.model_dump(),
        patient_name=patient["name"],
        dentist_name=dentist["name"]
    )
    doc = appointment_obj.model_dump()
    await db.appointments.insert_one(doc)
    return appointment_obj

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(date: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if date:
        query["date"] = date
    if status:
        query["status"] = status
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    return appointments

@api_router.get("/appointments/{appointment_id}", response_model=Appointment)
async def get_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    return appointment

@api_router.put("/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(appointment_id: str, appointment_update: AppointmentUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in appointment_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.appointments.update_one({"id": appointment_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    updated_appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    return updated_appointment

@api_router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.appointments.delete_one({"id": appointment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    return {"message": "Cita eliminada exitosamente"}

# Medical History endpoints
@api_router.post("/medical-history", response_model=MedicalHistory)
async def create_medical_history(history: MedicalHistoryCreate, current_user: dict = Depends(get_current_user)):
    history_obj = MedicalHistory(**history.model_dump(), created_by=current_user["id"])
    doc = history_obj.model_dump()
    await db.medical_history.insert_one(doc)
    return history_obj

@api_router.get("/medical-history/patient/{patient_id}", response_model=List[MedicalHistory])
async def get_patient_medical_history(patient_id: str, current_user: dict = Depends(get_current_user)):
    history = await db.medical_history.find({"patient_id": patient_id}, {"_id": 0}).sort("date", -1).to_list(1000)
    return history

# Dentists endpoint
@api_router.get("/dentists", response_model=List[User])
async def get_dentists(current_user: dict = Depends(get_current_user)):
    dentists = await db.users.find({"role": "dentista"}, {"_id": 0, "password": 0}).to_list(1000)
    return dentists

# Stats endpoint
@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    today = get_colombia_time().strftime("%Y-%m-%d")
    
    total_patients = await db.patients.count_documents({})
    total_appointments = await db.appointments.count_documents({})
    today_appointments = await db.appointments.count_documents({"date": today})
    pending_appointments = await db.appointments.count_documents({"status": "programada"})
    
    return {
        "total_patients": total_patients,
        "total_appointments": total_appointments,
        "today_appointments": today_appointments,
        "pending_appointments": pending_appointments
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()