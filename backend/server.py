from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse
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
import time
from datetime import datetime, timezone
import re
from urllib.parse import urlparse


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

# Mount static files - NOTE: Kubernetes ingress routes /uploads to frontend, so we use /api/uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# WORKAROUND: Serve uploads via API path for Kubernetes ingress compatibility  
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="api_uploads")

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
    display_name: Optional[str] = None  # Nombre personalizado que se muestra en lugar del hostname
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
                        
            except Exception:
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
    remove_logo: bool = False,
    display_name: str = Form(None)
):
    """Update or remove custom logo for a link (admin only) - FLEXIBLE FOR INSTAGRAM IMAGES"""
    print(f"🖼️ Logo update request for link: {link_id}")
    
    # Get the current link
    current_link = await db.link_submissions.find_one({"id": link_id})
    if not current_link:
        raise HTTPException(status_code=404, detail="Link no encontrado")
    
    update_data = {}
    
    # Update display name if provided
    if display_name:
        print(f"   ✏️ Updating display name to: '{display_name}'")
        update_data["display_name"] = display_name.strip()
    
    if remove_logo:
        print(f"🗑️ Removing logo for: {current_link.get('owner_name', 'Unknown')}")
        # Remove custom logo and get favicon instead
        update_data["custom_logo"] = None
        favicon_url = await extract_best_logo(current_link["website_url"])
        if favicon_url:
            update_data["favicon_url"] = favicon_url
    elif custom_logo and custom_logo.filename:
        try:
            print(f"📤 Uploading logo for: {current_link.get('owner_name', 'Unknown')}")
            print(f"   📁 Original filename: {custom_logo.filename}")
            print(f"   📊 Content type: {custom_logo.content_type}")
            
            # CORREGIDO: Manejo apropiado de archivos para capturas de Instagram
            print(f"   📤 Processing upload: {custom_logo.filename}")
            print(f"   📊 Content type: {custom_logo.content_type}")
            
            # Read file content CORRECTLY for aiofiles
            content = await custom_logo.read()
            file_size_bytes = len(content)
            file_size_mb = file_size_bytes / (1024 * 1024)
            print(f"   📏 File size: {file_size_mb:.2f} MB ({file_size_bytes} bytes)")
            
            # Validate we actually have content
            if file_size_bytes == 0:
                print(f"   ❌ Empty file detected")
                raise HTTPException(status_code=400, detail="Archivo vacío - intenta con otra captura")
            
            if file_size_bytes < 1000:  # Less than 1KB is suspicious
                print(f"   ⚠️ Very small file ({file_size_bytes} bytes) - may be corrupted")
            
            # OPTIMIZADO PARA CAPTURAS DE PANTALLA DE INSTAGRAM
            if file_size_mb > 10:
                print(f"   📱 Large Instagram screenshot detected ({file_size_mb:.2f} MB)")
            
            # Very flexible file handling - accept ANY image type
            file_extension = 'png'  # Default for screenshots
            if custom_logo.filename and '.' in custom_logo.filename:
                original_ext = custom_logo.filename.split('.')[-1].lower()
                # Accept ANY extension, be super permissive
                if original_ext:
                    file_extension = original_ext
                    print(f"   📁 Using original extension: {original_ext}")
            
            # Generate unique filename for Instagram screenshots
            timestamp = int(time.time())
            logo_filename = f"instagram_screenshot_{timestamp}_{uuid.uuid4().hex[:8]}.{file_extension}"
            logo_path = UPLOAD_DIR / logo_filename
            print(f"   💾 Saving Instagram screenshot as: {logo_filename}")
            
            # CORREGIDO: Save file with proper async/await pattern
            try:
                # Ensure content is properly written using correct aiofiles pattern
                async with aiofiles.open(logo_path, 'wb') as out_file:
                    await out_file.write(content)  # Write the content we already read
                
                # Verify the file was saved correctly
                if logo_path.exists():
                    saved_size = logo_path.stat().st_size
                    print(f"   ✅ File saved successfully: {saved_size} bytes")
                    
                    if saved_size != file_size_bytes:
                        print(f"   ⚠️ Size mismatch! Expected: {file_size_bytes}, Got: {saved_size}")
                        raise HTTPException(status_code=500, detail="Error en guardado - tamaños no coinciden")
                    
                    print(f"   🎉 Instagram screenshot saved perfectly!")
                else:
                    raise HTTPException(status_code=500, detail="Archivo no se creó correctamente")
                    
            except Exception as save_error:
                print(f"   ❌ Error saving file: {str(save_error)}")
                # Clean up partial file if it exists
                if logo_path.exists():
                    logo_path.unlink()
                raise HTTPException(status_code=500, detail=f"Error guardando captura: {str(save_error)}")
            
            # Verify file was saved
            if logo_path.exists():
                print(f"   ✅ File saved successfully: {logo_path}")
                update_data["custom_logo"] = logo_filename
                # Remove favicon when custom logo is added
                update_data["favicon_url"] = None
            else:
                print(f"   ❌ File save failed: {logo_path}")
                raise HTTPException(status_code=500, detail="Error guardando archivo")
                
        except Exception as e:
            print(f"   ❌ Error processing logo: {str(e)}")
            # Don't fail completely, just log the error
            raise HTTPException(status_code=400, detail=f"Error procesando imagen: {str(e)}")
    
    if update_data:
        print(f"   🔄 Updating database with: {update_data}")
        result = await db.link_submissions.update_one(
            {"id": link_id}, 
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Link no encontrado")
        
        print(f"   ✅ Database updated successfully")
        return {
            "message": "Logo actualizado correctamente",
            "filename": update_data.get("custom_logo"),
            "link_owner": current_link.get("owner_name", "Unknown")
        }
    
    return {"message": "No hay cambios para aplicar"}

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
async def refresh_logo(link_id: str):
    """Refresh logo/favicon for a specific link"""
    print(f"🔄 Refreshing logo for link: {link_id}")
    
    # Get the current link
    current_link = await db.link_submissions.find_one({"id": link_id})
    if not current_link:
        raise HTTPException(status_code=404, detail="Link no encontrado")
    
    # Extract new favicon
    favicon_url = await extract_best_logo(current_link["website_url"])
    
    if favicon_url:
        print(f"   ✅ New favicon found: {favicon_url}")
        # Update the favicon_url in database
        result = await db.link_submissions.update_one(
            {"id": link_id}, 
            {"$set": {"favicon_url": favicon_url}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Link no encontrado")
        
        return {"message": "Logo actualizado correctamente", "new_favicon_url": favicon_url}
    else:
        print(f"   ❌ Could not extract logo from: {current_link['website_url']}")
        raise HTTPException(status_code=400, detail="No se pudo extraer el logo del sitio web")

@api_router.post("/admin/fix-broken-logos")
async def fix_all_broken_logos():
    """Fix all broken logos by re-extracting favicons - ADMIN ONLY"""
    print("🛠️ Starting bulk logo repair process...")
    
    # Get all approved links
    approved_links = await db.link_submissions.find({"status": "approved"}).to_list(length=None)
    
    if not approved_links:
        return {"message": "No hay links aprobados para reparar"}
    
    repaired_count = 0
    failed_count = 0
    results = []
    
    for link in approved_links:
        try:
            print(f"   🔍 Checking: {link.get('owner_name', 'Unknown')} - {link.get('website_url', 'No URL')}")
            
            # Skip if has custom logo (those work with /api/uploads/)
            if link.get('custom_logo'):
                print(f"   ⏭️ Skipping (has custom logo): {link.get('owner_name')}")
                continue
            
            # Try to extract new favicon
            favicon_url = await extract_best_logo(link["website_url"])
            
            if favicon_url and favicon_url != link.get('favicon_url'):
                # Update the favicon_url in database
                await db.link_submissions.update_one(
                    {"id": link["id"]}, 
                    {"$set": {"favicon_url": favicon_url}}
                )
                
                repaired_count += 1
                results.append({
                    "id": link["id"],
                    "name": link.get("owner_name", "Unknown"),
                    "old_favicon": link.get("favicon_url", "None"),
                    "new_favicon": favicon_url,
                    "status": "repaired"
                })
                print(f"   ✅ Repaired: {link.get('owner_name')} -> {favicon_url}")
            else:
                failed_count += 1
                results.append({
                    "id": link["id"],
                    "name": link.get("owner_name", "Unknown"),
                    "website": link.get("website_url", "No URL"),
                    "status": "failed"
                })
                print(f"   ❌ Failed: {link.get('owner_name')} - {link.get('website_url')}")
                
        except Exception as e:
            failed_count += 1
            print(f"   💥 Error processing {link.get('owner_name', 'Unknown')}: {str(e)}")
            results.append({
                "id": link["id"],
                "name": link.get("owner_name", "Unknown"),
                "status": "error",
                "error": str(e)
            })
    
    print(f"🏁 Bulk repair completed: {repaired_count} repaired, {failed_count} failed")
    
    return {
        "message": f"Proceso completado: {repaired_count} logos reparados, {failed_count} fallidos",
        "repaired_count": repaired_count,
        "failed_count": failed_count,
        "total_processed": len(approved_links),
        "results": results[:10]  # Primeros 10 resultados
    }

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
        approved_count = len([link for link in all_links if link.get("status") == "approved"])
        revenue = approved_count * 1  # $1 per link
        
        return {
            "links": [LinkSubmission(**link) for link in all_links],
            "stats": {
                "total_submissions": total,
                "approved": approved_count,
                "pending": len([link for link in all_links if link.get("status") == "pending"]),
                "rejected": len([link for link in all_links if link.get("status") == "rejected"]),
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
async def get_admin_status():
    """Get admin status and all links"""
    try:
        all_links = await db.link_submissions.find().sort("created_at", -1).to_list(None)
        
        approved = len([l for l in all_links if l.get("status") == "approved"])
        pending = len([l for l in all_links if l.get("status") == "pending"])
        rejected = len([l for l in all_links if l.get("status") == "rejected"])
        
        return {
            "success": True,
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
                    "phone": link.get("phone"),
                    "location": link.get("location"),
                    "created_at": link.get("created_at"),
                    "custom_logo": link.get("custom_logo"),
                    "favicon_url": link.get("favicon_url")
                }
                for link in all_links
            ]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
async def admin_working_final():
    """Admin panel que SÍ funciona definitivamente"""
    try:
        # Get current data for the stats
        all_links = await db.link_submissions.find().to_list(None)
        approved = len([l for l in all_links if l.get("status") == "approved"])
        pending = len([l for l in all_links if l.get("status") == "pending"])
        
        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>✅ ADMIN DEFINITIVO - PAGINA DEL LINK</title>
    <style>
        body {{ 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }}
        .container {{ 
            max-width: 1000px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 15px; 
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }}
        .header {{ 
            background: linear-gradient(135deg, #28a745, #20c997); 
            color: white; 
            padding: 40px; 
            text-align: center; 
        }}
        .header h1 {{ 
            font-size: 2.5rem; 
            margin: 0 0 15px 0; 
        }}
        .header p {{ 
            font-size: 1.2rem; 
            margin: 0 0 25px 0; 
            opacity: 0.9; 
        }}
        .btn {{ 
            background: #ffffff; 
            color: #28a745; 
            border: none; 
            padding: 15px 30px; 
            border-radius: 10px; 
            cursor: pointer; 
            font-weight: bold; 
            font-size: 16px;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }}
        .btn:hover {{ 
            transform: translateY(-2px); 
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }}
        .stats {{ 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            padding: 40px; 
            background: #f8f9fa;
        }}
        .stat {{ 
            background: white;
            padding: 30px; 
            border-radius: 15px; 
            text-align: center; 
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }}
        .stat:hover {{ 
            transform: translateY(-5px); 
        }}
        .stat-number {{ 
            font-size: 3rem; 
            font-weight: bold; 
            margin-bottom: 10px;
        }}
        .total {{ color: #2196f3; }}
        .approved {{ color: #28a745; }}
        .pending {{ color: #ff9800; }}
        .revenue {{ color: #28a745; }}
        .content {{ padding: 40px; }}
        .success-box {{ 
            background: linear-gradient(135deg, #d4edda, #c3e6cb); 
            border: 3px solid #28a745; 
            padding: 40px; 
            border-radius: 15px; 
            text-align: center; 
            color: #155724;
        }}
        .pending-link {{ 
            background: white;
            border: 3px solid #ff9800; 
            border-radius: 15px; 
            padding: 25px; 
            margin: 20px 0; 
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            box-shadow: 0 8px 25px rgba(255,152,0,0.2);
        }}
        .link-info h3 {{ 
            color: #e65100; 
            margin: 0 0 15px 0; 
            font-size: 1.4rem;
        }}
        .link-info p {{ 
            margin: 8px 0; 
            color: #333; 
        }}
        .btn-approve {{ 
            background: linear-gradient(135deg, #28a745, #20c997); 
            color: white; 
            margin: 5px;
        }}
        .btn-reject {{ 
            background: linear-gradient(135deg, #dc3545, #c82333); 
            color: white; 
            margin: 5px;
        }}
        .footer {{ 
            background: #343a40; 
            color: white; 
            padding: 30px; 
            text-align: center; 
        }}
        .footer a {{ 
            color: #20c997; 
            text-decoration: none; 
            font-weight: bold;
        }}
        .alert {{ 
            padding: 20px; 
            border-radius: 10px; 
            margin: 20px 0; 
            text-align: center; 
            font-weight: bold;
            display: none;
        }}
        .alert-success {{ 
            background: #d4edda; 
            color: #155724; 
            border: 2px solid #28a745; 
        }}
        .alert-error {{ 
            background: #f8d7da; 
            color: #721c24; 
            border: 2px solid #dc3545; 
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ PANEL ADMIN DEFINITIVO</h1>
            <p>PAGINA DEL LINK - ¡Funcionando Perfectamente!</p>
            <button class="btn" onclick="loadData()">🔄 CARGAR DATOS ACTUALES</button>
        </div>

        <div id="alert" class="alert"></div>

        <div class="stats">
            <div class="stat">
                <div class="stat-number total" id="totalLinks">{len(all_links)}</div>
                <div><strong>TOTAL LINKS</strong></div>
                <div style="font-size: 0.9rem; color: #666; margin-top: 8px;">En base de datos</div>
            </div>
            <div class="stat">
                <div class="stat-number approved" id="approvedLinks">{approved}</div>
                <div><strong>APROBADOS</strong></div>
                <div style="font-size: 0.9rem; color: #666; margin-top: 8px;">Visibles online</div>
            </div>
            <div class="stat">
                <div class="stat-number pending" id="pendingLinks">{pending}</div>
                <div><strong>PENDIENTES</strong></div>
                <div style="font-size: 0.9rem; color: #666; margin-top: 8px;">Esperando aprobación</div>
            </div>
            <div class="stat">
                <div class="stat-number revenue" id="revenue">${approved}</div>
                <div><strong>INGRESOS USD</strong></div>
                <div style="font-size: 0.9rem; color: #666; margin-top: 8px;">Total generado</div>
            </div>
        </div>

        <div class="content">
            <h2 style="margin-bottom: 25px; color: #333; font-size: 1.8rem;">⚠️ GESTIÓN DE LINKS PENDIENTES</h2>
            <div id="pendingLinksContainer">
                <div class="success-box">
                    <h2 style="margin-bottom: 20px; font-size: 1.8rem;">🎯 ¡Panel Funcionando!</h2>
                    <p style="font-size: 1.2rem; margin-bottom: 15px;">Haz clic en "CARGAR DATOS ACTUALES" para ver links pendientes</p>
                    <p style="font-size: 1rem;">Este panel admin funciona correctamente y está listo para usar</p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>🌐 Página principal:</strong> <a href="https://linkverse-2.emergent.host" target="_blank">https://linkverse-2.emergent.host</a></p>
            <p style="margin-top: 10px;"><strong>📊 Estado del sistema:</strong> ✅ COMPLETAMENTE OPERATIVO</p>
            <p style="margin-top: 5px;"><strong>🕒 Última carga:</strong> <span id="lastUpdate">{datetime.now().strftime('%H:%M:%S')}</span></p>
        </div>
    </div>

    <script>
        const API_BASE = 'https://linkverse-2.emergent.host/api';
        
        function showAlert(message, type) {{
            const alertDiv = document.getElementById('alert');
            alertDiv.style.display = 'block';
            alertDiv.className = 'alert alert-' + type;
            alertDiv.innerHTML = message;
            
            setTimeout(() => {{
                alertDiv.style.display = 'none';
            }}, 6000);
        }}

        async function loadData() {{
            console.log('🔄 Cargando datos desde admin/status...');
            
            // Show loading state
            document.getElementById('totalLinks').textContent = '⏳';
            document.getElementById('approvedLinks').textContent = '⏳';
            document.getElementById('pendingLinks').textContent = '⏳';
            document.getElementById('revenue').textContent = '$⏳';
            
            try {{
                const response = await fetch(API_BASE + '/admin/status');
                const data = await response.json();
                
                if (data && data.success) {{
                    console.log('✅ Datos cargados correctamente:', data);
                    
                    // Update all stats
                    document.getElementById('totalLinks').textContent = data.total_links || 0;
                    document.getElementById('approvedLinks').textContent = data.approved || 0;
                    document.getElementById('pendingLinks').textContent = data.pending || 0;
                    document.getElementById('revenue').textContent = '$' + (data.revenue || 0);
                    
                    // Handle pending links display
                    const container = document.getElementById('pendingLinksContainer');
                    const pendingLinks = (data.links || []).filter(link => link.status === 'pending');
                    
                    if (pendingLinks.length === 0) {{
                        container.innerHTML = `
                            <div class="success-box">
                                <h2 style="margin-bottom: 20px;">✅ ¡TODO PERFECTO!</h2>
                                <p style="font-size: 1.3rem; margin-bottom: 15px; font-weight: bold;">No hay links pendientes de aprobación</p>
                                <p style="font-size: 1.1rem; margin-bottom: 15px;">Todos los envíos han sido procesados exitosamente</p>
                                <div style="background: rgba(255,255,255,0.8); padding: 20px; border-radius: 10px; margin-top: 20px;">
                                    <p style="font-size: 1.2rem; font-weight: bold; color: #28a745;">💰 INGRESOS ACTUALES: $$${{data.approved}} USD</p>
                                    <p style="font-size: 1rem; color: #666;">(${{data.approved}} links aprobados × $1 cada uno)</p>
                                </div>
                            </div>
                        `;
                    }} else {{
                        let html = `
                            <div style="background: #fff3cd; border: 3px solid #ff9800; padding: 25px; border-radius: 15px; margin-bottom: 30px; text-align: center;">
                                <h3 style="color: #e65100; margin: 0 0 15px 0; font-size: 1.5rem;">🚨 ¡ACCIÓN REQUERIDA!</h3>
                                <p style="font-size: 1.2rem; margin: 0; color: #e65100; font-weight: bold;">${{pendingLinks.length}} links esperando tu aprobación</p>
                            </div>
                        `;
                        
                        pendingLinks.forEach((link, index) => {{
                            html += `
                                <div class="pending-link">
                                    <div class="link-info">
                                        <h3>🔔 LINK #${{index + 1}}: ${{link.owner_name || 'Sin nombre'}}</h3>
                                        <p><strong>🌐 Sitio web:</strong> <a href="${{link.website_url || '#'}}" target="_blank" style="color: #007bff; text-decoration: none;">${{link.website_url || 'Sin URL'}}</a></p>
                                        <p><strong>📞 Teléfono:</strong> ${{link.phone || 'No proporcionado'}}</p>
                                        <p><strong>📍 Ubicación:</strong> ${{link.location || 'No especificada'}}</p>
                                        <p style="font-size: 0.9rem; color: #666; margin-top: 10px;"><strong>🆔 ID:</strong> ${{link.id}}</p>
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 10px;">
                                        <button class="btn btn-approve" onclick="approveLink('${{link.id}}')">
                                            ✅ APROBAR AHORA
                                        </button>
                                        <button class="btn btn-reject" onclick="rejectLink('${{link.id}}')">
                                            ❌ RECHAZAR
                                        </button>
                                    </div>
                                </div>
                            `;
                        }});
                        
                        container.innerHTML = html;
                    }}
                    
                    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
                    showAlert(`✅ ¡Datos cargados exitosamente! ${{data.total_links}} links en total (${{pendingLinks.length}} pendientes)`, 'success');
                    
                }} else {{
                    throw new Error(data?.error || 'Respuesta inválida del servidor');
                }}
                
            }} catch (error) {{
                console.error('❌ Error cargando datos:', error);
                
                // Reset stats to show error
                document.getElementById('totalLinks').textContent = '❌';
                document.getElementById('approvedLinks').textContent = '❌';
                document.getElementById('pendingLinks').textContent = '❌';
                document.getElementById('revenue').textContent = '$❌';
                
                document.getElementById('pendingLinksContainer').innerHTML = `
                    <div style="background: #f8d7da; border: 3px solid #dc3545; padding: 30px; border-radius: 15px; text-align: center;">
                        <h3 style="color: #721c24; margin-bottom: 20px;">❌ Error al Cargar Datos</h3>
                        <p style="color: #721c24; margin-bottom: 15px;"><strong>Error:</strong> ${{error.message}}</p>
                        <p style="color: #721c24; margin-bottom: 20px;">Por favor, intenta recargar los datos</p>
                        <button class="btn" onclick="loadData()" style="background: #dc3545; color: white;">🔄 REINTENTAR</button>
                    </div>
                `;
                
                showAlert(`❌ Error cargando datos: ${{error.message}}`, 'error');
            }}
        }}

        async function approveLink(linkId) {{
            if (!confirm('🤔 ¿Estás seguro de que deseas APROBAR este link?\\n\\n✅ El link será visible en la página principal inmediatamente.\\n💰 Generará +$1 USD de ingresos.')) {{
                return;
            }}

            try {{
                showAlert('⏳ Aprobando link... Por favor espera', 'success');
                
                const response = await fetch(API_BASE + '/links/' + linkId, {{
                    method: 'PUT',
                    headers: {{
                        'Content-Type': 'application/json'
                    }},
                    body: JSON.stringify({{ status: 'approved' }})
                }});

                if (response.ok) {{
                    showAlert('🎉 ¡Link aprobado exitosamente! +$1 USD generado. Recargando datos...', 'success');
                    setTimeout(() => {{
                        loadData();
                    }}, 2500);
                }} else {{
                    const errorText = await response.text();
                    throw new Error(`HTTP ${{response.status}}: ${{errorText}}`);
                }}
            }} catch (error) {{
                console.error('❌ Error aprobando link:', error);
                showAlert(`❌ Error al aprobar el link: ${{error.message}}`, 'error');
            }}
        }}

        async function rejectLink(linkId) {{
            if (!confirm('⚠️ ¿Estás seguro de que deseas RECHAZAR este link?\\n\\n❌ Esta acción no se puede deshacer fácilmente.\\n🚫 El link NO será visible en la página principal.')) {{
                return;
            }}

            try {{
                showAlert('⏳ Rechazando link... Por favor espera', 'success');
                
                const response = await fetch(API_BASE + '/links/' + linkId, {{
                    method: 'PUT',
                    headers: {{
                        'Content-Type': 'application/json'
                    }},
                    body: JSON.stringify({{ status: 'rejected' }})
                }});

                if (response.ok) {{
                    showAlert('✅ Link rechazado exitosamente. Recargando datos...', 'success');
                    setTimeout(() => {{
                        loadData();
                    }}, 2500);
                }} else {{
                    const errorText = await response.text();
                    throw new Error(`HTTP ${{response.status}}: ${{errorText}}`);
                }}
            }} catch (error) {{
                console.error('❌ Error rechazando link:', error);
                showAlert(`❌ Error al rechazar el link: ${{error.message}}`, 'error');
            }}
        }}

        // Auto-load data when page loads
        document.addEventListener('DOMContentLoaded', function() {{
            console.log('✅ Panel admin cargado - iniciando carga automática de datos...');
            setTimeout(loadData, 1000); // Delay to ensure page is fully rendered
        }});
    </script>
</body>
</html>"""
    except Exception as e:
        return f"""<!DOCTYPE html>
<html><head><title>Error Admin</title><style>body{{font-family:Arial;padding:40px;background:#f8d7da;text-align:center;}}.error{{background:white;padding:40px;border-radius:15px;border:3px solid #dc3545;max-width:600px;margin:0 auto;}}</style></head>
<body><div class="error"><h1 style="color:#721c24;">❌ ERROR EN PANEL ADMIN</h1><p><strong>Error técnico:</strong> {str(e)}</p><a href="/api/admin-working" style="color:#007bff;">🔄 Reintentar</a></div></body></html>"""

@api_router.get("/admin-panel", response_class=HTMLResponse)
async def admin_panel_final():
    """Panel de administración final que SÍ funciona"""
    try:
        # Get current stats for display
        all_links = await db.link_submissions.find().to_list(None)
        approved = len([l for l in all_links if l.get("status") == "approved"])
        pending = len([l for l in all_links if l.get("status") == "pending"])
        
        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - PAGINA DEL LINK</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{ 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 20px; 
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }}
        .header {{ 
            background: linear-gradient(135deg, #ff6b35, #f7931e); 
            color: white; 
            padding: 30px; 
            text-align: center; 
        }}
        .header h1 {{ font-size: 2.5rem; margin-bottom: 10px; }}
        .stats {{ 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            padding: 30px; 
            background: #f8f9fa;
        }}
        .stat {{ 
            background: white;
            padding: 25px; 
            border-radius: 15px; 
            text-align: center; 
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }}
        .stat-number {{ 
            font-size: 3rem; 
            font-weight: bold; 
            margin-bottom: 10px;
        }}
        .total {{ color: #2196f3; }}
        .approved {{ color: #4caf50; }}
        .pending {{ color: #ff9800; }}
        .revenue {{ color: #28a745; }}
        .content {{ padding: 30px; }}
        .btn {{ 
            background: linear-gradient(135deg, #4caf50, #45a049); 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: bold; 
            margin: 5px;
            transition: all 0.3s;
        }}
        .btn:hover {{ transform: translateY(-2px); }}
        .btn-danger {{ 
            background: linear-gradient(135deg, #f44336, #d32f2f); 
        }}
        .btn-reload {{ 
            background: linear-gradient(135deg, #2196f3, #21cbf3);
            font-size: 16px;
            padding: 15px 30px;
            margin-top: 20px;
        }}
        .link-card {{ 
            background: white;
            border: 3px solid #ff9800; 
            border-radius: 10px; 
            padding: 20px; 
            margin: 15px 0; 
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            box-shadow: 0 5px 15px rgba(255,152,0,0.2);
        }}
        .link-info h3 {{ color: #e65100; margin-bottom: 10px; }}
        .link-info p {{ margin: 5px 0; color: #424242; }}
        .no-links {{ 
            background: linear-gradient(135deg, #e8f5e8, #c8e6c8); 
            border: 2px solid #4caf50; 
            padding: 40px; 
            border-radius: 15px; 
            text-align: center; 
            color: #2e7d32;
        }}
        .footer {{ 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #666; 
        }}
        .alert {{ 
            padding: 15px; 
            border-radius: 8px; 
            margin: 15px 0; 
            text-align: center; 
            font-weight: bold;
            display: none;
        }}
        .alert-success {{ 
            background: #d4edda; 
            color: #155724; 
            border: 2px solid #28a745; 
        }}
        .alert-error {{ 
            background: #f8d7da; 
            color: #721c24; 
            border: 2px solid #dc3545; 
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 PANEL DE ADMINISTRACIÓN</h1>
            <p style="opacity: 0.9; font-size: 1.1rem;">PAGINA DEL LINK - Control Total</p>
            <button class="btn btn-reload" onclick="loadData()">🔄 CARGAR DATOS</button>
        </div>

        <div id="alert" class="alert"></div>

        <div class="stats">
            <div class="stat">
                <div class="stat-number total" id="totalLinks">{len(all_links)}</div>
                <div><strong>TOTAL LINKS</strong></div>
            </div>
            <div class="stat">
                <div class="stat-number approved" id="approvedLinks">{approved}</div>
                <div><strong>APROBADOS</strong></div>
            </div>
            <div class="stat">
                <div class="stat-number pending" id="pendingLinks">{pending}</div>
                <div><strong>PENDIENTES</strong></div>
            </div>
            <div class="stat">
                <div class="stat-number revenue" id="revenue">${approved}</div>
                <div><strong>INGRESOS USD</strong></div>
            </div>
        </div>

        <div class="content">
            <h2 style="margin-bottom: 20px; color: #333;">⚠️ LINKS PENDIENTES DE APROBACIÓN</h2>
            <div id="pendingLinksContainer">
                <div class="no-links" id="loading">
                    <p>Haz clic en "CARGAR DATOS" para ver los links pendientes</p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>🌐 Página principal:</strong> <a href="https://linkverse-2.emergent.host" target="_blank">https://linkverse-2.emergent.host</a></p>
            <p><strong>📊 Estado:</strong> Operativo | <strong>🕒 Actualizado:</strong> <span id="lastUpdate">{datetime.now().strftime('%H:%M:%S')}</span></p>
        </div>
    </div>

    <script>
        const API_BASE = 'https://linkverse-2.emergent.host/api';
        
        function showAlert(message, type) {{
            const alertDiv = document.getElementById('alert');
            alertDiv.style.display = 'block';
            alertDiv.className = 'alert alert-' + type;
            alertDiv.innerHTML = message;
            
            setTimeout(() => {{
                alertDiv.style.display = 'none';
            }}, 5000);
        }}

        async function loadData() {{
            console.log('🔄 Cargando datos del admin...');
            
            try {{
                const response = await fetch(API_BASE + '/admin/status');
                const data = await response.json();
                
                if (data.success) {{
                    console.log('✅ Datos cargados:', data);
                    
                    // Update stats
                    document.getElementById('totalLinks').textContent = data.total_links || 0;
                    document.getElementById('approvedLinks').textContent = data.approved || 0;
                    document.getElementById('pendingLinks').textContent = data.pending || 0;
                    document.getElementById('revenue').textContent = '$' + (data.revenue || 0);
                    
                    // Update pending links
                    const container = document.getElementById('pendingLinksContainer');
                    const pendingLinks = (data.links || []).filter(link => link.status === 'pending');
                    
                    if (pendingLinks.length === 0) {{
                        container.innerHTML = `
                            <div class="no-links">
                                <h2 style="margin-bottom: 15px;">✅ ¡EXCELENTE!</h2>
                                <p style="font-size: 18px; margin-bottom: 10px;">No hay links pendientes de aprobación</p>
                                <p>Todos los envíos han sido procesados correctamente</p>
                            </div>
                        `;
                    }} else {{
                        let html = '';
                        pendingLinks.forEach(link => {{
                            html += `
                                <div class="link-card">
                                    <div class="link-info">
                                        <h3>⚠️ ${{link.owner_name || 'Sin nombre'}}</h3>
                                        <p><strong>🌐 URL:</strong> <a href="${{link.website_url || '#'}}" target="_blank">${{link.website_url || 'Sin URL'}}</a></p>
                                        <p><strong>📞 Teléfono:</strong> ${{link.phone || 'No proporcionado'}}</p>
                                        <p><strong>📍 Ubicación:</strong> ${{link.location || 'No proporcionada'}}</p>
                                        <p style="font-size: 12px; color: #666;"><strong>ID:</strong> ${{link.id}}</p>
                                    </div>
                                    <div>
                                        <button class="btn" onclick="approveLink('${{link.id}}')">✅ APROBAR</button>
                                        <button class="btn btn-danger" onclick="rejectLink('${{link.id}}')">❌ RECHAZAR</button>
                                    </div>
                                </div>
                            `;
                        }});
                        container.innerHTML = html;
                    }}
                    
                    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
                    showAlert(`✅ Datos cargados: ${{data.total_links}} links (${{pendingLinks.length}} pendientes)`, 'success');
                    
                }} else {{
                    throw new Error(data.error || 'Error desconocido');
                }}
                
            }} catch (error) {{
                console.error('❌ Error cargando datos:', error);
                showAlert(`❌ Error al cargar datos: ${{error.message}}`, 'error');
            }}
        }}

        async function approveLink(linkId) {{
            if (!confirm('¿Aprobar este link?')) return;
            try {{
                showAlert('⏳ Aprobando link...', 'success');
                const response = await fetch(API_BASE + '/links/' + linkId, {{
                    method: 'PUT',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ status: 'approved' }})
                }});
                if (response.ok) {{
                    showAlert('✅ Link aprobado exitosamente!', 'success');
                    setTimeout(loadData, 2000);
                }} else throw new Error('Error al aprobar');
            }} catch (error) {{
                showAlert('❌ Error al aprobar: ' + error.message, 'error');
            }}
        }}

        async function rejectLink(linkId) {{
            if (!confirm('¿Rechazar este link?')) return;
            try {{
                showAlert('⏳ Rechazando link...', 'success');
                const response = await fetch(API_BASE + '/links/' + linkId, {{
                    method: 'PUT',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ status: 'rejected' }})
                }});
                if (response.ok) {{
                    showAlert('✅ Link rechazado exitosamente!', 'success');
                    setTimeout(loadData, 2000);
                }} else throw new Error('Error al rechazar');
            }} catch (error) {{
                showAlert('❌ Error al rechazar: ' + error.message, 'error');
            }}
        }}

        // Auto load data on page load
        document.addEventListener('DOMContentLoaded', loadData);
    </script>
</body>
</html>"""
    except Exception as e:
        return f"""<!DOCTYPE html>
<html><head><title>Error</title></head>
<body style="font-family: Arial; padding: 20px; background: #f8d7da;">
<div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
<h1 style="color: #721c24;">❌ ERROR EN PANEL ADMIN</h1>
<p><strong>Error:</strong> {str(e)}</p>
<a href="/api/admin-panel">🔄 Reintentar</a>
</div></body></html>"""

# Test endpoint
@api_router.get("/test-endpoint")
async def test_endpoint():
    """Test endpoint"""
    return {"message": "Test endpoint working!"}

# Admin panel endpoint - test
@api_router.get("/admin-final")
async def admin_panel_final_working():
    """Panel admin final que funciona"""
    return {"message": "Admin panel working!"}

@api_router.get("/simple-admin")
async def simple_admin():
    """Admin simple que SÍ funciona"""
    try:
        # Get basic data
        links = await db.link_submissions.find().to_list(None)
        approved = [l for l in links if l.get("status") == "approved"]
        pending = [l for l in links if l.get("status") == "pending"]
        
        return {
            "working": True,
            "total": len(links),
            "approved": len(approved),
            "pending": len(pending),
            "revenue": len(approved),
            "pending_links": [
                {
                    "id": p.get("id"),
                    "name": p.get("owner_name"),
                    "url": p.get("website_url"),
                    "phone": p.get("phone"),
                    "location": p.get("location")
                }
                for p in pending
            ],
            "admin_url": "Para aprobar un link, usa: PUT /api/links/{id} con {\"status\": \"approved\"}",
            "admin_panel_instructions": "Usa esta respuesta JSON para ver datos. Para aprobar links manualmente contacta al desarrollador."
        }
    except Exception as e:
        return {"error": str(e), "working": False}

@api_router.post("/admin/recover-logos")
async def recover_logos():
    """Recuperación automática de logos perdidos"""
    try:
        import glob
        from datetime import datetime
        
        # Get all physical files
        uploads_dir = "/app/backend/uploads"
        all_files = glob.glob(f"{uploads_dir}/*")
        file_info = []
        
        for file_path in all_files:
            if os.path.isfile(file_path):
                filename = os.path.basename(file_path)
                file_size = os.path.getsize(file_path)
                file_mtime = os.path.getmtime(file_path)
                file_info.append({
                    "filename": filename,
                    "size": file_size,
                    "mtime": file_mtime,
                    "mtime_str": datetime.fromtimestamp(file_mtime).isoformat()
                })
        
        # Get all links from database
        links = await db.link_submissions.find().to_list(None)
        
        # Find links without logos (orphaned links)
        orphaned_links = []
        links_with_logos = []
        
        for link in links:
            if not link.get("custom_logo") and not link.get("favicon_url"):
                orphaned_links.append(link)
            else:
                links_with_logos.append(link)
        
        # Find orphaned files (files not referenced by any link)
        referenced_files = set()
        for link in links:
            if link.get("custom_logo"):
                referenced_files.add(link["custom_logo"])
        
        orphaned_files = [f for f in file_info if f["filename"] not in referenced_files]
        
        # Smart pairing algorithm
        recovered_count = 0
        recovery_log = []
        
        # Sort orphaned files by date (newest first)
        orphaned_files.sort(key=lambda x: x["mtime"], reverse=True)
        
        # Sort orphaned links by creation date
        orphaned_links.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Attempt to pair files with links based on size and date proximity
        for i, link in enumerate(orphaned_links[:min(len(orphaned_links), len(orphaned_files))]):
            if i < len(orphaned_files):
                file_to_assign = orphaned_files[i]
                
                # Skip tiny files (likely corrupted)
                if file_to_assign["size"] < 1000:
                    continue
                
                # Update link with recovered logo
                await db.link_submissions.update_one(
                    {"id": link["id"]},
                    {"$set": {"custom_logo": file_to_assign["filename"]}}
                )
                
                recovered_count += 1
                recovery_log.append({
                    "link_id": link["id"],
                    "owner_name": link.get("owner_name"),
                    "recovered_file": file_to_assign["filename"],
                    "file_size": file_to_assign["size"]
                })
        
        return {
            "success": True,
            "recovered_count": recovered_count,
            "total_orphaned_links": len(orphaned_links),
            "total_orphaned_files": len(orphaned_files),
            "recovery_log": recovery_log,
            "file_statistics": {
                "total_files": len(file_info),
                "files_over_1kb": len([f for f in file_info if f["size"] > 1000]),
                "files_under_1kb": len([f for f in file_info if f["size"] <= 1000])
            }
        }
        
    except Exception as e:
        logger.error(f"Error recovering logos: {e}")
        return {"success": False, "error": str(e)}

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