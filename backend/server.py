from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse, RedirectResponse
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

# Prohibited keywords list (Spanish) - Updated to avoid false positives
PROHIBITED_KEYWORDS = [
    'pornografia', 'xxx', 'sexo', 'escort', 'prostituta', 'trata de blancas',
    'estafa', 'fraude', 'piramidal', 'ponzi', 'scam', 'hack', 'virus', 'malware',
    'droga', 'cocaina', 'marihuana', 'armas de fuego', 'armas blancas', 'menores de edad', 'abuso infantil',
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
    custom_logo: Optional[str] = None
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
    """Check if text contains prohibited keywords as whole words"""
    import re
    
    text_lower = text.lower()
    
    # Use word boundaries to match whole words only
    for keyword in PROHIBITED_KEYWORDS:
        # Create pattern that matches whole words only
        pattern = r'\b' + re.escape(keyword) + r'\b'
        if re.search(pattern, text_lower):
            return True
    return False

async def extract_best_logo(url: str) -> Optional[str]:
    """Extract the best available logo from website"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        # Get the main page content
        response = requests.get(url, timeout=15, headers=headers)
        if response.status_code != 200:
            return None
            
        html_content = response.text.lower()
        
        # List to store potential logo URLs with their priorities
        logo_candidates = []
        
        # 1. Look for Apple Touch Icons (usually high quality)
        apple_touch_patterns = [
            r'<link[^>]*rel=["\']apple-touch-icon[^"\']*["\'][^>]*href=["\']([^"\']+)',
            r'<link[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']apple-touch-icon',
        ]
        
        for pattern in apple_touch_patterns:
            matches = re.findall(pattern, html_content, re.IGNORECASE)
            for match in matches:
                logo_candidates.append((match, 5))  # High priority
        
        # 2. Look for Open Graph images (social media logos)
        og_pattern = r'<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)'
        og_matches = re.findall(og_pattern, html_content, re.IGNORECASE)
        for match in og_matches:
            logo_candidates.append((match, 4))  # Medium-high priority
        
        # 3. Look for high-resolution favicons
        favicon_patterns = [
            r'<link[^>]*rel=["\']icon["\'][^>]*href=["\']([^"\']+)["\'][^>]*sizes=["\'][^"\']*(?:192|512|256|128)',
            r'<link[^>]*sizes=["\'][^"\']*(?:192|512|256|128)[^"\']*["\'][^>]*href=["\']([^"\']+)',
        ]
        
        for pattern in favicon_patterns:
            matches = re.findall(pattern, html_content, re.IGNORECASE)
            for match in matches:
                logo_candidates.append((match, 4))
        
        # 4. Look for logo images in common locations
        logo_img_patterns = [
            r'<img[^>]*(?:class|id|alt)[^>]*logo[^>]*src=["\']([^"\']+)',
            r'<img[^>]*src=["\']([^"\']*logo[^"\']*)',
            r'<img[^>]*src=["\']([^"\']*brand[^"\']*)',
        ]
        
        for pattern in logo_img_patterns:
            matches = re.findall(pattern, html_content, re.IGNORECASE)
            for match in matches:
                logo_candidates.append((match, 3))  # Medium priority
        
        # 5. Standard favicon
        favicon_standard_patterns = [
            r'<link[^>]*rel=["\'](?:shortcut )?icon["\'][^>]*href=["\']([^"\']+)',
            r'<link[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\'](?:shortcut )?icon',
        ]
        
        for pattern in favicon_standard_patterns:
            matches = re.findall(pattern, html_content, re.IGNORECASE)
            for match in matches:
                logo_candidates.append((match, 2))  # Lower priority
        
        # 6. Try common logo locations
        common_logo_paths = [
            f"{url}/apple-touch-icon.png",
            f"{url}/apple-touch-icon-192x192.png",
            f"{url}/android-chrome-192x192.png",
            f"{url}/logo.png",
            f"{url}/logo.jpg",
            f"{url}/assets/logo.png",
            f"{url}/images/logo.png",
            f"{url}/img/logo.png",
        ]
        
        for logo_path in common_logo_paths:
            logo_candidates.append((logo_path, 1))  # Lowest priority
        
        # Remove duplicates and sort by priority
        seen = set()
        unique_candidates = []
        for logo_url, priority in logo_candidates:
            if logo_url not in seen:
                seen.add(logo_url)
                unique_candidates.append((logo_url, priority))
        
        # Sort by priority (highest first)
        unique_candidates.sort(key=lambda x: x[1], reverse=True)
        
        # Test each candidate URL
        for logo_url, priority in unique_candidates:
            try:
                # Make URL absolute
                if logo_url.startswith('//'):
                    logo_url = f"https:{logo_url}"
                elif logo_url.startswith('/'):
                    parsed_url = urlparse(url)
                    logo_url = f"{parsed_url.scheme}://{parsed_url.netloc}{logo_url}"
                elif not logo_url.startswith('http'):
                    logo_url = f"{url.rstrip('/')}/{logo_url.lstrip('/')}"
                
                # Test if the logo URL is accessible and is an image
                logo_response = requests.head(logo_url, timeout=8, headers=headers)
                if logo_response.status_code == 200:
                    content_type = logo_response.headers.get('content-type', '').lower()
                    if any(img_type in content_type for img_type in ['image/', 'png', 'jpg', 'jpeg', 'gif', 'webp']):
                        print(f"Found logo for {url}: {logo_url} (priority: {priority})")
                        return logo_url
                        
            except Exception as e:
                continue
        
        print(f"No suitable logo found for {url}")
        return None
        
    except Exception as e:
        print(f"Error extracting logo from {url}: {e}")
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
    payment_screenshot: UploadFile = File(...),
    custom_logo: UploadFile = File(None)
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

    # Save custom logo if provided
    logo_filename = None
    if custom_logo and custom_logo.filename:
        file_extension = custom_logo.filename.split('.')[-1] if '.' in custom_logo.filename else 'png'
        logo_filename = f"logo_{uuid.uuid4()}.{file_extension}"
        logo_path = UPLOAD_DIR / logo_filename
        
        async with aiofiles.open(logo_path, 'wb') as f:
            content = await custom_logo.read()
            await f.write(content)

    # Extract favicon only if no custom logo was provided
    favicon_url = None
    if not logo_filename:
        favicon_url = await extract_best_logo(link_data.website_url)

    # Create link submission
    submission = LinkSubmission(
        **link_data.dict(),
        payment_screenshot=screenshot_filename,
        favicon_url=favicon_url,
        custom_logo=logo_filename
    )

    # Save to database
    await db.link_submissions.insert_one(submission.dict())
    
    return {"message": "Link enviado correctamente. Será revisado antes de ser aprobado.", "id": submission.id}

@api_router.get("/links", response_model=List[LinkSubmission])
async def get_links(status: str = "approved"):
    """Get links by status"""
    links = await db.link_submissions.find({"status": status}).to_list(1000)
    return [LinkSubmission(**link) for link in links]

@api_router.get("/links/manage", response_model=List[LinkSubmission])
async def get_all_links_for_management():
    """Get all links grouped by status for management"""
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
            
        # Extract favicon for the new URL only if no custom logo exists
        if not current_link.get("custom_logo"):
            favicon_url = await extract_best_logo(update_data["website_url"])
            if favicon_url:
                update_data["favicon_url"] = favicon_url

    result = await db.link_submissions.update_one(
        {"id": link_id}, 
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Link no encontrado")
    
    return {"message": "Link actualizado correctamente"}

@api_router.put("/links/{link_id}/logo")
async def update_logo(
    link_id: str, 
    custom_logo: UploadFile = File(None),
    remove_logo: bool = False
):
    """Update or remove custom logo for a link (admin only)"""
    # Get the current link
    current_link = await db.link_submissions.find_one({"id": link_id})
    if not current_link:
        raise HTTPException(status_code=404, detail="Link no encontrado")
    
    update_data = {}
    
    if remove_logo:
        # Remove custom logo and get favicon instead
        update_data["custom_logo"] = None
        favicon_url = await extract_best_logo(current_link["website_url"])
        if favicon_url:
            update_data["favicon_url"] = favicon_url
    elif custom_logo and custom_logo.filename:
        # Save new custom logo
        file_extension = custom_logo.filename.split('.')[-1] if '.' in custom_logo.filename else 'png'
        logo_filename = f"logo_{uuid.uuid4()}.{file_extension}"
        logo_path = UPLOAD_DIR / logo_filename
        
        async with aiofiles.open(logo_path, 'wb') as f:
            content = await custom_logo.read()
            await f.write(content)
            
        update_data["custom_logo"] = logo_filename
        # Remove favicon when custom logo is added
        update_data["favicon_url"] = None
    
    if update_data:
        result = await db.link_submissions.update_one(
            {"id": link_id}, 
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Link no encontrado")
    
    return {"message": "Logo actualizado correctamente"}

@api_router.post("/links/refresh-logos")
async def refresh_all_logos():
    """Refresh logos for all approved links using the improved extraction"""
    try:
        # Get all approved links
        links = await db.link_submissions.find({"status": "approved"}).to_list(None)
        
        updated_count = 0
        for link in links:
            try:
                # Only update if they don't have a custom logo
                if not link.get("custom_logo"):
                    print(f"Refreshing logo for: {link['owner_name']} - {link['website_url']}")
                    
                    # Extract better logo
                    new_logo_url = await extract_best_logo(link["website_url"])
                    
                    if new_logo_url and new_logo_url != link.get("favicon_url"):
                        # Update the database
                        await db.link_submissions.update_one(
                            {"id": link["id"]}, 
                            {"$set": {"favicon_url": new_logo_url}}
                        )
                        print(f"✅ Updated logo for {link['owner_name']}: {new_logo_url}")
                        updated_count += 1
                    else:
                        print(f"⚪ No better logo found for {link['owner_name']}")
                        
            except Exception as e:
                print(f"❌ Error updating {link['owner_name']}: {e}")
                continue
        
        return {
            "message": f"Logos refreshed successfully. Updated {updated_count} links.",
            "updated_count": updated_count,
            "total_processed": len(links)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing logos: {str(e)}")

@api_router.post("/links/{link_id}/refresh-logo")
async def refresh_single_logo(link_id: str):
    """Refresh logo for a specific link"""
    try:
        # Get the link
        link = await db.link_submissions.find_one({"id": link_id})
        if not link:
            raise HTTPException(status_code=404, detail="Link no encontrado")
        
        # Extract better logo
        new_logo_url = await extract_best_logo(link["website_url"])
        
        if new_logo_url:
            # Update the database
            await db.link_submissions.update_one(
                {"id": link_id}, 
                {"$set": {"favicon_url": new_logo_url, "custom_logo": None}}
            )
            return {
                "message": "Logo actualizado correctamente",
                "new_logo_url": new_logo_url
            }
        else:
            return {
                "message": "No se encontró un logo mejor",
                "current_logo_url": link.get("favicon_url")
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing logo: {str(e)}")

@api_router.get("/admin/dashboard")
async def get_admin_dashboard():
    """Special endpoint for admin dashboard - bypasses all filters"""
    try:
        # Get ALL links regardless of status
        all_links = await db.link_submissions.find().sort("created_at", -1).to_list(None)
        
        # Get stats
        stats_pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        stats = await db.link_submissions.aggregate(stats_pipeline).to_list(None)
        
        total = len(all_links)
        approved_count = len([l for l in all_links if l.get("status") == "approved"])
        revenue = approved_count * 1  # $1 per link
        
        return {
            "links": [LinkSubmission(**link) for link in all_links],
            "stats": {
                "total_submissions": total,
                "approved": approved_count,
                "pending": len([l for l in all_links if l.get("status") == "pending"]),
                "rejected": len([l for l in all_links if l.get("status") == "rejected"]),
                "estimated_revenue": revenue,
                "raw_stats": stats
            },
            "success": True
        }
    except Exception as e:
        return {
            "error": str(e),
            "success": False
        }

@api_router.get("/admin/status")
async def get_admin_status_emergency():
    """Emergency endpoint for admin panel debugging"""
    try:
        # Get ALL links regardless of status
        all_links = await db.link_submissions.find().sort("created_at", -1).to_list(None)
        
        # Calculate stats
        approved = len([l for l in all_links if l.get("status") == "approved"])
        pending = len([l for l in all_links if l.get("status") == "pending"])
        rejected = len([l for l in all_links if l.get("status") == "rejected"])
        
        return {
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_links": len(all_links),
            "approved": approved,
            "pending": pending,
            "rejected": rejected,
            "revenue": approved,
            "links": [
                {
                    "id": link.get("id"),
                    "owner_name": link.get("owner_name"),
                    "website_url": link.get("website_url"),
                    "status": link.get("status"),
                    "created_at": link.get("created_at"),
                    "location": link.get("location"),
                    "phone": link.get("phone")
                }
                for link in all_links
            ],
            "html_admin": f"""
            <html>
            <head><title>ADMIN DIRECTO</title><meta charset="UTF-8"></head>
            <body style="font-family:Arial;margin:20px;">
                <h1 style="color:#dc3545;">🚨 PANEL ADMIN DIRECTO</h1>
                <div style="display:flex;gap:20px;margin:20px 0;">
                    <div style="background:#e3f2fd;padding:20px;border-radius:8px;text-align:center;">
                        <h2 style="margin:0;color:#1976d2;font-size:36px;">{len(all_links)}</h2>
                        <p style="margin:5px 0 0 0;color:#1976d2;">TOTAL</p>
                    </div>
                    <div style="background:#e8f5e8;padding:20px;border-radius:8px;text-align:center;">
                        <h2 style="margin:0;color:#388e3c;font-size:36px;">{approved}</h2>
                        <p style="margin:5px 0 0 0;color:#388e3c;">APROBADOS</p>
                    </div>
                    <div style="background:#fff3e0;padding:20px;border-radius:8px;text-align:center;">
                        <h2 style="margin:0;color:#f57c00;font-size:36px;">{pending}</h2>
                        <p style="margin:5px 0 0 0;color:#f57c00;">PENDIENTES</p>
                    </div>
                    <div style="background:#e8f5e8;padding:20px;border-radius:8px;text-align:center;">
                        <h2 style="margin:0;color:#388e3c;font-size:36px;">${approved}</h2>
                        <p style="margin:5px 0 0 0;color:#388e3c;">INGRESOS</p>
                    </div>
                </div>
                <h2>Links Pendientes ({pending}):</h2>
                {"".join([f'<div style="border:2px solid #ffc107;background:#fff3cd;padding:15px;margin:10px 0;border-radius:5px;"><h3>{l.get("owner_name","N/A")}</h3><p><b>URL:</b> {l.get("website_url","N/A")}</p><p><b>Tel:</b> {l.get("phone","N/A")}</p><button onclick="aprobar(\\"{l.get("id")}\\")" style="background:#28a745;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:5px;">✅ APROBAR</button><button onclick="rechazar(\\"{l.get("id")}\\")" style="background:#dc3545;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:5px;">❌ RECHAZAR</button></div>' for l in all_links if l.get("status") == "pending"]) if pending > 0 else "<p style='color:green;font-weight:bold;'>✅ NO HAY LINKS PENDIENTES</p>"}
                <script>
                async function aprobar(id) {{
                    if (!confirm('¿Aprobar este link?')) return;
                    try {{
                        const response = await fetch('/api/links/' + id, {{
                            method: 'PUT',
                            headers: {{'Content-Type': 'application/json'}},
                            body: JSON.stringify({{'status': 'approved'}})
                        }});
                        if (response.ok) {{
                            alert('✅ Link aprobado');
                            location.reload();
                        }} else {{
                            alert('❌ Error al aprobar');
                        }}
                    }} catch (e) {{
                        alert('❌ Error: ' + e.message);
                    }}
                }}
                async function rechazar(id) {{
                    if (!confirm('¿Rechazar este link?')) return;
                    try {{
                        const response = await fetch('/api/links/' + id, {{
                            method: 'PUT',
                            headers: {{'Content-Type': 'application/json'}},
                            body: JSON.stringify({{'status': 'rejected'}})
                        }});
                        if (response.ok) {{
                            alert('✅ Link rechazado');
                            location.reload();
                        }} else {{
                            alert('❌ Error al rechazar');
                        }}
                    }} catch (e) {{
                        alert('❌ Error: ' + e.message);
                    }}
                }}
                </script>
                <p style="text-align:center;margin-top:30px;">
                    <a href="https://linkverse-2.emergent.host" target="_blank">Ver página principal</a> | 
                    <button onclick="location.reload()" style="background:#007bff;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;">🔄 RECARGAR</button>
                </p>
            </body>
            </html>
            """
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@api_router.delete("/links/{link_id}")
async def delete_link_emergency(link_id: str):
    """Emergency endpoint to delete test links"""
    try:
        result = await db.link_submissions.delete_one({"id": link_id})
        if result.deleted_count > 0:
            return {"success": True, "message": "Link eliminado correctamente"}
        else:
            return {"success": False, "error": "Link no encontrado"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@api_router.get("/admin", response_class=HTMLResponse)
async def admin_panel_direct():
    """Panel admin directo que SÍ funciona"""
    try:
        # Get all links
        all_links = await db.link_submissions.find().sort("created_at", -1).to_list(None)
        approved = [l for l in all_links if l.get("status") == "approved"]
        pending = [l for l in all_links if l.get("status") == "pending"]
        rejected = [l for l in all_links if l.get("status") == "rejected"]
        
        # Generate pending links HTML
        pending_html = ""
        if pending:
            for link in pending:
                pending_html += f"""
                <div style="border: 3px solid #ff6b35; background: #fff8e1; padding: 20px; margin: 15px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(255,107,53,0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h3 style="color: #d84315; margin: 0 0 10px 0; font-size: 18px;">⚠️ {link.get('owner_name', 'Sin nombre')}</h3>
                            <p style="margin: 5px 0; color: #424242;"><strong>🌐 URL:</strong> <a href="{link.get('website_url', '#')}" target="_blank" style="color: #1976d2;">{link.get('website_url', 'Sin URL')}</a></p>
                            <p style="margin: 5px 0; color: #424242;"><strong>📍 Ubicación:</strong> {link.get('location', 'Sin ubicación')}</p>
                            <p style="margin: 5px 0; color: #424242;"><strong>📞 Teléfono:</strong> {link.get('phone', 'Sin teléfono')}</p>
                            <p style="margin: 5px 0; color: #666; font-size: 12px;"><strong>ID:</strong> {link.get('id', 'Sin ID')}</p>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <button onclick="aprobarLink('{link.get('id')}')" 
                                    style="background: linear-gradient(135deg, #4caf50, #45a049); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(76,175,80,0.3); transition: all 0.3s;">
                                ✅ APROBAR AHORA
                            </button>
                            <button onclick="rechazarLink('{link.get('id')}')" 
                                    style="background: linear-gradient(135deg, #f44336, #d32f2f); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(244,67,54,0.3); transition: all 0.3s;">
                                ❌ RECHAZAR
                            </button>
                        </div>
                    </div>
                </div>"""
        else:
            pending_html = """
            <div style="background: linear-gradient(135deg, #e8f5e8, #c8e6c8); border: 2px solid #4caf50; padding: 30px; border-radius: 15px; text-align: center; margin: 20px 0;">
                <h2 style="color: #2e7d32; margin: 0; font-size: 24px;">✅ ¡EXCELENTE!</h2>
                <p style="color: #388e3c; margin: 10px 0 0 0; font-size: 16px; font-weight: bold;">No hay links pendientes de aprobación</p>
                <p style="color: #4caf50; margin: 5px 0 0 0; font-size: 14px;">Todos los envíos han sido procesados</p>
            </div>"""
        
        html = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>🚨 ADMIN PAGINA DEL LINK</title>
            <meta http-equiv="refresh" content="60">
            <style>
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                }}
                .container {{ 
                    max-width: 1200px; 
                    margin: 0 auto; 
                    background: white; 
                    padding: 30px; 
                    border-radius: 20px; 
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                }}
                .header {{ 
                    background: linear-gradient(135deg, #ff6b35, #f7931e); 
                    color: white; 
                    padding: 25px; 
                    border-radius: 15px; 
                    text-align: center; 
                    margin-bottom: 30px;
                    box-shadow: 0 5px 15px rgba(255,107,53,0.3);
                }}
                .stats {{ 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                    gap: 20px; 
                    margin-bottom: 30px; 
                }}
                .stat {{ 
                    background: linear-gradient(135deg, #f8f9fa, #e9ecef); 
                    padding: 25px; 
                    border-radius: 15px; 
                    text-align: center; 
                    border: 2px solid #dee2e6;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.08);
                    transition: transform 0.3s;
                }}
                .stat:hover {{ 
                    transform: translateY(-5px); 
                }}
                .stat-number {{ 
                    font-size: 2.5rem; 
                    font-weight: bold; 
                    margin-bottom: 10px;
                }}
                .reload-btn {{
                    background: linear-gradient(135deg, #2196f3, #21cbf3);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 16px;
                    box-shadow: 0 3px 10px rgba(33,150,243,0.3);
                    transition: all 0.3s;
                }}
                .reload-btn:hover {{
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(33,150,243,0.4);
                }}
                button:hover {{
                    transform: translateY(-2px);
                }}
                .total {{ color: #2196f3; }}
                .approved {{ color: #4caf50; }}
                .pending {{ color: #ff9800; }}
                .revenue {{ color: #4caf50; }}
                .footer {{
                    margin-top: 40px;
                    text-align: center;
                    padding: 20px;
                    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                    border-radius: 15px;
                    border: 1px solid #dee2e6;
                }}
                .success-msg {{
                    background: linear-gradient(135deg, #d4edda, #c3e6cb);
                    color: #155724;
                    padding: 15px;
                    border-radius: 10px;
                    margin: 15px 0;
                    border: 2px solid #28a745;
                    text-align: center;
                    font-weight: bold;
                }}
                .error-msg {{
                    background: linear-gradient(135deg, #f8d7da, #f5c6cb);
                    color: #721c24;
                    padding: 15px;
                    border-radius: 10px;
                    margin: 15px 0;
                    border: 2px solid #dc3545;
                    text-align: center;
                    font-weight: bold;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0 0 10px 0; font-size: 2.2rem;">🚨 PANEL DE ADMINISTRACIÓN</h1>
                    <p style="margin: 0; font-size: 1.1rem; opacity: 0.9;">PAGINA DEL LINK - Actualización automática cada 60s</p>
                    <button class="reload-btn" onclick="location.reload()" style="margin-top: 15px;">
                        🔄 RECARGAR AHORA
                    </button>
                </div>

                <div id="mensaje" style="display: none;"></div>

                <div class="stats">
                    <div class="stat">
                        <div class="stat-number total">{len(all_links)}</div>
                        <div><strong>TOTAL LINKS</strong></div>
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">En base de datos</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number approved">{len(approved)}</div>
                        <div><strong>APROBADOS</strong></div>
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">Visibles en página</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number pending">{len(pending)}</div>
                        <div><strong>PENDIENTES</strong></div>
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">Esperando aprobación</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number revenue">${len(approved)}</div>
                        <div><strong>INGRESOS USD</strong></div>
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">Total generado</div>
                    </div>
                </div>

                <div style="background: linear-gradient(135deg, #fff, #f8f9fa); border-radius: 15px; padding: 25px; border: 2px solid #e9ecef;">
                    <h2 style="color: #333; margin: 0 0 20px 0; font-size: 1.5rem;">
                        ⚠️ LINKS PENDIENTES DE APROBACIÓN ({len(pending)})
                    </h2>
                    {pending_html}
                </div>

                <div class="footer">
                    <p style="color: #666; margin: 0 0 10px 0; font-size: 16px;">
                        <strong>🌐 Página principal:</strong> 
                        <a href="https://linkverse-2.emergent.host" target="_blank" style="color: #1976d2; text-decoration: none; font-weight: bold;">
                            https://linkverse-2.emergent.host
                        </a>
                    </p>
                    <p style="color: #666; margin: 0; font-size: 14px;">
                        <strong>💰 Total ingresos generados:</strong> ${len(approved)} USD | 
                        <strong>📊 Estado:</strong> Operativo | 
                        <strong>🕒 Última actualización:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
                    </p>
                </div>
            </div>

            <script>
                function mostrarMensaje(texto, tipo) {{
                    const mensajeDiv = document.getElementById('mensaje');
                    mensajeDiv.style.display = 'block';
                    mensajeDiv.className = tipo === 'success' ? 'success-msg' : 'error-msg';
                    mensajeDiv.innerHTML = texto;
                    
                    setTimeout(() => {{
                        mensajeDiv.style.display = 'none';
                    }}, 5000);
                }}

                async function aprobarLink(linkId) {{
                    if (!confirm('¿Estás seguro de que deseas APROBAR este link?\\n\\nEsto lo hará visible en la página principal.')) {{
                        return;
                    }}

                    try {{
                        mostrarMensaje('⏳ Aprobando link...', 'success');
                        
                        const response = await fetch('/api/links/' + linkId, {{
                            method: 'PUT',
                            headers: {{
                                'Content-Type': 'application/json'
                            }},
                            body: JSON.stringify({{ status: 'approved' }})
                        }});

                        if (response.ok) {{
                            mostrarMensaje('✅ ¡Link aprobado exitosamente! La página se actualizará en 3 segundos...', 'success');
                            setTimeout(() => {{
                                location.reload();
                            }}, 3000);
                        }} else {{
                            const errorText = await response.text();
                            throw new Error(`Error ${response.status}: ${{errorText}}`);
                        }}
                    }} catch (error) {{
                        console.error('Error aprobando link:', error);
                        mostrarMensaje('❌ Error al aprobar el link: ' + error.message, 'error');
                    }}
                }}

                async function rechazarLink(linkId) {{
                    if (!confirm('¿Estás seguro de que deseas RECHAZAR este link?\\n\\nEsta acción no se puede deshacer.')) {{
                        return;
                    }}

                    try {{
                        mostrarMensaje('⏳ Rechazando link...', 'success');
                        
                        const response = await fetch('/api/links/' + linkId, {{
                            method: 'PUT',
                            headers: {{
                                'Content-Type': 'application/json'
                            }},
                            body: JSON.stringify({{ status: 'rejected' }})
                        }});

                        if (response.ok) {{
                            mostrarMensaje('✅ Link rechazado exitosamente. La página se actualizará en 3 segundos...', 'success');
                            setTimeout(() => {{
                                location.reload();
                            }}, 3000);
                        }} else {{
                            const errorText = await response.text();
                            throw new Error(`Error ${{response.status}}: ${{errorText}}`);
                        }}
                    }} catch (error) {{
                        console.error('Error rechazando link:', error);
                        mostrarMensaje('❌ Error al rechazar el link: ' + error.message, 'error');
                    }}
                }}

                // Auto-refresh notification
                let refreshTimer = 60;
                setInterval(() => {{
                    refreshTimer--;
                    if (refreshTimer <= 10 && refreshTimer > 0) {{
                        document.title = `🚨 ADMIN (${refreshTimer}s)`;
                    }} else if (refreshTimer === 0) {{
                        document.title = '🚨 ADMIN PAGINA DEL LINK';
                    }}
                }}, 1000);
            </script>
        </body>
        </html>
        """
        
        return html
    except Exception as e:
        error_html = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Error - Admin Panel</title>
        </head>
        <body style="font-family: Arial; padding: 20px; background: #f8d7da;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; border: 2px solid #dc3545;">
                <h1 style="color: #721c24;">❌ ERROR EN PANEL ADMIN</h1>
                <p><strong>Error técnico:</strong> {str(e)}</p>
                <p>Por favor, contacta al desarrollador o intenta nuevamente.</p>
                <button onclick="location.reload()" style="background: #dc3545; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    🔄 REINTENTAR
                </button>
                <br><br>
                <a href="https://linkverse-2.emergent.host" style="color: #1976d2;">← Volver a página principal</a>
            </div>
        </body>
        </html>
        """
        return error_html

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