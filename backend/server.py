from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import pytz
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from fastapi.responses import StreamingResponse
import requests


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Colombia timezone
COLOMBIA_TZ = pytz.timezone('America/Bogota')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# WhatsApp Configuration
WHATSAPP_PHONE = "573217366758"  # Formato internacional: 57 + número
WHATSAPP_API_PROVIDER = os.environ.get('WHATSAPP_API_PROVIDER', 'callmebot')
WHAPI_TOKEN = os.environ.get('WHAPI_TOKEN', '')
WHATSAPP_BUSINESS_APIKEY = os.environ.get('WHATSAPP_BUSINESS_APIKEY', '')
WHATSAPP_CLIENTS_APIKEYS = os.environ.get('WHATSAPP_CLIENTS_APIKEYS', '')

# ==================== MODELS ====================

# Product Categories
CATEGORIES = [
    "Galletas",
    "Chocolates", 
    "Helados",
    "Cafés",
    "Cárnicos",
    "Cuidado Personal",
    "Limpieza del Hogar",
    "Alimentos Básicos",
    "Delicatessen",
    "Moda"
]

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    category: str
    price: float
    stock: int
    min_stock: int = 10
    cost: float = 0  # Costo de compra
    supplier: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(COLOMBIA_TZ))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(COLOMBIA_TZ))

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    category: str
    price: float
    stock: int
    min_stock: int = 10
    cost: float = 0
    supplier: Optional[str] = ""

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    min_stock: Optional[int] = None
    cost: Optional[float] = None
    supplier: Optional[str] = None

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    address: Optional[str] = ""
    email: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(COLOMBIA_TZ))

class CustomerCreate(BaseModel):
    name: str
    phone: str
    address: Optional[str] = ""
    email: Optional[str] = ""

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None

class SaleItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float
    subtotal: float

class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: Optional[str] = None
    customer_name: str
    items: List[SaleItem]
    total: float
    payment_method: str = "Efectivo"
    status: str = "Completado"
    notes: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(COLOMBIA_TZ))

class SaleCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    items: List[SaleItem]
    total: float
    payment_method: str = "Efectivo"
    notes: Optional[str] = ""

# ==================== ORDER MODELS ====================

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float
    subtotal: float

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"ORD-{datetime.now(COLOMBIA_TZ).strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}")
    customer_name: str
    customer_phone: str
    customer_address: Optional[str] = ""
    customer_email: Optional[str] = ""
    items: List[OrderItem]
    total: float
    notes: Optional[str] = ""
    status: str = "Pendiente"  # Pendiente, Confirmado, En Preparación, Entregado, Cancelado
    created_at: datetime = Field(default_factory=lambda: datetime.now(COLOMBIA_TZ))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(COLOMBIA_TZ))

class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_address: Optional[str] = ""
    customer_email: Optional[str] = ""
    items: List[OrderItem]
    total: float
    notes: Optional[str] = ""

class OrderStatusUpdate(BaseModel):
    status: str

# ==================== PURCHASE MODELS (COMPRAS) ====================

class PurchaseItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    cost: float  # Costo unitario de compra
    subtotal: float

class Purchase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    purchase_number: str = Field(default_factory=lambda: f"COMP-{datetime.now(COLOMBIA_TZ).strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}")
    supplier: str
    items: List[PurchaseItem]
    total: float
    notes: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(COLOMBIA_TZ))

class PurchaseCreate(BaseModel):
    supplier: str
    items: List[PurchaseItem]
    total: float
    notes: Optional[str] = ""

# ==================== HELPER FUNCTIONS ====================

def datetime_to_str(dt):
    """Convert datetime to ISO string for MongoDB"""
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt

def str_to_datetime(dt_str):
    """Convert ISO string to datetime"""
    if isinstance(dt_str, str):
        return datetime.fromisoformat(dt_str)
    return dt_str

