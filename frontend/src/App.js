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

const Home = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const fetchApprovedLinks = async () => {
    try {
      const response = await axios.get(`${API}/links?status=approved`);
      setLinks(response.data);
    } catch (error) {
      console.error("Error fetching links:", error);
      toast.error("Error al cargar los links");
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
                Enviar Link
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
                    {/* Custom logo has priority, then favicon, then fallback */}
                    {link.custom_logo ? (
                      <img
                        src={`${BACKEND_URL}/uploads/${link.custom_logo}`}
                        alt={`${link.owner_name} logo`}
                        className="w-8 h-8 mb-2 rounded-md object-contain"
                        onError={(e) => {
                          // If custom logo fails, try favicon
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = link.favicon_url ? 'block' : 'none';
                          if (!link.favicon_url) {
                            e.target.nextSibling.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : link.favicon_url ? (
                      <img
                        src={link.favicon_url}
                        alt={`${link.owner_name} favicon`}
                        className="w-8 h-8 mb-2 rounded-md object-contain"
                        style={{ display: link.custom_logo ? 'none' : 'block' }}
                        onError={(e) => {
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
                      {new URL(link.website_url).hostname.replace('www.', '')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Submit Link Modal */}
      {showSubmitForm && (
        <SubmitLinkModal 
          isOpen={showSubmitForm} 
          onClose={() => setShowSubmitForm(false)}
          onSuccess={fetchApprovedLinks}
        />
      )}
    </div>
  );
};

const SubmitLinkModal = ({ isOpen, onClose, onSuccess }) => {
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
      toast.error("Por favor sube la captura de pantalla del pago");
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

      toast.success("¡Link enviado correctamente! Será revisado antes de ser publicado.");
      onClose();
      setFormData({ owner_name: '', phone: '', location: '', website_url: '' });
      setPaymentFile(null);
      setLogoFile(null);
      
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Error al enviar el link";
      toast.error(errorMessage);
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
                Sube tu logo personalizado (PNG, JPG). Si no lo subes, usaremos el favicon de tu sitio automáticamente.
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

const AdminPanel = () => {
  const [allLinks, setAllLinks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingLink, setEditingLink] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editingLogo, setEditingLogo] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const fetchAllLinks = async () => {
    try {
      const [linksRes, statsRes] = await Promise.all([
        axios.get(`${API}/links/all`),
        axios.get(`${API}/links/stats`)
      ]);
      
      setAllLinks(linksRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Error al cargar datos de administración");
    } finally {
      setLoading(false);
    }
  };

  const updateLinkStatus = async (linkId, status, rejectionReason = null) => {
    try {
      await axios.put(`${API}/links/${linkId}`, {
        status,
        rejection_reason: rejectionReason
      });
      
      toast.success(`Link ${status === 'approved' ? 'aprobado' : 'rechazado'} correctamente`);
      fetchAllLinks();
    } catch (error) {
      toast.error("Error al actualizar el link");
    }
  };

  const startEditing = (link) => {
    setEditingLink(link.id);
    setEditForm({
      owner_name: link.owner_name,
      phone: link.phone,
      location: link.location,
      website_url: link.website_url
    });
  };

  const cancelEditing = () => {
    setEditingLink(null);
    setEditForm({});
    setEditingLogo(null);
    setLogoFile(null);
  };

  const saveEdit = async (linkId) => {
    try {
      await axios.put(`${API}/links/${linkId}/edit`, editForm);
      toast.success("Link actualizado correctamente");
      setEditingLink(null);
      setEditForm({});
      fetchAllLinks();
    } catch (error) {
      toast.error("Error al actualizar el link");
    }
  };

  const updateLogo = async (linkId, removeLogo = false) => {
    try {
      const formData = new FormData();
      if (removeLogo) {
        formData.append('remove_logo', 'true');
      } else if (logoFile) {
        formData.append('custom_logo', logoFile);
      }

      await axios.put(`${API}/links/${linkId}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success("Logo actualizado correctamente");
      setEditingLogo(null);
      setLogoFile(null);
      fetchAllLinks();
    } catch (error) {
      toast.error("Error al actualizar el logo");
    }
  };

  useEffect(() => {
    fetchAllLinks();
  }, []);

  const getStatusBadge = (status) => {
    const variants = {
      pending: { variant: "secondary", icon: Clock, color: "text-yellow-600" },
      approved: { variant: "default", icon: CheckCircle, color: "text-green-600" },
      rejected: { variant: "destructive", icon: XCircle, color: "text-red-600" }
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status === 'pending' ? 'Pendiente' : status === 'approved' ? 'Aprobado' : 'Rechazado'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-4" />
            <div>
              <p className="text-sm text-slate-500">Total Envíos</p>
              <p className="text-2xl font-bold">{stats.total_submissions || 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600 mr-4" />
            <div>
              <p className="text-sm text-slate-500">Aprobados</p>
              <p className="text-2xl font-bold">
                {stats.stats?.find(s => s._id === 'approved')?.count || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center">
            <DollarSign className="w-8 h-8 text-green-600 mr-4" />
            <div>
              <p className="text-sm text-slate-500">Ingresos Estimados</p>
              <p className="text-2xl font-bold">${stats.estimated_revenue || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Links Table */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Gestionar Links</h3>
          <div className="space-y-4">
            {allLinks.map((link) => (
              <div key={link.id} className="border rounded-lg p-4 space-y-3" data-testid={`admin-link-${link.id}`}>
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    {editingLink === link.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Nombre del propietario</Label>
                          <Input
                            value={editForm.owner_name}
                            onChange={(e) => setEditForm({...editForm, owner_name: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Teléfono</Label>
                          <Input
                            value={editForm.phone}
                            onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Ubicación</Label>
                          <Input
                            value={editForm.location}
                            onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">URL del sitio web</Label>
                          <Input
                            value={editForm.website_url}
                            onChange={(e) => setEditForm({...editForm, website_url: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(link.id)}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`save-edit-${link.id}`}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            data-testid={`cancel-edit-${link.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              {/* Show current logo/icon */}
                              {link.custom_logo ? (
                                <img
                                  src={`${BACKEND_URL}/uploads/${link.custom_logo}`}
                                  alt={`${link.owner_name} logo`}
                                  className="w-12 h-12 rounded-md object-contain border"
                                />
                              ) : link.favicon_url ? (
                                <img
                                  src={link.favicon_url}
                                  alt={`${link.owner_name} favicon`}
                                  className="w-12 h-12 rounded-md object-contain border"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-md bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center border">
                                  <span className="text-white font-bold text-lg">
                                    {link.owner_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              
                              {/* Logo edit button */}
                              <button
                                onClick={() => setEditingLogo(link.id)}
                                className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md border hover:bg-gray-50"
                                data-testid={`edit-logo-${link.id}`}
                              >
                                <Camera className="w-3 h-3 text-gray-600" />
                              </button>
                            </div>
                            
                            <div>
                              <p className="font-medium">{link.owner_name}</p>
                              <p className="text-sm text-slate-500">{link.website_url}</p>
                              <p className="text-xs text-slate-400">
                                {link.location} • {link.phone}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(link)}
                              data-testid={`edit-${link.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {getStatusBadge(link.status)}
                          </div>
                        </div>

                        {/* Logo editing modal */}
                        {editingLogo === link.id && (
                          <div className="mt-3 p-4 border rounded-lg bg-blue-50 border-blue-200">
                            <h4 className="font-semibold mb-3 text-blue-800">🎨 Cambiar Logo</h4>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-sm font-medium text-blue-700">Seleccionar nuevo logo:</Label>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => setLogoFile(e.target.files[0])}
                                  className="text-sm mt-1"
                                />
                                <p className="text-xs text-blue-600 mt-1">
                                  Formatos: PNG, JPG, JPEG. Tamaño recomendado: 64x64px o superior
                                </p>
                              </div>
                              
                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateLogo(link.id)}
                                  disabled={!logoFile}
                                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                  data-testid={`save-logo-${link.id}`}
                                >
                                  <Save className="w-3 h-3 mr-1" />
                                  {logoFile ? "Guardar Nuevo Logo" : "Selecciona un archivo"}
                                </Button>
                                
                                {link.custom_logo && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateLogo(link.id, true)}
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                    data-testid={`remove-logo-${link.id}`}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Usar Favicon Automático
                                  </Button>
                                )}
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingLogo(null);
                                    setLogoFile(null);
                                  }}
                                  className="text-gray-600"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancelar
                                </Button>
                              </div>
                              
                              {logoFile && (
                                <div className="bg-white p-2 rounded border">
                                  <p className="text-xs text-green-600 font-medium">
                                    ✅ Archivo seleccionado: {logoFile.name}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {editingLink !== link.id && getStatusBadge(link.status) && <span></span>}
                </div>
                
                {editingLink !== link.id && link.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => updateLinkStatus(link.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid={`approve-${link.id}`}
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateLinkStatus(link.id, 'rejected', 'No cumple con los términos')}
                      data-testid={`reject-${link.id}`}
                    >
                      Rechazar
                    </Button>
                  </div>
                )}
                
                {editingLink !== link.id && link.payment_screenshot && (
                  <div className="pt-2">
                    <p className="text-xs text-slate-500 mb-2">Comprobante de pago:</p>
                    <img
                      src={`${BACKEND_URL}/uploads/${link.payment_screenshot}`}
                      alt="Payment screenshot"
                      className="max-w-xs max-h-32 object-contain border rounded"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="App min-h-screen">
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                  <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                    <TabsTrigger value="home" data-testid="home-tab">Inicio</TabsTrigger>
                    <TabsTrigger value="admin" data-testid="admin-tab">Administración</TabsTrigger>
                  </TabsList>
                </div>
              </div>
              
              <TabsContent value="home" className="mt-0">
                <Home />
              </TabsContent>
              
              <TabsContent value="admin" className="mt-0">
                <div className="max-w-7xl mx-auto px-4 py-8">
                  <h1 className="text-3xl font-bold text-slate-800 mb-8">Panel de Administración</h1>
                  <AdminPanel />
                </div>
              </TabsContent>
            </Tabs>
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;