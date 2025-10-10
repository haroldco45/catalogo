from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'default-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 30

# AI Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ====================
# MODELS
# ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    user_id: str
    edad: int
    peso: float  # kg
    altura: float  # cm
    genero: str  # masculino/femenino/otro
    tipo_cuerpo: str  # ectomorfo/mesomorfo/endomorfo
    nivel_actividad: str  # sedentario/ligero/moderado/activo/muy_activo
    objetivo: str  # perder_peso/mantener/ganar_musculo
    alergias: List[str] = []
    enfermedades: List[str] = []
    preferencias_alimenticias: List[str] = []  # vegetariano, vegano, sin_gluten, etc.

class UserProfileUpdate(BaseModel):
    edad: Optional[int] = None
    peso: Optional[float] = None
    altura: Optional[float] = None
    genero: Optional[str] = None
    tipo_cuerpo: Optional[str] = None
    nivel_actividad: Optional[str] = None
    objetivo: Optional[str] = None
    alergias: Optional[List[str]] = None
    enfermedades: Optional[List[str]] = None
    preferencias_alimenticias: Optional[List[str]] = None

class MealRequest(BaseModel):
    tipo_comida: str  # desayuno/almuerzo/cena
    ingredientes_deseados: List[str] = []
    ingredientes_excluir: List[str] = []

class Meal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    tipo_comida: str
    nombre: str
    ingredientes: List[str]
    preparacion: str
    calorias: int
    proteinas: float
    carbohidratos: float
    grasas: float
    imagen_base64: Optional[str] = None
    fecha_creacion: datetime = Field(default_factory=datetime.utcnow)

class DailyMenuResponse(BaseModel):
    fecha: str
    calorias_objetivo: int
    sugerencias: List[Dict]

