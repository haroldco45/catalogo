from fastapi import APIRouter, HTTPException, Depends
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.company import Company, CompanyCreate, CompanyResponse, CompanyRegisterResponse
from database import get_database
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/companies", tags=["companies"])

@router.post("/register", response_model=CompanyRegisterResponse)
async def register_company(
    company_data: CompanyCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    try:
        # Verificar si la empresa ya existe
        existing_company = await db.companies.find_one({
            "$or": [
                {"email": company_data.email},
                {"name": {"$regex": f"^{company_data.name}$", "$options": "i"}}
            ]
        })
        
        if existing_company:
            raise HTTPException(
                status_code=400, 
                detail="Ya existe una empresa con este nombre o email"
            )
        
        # Crear nueva empresa
        company = Company(**company_data.dict())
        
        # Insertar en la base de datos
        result = await db.companies.insert_one(company.dict())
        
        if result.inserted_id:
            logger.info(f"Nueva empresa registrada: {company.name} - ID: {company.id}")
            return CompanyRegisterResponse(
                success=True,
                message="Solicitud de registro enviada exitosamente. Te contactaremos pronto para confirmar el pago por Nequi (3117700431).",
                registration_id=company.id
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="Error al registrar la empresa"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registrando empresa: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error interno del servidor"
        )

@router.get("", response_model=dict)
async def get_companies(
    limit: int = 100,
    verified_only: bool = True,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    try:
        # Filtrar por empresas verificadas si se especifica
        filter_query = {"verified": True} if verified_only else {}
        
        # Obtener empresas
        cursor = db.companies.find(filter_query).limit(limit)
        companies_data = await cursor.to_list(length=limit)
        
        # Convertir a formato de respuesta
        companies = [
            CompanyResponse(
                id=comp["id"],
                name=comp["name"],
                website=comp["website"],
                avatar=comp["avatar"],
                category=comp["category"],
                verified=comp["verified"]
            )
            for comp in companies_data
        ]
        
        # Contar total
        total = await db.companies.count_documents(filter_query)
        
        return {
            "companies": companies,
            "total": total
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo empresas: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error al obtener empresas"
        )