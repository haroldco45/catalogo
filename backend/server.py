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
from datetime import datetime, date, timedelta
from enum import Enum
import jwt
from passlib.context import CryptContext
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Sistema de Lavadero", description="API para gestión de lavadero de vehículos")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class TipoVehiculo(str, Enum):
    AUTO = "Auto"
    MOTO = "Moto"
    CAMION = "Camión"
    CAMIONETA = "Camioneta"

class EstadoServicio(str, Enum):
    PENDIENTE = "Pendiente"
    EN_PROCESO = "En Proceso"
    COMPLETADO = "Completado"
    CANCELADO = "Cancelado"

# Models
class ClienteBase(BaseModel):
    nombre: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass

class Cliente(ClienteBase):
    cliente_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fecha_registro: datetime = Field(default_factory=datetime.utcnow)

class VehiculoBase(BaseModel):
    placa: str
    tipo: TipoVehiculo
    marca: Optional[str] = None
    modelo: Optional[str] = None
    color: Optional[str] = None
    ano: Optional[int] = None

class VehiculoCreate(VehiculoBase):
    cliente_id: str

class Vehiculo(VehiculoBase):
    vehiculo_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cliente_id: str
    fecha_registro: datetime = Field(default_factory=datetime.utcnow)

class TipoServicioBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    precio_base: float
    duracion_estimada: Optional[int] = None  # en minutos

class TipoServicioCreate(TipoServicioBase):
    pass

class TipoServicio(TipoServicioBase):
    servicio_tipo_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class ServicioBase(BaseModel):
    vehiculo_id: str
    servicio_tipo_id: str
    costo: float
    notas: Optional[str] = None
    estado: EstadoServicio = EstadoServicio.COMPLETADO

class ServicioCreate(ServicioBase):
    pass

class Servicio(ServicioBase):
    servicio_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fecha_servicio: datetime = Field(default_factory=datetime.utcnow)

# Dashboard Models
class EstadisticasDashboard(BaseModel):
    servicios_hoy: int
    servicios_mes: int
    ingresos_hoy: float
    ingresos_mes: float
    clientes_total: int
    vehiculos_total: int
    servicio_mas_popular: Optional[str] = None

class ReporteIngresos(BaseModel):
    fecha: date
    total_servicios: int
    total_ingresos: float

# ==================== CLIENTES ====================
@api_router.post("/clientes", response_model=Cliente)
async def crear_cliente(cliente: ClienteCreate):
    cliente_obj = Cliente(**cliente.dict())
    await db.clientes.insert_one(cliente_obj.dict())
    return cliente_obj

@api_router.get("/clientes", response_model=List[Cliente])
async def obtener_clientes():
    clientes = await db.clientes.find().to_list(1000)
    return [Cliente(**cliente) for cliente in clientes]

@api_router.get("/clientes/{cliente_id}", response_model=Cliente)
async def obtener_cliente(cliente_id: str):
    cliente = await db.clientes.find_one({"cliente_id": cliente_id})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return Cliente(**cliente)