def normalize_phone_number(phone: str) -> str:
    """Normalize phone number to Colombia international format (57XXXXXXXXXX)"""
    if not phone:
        return phone
    
    # Remove all non-digit characters
    cleaned = ''.join(filter(str.isdigit, phone))
    
    # If starts with 57, return as is
    if cleaned.startswith('57'):
        return cleaned
    
    # If starts with 0, remove it (Colombian mobile format)
    if cleaned.startswith('0'):
        cleaned = cleaned[1:]
    
    # Add Colombia code (57)
    return f"57{cleaned}"

async def send_whatsapp_message(phone: str, message: str):
    """Send WhatsApp message using Whapi.cloud or CallMeBot API"""
    try:
        # Use Whapi.cloud if configured
        if WHATSAPP_API_PROVIDER == 'whapi' and WHAPI_TOKEN:
            url = "https://gate.whapi.cloud/messages/text"
            headers = {
                "Authorization": f"Bearer {WHAPI_TOKEN}",
                "Content-Type": "application/json"
            }
            data = {
                "to": phone,
                "body": message
            }
            
            response = requests.post(url, json=data, headers=headers, timeout=10)
            
            if response.status_code in [200, 201]:
                logger.info(f"✅ WhatsApp ENVIADO a {phone} (Whapi.cloud)")
                return True
            else:
                logger.error(f"❌ Error Whapi.cloud a {phone}: {response.status_code} - {response.text}")
                return False
        
        # Fallback to CallMeBot
        else:
            # Get API key for this phone number
            api_key = None
            
            # Check if it's the business phone
            if phone == WHATSAPP_PHONE and WHATSAPP_BUSINESS_APIKEY:
                api_key = WHATSAPP_BUSINESS_APIKEY
            else:
                # Check client API keys
                if WHATSAPP_CLIENTS_APIKEYS:
                    clients_keys = {}
                    for pair in WHATSAPP_CLIENTS_APIKEYS.split(','):
                        if ':' in pair:
                            client_phone, client_key = pair.strip().split(':')
                            clients_keys[client_phone] = client_key
                    api_key = clients_keys.get(phone)
            
            # If no API key, just log (for testing without real API)
            if not api_key:
                logger.info(f"WhatsApp to {phone} (SIN API KEY - SOLO LOG): {message}")
                return True
            
            # Send via CallMeBot API
            import urllib.parse
            encoded_message = urllib.parse.quote(message)
            url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={encoded_message}&apikey={api_key}"
            
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                logger.info(f"✅ WhatsApp ENVIADO a {phone} (CallMeBot)")
                return True
            else:
                logger.error(f"❌ Error enviando WhatsApp a {phone}: {response.status_code} - {response.text}")
                return False
            
    except Exception as e:
        logger.error(f"❌ Error enviando WhatsApp a {phone}: {e}")
        return False

# ==================== PRODUCTS API ====================

@api_router.get("/categories")
async def get_categories():
    """Get all available categories"""
    return {"categories": CATEGORIES}

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate):
    """Create a new product"""
    product = Product(**product_data.model_dump())
    doc = product.model_dump()
    doc['created_at'] = datetime_to_str(doc['created_at'])
    doc['updated_at'] = datetime_to_str(doc['updated_at'])
    
    await db.products.insert_one(doc)
    return product

