from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import aiofiles
import requests
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import re
from urllib.parse import urlparse
import base64


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Mount static files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Prohibited keywords list (Spanish)
PROHIBITED_KEYWORDS = [
    'porno', 'pornografia', 'xxx', 'sexo', 'escort', 'prostituta', 'trata', 'blancas',
    'estafa', 'fraude', 'piramidal', 'ponzi', 'scam', 'hack', 'virus', 'malware',
    'droga', 'cocaina', 'marihuana', 'arma', 'armas', 'niños', 'menores', 'infantil',
    'abuso', 'violencia', 'terror', 'terrorismo', 'bomba', 'explosivo'
]

# Define Models
class LinkSubmission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    location: str = Field(..., min_length=2, max_length=200)
    website_url: str = Field(..., min_length=5, max_length=500)
    payment_screenshot: Optional[str] = None
    favicon_url: Optional[str] = None
    status: str = Field(default="pending")  # pending, approved, rejected
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approved_at: Optional[datetime] = None

    @validator('website_url')
    def validate_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            v = 'https://' + v
        parsed = urlparse(v)
        if not parsed.netloc:
            raise ValueError('URL inválida')
        return v

    @validator('phone')
    def validate_phone(cls, v):
        # Remove spaces and special characters
        cleaned = re.sub(r'[^\d+]', '', v)
        if len(cleaned) < 10:
            raise ValueError('Número de teléfono inválido')
        return cleaned

class LinkSubmissionCreate(BaseModel):
    owner_name: str
    phone: str
    location: str
    website_url: str

class LinkUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = None

class LinkEdit(BaseModel):
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    website_url: Optional[str] = None

    @validator('website_url')
    def validate_url(cls, v):
        if v is not None:
            if not v.startswith(('http://', 'https://')):
                v = 'https://' + v
            parsed = urlparse(v)
            if not parsed.netloc:
                raise ValueError('URL inválida')
        return v

    @validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            # Remove spaces and special characters
            cleaned = re.sub(r'[^\d+]', '', v)
            if len(cleaned) < 10:
                raise ValueError('Número de teléfono inválido')
            return cleaned
        return v

def check_prohibited_content(text: str) -> bool:
    """Check if text contains prohibited keywords"""
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in PROHIBITED_KEYWORDS)