# ====================
# AUTH UTILITIES
# ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    expiration = datetime.utcnow() + timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_jwt_token(token)
    user = await db.users.find_one({"id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

# ====================
# AI UTILITIES
# ====================

def calcular_calorias_objetivo(profile: dict) -> int:
    """Calcula las calorías objetivo basado en el perfil del usuario usando fórmula Harris-Benedict"""
    edad = profile.get('edad', 30)
    peso = profile.get('peso', 70)
    altura = profile.get('altura', 170)
    genero = profile.get('genero', 'masculino')
    nivel_actividad = profile.get('nivel_actividad', 'moderado')
    objetivo = profile.get('objetivo', 'mantener')
    
    # Calcular TMB (Tasa Metabólica Basal)
    if genero.lower() == 'masculino':
        tmb = 88.362 + (13.397 * peso) + (4.799 * altura) - (5.677 * edad)
    else:
        tmb = 447.593 + (9.247 * peso) + (3.098 * altura) - (4.330 * edad)
    
    # Multiplicador por nivel de actividad
    multiplicadores = {
        'sedentario': 1.2,
        'ligero': 1.375,
        'moderado': 1.55,
        'activo': 1.725,
        'muy_activo': 1.9
    }
    
    calorias_mantenimiento = tmb * multiplicadores.get(nivel_actividad, 1.55)
    
    # Ajustar por objetivo
    if objetivo == 'perder_peso':
        calorias_objetivo = calorias_mantenimiento - 500
    elif objetivo == 'ganar_musculo':
        calorias_objetivo = calorias_mantenimiento + 300
    else:
        calorias_objetivo = calorias_mantenimiento
    
    return int(calorias_objetivo)

async def generar_receta_con_ia(tipo_comida: str, ingredientes: List[str], profile: dict, ingredientes_excluir: List[str] = []) -> dict:
    """Genera una receta personalizada usando IA"""
    calorias_objetivo = calcular_calorias_objetivo(profile)
    
    # Calcular calorías por comida
    distribucion = {
        'desayuno': 0.30,
        'almuerzo': 0.40,
        'cena': 0.30
    }
    calorias_comida = int(calorias_objetivo * distribucion.get(tipo_comida, 0.33))
    
    alergias = profile.get('alergias', [])
    enfermedades = profile.get('enfermedades', [])
    preferencias = profile.get('preferencias_alimenticias', [])
    
    # Crear prompt para la IA
    prompt = f"""Eres un chef nutricionista experto. Crea una receta de {tipo_comida} con las siguientes características:

- Calorías objetivo: aproximadamente {calorias_comida} kcal
- Edad del usuario: {profile.get('edad', 'N/A')} años
- Objetivo: {profile.get('objetivo', 'mantener peso')}
"""
    
    if ingredientes:
        prompt += f"\n- Ingredientes preferidos: {', '.join(ingredientes)}"
    
    if ingredientes_excluir:
        prompt += f"\n- NO usar estos ingredientes: {', '.join(ingredientes_excluir)}"
    
    if alergias:
        prompt += f"\n- IMPORTANTE - Alergias del usuario (NO INCLUIR): {', '.join(alergias)}"
    
    if enfermedades:
        prompt += f"\n- Condiciones médicas a considerar: {', '.join(enfermedades)}"
    
    if preferencias:
        prompt += f"\n- Preferencias alimenticias: {', '.join(preferencias)}"
    
    prompt += """\n\nResponde ÚNICAMENTE en este formato JSON exacto (sin markdown, sin ```json):
{
  "nombre": "Nombre del plato",
  "ingredientes": ["ingrediente 1", "ingrediente 2", "ingrediente 3"],
  "preparacion": "Paso 1: ...\nPaso 2: ...\nPaso 3: ...",
  "calorias": 500,
  "proteinas": 25.5,
  "carbohidratos": 60.0,
  "grasas": 15.0
}"""
    
    # Generar receta con IA
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"meal-gen-{uuid.uuid4()}",
        system_message="Eres un chef nutricionista experto. Siempre respondes en formato JSON válido sin markdown."
    ).with_model("openai", "gpt-4o")
    
    response = await chat.send_message(UserMessage(text=prompt))
    
    # Parse JSON response
    import json
    try:
        # Limpiar la respuesta
        response_text = response.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        receta_data = json.loads(response_text)
        return receta_data
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON: {e}\nResponse: {response}")
        # Fallback response
        return {
            "nombre": f"{tipo_comida.capitalize()} Saludable",
            "ingredientes": ingredientes if ingredientes else ["Ingredientes varios"],
            "preparacion": "Preparar según instrucciones estándar de cocina saludable.",
            "calorias": calorias_comida,
            "proteinas": calorias_comida * 0.25 / 4,
            "carbohidratos": calorias_comida * 0.50 / 4,
            "grasas": calorias_comida * 0.25 / 9
        }

async def generar_imagen_plato(nombre_plato: str, ingredientes: List[str]) -> str:
    """Genera una imagen del plato usando IA"""
    prompt = f"Una fotografía profesional de alta calidad de {nombre_plato}, plato gourmet bien presentado, con {', '.join(ingredientes[:3])}, iluminación natural, fondo neutro, estilo gastronómico, comida apetitosa"
    
    try:
        image_gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            return base64.b64encode(images[0]).decode('utf-8')
        return None
    except Exception as e:
        logger.error(f"Error generando imagen: {e}")
        return None

# ====================
# ROUTES
# ====================

@api_router.get("/")
async def root():
    return {"message": "Menu Maestro API - Tu asistente gastronómico personalizado"}

# Auth endpoints
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    
    # Create token
    token = create_jwt_token(user_id, user_data.email)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_jwt_token(user["id"], user["email"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"]
        }
    }

# Profile endpoints
@api_router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        return {"user_id": current_user["id"], "configured": False}
    return profile

@api_router.post("/profile")
async def create_or_update_profile(profile_data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    profile_dict = profile_data.dict(exclude_unset=True)
    profile_dict["user_id"] = current_user["id"]
    profile_dict["updated_at"] = datetime.utcnow()
    
    existing_profile = await db.profiles.find_one({"user_id": current_user["id"]})
    
    if existing_profile:
        await db.profiles.update_one(
            {"user_id": current_user["id"]},
            {"$set": profile_dict}
        )
    else:
        await db.profiles.insert_one(profile_dict)
    
    return {"message": "Perfil actualizado correctamente", "profile": profile_dict}

# Meal generation endpoints
@api_router.post("/generate-meal")
async def generate_meal(meal_request: MealRequest, current_user: dict = Depends(get_current_user)):
    # Get user profile
    profile = await db.profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        raise HTTPException(status_code=400, detail="Por favor completa tu perfil primero")
    
    # Generate recipe
    receta = await generar_receta_con_ia(
        meal_request.tipo_comida,
        meal_request.ingredientes_deseados,
        profile,
        meal_request.ingredientes_excluir
    )
    
    # Generate image
    imagen_base64 = await generar_imagen_plato(receta["nombre"], receta["ingredientes"])
    
    # Save meal
    meal = Meal(
        user_id=current_user["id"],
        tipo_comida=meal_request.tipo_comida,
        nombre=receta["nombre"],
        ingredientes=receta["ingredientes"],
        preparacion=receta["preparacion"],
        calorias=receta["calorias"],
        proteinas=receta["proteinas"],
        carbohidratos=receta["carbohidratos"],
        grasas=receta["grasas"],
        imagen_base64=imagen_base64
    )
    
    await db.meals.insert_one(meal.dict())
    
    return meal

@api_router.get("/daily-suggestions")
async def get_daily_suggestions(current_user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        raise HTTPException(status_code=400, detail="Por favor completa tu perfil primero")
    
    calorias_objetivo = calcular_calorias_objetivo(profile)
    
    # Generar sugerencias para cada tipo de comida
    sugerencias = []
    tipos_comida = ['desayuno', 'almuerzo', 'cena']
    
    for tipo in tipos_comida:
        receta = await generar_receta_con_ia(tipo, [], profile)
        sugerencias.append({
            "tipo_comida": tipo,
            "nombre": receta["nombre"],
            "calorias": receta["calorias"],
            "ingredientes": receta["ingredientes"][:5]  # Solo mostrar 5 ingredientes principales
        })
    
    return DailyMenuResponse(
        fecha=datetime.utcnow().strftime("%Y-%m-%d"),
        calorias_objetivo=calorias_objetivo,
        sugerencias=sugerencias
    )

@api_router.get("/meal-history")
async def get_meal_history(limit: int = 20, current_user: dict = Depends(get_current_user)):
    meals = await db.meals.find(
        {"user_id": current_user["id"]}
    ).sort("fecha_creacion", -1).limit(limit).to_list(limit)
    
    return meals

@api_router.get("/stats")
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        return {"configured": False}
    
    # Obtener comidas de hoy
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_meals = await db.meals.find({
        "user_id": current_user["id"],
        "fecha_creacion": {"$gte": today_start}
    }).to_list(100)
    
    total_calorias_hoy = sum(meal.get('calorias', 0) for meal in today_meals)
    calorias_objetivo = calcular_calorias_objetivo(profile)
    
    # Contar total de recetas generadas
    total_recetas = await db.meals.count_documents({"user_id": current_user["id"]})
    
    return {
        "configured": True,
        "calorias_objetivo": calorias_objetivo,
        "calorias_hoy": total_calorias_hoy,
        "comidas_hoy": len(today_meals),
        "total_recetas_generadas": total_recetas,
        "progreso_hoy": round((total_calorias_hoy / calorias_objetivo) * 100, 1) if calorias_objetivo > 0 else 0
    }

# Include router
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