@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    low_stock: bool = False
):
    """Get all products with optional filters"""
    query = {}
    
    if category:
        query['category'] = category
    
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'description': {'$regex': search, '$options': 'i'}}
        ]
    
    if low_stock:
        query['$expr'] = {'$lte': ['$stock', '$min_stock']}
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    
    for product in products:
        product['created_at'] = str_to_datetime(product['created_at'])
        product['updated_at'] = str_to_datetime(product['updated_at'])
    
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    """Get a specific product"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    product['created_at'] = str_to_datetime(product['created_at'])
    product['updated_at'] = str_to_datetime(product['updated_at'])
    
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductUpdate):
    """Update a product"""
    update_data = {k: v for k, v in product_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    update_data['updated_at'] = datetime_to_str(datetime.now(COLOMBIA_TZ))
    
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    updated_product = await db.products.find_one({"id": product_id}, {"_id": 0})
    updated_product['created_at'] = str_to_datetime(updated_product['created_at'])
    updated_product['updated_at'] = str_to_datetime(updated_product['updated_at'])
    
    return updated_product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    """Delete a product"""
    result = await db.products.delete_one({"id": product_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return {"message": "Producto eliminado exitosamente"}

# ==================== CUSTOMERS API ====================

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate):
    """Create a new customer"""
    customer_dict = customer_data.model_dump()
    
    # Normalize phone number to Colombia format (+57)
    if customer_dict.get('phone'):
        customer_dict['phone'] = normalize_phone_number(customer_dict['phone'])
    
    customer = Customer(**customer_dict)
    doc = customer.model_dump()
    doc['created_at'] = datetime_to_str(doc['created_at'])
    
    await db.customers.insert_one(doc)
    return customer

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(search: Optional[str] = None):
    """Get all customers"""
    query = {}
    
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'phone': {'$regex': search, '$options': 'i'}}
        ]
    
    customers = await db.customers.find(query, {"_id": 0}).to_list(1000)
    
    for customer in customers:
        customer['created_at'] = str_to_datetime(customer['created_at'])
    
    return customers

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str):
    """Get a specific customer"""
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    customer['created_at'] = str_to_datetime(customer['created_at'])
    
    return customer

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_data: CustomerUpdate):
    """Update a customer"""
    update_data = {k: v for k, v in customer_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    # Normalize phone number if provided
    if 'phone' in update_data and update_data['phone']:
        update_data['phone'] = normalize_phone_number(update_data['phone'])
    
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    updated_customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    updated_customer['created_at'] = str_to_datetime(updated_customer['created_at'])
    
    return updated_customer

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    """Delete a customer"""
    result = await db.customers.delete_one({"id": customer_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return {"message": "Cliente eliminado exitosamente"}

# ==================== SALES API ====================

@api_router.post("/sales", response_model=Sale)
async def create_sale(sale_data: SaleCreate):
    """Create a new sale and update inventory"""
    sale = Sale(**sale_data.model_dump())
    
    # Update product stock
    for item in sale.items:
        product = await db.products.find_one({"id": item.product_id})
        if product:
            new_stock = product['stock'] - item.quantity
            await db.products.update_one(
                {"id": item.product_id},
                {"$set": {"stock": new_stock}}
            )
            
            # Check if stock is low and send WhatsApp alert
            if new_stock <= product.get('min_stock', 10):
                message = f"⚠️ ALERTA NOVAVENTA: El producto '{item.product_name}' tiene stock bajo ({new_stock} unidades)"
                await send_whatsapp_message(WHATSAPP_PHONE, message)
    
    # Save sale
    doc = sale.model_dump()
    doc['created_at'] = datetime_to_str(doc['created_at'])
    await db.sales.insert_one(doc)
    
    # Send sale notification to business owner (3217366758)
    items_text = "\n".join([f"- {item.product_name} x{item.quantity}: ${item.subtotal:,.0f}" for item in sale.items])
    business_message = f"✅ NUEVA VENTA NOVAVENTA\nCliente: {sale.customer_name}\nTotal: ${sale.total:,.0f} COP\n\nProductos:\n{items_text}"
    await send_whatsapp_message(WHATSAPP_PHONE, business_message)
    
    # Send receipt/confirmation to customer via WhatsApp
    customer_phone = None
    if sale.customer_id:
        # Get customer phone from database
        customer = await db.customers.find_one({"id": sale.customer_id})
        if customer and customer.get('phone'):
            customer_phone = customer['phone']
    
    if customer_phone:
        # Format receipt for customer
        sale_date = datetime.now(COLOMBIA_TZ).strftime("%d/%m/%Y %H:%M")
        receipt_items = "\n".join([
            f"  {item.product_name}\n  {item.quantity} x ${item.price:,.0f} = ${item.subtotal:,.0f}"
            for item in sale.items
        ])
        
        customer_message = f"""
🧾 COMPROBANTE DE COMPRA
━━━━━━━━━━━━━━━━━━━━━━
NOVAVENTA
Fecha: {sale_date}