@api_router.put("/clientes/{cliente_id}", response_model=Cliente)
async def actualizar_cliente(cliente_id: str, cliente_data: ClienteCreate):
    result = await db.clientes.update_one(
        {"cliente_id": cliente_id}, 
        {"$set": cliente_data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    cliente = await db.clientes.find_one({"cliente_id": cliente_id})
    return Cliente(**cliente)

@api_router.delete("/clientes/{cliente_id}")
async def eliminar_cliente(cliente_id: str):
    result = await db.clientes.delete_one({"cliente_id": cliente_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"message": "Cliente eliminado exitosamente"}

# ==================== VEHÍCULOS ====================
@api_router.post("/vehiculos", response_model=Vehiculo)
async def crear_vehiculo(vehiculo: VehiculoCreate):
    # Verificar que el cliente existe
    cliente = await db.clientes.find_one({"cliente_id": vehiculo.cliente_id})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    vehiculo_obj = Vehiculo(**vehiculo.dict())
    await db.vehiculos.insert_one(vehiculo_obj.dict())
    return vehiculo_obj

@api_router.get("/vehiculos", response_model=List[Vehiculo])
async def obtener_vehiculos():
    vehiculos = await db.vehiculos.find().to_list(1000)
    return [Vehiculo(**vehiculo) for vehiculo in vehiculos]

@api_router.get("/vehiculos/{vehiculo_id}", response_model=Vehiculo)
async def obtener_vehiculo(vehiculo_id: str):
    vehiculo = await db.vehiculos.find_one({"vehiculo_id": vehiculo_id})
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return Vehiculo(**vehiculo)

@api_router.get("/clientes/{cliente_id}/vehiculos", response_model=List[Vehiculo])
async def obtener_vehiculos_cliente(cliente_id: str):
    vehiculos = await db.vehiculos.find({"cliente_id": cliente_id}).to_list(1000)
    return [Vehiculo(**vehiculo) for vehiculo in vehiculos]

@api_router.put("/vehiculos/{vehiculo_id}", response_model=Vehiculo)
async def actualizar_vehiculo(vehiculo_id: str, vehiculo_data: VehiculoCreate):
    result = await db.vehiculos.update_one(
        {"vehiculo_id": vehiculo_id}, 
        {"$set": vehiculo_data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    vehiculo = await db.vehiculos.find_one({"vehiculo_id": vehiculo_id})
    return Vehiculo(**vehiculo)

@api_router.delete("/vehiculos/{vehiculo_id}")
async def eliminar_vehiculo(vehiculo_id: str):
    result = await db.vehiculos.delete_one({"vehiculo_id": vehiculo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return {"message": "Vehículo eliminado exitosamente"}

# ==================== TIPOS DE SERVICIO ====================
@api_router.post("/tipos-servicios", response_model=TipoServicio)
async def crear_tipo_servicio(tipo_servicio: TipoServicioCreate):
    tipo_servicio_obj = TipoServicio(**tipo_servicio.dict())
    await db.tipos_servicios.insert_one(tipo_servicio_obj.dict())
    return tipo_servicio_obj

@api_router.get("/tipos-servicios", response_model=List[TipoServicio])
async def obtener_tipos_servicios():
    tipos = await db.tipos_servicios.find().to_list(1000)
    return [TipoServicio(**tipo) for tipo in tipos]

@api_router.put("/tipos-servicios/{servicio_tipo_id}", response_model=TipoServicio)
async def actualizar_tipo_servicio(servicio_tipo_id: str, tipo_data: TipoServicioCreate):
    result = await db.tipos_servicios.update_one(
        {"servicio_tipo_id": servicio_tipo_id}, 
        {"$set": tipo_data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tipo de servicio no encontrado")
    
    tipo = await db.tipos_servicios.find_one({"servicio_tipo_id": servicio_tipo_id})
    return TipoServicio(**tipo)

@api_router.delete("/tipos-servicios/{servicio_tipo_id}")
async def eliminar_tipo_servicio(servicio_tipo_id: str):
    result = await db.tipos_servicios.delete_one({"servicio_tipo_id": servicio_tipo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tipo de servicio no encontrado")
    return {"message": "Tipo de servicio eliminado exitosamente"}

# ==================== SERVICIOS ====================
@api_router.post("/servicios", response_model=Servicio)
async def crear_servicio(servicio: ServicioCreate):
    # Verificar que el vehículo existe
    vehiculo = await db.vehiculos.find_one({"vehiculo_id": servicio.vehiculo_id})
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    # Verificar que el tipo de servicio existe
    tipo_servicio = await db.tipos_servicios.find_one({"servicio_tipo_id": servicio.servicio_tipo_id})
    if not tipo_servicio:
        raise HTTPException(status_code=404, detail="Tipo de servicio no encontrado")
    
    servicio_obj = Servicio(**servicio.dict())
    await db.servicios.insert_one(servicio_obj.dict())
    return servicio_obj

@api_router.get("/servicios", response_model=List[Servicio])
async def obtener_servicios():
    servicios = await db.servicios.find().sort("fecha_servicio", -1).to_list(1000)
    return [Servicio(**servicio) for servicio in servicios]

@api_router.get("/servicios/{servicio_id}", response_model=Servicio)
async def obtener_servicio(servicio_id: str):
    servicio = await db.servicios.find_one({"servicio_id": servicio_id})
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return Servicio(**servicio)

@api_router.get("/vehiculos/{vehiculo_id}/servicios", response_model=List[Servicio])
async def obtener_servicios_vehiculo(vehiculo_id: str):
    servicios = await db.servicios.find({"vehiculo_id": vehiculo_id}).sort("fecha_servicio", -1).to_list(1000)
    return [Servicio(**servicio) for servicio in servicios]

@api_router.put("/servicios/{servicio_id}", response_model=Servicio)
async def actualizar_servicio(servicio_id: str, servicio_data: ServicioCreate):
    result = await db.servicios.update_one(
        {"servicio_id": servicio_id}, 
        {"$set": servicio_data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    servicio = await db.servicios.find_one({"servicio_id": servicio_id})
    return Servicio(**servicio)

# ==================== DASHBOARD Y REPORTES ====================
@api_router.get("/dashboard/estadisticas", response_model=EstadisticasDashboard)
async def obtener_estadisticas_dashboard():
    hoy = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    inicio_mes = hoy.replace(day=1)
    
    # Servicios y ingresos de hoy
    servicios_hoy = await db.servicios.count_documents({
        "fecha_servicio": {"$gte": hoy}
    })
    
    ingresos_hoy_cursor = db.servicios.aggregate([
        {"$match": {"fecha_servicio": {"$gte": hoy}}},
        {"$group": {"_id": None, "total": {"$sum": "$costo"}}}
    ])
    ingresos_hoy_result = await ingresos_hoy_cursor.to_list(1)
    ingresos_hoy = ingresos_hoy_result[0]["total"] if ingresos_hoy_result else 0
    
    # Servicios y ingresos del mes
    servicios_mes = await db.servicios.count_documents({
        "fecha_servicio": {"$gte": inicio_mes}
    })
    
    ingresos_mes_cursor = db.servicios.aggregate([
        {"$match": {"fecha_servicio": {"$gte": inicio_mes}}},
        {"$group": {"_id": None, "total": {"$sum": "$costo"}}}
    ])
    ingresos_mes_result = await ingresos_mes_cursor.to_list(1)
    ingresos_mes = ingresos_mes_result[0]["total"] if ingresos_mes_result else 0
    
    # Totales
    clientes_total = await db.clientes.count_documents({})
    vehiculos_total = await db.vehiculos.count_documents({})
    
    # Servicio más popular
    servicio_popular_cursor = db.servicios.aggregate([
        {"$group": {"_id": "$servicio_tipo_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1}
    ])
    servicio_popular_result = await servicio_popular_cursor.to_list(1)
    servicio_mas_popular = None
    
    if servicio_popular_result:
        tipo_servicio = await db.tipos_servicios.find_one({
            "servicio_tipo_id": servicio_popular_result[0]["_id"]
        })
        servicio_mas_popular = tipo_servicio["nombre"] if tipo_servicio else None
    
    return EstadisticasDashboard(
        servicios_hoy=servicios_hoy,
        servicios_mes=servicios_mes,
        ingresos_hoy=ingresos_hoy,
        ingresos_mes=ingresos_mes,
        clientes_total=clientes_total,
        vehiculos_total=vehiculos_total,
        servicio_mas_popular=servicio_mas_popular
    )

@api_router.get("/reportes/ingresos", response_model=List[ReporteIngresos])
async def obtener_reporte_ingresos(dias: int = 30):
    fecha_inicio = datetime.now() - timedelta(days=dias)
    
    pipeline = [
        {"$match": {"fecha_servicio": {"$gte": fecha_inicio}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$fecha_servicio"
                    }
                },
                "total_servicios": {"$sum": 1},
                "total_ingresos": {"$sum": "$costo"}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    resultados = await db.servicios.aggregate(pipeline).to_list(None)
    
    return [
        ReporteIngresos(
            fecha=datetime.strptime(resultado["_id"], "%Y-%m-%d").date(),
            total_servicios=resultado["total_servicios"],
            total_ingresos=resultado["total_ingresos"]
        )
        for resultado in resultados
    ]

@api_router.get("/buscar")
async def buscar_por_placa(placa: str):
    # Buscar vehículo por placa
    vehiculo = await db.vehiculos.find_one({"placa": {"$regex": placa, "$options": "i"}})
    if not vehiculo:
        return {"vehiculo": None, "cliente": None, "servicios": []}
    
    # Obtener cliente
    cliente = await db.clientes.find_one({"cliente_id": vehiculo["cliente_id"]})
    
    # Obtener servicios del vehículo
    servicios = await db.servicios.find({"vehiculo_id": vehiculo["vehiculo_id"]}).sort("fecha_servicio", -1).to_list(100)
    
    return {
        "vehiculo": Vehiculo(**vehiculo),
        "cliente": Cliente(**cliente) if cliente else None,
        "servicios": [Servicio(**servicio) for servicio in servicios]
    }

# Inicializar datos de ejemplo
@api_router.post("/inicializar-datos")
async def inicializar_datos():
    # Verificar si ya hay datos
    if await db.tipos_servicios.count_documents({}) > 0:
        return {"message": "Los datos ya están inicializados"}
    
    # Crear tipos de servicios básicos
    tipos_servicios = [
        {"nombre": "Lavado Básico", "descripcion": "Lavado exterior básico", "precio_base": 25.0, "duracion_estimada": 30},
        {"nombre": "Lavado Completo", "descripcion": "Lavado exterior e interior", "precio_base": 45.0, "duracion_estimada": 60},
        {"nombre": "Lavado Premium", "descripcion": "Lavado completo + encerado + aspirado", "precio_base": 75.0, "duracion_estimada": 90},
        {"nombre": "Solo Aspirado", "descripcion": "Aspirado interior únicamente", "precio_base": 15.0, "duracion_estimada": 20},
        {"nombre": "Encerado", "descripcion": "Aplicación de cera protectora", "precio_base": 35.0, "duracion_estimada": 45}
    ]
    
    for tipo_data in tipos_servicios:
        tipo_obj = TipoServicio(**tipo_data)
        await db.tipos_servicios.insert_one(tipo_obj.dict())
    
    return {"message": "Datos inicializados correctamente"}

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