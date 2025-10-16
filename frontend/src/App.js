import { useState, useEffect } from 'react';
import '@/App.css';
import axios from 'axios';
import { ShoppingCart, Package, Phone, MapPin, User, DollarSign, LogOut, TrendingUp, Lock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WHATSAPP_NUMBER = '573206134987';

function App() {
  const [view, setView] = useState('customer'); // 'customer' or 'admin'
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Customer Form
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    quantity: 1
  });
  
  // Admin
  const [adminAuth, setAdminAuth] = useState({
    username: '',
    password: ''
  });
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
  const [adminData, setAdminData] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [orders, setOrders] = useState([]);
  const [showOrders, setShowOrders] = useState(false);

  useEffect(() => {
    loadProduct();
    if (adminToken) {
      verifyAdmin();
    }
  }, []);

  const loadProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/main`);
      setProduct(response.data);
      setNewPrice(response.data.price);
    } catch (error) {
      console.error('Error cargando producto:', error);
    }
  };

  const verifyAdmin = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setAdminData(response.data);
      loadOrders();
    } catch (error) {
      console.error('Error verificando admin:', error);
      localStorage.removeItem('adminToken');
      setAdminToken(null);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, adminAuth);
      const token = response.data.access_token;
      localStorage.setItem('adminToken', token);
      setAdminToken(token);
      setAdminData(response.data.admin);
      setAdminAuth({ username: '', password: '' });
      loadOrders();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || 'Usuario o contraseña incorrectos'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setAdminData(null);
    setView('customer');
  };

  const updatePrice = async () => {
    setLoading(true);
    try {
      const response = await axios.put(
        `${API}/products/main`,
        { price: parseFloat(newPrice) },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      setProduct(response.data);
      alert('¡Precio actualizado exitosamente!');
    } catch (error) {
      alert('Error actualizando precio: ' + (error.response?.data?.detail || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error cargando pedidos:', error);
    }
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create order in database
      const response = await axios.post(`${API}/orders`, formData);
      const order = response.data;
      
      // Prepare WhatsApp message
      const message = `🛒 *NUEVO PEDIDO - SUPER ARROZ*\n\n` +
        `👤 *Cliente:* ${order.customer_name}\n` +
        `📱 *Teléfono:* ${order.customer_phone}\n` +
        `📍 *Dirección:* ${order.customer_address}\n\n` +
        `📦 *Producto:* Super Arroz 25x500g\n` +
        `🔢 *Cantidad:* ${order.quantity} unidades\n` +
        `💵 *Precio unitario:* $${order.unit_price.toLocaleString('es-CO')}\n` +
        `💰 *Total:* $${order.total_price.toLocaleString('es-CO')}\n\n` +
        `📅 *Fecha:* ${new Date(order.created_at).toLocaleString('es-CO')}\n` +
        `🆔 *ID Pedido:* ${order.id}`;
      
      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp
      window.open(whatsappUrl, '_blank');
      
      // Reset form
      setFormData({
        customer_name: '',
        customer_phone: '',
        customer_address: '',
        quantity: 1
      });
      
      alert('¡Pedido registrado! Se abrirá WhatsApp para confirmar.');
    } catch (error) {
      alert('Error al crear pedido: ' + (error.response?.data?.detail || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-yellow-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-green-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <Package className="h-10 w-10 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-red-600">Super Arroz</h1>
                <p className="text-xs text-gray-500">Calidad Premium</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setView('customer')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'customer'
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                data-testid="nav-customer-btn"
              >
                <ShoppingCart className="inline h-5 w-5 mr-2" />
                Tienda
              </button>
              <button
                onClick={() => setView('admin')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'admin'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                data-testid="nav-admin-btn"
              >
                <Lock className="inline h-5 w-5 mr-2" />
                Admin
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Customer View */}
      {view === 'customer' && (
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-8 px-6">
              <h2 className="text-4xl font-bold mb-2">¡Arroz de Calidad Premium!</h2>
              <p className="text-red-100 text-lg">Grano largo extrafino - Clasificado electrónicamente</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 p-8">
              {/* Product Image */}
              <div className="flex items-center justify-center">
                <img
                  src={product.image_url}
                  alt="Super Arroz"
                  className="w-full max-w-md rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300"
                  data-testid="product-image"
                />
              </div>
              
              {/* Product Info */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-2" data-testid="product-name">{product.name}</h3>
                  <p className="text-gray-600 text-lg">{product.description}</p>
                </div>
                
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6">
                  <p className="text-gray-600 text-sm mb-1">Precio por unidad:</p>
                  <p className="text-5xl font-bold text-green-700" data-testid="product-price">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 text-green-600">
                  <Package className="h-5 w-5" />
                  <span className="font-medium">500 gramos por bolsa</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Form */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h3 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
              <ShoppingCart className="h-8 w-8 mr-3 text-red-600" />
              Realizar Pedido
            </h3>
            
            <form onSubmit={handleSubmitOrder} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center text-gray-700 font-medium mb-2">
                    <User className="h-5 w-5 mr-2 text-red-600" />
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="Ej: Juan Pérez"
                    data-testid="input-customer-name"
                  />
                </div>
                
                <div>
                  <label className="flex items-center text-gray-700 font-medium mb-2">
                    <Phone className="h-5 w-5 mr-2 text-red-600" />
                    Teléfono / Celular *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="Ej: 3201234567"
                    data-testid="input-customer-phone"
                  />
                </div>
              </div>
              
              <div>
                <label className="flex items-center text-gray-700 font-medium mb-2">
                  <MapPin className="h-5 w-5 mr-2 text-red-600" />
                  Dirección de Entrega *
                </label>
                <textarea
                  required
                  value={formData.customer_address}
                  onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none transition-colors"
                  rows="3"
                  placeholder="Ej: Calle 123 #45-67, Barrio Centro"
                  data-testid="input-customer-address"
                />
              </div>
              
              <div>
                <label className="flex items-center text-gray-700 font-medium mb-2">
                  <Package className="h-5 w-5 mr-2 text-red-600" />
                  Cantidad de Unidades *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none transition-colors"
                  data-testid="input-quantity"
                />
              </div>
              
              {/* Total Price */}
              <div className="bg-gradient-to-r from-green-50 to-yellow-50 border-2 border-green-400 rounded-xl p-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold text-gray-700">Total a Pagar:</span>
                  <span className="text-4xl font-bold text-green-700" data-testid="total-price">
                    {formatCurrency(product.price * formData.quantity)}
                  </span>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="submit-order-btn"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white"></div>
                ) : (
                  <>
                    <Phone className="h-6 w-6" />
                    <span className="text-lg">Enviar Pedido por WhatsApp</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin View */}
      {view === 'admin' && (
        <div className="max-w-4xl mx-auto px-4 py-12">
          {!adminToken ? (
            // Login Form
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Lock className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800">Panel de Administrador</h2>
                <p className="text-gray-600 mt-2">Ingresa tus credenciales</p>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Usuario</label>
                  <input
                    type="text"
                    required
                    value={adminAuth.username}
                    onChange={(e) => setAdminAuth({ ...adminAuth, username: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none transition-colors"
                    placeholder="admin"
                    data-testid="admin-username-input"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Contraseña</label>
                  <input
                    type="password"
                    required
                    value={adminAuth.password}
                    onChange={(e) => setAdminAuth({ ...adminAuth, password: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none transition-colors"
                    placeholder="••••••••"
                    data-testid="admin-password-input"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
                  data-testid="admin-login-btn"
                >
                  {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>
              </form>
              
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  <strong>Credenciales por defecto:</strong><br />
                  Usuario: admin | Contraseña: admin123
                </p>
              </div>
            </div>
          ) : (
            // Admin Dashboard
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-white rounded-2xl shadow-lg p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Panel de Administrador</h2>
                  <p className="text-gray-600">Bienvenido, {adminData?.username}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  data-testid="admin-logout-btn"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
              
              {/* Price Management */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <DollarSign className="h-7 w-7 mr-2 text-green-600" />
                  Gestión de Precio
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Precio Actual:</label>
                    <div className="text-4xl font-bold text-green-700" data-testid="admin-current-price">
                      {formatCurrency(product.price)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Nuevo Precio:</label>
                    <div className="flex space-x-4">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none transition-colors"
                        placeholder="50000"
                        data-testid="admin-new-price-input"
                      />
                      <button
                        onClick={updatePrice}
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
                        data-testid="admin-update-price-btn"
                      >
                        {loading ? 'Actualizando...' : 'Actualizar Precio'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Orders Section */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                    <TrendingUp className="h-7 w-7 mr-2 text-blue-600" />
                    Historial de Pedidos
                  </h3>
                  <button
                    onClick={() => {
                      setShowOrders(!showOrders);
                      if (!showOrders) loadOrders();
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    data-testid="admin-toggle-orders-btn"
                  >
                    {showOrders ? 'Ocultar' : 'Mostrar'} Pedidos
                  </button>
                </div>
                
                {showOrders && (
                  <div className="space-y-4" data-testid="orders-list">
                    {orders.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No hay pedidos registrados aún</p>
                    ) : (
                      orders.map((order) => (
                        <div key={order.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors" data-testid="order-item">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Cliente</p>
                              <p className="font-semibold text-gray-800">{order.customer_name}</p>
                              <p className="text-sm text-gray-600">{order.customer_phone}</p>
                              <p className="text-sm text-gray-600">{order.customer_address}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Pedido</p>
                              <p className="font-semibold text-gray-800">{order.quantity} unidades</p>
                              <p className="text-sm text-gray-600">Precio: {formatCurrency(order.unit_price)}</p>
                              <p className="text-lg font-bold text-green-700">Total: {formatCurrency(order.total_price)}</p>
                              <p className="text-xs text-gray-400 mt-2">
                                {new Date(order.created_at).toLocaleString('es-CO')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t-4 border-red-600 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-600">
            <strong className="text-red-600">Super Arroz</strong> - Calidad Premium desde 1985
          </p>
          <p className="text-sm text-gray-500 mt-2">
            📱 WhatsApp: +57 320 613 4987
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