async def extract_favicon(url: str) -> Optional[str]:
    """Extract favicon from website"""
    try:
        # Try common favicon locations
        favicon_urls = [
            f"{url}/favicon.ico",
            f"{url}/apple-touch-icon.png",
            f"{url}/android-chrome-192x192.png"
        ]
        
        for favicon_url in favicon_urls:
            try:
                response = requests.get(favicon_url, timeout=10, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
                if response.status_code == 200:
                    return favicon_url
            except:
                continue
        
        # Try to get favicon from main page
        try:
            response = requests.get(url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            if response.status_code == 200:
                import re
                # Look for favicon link in HTML
                favicon_match = re.search(r'<link[^>]*rel=["\'](?:shortcut )?icon["\'][^>]*href=["\']([^"\']+)', response.text, re.IGNORECASE)
                if favicon_match:
                    favicon_path = favicon_match.group(1)
                    if favicon_path.startswith('//'):
                        return f"https:{favicon_path}"
                    elif favicon_path.startswith('/'):
                        parsed_url = urlparse(url)
                        return f"{parsed_url.scheme}://{parsed_url.netloc}{favicon_path}"
                    elif not favicon_path.startswith('http'):
                        return f"{url.rstrip('/')}/{favicon_path}"
                    return favicon_path
        except:
            pass
            
    except Exception as e:
        print(f"Error extracting favicon: {e}")
    
    return None

# Routes
@api_router.get("/")
async def root():
    return {"message": "PAGINA DEL LINK API"}

@api_router.post("/links/submit")
async def submit_link(
    owner_name: str = Form(...),
    phone: str = Form(...),
    location: str = Form(...),
    website_url: str = Form(...),
    payment_screenshot: UploadFile = File(...)
):
    # Validate form data
    try:
        link_data = LinkSubmissionCreate(
            owner_name=owner_name,
            phone=phone,
            location=location,
            website_url=website_url
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Check for prohibited content
    text_to_check = f"{owner_name} {location} {website_url}"
    if check_prohibited_content(text_to_check):
        raise HTTPException(
            status_code=400, 
            detail="El contenido enviado contiene palabras prohibidas"
        )

    # Save payment screenshot
    screenshot_filename = None
    if payment_screenshot:
        file_extension = payment_screenshot.filename.split('.')[-1] if '.' in payment_screenshot.filename else 'jpg'
        screenshot_filename = f"{uuid.uuid4()}.{file_extension}"
        screenshot_path = UPLOAD_DIR / screenshot_filename
        
        async with aiofiles.open(screenshot_path, 'wb') as f:
            content = await payment_screenshot.read()
            await f.write(content)

    # Extract favicon
    favicon_url = await extract_favicon(link_data.website_url)

    # Create link submission
    submission = LinkSubmission(
        **link_data.dict(),
        payment_screenshot=screenshot_filename,
        favicon_url=favicon_url
    )

    # Save to database
    await db.link_submissions.insert_one(submission.dict())
    
    return {"message": "Link enviado correctamente. Será revisado antes de ser aprobado.", "id": submission.id}

@api_router.get("/links", response_model=List[LinkSubmission])
async def get_links(status: str = "approved"):
    """Get links by status"""
    links = await db.link_submissions.find({"status": status}).to_list(1000)
    return [LinkSubmission(**link) for link in links]

@api_router.get("/links/all", response_model=List[LinkSubmission])
async def get_all_links():
    """Get all links for admin"""
    links = await db.link_submissions.find().sort("created_at", -1).to_list(1000)
    return [LinkSubmission(**link) for link in links]

@api_router.put("/links/{link_id}")
async def update_link_status(link_id: str, update: LinkUpdate):
    """Update link status (admin only)"""
    update_data = {"status": update.status}
    
    if update.status == "approved":
        update_data["approved_at"] = datetime.now(timezone.utc)
    elif update.status == "rejected" and update.rejection_reason:
        update_data["rejection_reason"] = update.rejection_reason

    result = await db.link_submissions.update_one(
        {"id": link_id}, 
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Link no encontrado")
    
    return {"message": f"Link {update.status} correctamente"}

@api_router.put("/links/{link_id}/edit")
async def edit_link(link_id: str, update: LinkEdit):
    """Edit link information (admin only)"""
    # Get the current link
    current_link = await db.link_submissions.find_one({"id": link_id})
    if not current_link:
        raise HTTPException(status_code=404, detail="Link no encontrado")
    
    # Prepare update data (only include fields that were provided)
    update_data = {}
    for field, value in update.dict().items():
        if value is not None:
            update_data[field] = value
    
    # If website URL was updated, try to extract new favicon
    if "website_url" in update_data:
        # Check for prohibited content in the new URL
        text_to_check = f"{update_data.get('owner_name', current_link.get('owner_name', ''))} {update_data.get('location', current_link.get('location', ''))} {update_data['website_url']}"
        if check_prohibited_content(text_to_check):
            raise HTTPException(
                status_code=400, 
                detail="El contenido actualizado contiene palabras prohibidas"
            )
            
        # Extract favicon for the new URL
        favicon_url = await extract_favicon(update_data["website_url"])
        if favicon_url:
            update_data["favicon_url"] = favicon_url

    result = await db.link_submissions.update_one(
        {"id": link_id}, 
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Link no encontrado")
    
    return {"message": "Link actualizado correctamente"}

@api_router.get("/links/stats")
async def get_stats():
    """Get statistics"""
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    stats = await db.link_submissions.aggregate(pipeline).to_list(None)
    
    total = sum(stat["count"] for stat in stats)
    revenue = len([s for s in stats if s["_id"] == "approved"]) * 1  # $1 per link
    
    return {
        "stats": stats,
        "total_submissions": total,
        "estimated_revenue": revenue
    }

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