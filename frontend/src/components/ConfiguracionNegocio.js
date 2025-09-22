import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building, User, Phone, Mail, MapPin, DollarSign, Globe, Save, Key } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ConfiguracionNegocio = ({ user }) => {
  const [config, setConfig] = useState({
    business_name: '',
    owner_name: '',
    phone: '',
    email: '',
    address: '',
    logo_url: '',
    currency: 'USD',
    timezone: 'UTC'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [generatingLicense, setGeneratingLicense] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/business/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = localStorage.getItem('access_token');
      await axios.post(`${API}/business/config`, config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const generateLicense = async () => {
    if (!config.business_name.trim()) {
      alert('Por favor, ingresa el nombre del negocio primero');
      return;
    }

    try {
      setGeneratingLicense(true);
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API}/business/license?business_name=${encodeURIComponent(config.business_name)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setLicenseKey(response.data.license_key);
      alert(`Licencia generada exitosamente!\nClave: ${response.data.license_key}`);
    } catch (error) {
      console.error('Error generating license:', error);
      alert('Error al generar la licencia');
    } finally {
      setGeneratingLicense(false);
    }
  };

  const currencies = [
    { code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
    { code: 'COP', symbol: '$', name: 'Peso Colombiano' },
    { code: 'ARS', symbol: '$', name: 'Peso Argentino' },
    { code: 'CLP', symbol: '$', name: 'Peso Chileno' },
    { code: 'PEN', symbol: 'S/', name: 'Sol Peruano' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configuración del Negocio</h1>
        <p className="mt-2 text-gray-600">
          Personaliza la información de tu lavadero
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Form */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-6">
              <Building className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Información del Negocio</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">
                    <Building className="h-4 w-4 inline mr-2" />
                    Nombre del Negocio *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={config.business_name}
                    onChange={(e) => setConfig({ ...config, business_name: e.target.value })}
                    placeholder="Mi Lavadero Pro"
                  />
                </div>

                <div>
                  <label className="form-label">
                    <User className="h-4 w-4 inline mr-2" />
                    Nombre del Propietario
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={config.owner_name}
                    onChange={(e) => setConfig({ ...config, owner_name: e.target.value })}
                    placeholder="Juan Pérez"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">
                    <Phone className="h-4 w-4 inline mr-2" />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    value={config.phone}
                    onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="form-label">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={config.email}
                    onChange={(e) => setConfig({ ...config, email: e.target.value })}
                    placeholder="contacto@milavadero.com"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Dirección
                </label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={config.address}
                  onChange={(e) => setConfig({ ...config, address: e.target.value })}
                  placeholder="Calle Principal 123, Ciudad, Estado, Código Postal"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">
                    <DollarSign className="h-4 w-4 inline mr-2" />
                    Moneda
                  </label>
                  <select
                    className="form-select"
                    value={config.currency}
                    onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                  >
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    <Globe className="h-4 w-4 inline mr-2" />
                    URL del Logo
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    value={config.logo_url}
                    onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
                    placeholder="https://ejemplo.com/logo.png"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Configuración
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* License Management */}
        <div className="space-y-6">
          {/* License Generation */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Key className="h-6 w-6 text-purple-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Licencia</h3>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Genera una licencia única para tu negocio. Esta licencia protege tu instalación y permite el uso comercial.
              </p>

              {user?.role === 'admin' && (
                <button
                  onClick={generateLicense}
                  className="w-full btn-primary"
                  disabled={generatingLicense || !config.business_name.trim()}
                >
                  {generatingLicense ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generando...
                    </div>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Generar Licencia
                    </>
                  )}
                </button>
              )}

              {licenseKey && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="text-sm font-medium text-green-800 mb-2">
                    Licencia Generada
                  </h4>
                  <div className="text-xs font-mono text-green-600 bg-white p-2 rounded border break-all">
                    {licenseKey}
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    Guarda esta clave en un lugar seguro
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa</h3>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-center">
                {config.logo_url ? (
                  <img 
                    src={config.logo_url} 
                    alt="Logo" 
                    className="h-12 w-12 mx-auto mb-2 rounded-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="h-12 w-12 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                )}
                <h4 className="font-bold text-gray-900">
                  {config.business_name || 'Nombre del Negocio'}
                </h4>
                {config.owner_name && (
                  <p className="text-sm text-gray-600">{config.owner_name}</p>
                )}
                {config.phone && (
                  <p className="text-xs text-gray-500">{config.phone}</p>
                )}
                {config.email && (
                  <p className="text-xs text-gray-500">{config.email}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionNegocio;