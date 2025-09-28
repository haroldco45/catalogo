from pydantic import BaseModel, Field, EmailStr, HttpUrl
from typing import Optional
from datetime import datetime
import uuid

class CompanyBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Nombre de la empresa")
    website: str = Field(..., description="Sitio web de la empresa")
    email: EmailStr = Field(..., description="Email de contacto")
    phone: Optional[str] = Field(None, max_length=20, description="Teléfono de contacto")
    category: str = Field(..., max_length=50, description="Categoría del negocio")
    instagram: Optional[str] = Field(None, max_length=100, description="Usuario de Instagram")
    description: Optional[str] = Field(None, max_length=500, description="Descripción del negocio")

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    avatar: str = Field(default="", description="Primera letra del nombre")
    verified: bool = Field(default=False, description="Empresa verificada")
    payment_confirmed: bool = Field(default=False, description="Pago confirmado")
    registration_date: datetime = Field(default_factory=datetime.utcnow)
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    def __init__(self, **data):
        super().__init__(**data)
        if not self.avatar and self.name:
            self.avatar = self.name[0].upper()

class CompanyResponse(BaseModel):
    id: str
    name: str
    website: str
    avatar: str
    category: str
    verified: bool

class CompanyRegisterResponse(BaseModel):
    success: bool
    message: str
    registration_id: str