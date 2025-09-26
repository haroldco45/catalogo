import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Globe, Upload, Users, DollarSign, Eye, CheckCircle, XCircle, Clock, Edit, Save, X, Camera, Trash2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Simple notification system to replace Sonner
const useNotification = () => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, type = 'info') => {
    const id = Date.now();
    const notification = { id, message, type };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    showNotification,
    removeNotification,
    success: (message) => showNotification(message, 'success'),
    error: (message) => showNotification(message, 'error'),
    info: (message) => showNotification(message, 'info')
  };
};

const NotificationContainer = ({ notifications, onRemove }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => onRemove(notification.id)}
              className="ml-2 text-white hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const SubmitLinkModal = ({ isOpen, onClose, notify }) => {
  const [formData, setFormData] = useState({
    owner_name: '',
    phone: '',
    location: '',
    website_url: ''
  });
  const [paymentFile, setPaymentFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ owner_name: '', phone: '', location: '', website_url: '' });
      setPaymentFile(null);
      setLogoFile(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!paymentFile) {
      notify.error("Por favor sube la captura de pantalla del pago");
      return;
    }

    setSubmitting(true);
    
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      formDataToSend.append('payment_screenshot', paymentFile);
      
      // Add custom logo if provided
      if (logoFile) {
        formDataToSend.append('custom_logo', logoFile);
      }

      await axios.post(`${API}/links/submit`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      notify.success("¡Link enviado correctamente! Será revisado antes de ser publicado.");
      onClose();
      setFormData({ owner_name: '', phone: '', location: '', website_url: '' });
      setPaymentFile(null);
      setLogoFile(null);
      
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Error al enviar el link";
      notify.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Enviar tu Link</h2>
              <p className="text-sm text-slate-600 mt-1">
                Completa el formulario para enviar tu sitio web. Será revisado antes de ser publicado.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="submit-form">
            <div className="space-y-2">
              <Label htmlFor="owner_name">Nombre del propietario *</Label>
              <Input
                id="owner_name"
                value={formData.owner_name}
                onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                placeholder="Tu nombre completo"
                required
                data-testid="owner-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="3001234567"
                required
                data-testid="phone-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Ubicación *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Ciudad, País"
                required
                data-testid="location-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url">URL del sitio web *</Label>
              <Input
                id="website_url"
                value={formData.website_url}
                onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                placeholder="https://tusitio.com"
                required
                data-testid="website-url-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom_logo">Logo personalizado (opcional)</Label>
              <Input
                id="custom_logo"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files[0])}
                data-testid="custom-logo-input"
              />
              <p className="text-xs text-slate-500">
                Sube tu logo personalizado (PNG, JPG). Si no lo subes, usaremos el logo de tu sitio automáticamente.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_screenshot">Captura de pantalla del pago *</Label>
              <Input
                id="payment_screenshot"
                type="file"
                accept="image/*"
                onChange={(e) => setPaymentFile(e.target.files[0])}
                required
                data-testid="payment-screenshot-input"
              />
              <p className="text-xs text-slate-500">
                Sube una captura del pago de $1 USD enviado a Nequi 3117700431
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              data-testid="submit-form-button"
            >
              {submitting ? "Enviando..." : "Enviar Link"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Public client view - show gallery + submit form
const ClientView = ({ notify }) => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const fetchApprovedLinks = async () => {
    try {
      const response = await axios.get(`${API}/links?status=approved`);
      setLinks(response.data);
    } catch (error) {
      console.error("Error fetching links:", error);
      notify.error("Error al cargar los links");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedLinks();
  }, []);

  const handleLinkClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                PAGINA DEL LINK
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="text-sm">
                {links.length} Links Activos
              </Badge>
              <Button
                onClick={() => setShowSubmitForm(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-2 rounded-xl shadow-md transition-all duration-300"
                data-testid="submit-link-button"
              >
                <Upload className="w-4 h-4 mr-2" />
                Enviar Mi Link
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 leading-tight">
            Comparte tu sitio web con el mundo
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Por solo <span className="font-bold text-green-600">$1 USD</span> puedes mostrar tu sitio web 
            como un ícono en nuestra página. Pago único, exposición permanente.
          </p>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto shadow-lg">
            <h3 className="font-semibold text-slate-700 mb-3">Información de Pago</h3>
            <div className="text-left space-y-2">
              <p className="text-sm"><span className="font-medium">Método:</span> Nequi</p>
              <p className="text-sm"><span className="font-medium">Número:</span> 3117700431</p>
              <p className="text-sm"><span className="font-medium">Valor:</span> $1 USD (equivalente en COP)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Links Grid */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-800 mb-8 text-center">
            Links Publicados ({links.length})
          </h3>
          
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-16">
              <Globe className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">Aún no hay links publicados</p>
              <p className="text-slate-400">¡Sé el primero en enviar tu sitio web!</p>
            </div>
          ) : (
            <div 
              className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4"
              data-testid="links-grid"
            >
              {links.map((link) => (
                <Card
                  key={link.id}
                  className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg bg-white/80 backdrop-blur-sm border-slate-200 hover:border-blue-300"
                  onClick={() => handleLinkClick(link.website_url)}
                  data-testid={`link-card-${link.id}`}
                >
                  <CardContent className="p-3 flex flex-col items-center justify-center aspect-square">
                    {/* OPTIMIZADO PARA CAPTURAS DE PANTALLA DE INSTAGRAM */}
                    {link.custom_logo ? (
                      <img
                        src={`${BACKEND_URL}/api/uploads/${link.custom_logo}`}
                        alt={`${link.owner_name} logo`}
                        className="w-8 h-8 mb-2 rounded-md object-cover shadow-sm"
                        style={{ 
                          objectFit: 'cover',
                          objectPosition: 'center center'
                        }}
                        onError={(e) => {
                          console.log(`❌ Error cargando logo personalizado para ${link.owner_name}:`, e.target.src);
                          // If custom logo fails, try favicon
                          e.target.style.display = 'none';
                          const faviconImg = e.target.nextSibling;
                          if (faviconImg && link.favicon_url) {
                            faviconImg.style.display = 'block';
                          } else {
                            // Show fallback
                            const fallback = link.favicon_url ? 
                              e.target.nextSibling?.nextSibling : 
                              e.target.nextSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }
                        }}
                        onLoad={(e) => {
                          console.log(`✅ Logo personalizado cargado para ${link.owner_name}:`, e.target.src);
                        }}
                      />
                    ) : link.favicon_url ? (
                      <img
                        src={link.favicon_url}
                        alt={`${link.owner_name} favicon`}
                        className="w-8 h-8 mb-2 rounded-md object-contain"
                        style={{ display: link.custom_logo ? 'none' : 'block' }}
                        onError={(e) => {
                          console.log(`❌ Error cargando favicon para ${link.owner_name}:`, e.target.src);
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-8 h-8 mb-2 rounded-md bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center ${
                        (link.custom_logo || link.favicon_url) ? 'hidden' : 'flex'
                      }`}
                    >
                      <span className="text-white font-bold text-sm">
                        {link.owner_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-center font-medium text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {link.display_name || new URL(link.website_url).hostname.replace('www.', '')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 px-4 bg-white/40">
        <div className="max-w-6xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-slate-800 mb-4">
            ¿Quieres que tu sitio aparezca aquí?
          </h3>
          <p className="text-slate-600 mb-6">
            Únete a las empresas que ya están visible para miles de personas
          </p>
          <Button
            onClick={() => setShowSubmitForm(true)}
            size="lg"
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <Upload className="w-5 h-5 mr-3" />
            ¡Enviar Mi Sitio Web Ahora!
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-slate-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-slate-400">
            © 2025 PAGINA DEL LINK. Haz que tu sitio web sea visible para el mundo.
          </p>
        </div>
      </footer>

      {/* Submit Link Modal */}
      {showSubmitForm && (
        <SubmitLinkModal 
          isOpen={showSubmitForm} 
          onClose={() => setShowSubmitForm(false)}
          onSuccess={fetchApprovedLinks}
          notify={notify}
        />
      )}
    </div>
  );
};

// EMERGENCY ADMIN PANEL - COMPLETELY NEW COMPONENT
const EmergencyAdminPanel = ({ notify }) => {
  const [links, setLinks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [logoEditModal, setLogoEditModal] = useState({
    open: false,
    link: null
  });

  const openLogoEditModal = (link) => {
    setLogoEditModal({
      open: true,
      link: link
    });
  };

  const closeLogoEditModal = () => {
    setLogoEditModal({
      open: false,
      link: null
    });
  };

  const uploadNewLogo = async (linkId, file) => {
    try {
      const formData = new FormData();
      formData.append('custom_logo', file);

      await axios.put(`${API}/links/${linkId}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      notify.success('✅ Logo actualizado correctamente');
      emergencyLoadData();
      closeLogoEditModal();
    } catch (error) {
      notify.error('❌ Error al actualizar el logo');
    }
  };

  const removeLogo = async (linkId) => {
    try {
      await axios.put(`${API}/links/${linkId}/logo`, { remove_logo: true });
      notify.success('✅ Logo eliminado, se extrajo favicon automático');
      emergencyLoadData();
      closeLogoEditModal();
    } catch (error) {
      notify.error('❌ Error al eliminar el logo');
    }
  };

  const refreshFavicon = async (linkId) => {
    try {
      await axios.post(`${API}/links/${linkId}/refresh-logo`);
      notify.success('✅ Favicon actualizado');
      emergencyLoadData();
      closeLogoEditModal();
    } catch (error) {
      notify.error('❌ Error al actualizar favicon');
    }
  };

  const emergencyLoadData = async () => {
    console.log("🚨 EMERGENCY: Loading admin data from /api/admin/status");
    setLoading(true);
    
    try {
      const response = await axios.get(`${API}/admin/status`);
      console.log("🚨 EMERGENCY: Response received", response.data);
      
      if (response.data.success) {
        const data = response.data;
        setLinks(data.links || []);
        setStats({
          total_submissions: data.total_links,
          approved: data.approved,
          pending: data.pending,
          rejected: data.rejected,
          estimated_revenue: data.revenue
        });
        
        notify.success(`🚨 EMERGENCY: ${data.total_links} links cargados (${data.pending} pendientes)`);
      } else {
        throw new Error(response.data.error || "Error en endpoint de emergencia");
      }
    } catch (error) {
      console.error("🚨 EMERGENCY: Error loading data", error);
      notify.error(`🚨 ERROR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const emergencyApprove = async (linkId) => {
    try {
      await axios.put(`${API}/links/${linkId}`, { status: 'approved' });
      notify.success("✅ Link aprobado");
      emergencyLoadData(); // Reload
    } catch (error) {
      notify.error("❌ Error al aprobar");
    }
  };

  const emergencyReject = async (linkId) => {
    try {
      await axios.put(`${API}/links/${linkId}`, { status: 'rejected' });
      notify.success("✅ Link rechazado");
      emergencyLoadData(); // Reload
    } catch (error) {
      notify.error("❌ Error al rechazar");
    }
  };

  useEffect(() => {
    emergencyLoadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-red-600 font-bold">🚨 CARGANDO PANEL DE EMERGENCIA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* EMERGENCY HEADER */}
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-red-800">🚨 PANEL DE EMERGENCIA</h2>
          <Button onClick={emergencyLoadData} className="bg-red-600 hover:bg-red-700 text-white">
            🔄 RECARGAR AHORA
          </Button>
        </div>
        <p className="text-red-700 mt-2">Panel de emergencia activado - {stats.pending || 0} links esperando aprobación</p>
      </div>

      {/* EMERGENCY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total_submissions || 0}</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-green-200">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Aprobados</p>
            <p className="text-3xl font-bold text-green-600">{stats.approved || 0}</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-yellow-200">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">⚠️ PENDIENTES</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending || 0}</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-green-200">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">💰 Ingresos</p>
            <p className="text-3xl font-bold text-green-600">${stats.estimated_revenue || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* EMERGENCY LINKS LIST */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-800">
            🚨 TODOS LOS LINKS ({links.length}) - ACCIÓN INMEDIATA REQUERIDA
          </h3>
          
          {links.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-bold">🚨 NO SE CARGARON LINKS</p>
              <Button onClick={emergencyLoadData} className="mt-4 bg-red-600">
                RECARGAR AHORA
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* PENDING LINKS FIRST */}
              {links.filter(link => link.status === 'pending').map((link) => (
                <div key={link.id} className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-yellow-800">⚠️ PENDIENTE DE APROBACIÓN</p>
                      <p className="font-semibold text-lg">{link.owner_name}</p>
                      <p className="text-sm text-blue-600 underline">{link.website_url}</p>
                      <p className="text-xs text-gray-500">ID: {link.id}</p>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        onClick={() => emergencyApprove(link.id)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold"
                        size="sm"
                      >
                        ✅ APROBAR YA
                      </Button>
                      <Button
                        onClick={() => emergencyReject(link.id)}
                        variant="destructive"
                        size="sm"
                      >
                        ❌ RECHAZAR
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* APPROVED LINKS */}
              {links.filter(link => link.status === 'approved').map((link) => (
                <div key={link.id} className="border border-green-200 bg-green-50 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {/* Logo Preview */}
                      <div className="flex-shrink-0">
                        {link.custom_logo ? (
                          <img
                            src={`${BACKEND_URL}/api/uploads/${link.custom_logo}`}
                            alt="Logo"
                            className="w-8 h-8 rounded object-cover border"
                          />
                        ) : link.favicon_url ? (
                          <img
                            src={link.favicon_url}
                            alt="Favicon"
                            className="w-8 h-8 rounded object-cover border"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                            {link.owner_name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <span className="text-green-600 font-bold">✅</span>
                        <span className="ml-2 font-semibold">{link.owner_name}</span>
                        <span className="ml-2 text-sm text-blue-600">{link.website_url}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">APROBADO</Badge>
                      
                      {/* Logo Edit Button */}
                      <Button
                        onClick={() => openLogoEditModal(link)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        🖼️ EDITAR LOGO
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logo Edit Modal */}
      {logoEditModal.open && logoEditModal.link && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Editar Logo - {logoEditModal.link.owner_name}</h3>
              <button 
                onClick={closeLogoEditModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {/* Current Logo Preview */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Logo Actual:</p>
              <div className="flex items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded">
                {logoEditModal.link.custom_logo ? (
                  <img
                    src={`${BACKEND_URL}/api/uploads/${logoEditModal.link.custom_logo}`}
                    alt="Logo actual"
                    className="w-full h-full object-cover rounded"
                  />
                ) : logoEditModal.link.favicon_url ? (
                  <img
                    src={logoEditModal.link.favicon_url}
                    alt="Favicon actual"
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold rounded">
                    {logoEditModal.link.owner_name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
            </div>

            {/* Upload New Logo */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Subir Nuevo Logo:</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    uploadNewLogo(logoEditModal.link.id, file);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => refreshFavicon(logoEditModal.link.id)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white flex-1"
              >
                🔄 Actualizar Favicon
              </Button>
              
              <Button
                onClick={() => removeLogo(logoEditModal.link.id)}
                variant="destructive"
                className="flex-1"
              >
                🗑️ Eliminar Logo
              </Button>
            </div>

            <div className="mt-4">
              <Button
                onClick={closeLogoEditModal}
                className="w-full bg-gray-500 hover:bg-gray-600"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Admin view with authentication
const AdminView = ({ notify }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [adminData, setAdminData] = useState({});
  const [loading, setLoading] = useState(false);
  const [logoEditModal, setLogoEditModal] = useState({
    open: false,
    link: null
  });

  const openLogoEditModal = (link) => {
    setLogoEditModal({
      open: true,
      link: link
    });
  };

  const closeLogoEditModal = () => {
    setLogoEditModal({
      open: false,
      link: null
    });
  };

  const uploadNewLogo = async (linkId, file) => {
    try {
      const formData = new FormData();
      formData.append('custom_logo', file);

      await axios.put(`${API}/links/${linkId}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      notify.success('✅ Logo actualizado correctamente');
      loadAdminData();
      closeLogoEditModal();
    } catch (error) {
      notify.error('❌ Error al actualizar el logo');
    }
  };

  const removeLogo = async (linkId) => {
    try {
      await axios.put(`${API}/links/${linkId}/logo`, { remove_logo: true });
      notify.success('✅ Logo eliminado, se extrajo favicon automático');
      loadAdminData();
      closeLogoEditModal();
    } catch (error) {
      notify.error('❌ Error al eliminar el logo');
    }
  };

  const refreshFavicon = async (linkId) => {
    try {
      await axios.post(`${API}/links/${linkId}/refresh-logo`);
      notify.success('✅ Favicon actualizado');
      loadAdminData();
      closeLogoEditModal();
    } catch (error) {
      notify.error('❌ Error al actualizar favicon');
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple password check (you can make this more secure)
    if (password === 'admin123') {
      setIsAuthenticated(true);
      notify.success('Acceso administrativo autorizado');
    } else {
      notify.error('Contraseña incorrecta');
      setPassword('');
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/status`);
      if (response.data.success) {
        setAdminData(response.data);
        notify.success(`✅ ${response.data.total_links} links cargados (${response.data.pending} pendientes)`);
      } else {
        throw new Error(response.data.error || 'Error cargando datos');
      }
    } catch (error) {
      console.error('Error:', error);
      notify.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const approveLink = async (linkId) => {
    try {
      await axios.put(`${API}/links/${linkId}`, { status: 'approved' });
      notify.success('✅ Link aprobado');
      loadAdminData();
    } catch (error) {
      notify.error('Error al aprobar link');
    }
  };

  const rejectLink = async (linkId) => {
    try {
      await axios.put(`${API}/links/${linkId}`, { status: 'rejected' });
      notify.success('✅ Link rechazado');
      loadAdminData();
    } catch (error) {
      notify.error('Error al rechazar link');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800">Panel de Administración</h1>
              <p className="text-slate-600 mt-2">Ingresa la contraseña para continuar</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa la contraseña"
                  className="mt-1"
                  data-testid="admin-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-slate-800 hover:bg-slate-900"
                data-testid="admin-login-button"
              >
                Acceder
              </Button>
            </form>
            
            <div className="mt-6 pt-6 border-t text-center">
              <a 
                href="/" 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ← Volver a la página principal
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-800">Panel de Administración</h1>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAuthenticated(false);
                  setPassword('');
                  notify.info('Sesión cerrada');
                }}
              >
                Cerrar Sesión
              </Button>
              <a href="/" className="text-sm text-blue-600 hover:text-blue-800">
                Ver sitio público
              </a>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-red-600 text-white p-6 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">🚨 PANEL FUNCIONAL DE ADMINISTRACIÓN</h1>
            <div className="flex gap-4">
              <Button onClick={loadAdminData} disabled={loading} className="bg-white text-red-600 hover:bg-gray-100">
                {loading ? '⏳ Cargando...' : '🔄 RECARGAR DATOS'}
              </Button>
              
              <a 
                href="/admin-links.html"
                target="_blank"
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-lg shadow-lg inline-flex items-center gap-2 text-decoration-none"
              >
                🖼️ GESTIONAR LOGOS
              </a>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Total Links</p>
              <p className="text-2xl font-bold">{adminData.total_links || 0}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Aprobados</p>
              <p className="text-2xl font-bold">{adminData.approved || 0}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Pendientes</p>
              <p className="text-2xl font-bold">{adminData.pending || 0}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Ingresos</p>
              <p className="text-2xl font-bold">${adminData.revenue || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Links */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">⚠️ Links Pendientes de Aprobación</h2>
              {adminData.links && adminData.links.filter(link => link.status === 'approved').length > 0 && (
                <button
                  onClick={() => {
                    const approvedLinks = adminData.links.filter(link => link.status === 'approved');
                    
                    // Crear modal HTML completo para gestión de logos - VERSION ACTUALIZADA CON EDICION DE NOMBRES
                    const timestamp = Date.now(); // Para evitar caché
                    const modalHTML = `
                        <div id="logoManagementModal" style="
                            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                            background: rgba(0,0,0,0.5); z-index: 10000; 
                            display: flex; align-items: center; justify-content: center;
                        ">
                            <div style="
                                background: white; border-radius: 10px; padding: 30px; 
                                max-width: 900px; width: 90%; max-height: 80vh; overflow-y: auto;
                                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                            ">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                    <h2 style="margin: 0; color: #2d5a27; font-size: 24px;">🖼️ Gestión de Logos</h2>
                                    <button onclick="document.getElementById('logoManagementModal').remove()" 
                                        style="background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; font-size: 18px; cursor: pointer;">✕</button>
                                </div>
                                
                                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                    <p style="margin: 0; font-size: 14px;"><strong>📋 ${approvedLinks.length} links aprobados</strong> | Haz clic en "SUBIR LOGO" para cambiar el logo de cualquier link</p>
                                </div>
                                
                                <div style="max-height: 400px; overflow-y: auto;">
                                    ${approvedLinks.map(link => `
                                        <div style="
                                            border: 1px solid #28a745; background: #f8fff8; border-radius: 8px; 
                                            padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;
                                        ">
                                            <div>
                                                <p style="margin: 0; font-weight: bold; color: #2d5a27; font-size: 16px;">✅ ${link.owner_name}</p>
                                                <p style="margin: 5px 0 0 0; color: #0066cc; font-size: 14px;">${link.website_url}</p>
                                                <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">📞 ${link.phone || 'N/A'} | 📍 ${link.location || 'N/A'}</p>
                                            </div>
                                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                                <div style="display: flex; gap: 5px;">
                                                    <input type="file" id="logoFile_${link.id}" accept="image/*" style="display: none;">
                                                    <button onclick="document.getElementById('logoFile_${link.id}').click()" 
                                                        style="background: #007bff; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 12px;">
                                                        🖼️ SUBIR LOGO
                                                    </button>
                                                    <button onclick="removeLogo('${link.id}', '${link.owner_name}')" 
                                                        style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 12px;">
                                                        🗑️ QUITAR
                                                    </button>
                                                </div>
                                                <button onclick="editDisplayName('${link.id}', '${link.owner_name}', '${link.display_name || ''}')" 
                                                    style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-size: 11px; width: 100%;">
                                                    ✏️ CAMBIAR NOMBRE: "${link.display_name || 'instagram.com'}"
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                                
                                <div style="text-align: center; margin-top: 20px;">
                                    <button onclick="document.getElementById('logoManagementModal').remove()" 
                                        style="background: #6c757d; color: white; border: none; padding: 10px 30px; border-radius: 5px; cursor: pointer;">
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    // Insertar modal en el DOM
                    document.body.insertAdjacentHTML('beforeend', modalHTML);
                    
                    // Agregar event listeners para subir archivos
                    approvedLinks.forEach(link => {
                        const fileInput = document.getElementById(`logoFile_${link.id}`);
                        if (fileInput) {
                            fileInput.onchange = async function(event) {
                                const file = event.target.files[0];
                                if (file) {
                                    await window.uploadLogo(link.id, link.owner_name, file);
                                }
                            };
                        }
                    });
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold text-sm"
                >
                  📋 VER LINKS APROBADOS ({adminData.approved || 0})
                </button>
              )}
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Cargando datos...</p>
              </div>
            ) : (
              <div>
                {adminData.links ? (
                  <div>
                    {/* Links Pendientes */}
                    {adminData.links.filter(link => link.status === 'pending').length === 0 ? (
                      <div>
                        <p className="text-green-600 font-bold text-center py-4 mb-6">✅ No hay links pendientes</p>
                        
                        {/* GESTIÓN DE LINKS APROBADOS - INTEGRADO AQUÍ */}
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-green-800">📋 Gestionar Links Aprobados</h3>
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                              {adminData.approved || 0} Links Activos
                            </span>
                          </div>
                          
                          {adminData.links && adminData.links.length > 0 ? (
                            <div className="space-y-3">
                              {adminData.links.filter(link => link.status === 'approved').slice(0, 10).map(link => (
                                <div key={link.id} className="border border-green-300 bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                      <div className="flex-shrink-0">
                                        {link.custom_logo ? (
                                          <img
                                            src={`${BACKEND_URL}/api/uploads/${link.custom_logo}`}
                                            alt="Logo"
                                            className="w-12 h-12 rounded object-cover border-2 border-green-400"
                                          />
                                        ) : link.favicon_url ? (
                                          <img
                                            src={link.favicon_url}
                                            alt="Favicon"
                                            className="w-12 h-12 rounded object-cover border-2 border-green-400"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold border-2 border-green-400">
                                            {link.owner_name?.charAt(0).toUpperCase() || '?'}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-green-600 font-bold">✅</span>
                                          <span className="font-semibold text-lg">{link.owner_name}</span>
                                        </div>
                                        <p className="text-sm text-blue-600 hover:underline cursor-pointer" 
                                           onClick={() => window.open(link.website_url, '_blank')}>
                                          {link.website_url}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          📞 {link.phone} | 📍 {link.location}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Button
                                        onClick={() => openLogoEditModal(link)}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2"
                                      >
                                        🖼️ EDITAR LOGO
                                      </Button>
                                      <Button
                                        onClick={() => rejectLink(link.id)}
                                        variant="destructive"
                                        size="sm"
                                        className="px-3 py-2"
                                      >
                                        ❌ RECHAZAR
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              {adminData.links.filter(link => link.status === 'approved').length > 10 && (
                                <p className="text-center text-gray-500 text-sm py-2">
                                  Mostrando los primeros 10 links de {adminData.links.filter(link => link.status === 'approved').length} totales
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-center py-8 text-gray-600">No hay datos de links disponibles</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 mb-6">
                        {adminData.links.filter(link => link.status === 'pending').map(link => (
                          <div key={link.id} className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-bold text-yellow-800">⚠️ {link.owner_name}</h3>
                                <p className="text-sm text-blue-600 underline">{link.website_url}</p>
                                <p className="text-xs text-gray-500">ID: {link.id}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => approveLink(link.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                  size="sm"
                                >
                                  ✅ APROBAR
                                </Button>
                                <Button
                                  onClick={() => rejectLink(link.id)}
                                  variant="destructive"
                                  size="sm"
                                >
                                  ❌ RECHAZAR
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center py-8">Haz clic en "RECARGAR DATOS" para cargar los links</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logo Edit Modal */}
        {logoEditModal.open && logoEditModal.link && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">🖼️ Editar Logo</h3>
                <button 
                  onClick={closeLogoEditModal}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ✕
                </button>
              </div>
              
              {/* Link Info */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-800">{logoEditModal.link.owner_name}</p>
                <p className="text-sm text-blue-600">{logoEditModal.link.website_url}</p>
              </div>
              
              {/* Current Logo Preview */}
              <div className="mb-6">
                <p className="text-sm font-semibold mb-3 text-gray-700">Logo Actual:</p>
                <div className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg mx-auto">
                  {logoEditModal.link.custom_logo ? (
                    <img
                      src={`${BACKEND_URL}/api/uploads/${logoEditModal.link.custom_logo}`}
                      alt="Logo actual"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : logoEditModal.link.favicon_url ? (
                    <img
                      src={logoEditModal.link.favicon_url}
                      alt="Favicon actual"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xl rounded-lg">
                      {logoEditModal.link.owner_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload New Logo */}
              <div className="mb-6">
                <p className="text-sm font-semibold mb-3 text-gray-700">Subir Nuevo Logo:</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      uploadNewLogo(logoEditModal.link.id, file);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 
                           file:mr-4 file:py-2 file:px-4 
                           file:rounded-full file:border-0 
                           file:text-sm file:font-semibold 
                           file:bg-blue-50 file:text-blue-700 
                           hover:file:bg-blue-100
                           border border-gray-300 rounded-lg p-2"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button
                    onClick={() => refreshFavicon(logoEditModal.link.id)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white flex-1 font-semibold"
                  >
                    🔄 Actualizar Favicon
                  </Button>
                  
                  <Button
                    onClick={() => removeLogo(logoEditModal.link.id)}
                    variant="destructive"
                    className="flex-1 font-semibold"
                  >
                    🗑️ Eliminar Logo
                  </Button>
                </div>

                <Button
                  onClick={closeLogoEditModal}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Botón para editar nombres de Instagram - SOLUCIÓN TEMPORAL */}
        {adminData.links && adminData.links.filter(link => link.status === 'approved').length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-purple-800 mb-4">✏️ Gestión Adicional</h3>
              <div className="flex gap-4">
                <Button
                  onClick={async () => {
                    const approvedLinks = adminData.links.filter(link => link.status === 'approved');
                    
                    // Crear lista de links para seleccionar
                    const linkOptions = approvedLinks.map((link, i) => 
                      `${i+1}. ${link.owner_name} - Nombre actual: "${link.display_name || new URL(link.website_url).hostname}"`
                    ).join('\n');
                    
                    const selection = prompt(`🏷️ CAMBIAR NOMBRES QUE APARECEN EN LA PÁGINA\n\nSeleccione el número del link:\n\n${linkOptions}\n\nIngrese el número (1-${approvedLinks.length}):`);
                    
                    if (selection && !isNaN(selection)) {
                      const linkIndex = parseInt(selection) - 1;
                      if (linkIndex >= 0 && linkIndex < approvedLinks.length) {
                        const selectedLink = approvedLinks[linkIndex];
                        const currentName = selectedLink.display_name || new URL(selectedLink.website_url).hostname;
                        
                        const newName = prompt(`✏️ Cambiar nombre para: ${selectedLink.owner_name}\n\nURL: ${selectedLink.website_url}\nNombre actual: "${currentName}"\n\nIngrese el nuevo nombre (ej: "Tienda María", "Restaurante El Sol"):`);
                        
                        if (newName !== null && newName.trim()) {
                          try {
                            const formData = new FormData();
                            formData.append('display_name', newName.trim());
                            
                            const response = await fetch(`${BACKEND_URL}/api/links/${selectedLink.id}/logo`, {
                              method: 'PUT',
                              body: formData
                            });
                            
                            if (response.ok) {
                              alert(`✅ ¡Nombre actualizado exitosamente!\n\nCliente: ${selectedLink.owner_name}\nNombre anterior: "${currentName}"\nNombre nuevo: "${newName.trim()}"\n\n🔄 Recargando para ver cambios...`);
                              window.location.reload();
                            } else {
                              const errorText = await response.text();
                              alert(`❌ Error al actualizar: ${response.status}\n${errorText}`);
                            }
                          } catch (error) {
                            alert(`❌ Error de conexión: ${error.message}`);
                          }
                        } else if (newName !== null) {
                          alert('⚠️ El nombre no puede estar vacío');
                        }
                      } else {
                        alert('⚠️ Número de link inválido');
                      }
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3"
                >
                  ✏️ CAMBIAR NOMBRES DE INSTAGRAM
                </Button>
                
                <Button
                  onClick={() => {
                    const approvedLinks = adminData.links.filter(link => link.status === 'approved');
                    const instagramLinks = approvedLinks.filter(link => 
                      link.website_url.includes('instagram.com') || 
                      link.display_name === null || 
                      link.display_name === ''
                    );
                    
                    if (instagramLinks.length === 0) {
                      alert('✅ ¡Perfecto!\n\nTodos los links de Instagram ya tienen nombres personalizados.');
                      return;
                    }
                    
                    const linksText = instagramLinks.map((link, i) => 
                      `${i+1}. ${link.owner_name} - "${link.display_name || 'instagram.com'}"`
                    ).join('\n');
                    
                    alert(`📋 LINKS DE INSTAGRAM (${instagramLinks.length} total):\n\n${linksText}\n\n💡 Use el botón "CAMBIAR NOMBRES" para personalizar cada uno.`);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                >
                  📋 VER LINKS DE INSTAGRAM
                </Button>
              </div>
              
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-700">
                  <strong>💡 Cómo usar:</strong> Los links de Instagram aparecen como "instagram.com" en la página principal. 
                  Use "CAMBIAR NOMBRES" para personalizarlos (ej: "Tienda María", "Restaurante El Sol").
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Función para subir logo - OPTIMIZADA PARA INSTAGRAM
window.uploadLogo = async function(linkId, ownerName, file) {
  console.log('🖼️ Iniciando subida de logo:', { linkId, ownerName, fileName: file.name, fileSize: file.size });
  
  try {
    // Verificación básica del archivo
    if (!file) {
      window.alert('❌ No se seleccionó ningún archivo');
      return;
    }
    
    // Mostrar información del archivo
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    console.log(`📁 Archivo: ${file.name} (${fileSizeMB} MB)`);
    
    // Preparar datos
    const formData = new FormData();
    formData.append('custom_logo', file);
    
    // Mostrar progreso al usuario
    const progressMsg = `⏳ Subiendo logo para ${ownerName}...\\n📁 ${file.name} (${fileSizeMB} MB)`;
    console.log(progressMsg);
    
    // Realizar upload
    const response = await fetch(`${BACKEND_URL}/api/links/${linkId}/logo`, {
      method: 'PUT',
      body: formData
    });
    
    console.log('📡 Respuesta del servidor:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Respuesta exitosa:', result);
      
      window.alert(`🎉 ¡Logo actualizado exitosamente!\\n👤 ${ownerName}\\n📁 ${file.name}\\n💾 Guardado como: ${result.filename || 'archivo procesado'}`);
      
      // Cerrar modal y recargar página para ver cambios
      const modal = document.getElementById('logoManagementModal');
      if (modal) modal.remove();
      
      // Recargar la página principal para mostrar el nuevo logo
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } else {
      const errorText = await response.text();
      console.error('❌ Error del servidor:', response.status, errorText);
      
      let userMessage = `❌ Error al subir logo (${response.status}):\\n`;
      
      try {
        const errorJson = JSON.parse(errorText);
        userMessage += errorJson.detail || errorText;
      } catch {
        userMessage += errorText;
      }
      
      window.alert(userMessage);
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    window.alert(`❌ Error de conexión:\\n${error.message}\\n\\nVerifica tu conexión a internet y vuelve a intentar.`);
  }
};

// Función para eliminar logo
window.removeLogo = async function(linkId, ownerName) {
  if (window.confirm(`¿Eliminar logo personalizado de ${ownerName}?`)) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/links/${linkId}/logo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove_logo: true })
      });
      
      if (response.ok) {
        window.alert(`✅ Logo eliminado correctamente para ${ownerName}`);
        // Cerrar modal y recargar
        const modal = document.getElementById('logoManagementModal');
        if (modal) modal.remove();
        setTimeout(() => window.location.reload(), 500);
      } else {
        const errorText = await response.text();
        window.alert(`❌ Error al eliminar logo: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      window.alert(`❌ Error de conexión: ${error.message}`);
    }
  }
};

// Función para editar nombre personalizado
window.editDisplayName = async function(linkId, ownerName, currentDisplayName) {
  const newDisplayName = window.prompt(
    `🏷️ Cambiar nombre que aparece en la página principal:\\n\\n` +
    `Cliente: ${ownerName}\\n` +
    `Nombre actual: "${currentDisplayName || 'instagram.com'}"\\n\\n` +
    `Ingrese el nuevo nombre (ej: "Tienda María", "Restaurante El Sol"):`,
    currentDisplayName || ''
  );
  
  if (newDisplayName !== null) { // User didn't cancel
    try {
      const formData = new FormData();
      formData.append('display_name', newDisplayName.trim());
      
      const response = await fetch(`${BACKEND_URL}/api/links/${linkId}/logo`, {
        method: 'PUT',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        window.alert(`✅ Nombre actualizado correctamente\\n\\n` +
                    `Cliente: ${ownerName}\\n` +
                    `Nuevo nombre: "${newDisplayName.trim() || 'instagram.com'}"`);
        
        // Cerrar modal y recargar para ver cambios
        const modal = document.getElementById('logoManagementModal');
        if (modal) modal.remove();
        setTimeout(() => window.location.reload(), 1000);
        
      } else {
        const errorText = await response.text();
        window.alert(`❌ Error al cambiar nombre: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      window.alert(`❌ Error de conexión: ${error.message}`);
    }
  }
};

function App() {
  const notification = useNotification();

  return (
    <div className="App min-h-screen">
      <NotificationContainer 
        notifications={notification.notifications}
        onRemove={notification.removeNotification}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ClientView notify={notification} />} />
          <Route path="/admin" element={<AdminView notify={notification} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;