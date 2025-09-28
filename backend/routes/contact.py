from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..models.contact import Contact, ContactCreate, ContactResponse
from ..database import get_database
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contact", tags=["contact"])

@router.post("", response_model=ContactResponse)
async def create_contact(
    contact_data: ContactCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    try:
        # Crear nuevo contacto
        contact = Contact(**contact_data.dict())
        
        # Insertar en la base de datos
        result = await db.contacts.insert_one(contact.dict())
        
        if result.inserted_id:
            logger.info(f"Nuevo contacto registrado: {contact.email} - Tipo: {contact.type}")
            return ContactResponse(
                success=True,
                message="Tu mensaje ha sido enviado exitosamente. Te responderemos pronto."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="Error al enviar el mensaje"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando contacto: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error interno del servidor"
        )