# LinkHub - Contratos API Frontend/Backend

## Datos Mock Actuales (frontend/src/data/mock.js)
- `mockCompanies`: Lista de empresas registradas
- `mockStats`: Estadísticas del sitio 
- `mockPaymentInfo`: Información de pago
- `mockTestimonials`: Testimonios de empresas
- `mockFAQs`: Preguntas frecuentes

## APIs a Implementar

### 1. Registro de Empresa
**Endpoint:** `POST /api/companies/register`
**Función:** Registrar nueva empresa en el directorio

**Request Body:**
```json
{
  "companyName": "string",
  "website": "string", 
  "email": "string",
  "phone": "string",
  "category": "string",
  "instagram": "string (opcional)",
  "description": "string (opcional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Solicitud de registro enviada. Te contactaremos para confirmar el pago.",
  "registrationId": "string"
}
```

### 2. Obtener Empresas Registradas
**Endpoint:** `GET /api/companies`
**Función:** Mostrar directorio público de empresas

**Response:**
```json
{
  "companies": [
    {
      "id": "string",
      "name": "string",
      "website": "string", 
      "avatar": "string",
      "category": "string",
      "verified": "boolean"
    }
  ],
  "total": "number"
}
```

### 3. Estadísticas del Sitio
**Endpoint:** `GET /api/stats`
**Función:** Mostrar estadísticas para social proof

**Response:**
```json
{
  "totalCompanies": "number",
  "monthlyVisitors": "number", 
  "avgTrafficIncrease": "number"
}
```

### 4. Contacto/Soporte
**Endpoint:** `POST /api/contact`
**Función:** Formulario de contacto para dudas

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "message": "string",
  "type": "support|question|partnership"
}
```

## Modelos MongoDB

### Company
```javascript
{
  _id: ObjectId,
  name: String (required),
  website: String (required),
  email: String (required),
  phone: String,
  category: String,
  instagram: String,
  description: String,
  avatar: String (first letter of name),
  verified: Boolean (default: false),
  paymentConfirmed: Boolean (default: false),
  registrationDate: Date,
  lastUpdated: Date
}
```

### Contact
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required), 
  message: String (required),
  type: String (enum: support, question, partnership),
  status: String (enum: pending, resolved),
  createdAt: Date
}
```

## Integración Frontend

### Remover Mock Data
- Reemplazar llamadas a mock data con APIs reales
- Actualizar componente `LandingPage.jsx`
- Mantener loading states y error handling

### Estados de Carga
- Loading spinner durante registro
- Success/error messages
- Form validation

### Funcionalidades a Conectar
1. **Formulario de registro** → `POST /api/companies/register`
2. **Mostrar empresas** → `GET /api/companies`  
3. **Estadísticas** → `GET /api/stats`
4. **Testimonios** → Mantener mock (data editorial)

## Proceso de Pago (Fuera del Scope)
- El pago por Nequi se maneja manualmente
- Sistema envía notificación por email
- Admin confirma pago y activa empresa

## Validaciones
- Email válido
- Website con formato URL válido
- Nombre de empresa único
- Rate limiting para prevenir spam

## Error Handling
- Formulario: mostrar errores específicos
- Network errors: mensajes user-friendly
- Validation errors: highlight campos incorrectos