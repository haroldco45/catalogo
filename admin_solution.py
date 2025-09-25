from fastapi import APIRouter
from fastapi.responses import HTMLResponse

# Add this route to your existing server.py
@api_router.get("/admin-working", response_class=HTMLResponse)
async def admin_panel_working():
    """Working admin panel - NO React, NO cache issues"""
    
    # Get current data
    try:
        all_links = await db.link_submissions.find().sort("created_at", -1).to_list(None)
        
        approved = [l for l in all_links if l.get("status") == "approved"]
        pending = [l for l in all_links if l.get("status") == "pending"]
        
        # Build HTML directly
        pending_html = ""
        for link in pending:
            pending_html += f"""
            <div style="border: 3px solid #ff0000; background: #ffe6e6; padding: 15px; margin: 10px 0; border-radius: 8px;">
                <h3 style="color: #cc0000; margin: 0;">{link.get('owner_name', 'N/A')}</h3>
                <p><strong>URL:</strong> {link.get('website_url', 'N/A')}</p>
                <p><strong>Location:</strong> {link.get('location', 'N/A')}</p>
                <p><strong>Phone:</strong> {link.get('phone', 'N/A')}</p>
                <form method="post" action="/api/approve-now" style="display: inline-block; margin-right: 10px;">
                    <input type="hidden" name="link_id" value="{link.get('id')}">
                    <button type="submit" style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        ✅ APROBAR AHORA
                    </button>
                </form>
                <form method="post" action="/api/reject-now" style="display: inline-block;">
                    <input type="hidden" name="link_id" value="{link.get('id')}">
                    <button type="submit" style="background: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        ❌ RECHAZAR
                    </button>
                </form>
            </div>
            """
        
        if not pending_html:
            pending_html = "<p style='color: green; font-weight: bold; text-align: center; padding: 20px;'>✅ NO HAY LINKS PENDIENTES</p>"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>ADMIN DEFINITIVO - PAGINA DEL LINK</title>
            <meta http-equiv="refresh" content="30">
        </head>
        <body style="font-family: Arial; margin: 0; padding: 20px; background: #f5f5f5;">
            <div style="max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
                
                <div style="background: linear-gradient(135deg, #ff4757, #2ed573); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
                    <h1 style="margin: 0; font-size: 28px;">🚨 PANEL ADMIN DEFINITIVO</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px;">Esta página se actualiza cada 30 segundos</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #2196f3;">
                        <h2 style="margin: 0; color: #1976d2; font-size: 36px;">{len(all_links)}</h2>
                        <p style="margin: 5px 0 0 0; color: #1976d2; font-weight: bold;">TOTAL LINKS</p>
                    </div>
                    <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #4caf50;">
                        <h2 style="margin: 0; color: #388e3c; font-size: 36px;">{len(approved)}</h2>
                        <p style="margin: 5px 0 0 0; color: #388e3c; font-weight: bold;">APROBADOS</p>
                    </div>
                    <div style="background: #fff3e0; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #ff9800;">
                        <h2 style="margin: 0; color: #f57c00; font-size: 36px;">{len(pending)}</h2>
                        <p style="margin: 5px 0 0 0; color: #f57c00; font-weight: bold;">PENDIENTES</p>
                    </div>
                    <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #4caf50;">
                        <h2 style="margin: 0; color: #388e3c; font-size: 36px;">${len(approved)}</h2>
                        <p style="margin: 5px 0 0 0; color: #388e3c; font-weight: bold;">INGRESOS USD</p>
                    </div>
                </div>
                
                <div style="background: #fff; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #333; margin: 0 0 20px 0;">⚠️ LINKS PENDIENTES DE APROBACIÓN</h2>
                    {pending_html}
                </div>
                
                <div style="margin-top: 30px; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <p style="color: #666; margin: 0;"><strong>Página principal:</strong> <a href="https://linkverse-2.emergent.host" target="_blank">https://linkverse-2.emergent.host</a></p>
                    <p style="color: #666; margin: 5px 0 0 0;"><strong>Total ingresos generados:</strong> ${len(approved)} USD</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html
        
    except Exception as e:
        return f"""
        <html>
        <body style="font-family: Arial; padding: 20px;">
            <h1 style="color: red;">ERROR EN ADMIN PANEL</h1>
            <p><strong>Error:</strong> {str(e)}</p>
            <a href="/api/admin-working">RECARGAR</a>
        </body>
        </html>
        """

@api_router.post("/approve-now")
async def approve_link_now(link_id: str = Form(...)):
    """Approve link immediately"""
    try:
        result = await db.link_submissions.update_one(
            {"id": link_id}, 
            {"$set": {"status": "approved"}}
        )
        if result.modified_count > 0:
            return RedirectResponse(url="/api/admin-working", status_code=303)
        else:
            return HTMLResponse(f"<html><body><h1>ERROR: Link {link_id} no encontrado</h1><a href='/api/admin-working'>VOLVER</a></body></html>")
    except Exception as e:
        return HTMLResponse(f"<html><body><h1>ERROR: {str(e)}</h1><a href='/api/admin-working'>VOLVER</a></body></html>")

@api_router.post("/reject-now") 
async def reject_link_now(link_id: str = Form(...)):
    """Reject link immediately"""
    try:
        result = await db.link_submissions.update_one(
            {"id": link_id},
            {"$set": {"status": "rejected"}}
        )
        if result.modified_count > 0:
            return RedirectResponse(url="/api/admin-working", status_code=303)
        else:
            return HTMLResponse(f"<html><body><h1>ERROR: Link {link_id} no encontrado</h1><a href='/api/admin-working'>VOLVER</a></body></html>")
    except Exception as e:
        return HTMLResponse(f"<html><body><h1>ERROR: {str(e)}</h1><a href='/api/admin-working'>VOLVER</a></body></html>")