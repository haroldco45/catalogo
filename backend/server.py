from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.environ.get('SECRET_KEY', 'moto-service-secret-key-2024')
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="MotoService API")
api_router = APIRouter(prefix="/api")

# ============= MODELOS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    nombre: str
    rol: str = "mecanico"  # admin, mecanico
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nombre: str
    rol: str = "mecanico"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Cliente(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre: str
    telefono: str
    email: Optional[str] = None
    direccion: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ClienteCreate(BaseModel):
    nombre: str
    telefono: str
    email: Optional[str] = None
    direccion: Optional[str] = None

class Moto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cliente_id: str
    cliente_nombre: str  # Desnormalizado para queries rápidas
    marca: str
    modelo: str
    año: int
    placa: str
    vin: Optional[str] = None
    kilometraje_actual: int
    color: Optional[str] = None
    foto_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MotoCreate(BaseModel):
    cliente_id: str
    marca: str
    modelo: str
    año: int
    placa: str
    vin: Optional[str] = None
    kilometraje_actual: int
    color: Optional[str] = None
    foto_url: Optional[str] = None

class MotoUpdate(BaseModel):
    kilometraje_actual: Optional[int] = None
    color: Optional[str] = None
    foto_url: Optional[str] = None

class ChecklistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    categoria: str  # Lubricación, Frenos, Transmisión, etc.
    descripcion: str
    estado: str = "pendiente"  # pendiente, en_proceso, completado, no_aplica
    notas: Optional[str] = None
    costo: float = 0.0

class OrdenTrabajo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    moto_id: str
    moto_info: Dict[str, Any]  # Datos de la moto para referencia rápida
    tipo_servicio: str  # preventivo, correctivo, revision_general
    kilometraje_servicio: int
    fecha_inicio: str
    fecha_completado: Optional[str] = None
    estado: str = "pendiente"  # pendiente, en_proceso, completado
    checklist: List[ChecklistItem]
    costo_total: float = 0.0
    mecanico_asignado: Optional[str] = None
    notas_generales: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OrdenTrabajoCreate(BaseModel):
    moto_id: str
    tipo_servicio: str
    kilometraje_servicio: int
    fecha_inicio: str
    mecanico_asignado: Optional[str] = None
    notas_generales: Optional[str] = None

class OrdenTrabajoUpdate(BaseModel):
    estado: Optional[str] = None
    fecha_completado: Optional[str] = None
    checklist: Optional[List[ChecklistItem]] = None
    costo_total: Optional[float] = None
    notas_generales: Optional[str] = None

class Recordatorio(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    moto_id: str
    tipo: str  # kilometraje, fecha
    descripcion: str
    kilometraje_objetivo: Optional[int] = None
    fecha_objetivo: Optional[str] = None
    activo: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============= FUNCIONES DE SEGURIDAD =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token inválido")

# ============= ENDPOINTS DE AUTENTICACIÓN =============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Verificar si el usuario ya existe
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Crear usuario
    user = User(
        email=user_data.email,
        nombre=user_data.nombre,
        rol=user_data.rol
    )
    
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    token = create_token(user.id, user.email)
    return {"user": user, "token": token}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_data = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user_data or not verify_password(credentials.password, user_data.get("password", "")):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    user = User(**user_data)
    token = create_token(user.id, user.email)
    
    return {"user": user, "token": token}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ============= ENDPOINTS DE CLIENTES =============

@api_router.post("/clientes", response_model=Cliente)
async def crear_cliente(cliente_data: ClienteCreate, current_user: User = Depends(get_current_user)):
    cliente = Cliente(**cliente_data.model_dump())
    await db.clientes.insert_one(cliente.model_dump())
    return cliente

@api_router.get("/clientes", response_model=List[Cliente])
async def listar_clientes(current_user: User = Depends(get_current_user)):
    clientes = await db.clientes.find({}, {"_id": 0}).to_list(1000)
    return clientes

@api_router.get("/clientes/{cliente_id}", response_model=Cliente)
async def obtener_cliente(cliente_id: str, current_user: User = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return Cliente(**cliente)

@api_router.put("/clientes/{cliente_id}", response_model=Cliente)
async def actualizar_cliente(cliente_id: str, cliente_data: ClienteCreate, current_user: User = Depends(get_current_user)):
    result = await db.clientes.update_one(
        {"id": cliente_id},
        {"$set": cliente_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    return Cliente(**cliente)

@api_router.delete("/clientes/{cliente_id}")
async def eliminar_cliente(cliente_id: str, current_user: User = Depends(get_current_user)):
    result = await db.clientes.delete_one({"id": cliente_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"message": "Cliente eliminado exitosamente"}

# ============= ENDPOINTS DE MOTOS =============

@api_router.post("/motos", response_model=Moto)
async def crear_moto(moto_data: MotoCreate, current_user: User = Depends(get_current_user)):
    # Obtener info del cliente
    cliente = await db.clientes.find_one({"id": moto_data.cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    moto = Moto(
        **moto_data.model_dump(),
        cliente_nombre=cliente["nombre"]
    )
    await db.motos.insert_one(moto.model_dump())
    return moto

@api_router.get("/motos", response_model=List[Moto])
async def listar_motos(current_user: User = Depends(get_current_user)):
    motos = await db.motos.find({}, {"_id": 0}).to_list(1000)
    return motos

@api_router.get("/motos/{moto_id}", response_model=Moto)
async def obtener_moto(moto_id: str, current_user: User = Depends(get_current_user)):
    moto = await db.motos.find_one({"id": moto_id}, {"_id": 0})
    if not moto:
        raise HTTPException(status_code=404, detail="Moto no encontrada")
    return Moto(**moto)

@api_router.get("/motos/cliente/{cliente_id}", response_model=List[Moto])
async def listar_motos_cliente(cliente_id: str, current_user: User = Depends(get_current_user)):
    motos = await db.motos.find({"cliente_id": cliente_id}, {"_id": 0}).to_list(1000)
    return motos

@api_router.put("/motos/{moto_id}", response_model=Moto)
async def actualizar_moto(moto_id: str, moto_data: MotoUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in moto_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.motos.update_one(
        {"id": moto_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Moto no encontrada")
    
    moto = await db.motos.find_one({"id": moto_id}, {"_id": 0})
    return Moto(**moto)

@api_router.delete("/motos/{moto_id}")
async def eliminar_moto(moto_id: str, current_user: User = Depends(get_current_user)):
    result = await db.motos.delete_one({"id": moto_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Moto no encontrada")
    return {"message": "Moto eliminada exitosamente"}

# ============= ENDPOINTS DE ÓRDENES DE TRABAJO =============

def generar_checklist_default(tipo_servicio: str) -> List[ChecklistItem]:
    """Genera un checklist predeterminado según el tipo de servicio"""
    checklist_base = [
        # Lubricación
        ChecklistItem(categoria="Lubricación", descripcion="Cambio de aceite de motor"),
        ChecklistItem(categoria="Lubricación", descripcion="Cambio de filtro de aceite"),
        ChecklistItem(categoria="Lubricación", descripcion="Revisión del nivel de aceite"),
        ChecklistItem(categoria="Lubricación", descripcion="Cambio o limpieza del filtro de aire"),
        # Frenos
        ChecklistItem(categoria="Frenos", descripcion="Revisión de pastillas y zapatas"),
        ChecklistItem(categoria="Frenos", descripcion="Inspección de discos y tambores"),
        ChecklistItem(categoria="Frenos", descripcion="Revisión y cambio de líquido de frenos"),
        # Transmisión
        ChecklistItem(categoria="Transmisión", descripcion="Limpieza y lubricación de la cadena"),
        ChecklistItem(categoria="Transmisión", descripcion="Ajuste de la tensión de la cadena"),
        ChecklistItem(categoria="Transmisión", descripcion="Revisión de piñón y corona"),
        # Ruedas y Neumáticos
        ChecklistItem(categoria="Ruedas", descripcion="Verificación de la presión de neumáticos"),
        ChecklistItem(categoria="Ruedas", descripcion="Inspección del estado de neumáticos"),
        ChecklistItem(categoria="Ruedas", descripcion="Revisión de ejes y rodamientos"),
        # Sistema Eléctrico
        ChecklistItem(categoria="Eléctrico", descripcion="Revisión de la batería"),
        ChecklistItem(categoria="Eléctrico", descripcion="Verificación de luces"),
        ChecklistItem(categoria="Eléctrico", descripcion="Revisión de bujías"),
        # Suspensiones
        ChecklistItem(categoria="Suspensiones", descripcion="Revisión de horquillas delanteras"),
        ChecklistItem(categoria="Suspensiones", descripcion="Revisión de amortiguador trasero"),
        ChecklistItem(categoria="Suspensiones", descripcion="Apriete general de tornillos y tuercas"),
        ChecklistItem(categoria="Otros", descripcion="Nivel de líquido refrigerante"),
        ChecklistItem(categoria="Otros", descripcion="Limpieza general"),
    ]
    
    return checklist_base

@api_router.post("/ordenes", response_model=OrdenTrabajo)
async def crear_orden(orden_data: OrdenTrabajoCreate, current_user: User = Depends(get_current_user)):
    # Obtener info de la moto
    moto = await db.motos.find_one({"id": orden_data.moto_id}, {"_id": 0})
    if not moto:
        raise HTTPException(status_code=404, detail="Moto no encontrada")
    
    # Generar checklist
    checklist = generar_checklist_default(orden_data.tipo_servicio)
    
    orden = OrdenTrabajo(
        moto_id=orden_data.moto_id,
        moto_info={
            "marca": moto["marca"],
            "modelo": moto["modelo"],
            "placa": moto["placa"],
            "cliente_nombre": moto["cliente_nombre"]
        },
        tipo_servicio=orden_data.tipo_servicio,
        kilometraje_servicio=orden_data.kilometraje_servicio,
        fecha_inicio=orden_data.fecha_inicio,
        mecanico_asignado=orden_data.mecanico_asignado or current_user.nombre,
        notas_generales=orden_data.notas_generales,
        checklist=[item.model_dump() for item in checklist],
        estado="en_proceso"
    )
    
    await db.ordenes.insert_one(orden.model_dump())
    return orden

@api_router.get("/ordenes", response_model=List[OrdenTrabajo])
async def listar_ordenes(estado: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if estado:
        query["estado"] = estado
    
    ordenes = await db.ordenes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return ordenes

@api_router.get("/ordenes/{orden_id}", response_model=OrdenTrabajo)
async def obtener_orden(orden_id: str, current_user: User = Depends(get_current_user)):
    orden = await db.ordenes.find_one({"id": orden_id}, {"_id": 0})
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return OrdenTrabajo(**orden)

@api_router.get("/ordenes/moto/{moto_id}", response_model=List[OrdenTrabajo])
async def listar_ordenes_moto(moto_id: str, current_user: User = Depends(get_current_user)):
    ordenes = await db.ordenes.find({"moto_id": moto_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return ordenes

@api_router.put("/ordenes/{orden_id}", response_model=OrdenTrabajo)
async def actualizar_orden(orden_id: str, orden_data: OrdenTrabajoUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in orden_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    # Si se actualiza el checklist, calcular el costo total
    if "checklist" in update_data:
        costo_total = sum(item.get("costo", 0) for item in update_data["checklist"])
        update_data["costo_total"] = costo_total
    
    result = await db.ordenes.update_one(
        {"id": orden_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    orden = await db.ordenes.find_one({"id": orden_id}, {"_id": 0})
    return OrdenTrabajo(**orden)

@api_router.delete("/ordenes/{orden_id}")
async def eliminar_orden(orden_id: str, current_user: User = Depends(get_current_user)):
    result = await db.ordenes.delete_one({"id": orden_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return {"message": "Orden eliminada exitosamente"}

# ============= ENDPOINTS DE ESTADÍSTICAS =============

@api_router.get("/stats/dashboard")
async def obtener_stats_dashboard(current_user: User = Depends(get_current_user)):
    # Contar totales
    total_motos = await db.motos.count_documents({})
    total_clientes = await db.clientes.count_documents({})
    total_ordenes = await db.ordenes.count_documents({})
    
    # Órdenes por estado
    ordenes_pendientes = await db.ordenes.count_documents({"estado": "pendiente"})
    ordenes_proceso = await db.ordenes.count_documents({"estado": "en_proceso"})
    ordenes_completadas = await db.ordenes.count_documents({"estado": "completado"})
    
    # Últimas 5 órdenes
    ultimas_ordenes = await db.ordenes.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    # Próximos recordatorios (motos que necesitan servicio pronto)
    motos = await db.motos.find({}, {"_id": 0}).to_list(1000)
    recordatorios = []
    for moto in motos:
        # Última orden de la moto
        ultima_orden = await db.ordenes.find_one(
            {"moto_id": moto["id"]},
            {"_id": 0}
        )
        if ultima_orden:
            km_desde_ultimo = moto["kilometraje_actual"] - ultima_orden["kilometraje_servicio"]
            if km_desde_ultimo >= 4500:  # Alerta si faltan 500km para los 5000km
                recordatorios.append({
                    "moto_id": moto["id"],
                    "moto_info": f"{moto['marca']} {moto['modelo']} - {moto['placa']}",
                    "cliente": moto["cliente_nombre"],
                    "km_desde_ultimo": km_desde_ultimo,
                    "mensaje": f"Faltan {5000 - km_desde_ultimo}km para el próximo servicio"
                })
    
    return {
        "totales": {
            "motos": total_motos,
            "clientes": total_clientes,
            "ordenes": total_ordenes
        },
        "ordenes_por_estado": {
            "pendientes": ordenes_pendientes,
            "en_proceso": ordenes_proceso,
            "completadas": ordenes_completadas
        },
        "ultimas_ordenes": ultimas_ordenes,
        "recordatorios": recordatorios[:5]  # Mostrar solo los 5 más urgentes
    }

# ============= CONFIGURACIÓN =============

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