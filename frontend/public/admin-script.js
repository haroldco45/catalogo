// Script para añadir funcionalidad de gestión de logos al panel de admin
(function() {
    console.log('🚀 Iniciando script de gestión de logos...');
    
    // Esperar a que cargue la página
    function addLogoManagementButton() {
        // Buscar el botón de RECARGAR DATOS
        const reloadButton = document.querySelector('button:has-text("RECARGAR DATOS"), [data-testid*="reload"], button');
        
        if (reloadButton) {
            console.log('✅ Botón encontrado, agregando gestión de logos');
            
            // Crear botón de gestión de logos
            const logoButton = document.createElement('button');
            logoButton.innerHTML = '🖼️ VER Y EDITAR LOGOS';
            logoButton.className = 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold text-sm ml-2';
            logoButton.style.marginLeft = '10px';
            
            logoButton.onclick = function() {
                showLinksModal();
            };
            
            // Insertar el botón después del botón de recargar
            reloadButton.parentNode.insertBefore(logoButton, reloadButton.nextSibling);
            console.log('✅ Botón de gestión agregado');
            
            return true;
        }
        return false;
    }
    
    // Función para mostrar modal con links
    async function showLinksModal() {
        console.log('🔍 Cargando links...');
        
        try {
            const response = await fetch('/api/admin/status');
            const data = await response.json();
            
            if (data.success && data.links) {
                const approvedLinks = data.links.filter(link => link.status === 'approved');
                console.log(`✅ ${approvedLinks.length} links aprobados encontrados`);
                
                createLinksModal(approvedLinks);
            } else {
                alert('❌ Error al cargar los links');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error de conexión');
        }
    }
    
    // Crear modal con lista de links
    function createLinksModal(links) {
        // Crear overlay del modal
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'linksModal';
        modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modalOverlay.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold text-green-800">🖼️ Gestión de Links y Logos</h2>
                    <button onclick="closeLinksModal()" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">✕</button>
                </div>
                
                <div class="mb-4 p-4 bg-blue-50 rounded-lg">
                    <p class="text-sm"><strong>📋 Total de links aprobados:</strong> ${links.length}</p>
                    <p class="text-xs text-gray-600 mt-1">Haz clic en "EDITAR LOGO" para subir, cambiar o eliminar el logo de cualquier link.</p>
                </div>
                
                <div class="space-y-3">
                    ${links.slice(0, 15).map((link, index) => `
                        <div class="border border-green-200 bg-green-50 rounded-lg p-4">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center gap-3">
                                    <div class="w-12 h-12 rounded bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                        ${link.owner_name ? link.owner_name.charAt(0).toUpperCase() : index + 1}
                                    </div>
                                    <div>
                                        <p class="font-semibold text-lg text-green-800">✅ ${link.owner_name}</p>
                                        <p class="text-sm text-blue-600">${link.website_url}</p>
                                        <p class="text-xs text-gray-500">📞 ${link.phone || 'N/A'} | 📍 ${link.location || 'N/A'}</p>
                                    </div>
                                </div>
                                <button 
                                    onclick="editLogo('${link.id}', '${link.owner_name}', '${link.website_url}')"
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold"
                                >
                                    🖼️ EDITAR LOGO
                                </button>
                            </div>
                        </div>
                    `).join('')}
                    
                    ${links.length > 15 ? `
                        <div class="text-center py-4 bg-gray-50 rounded-lg">
                            <p class="text-sm text-gray-600">Mostrando los primeros 15 links de ${links.length} totales</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="mt-6 text-center">
                    <button onclick="closeLinksModal()" class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);
    }
    
    // Función para cerrar modal
    window.closeLinksModal = function() {
        const modal = document.getElementById('linksModal');
        if (modal) {
            modal.remove();
        }
    };
    
    // Función para editar logo
    window.editLogo = function(linkId, ownerName, websiteUrl) {
        const message = `🖼️ EDITAR LOGO DE: ${ownerName}\n🌐 ${websiteUrl}\n\n` +
                       `Para editar el logo de este link:\n\n` +
                       `1. 📤 SUBIR NUEVO LOGO:\n` +
                       `   • Ir al backend: /api/links/${linkId}/logo\n` +
                       `   • Método: PUT\n` +
                       `   • Subir archivo con nombre: custom_logo\n\n` +
                       `2. 🗑️ ELIMINAR LOGO:\n` +
                       `   • Enviar: {"remove_logo": true}\n\n` +
                       `3. 🔄 ACTUALIZAR FAVICON:\n` +
                       `   • Endpoint: /api/links/${linkId}/refresh-logo\n` +
                       `   • Método: POST\n\n` +
                       `💡 ¿Deseas copiar el ID del link al portapapeles?`;
        
        if (confirm(message)) {
            // Copiar ID al portapapeles
            if (navigator.clipboard) {
                navigator.clipboard.writeText(linkId).then(() => {
                    alert(`✅ ID copiado: ${linkId}\n\nAhora puedes usar este ID para hacer llamadas directas al API.`);
                });
            } else {
                alert(`✅ ID del link: ${linkId}\n\n(Copia manualmente este ID para usar con el API)`);
            }
        }
    };
    
    // Intentar agregar el botón cada segundo hasta que aparezca
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        
        if (addLogoManagementButton() || attempts > 30) {
            clearInterval(interval);
            if (attempts > 30) {
                console.log('⚠️ No se pudo encontrar el botón de recargar después de 30 intentos');
            }
        }
    }, 1000);
    
    console.log('🔄 Buscando botón para agregar funcionalidad...');
})();