👤 Cliente: {sale.customer_name}

📦 PRODUCTOS:
{receipt_items}

━━━━━━━━━━━━━━━━━━━━━━
💰 TOTAL: ${sale.total:,.0f} COP
💳 Método de Pago: {sale.payment_method}

¡Gracias por tu compra! 🎉
Para consultas: {WHATSAPP_PHONE}
"""
        await send_whatsapp_message(customer_phone, customer_message.strip())
        logger.info(f"Comprobante enviado al cliente {sale.customer_name} ({customer_phone})")
    else:
        logger.info(f"Cliente sin teléfono registrado, no se envió comprobante")
    
    return sale

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    customer_id: Optional[str] = None
):
    """Get all sales with optional filters"""
    query = {}
    
    if customer_id:
        query['customer_id'] = customer_id
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query['$gte'] = start_date
        if end_date:
            date_query['$lte'] = end_date
        query['created_at'] = date_query
    
    sales = await db.sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for sale in sales:
        sale['created_at'] = str_to_datetime(sale['created_at'])
    
    return sales

@api_router.get("/sales/{sale_id}", response_model=Sale)
async def get_sale(sale_id: str):
    """Get a specific sale"""
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    sale['created_at'] = str_to_datetime(sale['created_at'])
    
    return sale

# ==================== ORDERS API (PEDIDOS) ====================

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    """Create a new order from customer (no reduce inventory until confirmed)"""
    # Normalize phone number
    order_dict = order_data.model_dump()
    if order_dict.get('customer_phone'):
        order_dict['customer_phone'] = normalize_phone_number(order_dict['customer_phone'])
    
    order = Order(**order_dict)
    
    # Save order
    doc = order.model_dump()
    doc['created_at'] = datetime_to_str(doc['created_at'])
    doc['updated_at'] = datetime_to_str(doc['updated_at'])
    await db.orders.insert_one(doc)
    
    # Send order notification to business
    items_text = "\n".join([f"- {item.product_name} x{item.quantity}: ${item.subtotal:,.0f}" for item in order.items])
    business_message = f"🔔 NUEVO PEDIDO #{order.order_number}\n\n👤 Cliente: {order.customer_name}\n📱 Teléfono: {order.customer_phone}\n📍 Dirección: {order.customer_address or 'No especificada'}\n\n📦 Productos:\n{items_text}\n\n💰 Total: ${order.total:,.0f} COP\n\n⚠️ Estado: {order.status}"
    await send_whatsapp_message(WHATSAPP_PHONE, business_message)
    
    # Send confirmation to customer
    customer_message = f"✅ PEDIDO RECIBIDO - NOVAVENTA\n\nGracias {order.customer_name}!\n\n📋 Número de pedido: #{order.order_number}\n💰 Total: ${order.total:,.0f} COP\n\n📦 Productos:\n{items_text}\n\nTu pedido está pendiente de confirmación.\nTe notificaremos cuando esté listo.\n\n📞 Consultas: {WHATSAPP_PHONE[2:]}"
    await send_whatsapp_message(order.customer_phone, customer_message)
    
    logger.info(f"Pedido creado: {order.order_number} por {order.customer_name}")
    
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(status: Optional[str] = None):
    """Get all orders with optional status filter"""
    query = {}
    if status:
        query['status'] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for order in orders:
        order['created_at'] = str_to_datetime(order['created_at'])
        order['updated_at'] = str_to_datetime(order['updated_at'])
    
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Get a specific order"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    order['created_at'] = str_to_datetime(order['created_at'])
    order['updated_at'] = str_to_datetime(order['updated_at'])
    
    return order

@api_router.put("/orders/{order_id}/status", response_model=Order)
async def update_order_status(order_id: str, status_data: OrderStatusUpdate):
    """Update order status and send notifications"""
    new_status = status_data.status
    
    # Validate status
    valid_statuses = ["Pendiente", "Confirmado", "En Preparación", "Entregado", "Cancelado"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Estado inválido")
    
    # Get order
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    old_status = order['status']
    
    # Update status
    update_data = {
        'status': new_status,
        'updated_at': datetime_to_str(datetime.now(COLOMBIA_TZ))
    }
    
    # If confirming order, reduce inventory
    if new_status == "Confirmado" and old_status == "Pendiente":
        for item in order['items']:
            product = await db.products.find_one({"id": item['product_id']})
            if product:
                new_stock = product['stock'] - item['quantity']
                await db.products.update_one(
                    {"id": item['product_id']},
                    {"$set": {"stock": new_stock}}
                )
                
                # Check low stock
                if new_stock <= product.get('min_stock', 10):
                    alert_message = f"⚠️ ALERTA NOVAVENTA: El producto '{item['product_name']}' tiene stock bajo ({new_stock} unidades)"
                    await send_whatsapp_message(WHATSAPP_PHONE, alert_message)
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Send notification to customer
    status_messages = {
        "Confirmado": f"✅ PEDIDO CONFIRMADO\n\n📋 Pedido #{order['order_number']}\n\nTu pedido ha sido confirmado y está en preparación.\n\nTe notificaremos cuando esté listo para entrega. 📦",
        "En Preparación": f"📦 PEDIDO EN PREPARACIÓN\n\n📋 Pedido #{order['order_number']}\n\nEstamos preparando tu pedido.\nPronto estará listo! ⏱️",
        "Entregado": f"🎉 PEDIDO ENTREGADO\n\n📋 Pedido #{order['order_number']}\n\n¡Gracias por tu compra en NOVAVENTA!\n\nEsperamos que disfrutes tus productos. 😊\n\nVuelve pronto! 🛍️",
        "Cancelado": f"❌ PEDIDO CANCELADO\n\n📋 Pedido #{order['order_number']}\n\nTu pedido ha sido cancelado.\n\nSi tienes dudas, contáctanos: {WHATSAPP_PHONE[2:]}"
    }
    
    if new_status in status_messages:
        await send_whatsapp_message(order['customer_phone'], status_messages[new_status])
    
    # Get updated order
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    updated_order['created_at'] = str_to_datetime(updated_order['created_at'])
    updated_order['updated_at'] = str_to_datetime(updated_order['updated_at'])
    
    logger.info(f"Pedido {order['order_number']} actualizado: {old_status} → {new_status}")
    
    return updated_order

@api_router.get("/orders/stats/summary")
async def get_orders_stats():
    """Get orders statistics"""
    # Count by status
    pending = await db.orders.count_documents({"status": "Pendiente"})
    confirmed = await db.orders.count_documents({"status": "Confirmado"})
    preparing = await db.orders.count_documents({"status": "En Preparación"})
    delivered = await db.orders.count_documents({"status": "Entregado"})
    cancelled = await db.orders.count_documents({"status": "Cancelado"})
    
    # Today's orders
    now = datetime.now(COLOMBIA_TZ)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders = await db.orders.count_documents({
        "created_at": {"$gte": datetime_to_str(today_start)}
    })
    
    return {
        "by_status": {
            "pendiente": pending,
            "confirmado": confirmed,
            "en_preparacion": preparing,
            "entregado": delivered,
            "cancelado": cancelled
        },
        "today": today_orders,
        "total": pending + confirmed + preparing + delivered + cancelled
    }

# ==================== PURCHASES API (COMPRAS) ====================

@api_router.post("/purchases", response_model=Purchase)
async def create_purchase(purchase_data: PurchaseCreate):
    """Create a new purchase and update inventory"""
    purchase = Purchase(**purchase_data.model_dump())
    
    # Update product stock and cost
    for item in purchase.items:
        product = await db.products.find_one({"id": item.product_id})
        if product:
            new_stock = product['stock'] + item.quantity
            
            # Update product with new stock and cost
            await db.products.update_one(
                {"id": item.product_id},
                {"$set": {
                    "stock": new_stock,
                    "cost": item.cost  # Actualizar costo de compra
                }}
            )
    
    # Save purchase
    doc = purchase.model_dump()
    doc['created_at'] = datetime_to_str(doc['created_at'])
    await db.purchases.insert_one(doc)
    
    logger.info(f"Compra registrada: {purchase.purchase_number} - {purchase.supplier}")
    
    return purchase

@api_router.get("/purchases", response_model=List[Purchase])
async def get_purchases():
    """Get all purchases"""
    purchases = await db.purchases.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for purchase in purchases:
        purchase['created_at'] = str_to_datetime(purchase['created_at'])
    
    return purchases

@api_router.get("/purchases/{purchase_id}", response_model=Purchase)
async def get_purchase(purchase_id: str):
    """Get a specific purchase"""
    purchase = await db.purchases.find_one({"id": purchase_id}, {"_id": 0})
    
    if not purchase:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    purchase['created_at'] = str_to_datetime(purchase['created_at'])
    
    return purchase

# ==================== INVENTORY REPORTS API ====================

@api_router.get("/reports/inventory")
async def get_inventory_report():
    """Get current inventory report with valuation"""
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    
    total_items = 0
    total_value = 0
    low_stock_count = 0
    by_category = {}
    
    inventory_items = []
    
    for product in products:
        cost = product.get('cost', product.get('price', 0))  # Usar costo o precio si no hay costo
        stock = product['stock']
        value = stock * cost
        
        total_items += stock
        total_value += value
        
        if stock <= product.get('min_stock', 10):
            low_stock_count += 1
        
        # Group by category
        category = product['category']
        if category not in by_category:
            by_category[category] = {
                'items': 0,
                'value': 0,
                'products': 0
            }
        by_category[category]['items'] += stock
        by_category[category]['value'] += value
        by_category[category]['products'] += 1
        
        inventory_items.append({
            'id': product['id'],
            'name': product['name'],
            'category': product['category'],
            'stock': stock,
            'cost': cost,
            'price': product['price'],
            'value': value,
            'supplier': product.get('supplier', '')
        })
    
    # Sort by value descending
    inventory_items.sort(key=lambda x: x['value'], reverse=True)
    
    return {
        "summary": {
            "total_products": len(products),
            "total_items": total_items,
            "total_value": total_value,
            "low_stock_count": low_stock_count
        },
        "by_category": by_category,
        "items": inventory_items
    }

@api_router.get("/reports/inventory/export")
async def export_inventory_to_excel():
    """Export inventory report to Excel"""
    # Get inventory data
    report = await get_inventory_report()
    
    # Create Excel workbook
    wb = Workbook()
    
    # Sheet 1: Summary
    ws_summary = wb.active
    ws_summary.title = "Resumen"
    
    header_fill = PatternFill(start_color="FFB6D7", end_color="FFB6D7", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    
    ws_summary['A1'] = "REPORTE DE INVENTARIO VALORIZADO"
    ws_summary['A1'].font = Font(bold=True, size=14)
    ws_summary.merge_cells('A1:D1')
    
    ws_summary['A3'] = "Fecha:"
    ws_summary['B3'] = datetime.now(COLOMBIA_TZ).strftime("%d/%m/%Y %H:%M")
    
    ws_summary['A5'] = "RESUMEN GENERAL"
    ws_summary['A5'].font = header_font
    ws_summary['A5'].fill = header_fill
    ws_summary.merge_cells('A5:B5')
    
    ws_summary['A6'] = "Total Productos:"
    ws_summary['B6'] = report['summary']['total_products']
    ws_summary['A7'] = "Total Unidades:"
    ws_summary['B7'] = report['summary']['total_items']
    ws_summary['A8'] = "Valor Total Inventario:"
    ws_summary['B8'] = f"${report['summary']['total_value']:,.0f} COP"
    ws_summary['A9'] = "Productos con Stock Bajo:"
    ws_summary['B9'] = report['summary']['low_stock_count']
    
    # By Category
    ws_summary['A11'] = "POR CATEGORÍA"
    ws_summary['A11'].font = header_font
    ws_summary['A11'].fill = header_fill
    ws_summary.merge_cells('A11:D11')
    
    headers_cat = ['Categoría', 'Productos', 'Unidades', 'Valor Total']
    for col, header in enumerate(headers_cat, start=1):
        cell = ws_summary.cell(row=12, column=col)
        cell.value = header
        cell.font = header_font
        cell.fill = header_fill
    
    row = 13
    for category, data in report['by_category'].items():
        ws_summary[f'A{row}'] = category
        ws_summary[f'B{row}'] = data['products']
        ws_summary[f'C{row}'] = data['items']
        ws_summary[f'D{row}'] = f"${data['value']:,.0f}"
        row += 1
    
    # Sheet 2: Detailed Inventory
    ws_detail = wb.create_sheet("Inventario Detallado")
    
    ws_detail['A1'] = "INVENTARIO DETALLADO VALORIZADO"
    ws_detail['A1'].font = Font(bold=True, size=14)
    ws_detail.merge_cells('A1:H1')
    
    headers_detail = ['Producto', 'Categoría', 'Stock', 'Costo Unit.', 'Precio Venta', 'Valor Total', 'Margen %', 'Proveedor']
    for col, header in enumerate(headers_detail, start=1):
        cell = ws_detail.cell(row=3, column=col)
        cell.value = header
        cell.font = header_font
        cell.fill = header_fill
    
    row = 4
    for item in report['items']:
        margin = ((item['price'] - item['cost']) / item['cost'] * 100) if item['cost'] > 0 else 0
        ws_detail[f'A{row}'] = item['name']
        ws_detail[f'B{row}'] = item['category']
        ws_detail[f'C{row}'] = item['stock']
        ws_detail[f'D{row}'] = f"${item['cost']:,.0f}"
        ws_detail[f'E{row}'] = f"${item['price']:,.0f}"
        ws_detail[f'F{row}'] = f"${item['value']:,.0f}"
        ws_detail[f'G{row}'] = f"{margin:.1f}%"
        ws_detail[f'H{row}'] = item['supplier']
        row += 1
    
    # Adjust column widths
    for ws in [ws_summary, ws_detail]:
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width
    
    # Save to BytesIO
    excel_file = BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)
    
    filename = f"inventario_valorizado_{datetime.now(COLOMBIA_TZ).strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== DASHBOARD & STATS API ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    now = datetime.now(COLOMBIA_TZ)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    # Today's sales
    today_sales = await db.sales.find({
        "created_at": {"$gte": datetime_to_str(today_start)}
    }).to_list(1000)
    today_total = sum(sale['total'] for sale in today_sales)
    
    # Week's sales
    week_sales = await db.sales.find({
        "created_at": {"$gte": datetime_to_str(week_start)}
    }).to_list(1000)
    week_total = sum(sale['total'] for sale in week_sales)
    
    # Month's sales
    month_sales = await db.sales.find({
        "created_at": {"$gte": datetime_to_str(month_start)}
    }).to_list(1000)
    month_total = sum(sale['total'] for sale in month_sales)
    
    # Total products
    total_products = await db.products.count_documents({})
    
    # Low stock products
    low_stock_products = await db.products.find({
        "$expr": {"$lte": ["$stock", "$min_stock"]}
    }).to_list(100)
    
    # Total customers
    total_customers = await db.customers.count_documents({})
    
    return {
        "today": {
            "sales": len(today_sales),
            "total": today_total
        },
        "week": {
            "sales": len(week_sales),
            "total": week_total
        },
        "month": {
            "sales": len(month_sales),
            "total": month_total
        },
        "products": {
            "total": total_products,
            "low_stock": len(low_stock_products)
        },
        "customers": total_customers
    }

# ==================== REPORTS API ====================

@api_router.get("/reports/sales")
async def get_sales_report(
    period: str = Query(..., regex="^(daily|weekly|monthly)$"),
    date: Optional[str] = None
):
    """Get sales report for a specific period"""
    now = datetime.now(COLOMBIA_TZ) if not date else datetime.fromisoformat(date).replace(tzinfo=COLOMBIA_TZ)
    
    if period == "daily":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=1)
    elif period == "weekly":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=7)
    else:  # monthly
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            end_date = start_date.replace(year=now.year + 1, month=1)
        else:
            end_date = start_date.replace(month=now.month + 1)
    
    # Get sales in period
    sales = await db.sales.find({
        "created_at": {
            "$gte": datetime_to_str(start_date),
            "$lt": datetime_to_str(end_date)
        }
    }).to_list(10000)
    
    # Calculate statistics
    total_sales = len(sales)
    total_revenue = sum(sale['total'] for sale in sales)
    
    # Products sold
    products_sold = {}
    for sale in sales:
        for item in sale['items']:
            if item['product_id'] not in products_sold:
                products_sold[item['product_id']] = {
                    'name': item['product_name'],
                    'quantity': 0,
                    'revenue': 0
                }
            products_sold[item['product_id']]['quantity'] += item['quantity']
            products_sold[item['product_id']]['revenue'] += item['subtotal']
    
    # Sort by quantity
    top_products = sorted(
        products_sold.values(),
        key=lambda x: x['quantity'],
        reverse=True
    )[:10]
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_sales": total_sales,
        "total_revenue": total_revenue,
        "average_sale": total_revenue / total_sales if total_sales > 0 else 0,
        "top_products": top_products
    }

@api_router.get("/reports/export")
async def export_report_to_excel(
    period: str = Query(..., regex="^(daily|weekly|monthly)$"),
    date: Optional[str] = None
):
    """Export sales report to Excel"""
    # Get report data
    report_data = await get_sales_report(period, date)
    
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = f"Reporte {period.capitalize()}"
    
    # Styles
    header_fill = PatternFill(start_color="FFB6D7", end_color="FFB6D7", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    
    # Header
    ws['A1'] = "REPORTE DE VENTAS NOVAVENTA"
    ws['A1'].font = Font(bold=True, size=14)
    ws.merge_cells('A1:D1')
    
    # Report info
    ws['A3'] = "Período:"
    ws['B3'] = period.capitalize()
    ws['A4'] = "Fecha Inicio:"
    ws['B4'] = report_data['start_date']
    ws['A5'] = "Fecha Fin:"
    ws['B5'] = report_data['end_date']
    
    # Summary
    ws['A7'] = "RESUMEN"
    ws['A7'].font = header_font
    ws['A7'].fill = header_fill
    ws.merge_cells('A7:B7')
    
    ws['A8'] = "Total Ventas:"
    ws['B8'] = report_data['total_sales']
    ws['A9'] = "Ingresos Totales:"
    ws['B9'] = f"${report_data['total_revenue']:,.0f} COP"
    ws['A10'] = "Venta Promedio:"
    ws['B10'] = f"${report_data['average_sale']:,.0f} COP"
    
    # Top Products
    ws['A12'] = "PRODUCTOS MÁS VENDIDOS"
    ws['A12'].font = header_font
    ws['A12'].fill = header_fill
    ws.merge_cells('A12:D12')
    
    headers = ['Producto', 'Cantidad', 'Ingresos', 'Promedio']
    for col, header in enumerate(headers, start=1):
        cell = ws.cell(row=13, column=col)
        cell.value = header
        cell.font = header_font
        cell.fill = header_fill
    
    row = 14
    for product in report_data['top_products']:
        ws[f'A{row}'] = product['name']
        ws[f'B{row}'] = product['quantity']
        ws[f'C{row}'] = f"${product['revenue']:,.0f}"
        ws[f'D{row}'] = f"${product['revenue']/product['quantity']:,.0f}"
        row += 1
    
    # Adjust column widths
    ws.column_dimensions['A'].width = 30
    ws.column_dimensions['B'].width = 15
    ws.column_dimensions['C'].width = 15
    ws.column_dimensions['D'].width = 15
    
    # Save to BytesIO
    excel_file = BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)
    
    filename = f"reporte_{period}_{datetime.now(COLOMBIA_TZ).strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "NOVAVENTA API", "status": "active"}

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
