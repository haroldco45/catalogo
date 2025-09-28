from pydantic import BaseModel, Field, EmailStr
from typing import Literal
from datetime import datetime
import uuid

class ContactBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Nombre del contacto")
    email: EmailStr = Field(..., description="Email de contacto")
    message: str = Field(..., min_length=10, max_length=1000, description="Mensaje")
    type: Literal["support", "question", "partnership"] = Field(default="question", description="Tipo de consulta")

class ContactCreate(ContactBase):
    pass

class Contact(ContactBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: Literal["pending", "resolved"] = Field(default="pending", description="Estado de la consulta")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ContactResponse(BaseModel):
    success: bool
    message: str