from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime
import sys

# Añadir el directorio backend al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Importar rutas y database
try:
    from routes.companies import router as companies_router
    from routes.contact import router as contact_router
    from routes.stats import router as stats_router
    from database import connect_to_mongo, close_mongo_connection
except ImportError as e:
    logging.error(f"Error importando módulos: {e}")
    # Fallback - crear rutas básicas
    companies_router = APIRouter()
    contact_router = APIRouter()
    stats_router = APIRouter()

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Crear la aplicación principal
app = FastAPI(title="LinkHub API", description="API para el directorio web LinkHub")

# Crear router principal con prefijo /api
api_router = APIRouter(prefix="/api")

# Mantener el endpoint original para compatibilidad
@api_router.get("/")
async def root():
    return {"message": "LinkHub API - Ready to connect businesses!"}

# Incluir todas las rutas
api_router.include_router(companies_router)
api_router.include_router(contact_router)
api_router.include_router(stats_router)

# Incluir el router principal en la app
app.include_router(api_router)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_client():
    """Conectar a MongoDB al iniciar la aplicación"""
    try:
        await connect_to_mongo()
        logger.info("✅ Conexión a MongoDB establecida")
    except Exception as e:
        logger.error(f"❌ Error conectando a MongoDB: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Cerrar conexión a MongoDB al cerrar la aplicación"""
    try:
        await close_mongo_connection()
        logger.info("✅ Conexión a MongoDB cerrada")
    except Exception as e:
        logger.error(f"❌ Error cerrando conexión MongoDB: {e}")