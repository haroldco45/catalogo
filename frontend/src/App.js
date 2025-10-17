import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import '@/App.css';
import * as api from './api';
import Store from './components/Store';
import Orders from './components/Orders';
import Purchases from './components/Purchases';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// ==================== LAYOUT ====================
const Layout = ({ children }) => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    setActiveMenu(path);
    // Close mobile menu when route changes
    setIsMobileMenuOpen(false);
  }, [location]);

  const menuItems = [
    { id: 'dashboard', label: '📊 Dashboard', path: '/' },
    { id: 'products', label: '📦 Inventario', path: '/products' },
    { id: 'purchases', label: '📥 Compras', path: '/purchases' },
    { id: 'sales', label: '🛒 Ventas', path: '/sales' },
    { id: 'orders', label: '📋 Pedidos', path: '/orders' },
    { id: 'customers', label: '👥 Clientes', path: '/customers' },
    { id: 'reports', label: '📈 Reportes', path: '/reports' },
    { id: 'profile', label: '⚙️ Perfil', path: '/profile' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-pink-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3">
            {logo ? (
              <img src={logo} alt="Logo" className="h-8 w-8 md:h-10 md:w-10 rounded-full" />
            ) : (
              <div className="h-8 w-8 md:h-10 md:w-10 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base">
                N
              </div>
            )}
            <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              NOVAVENTA
            </h1>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1">
            {menuItems.map(item => (
              <Link
                key={item.id}
                to={item.path}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeMenu === item.id
                    ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md'
                    : 'text-gray-600 hover:bg-pink-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-pink-100 active:bg-pink-200 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-pink-200 shadow-lg">
            <nav className="container mx-auto px-4 py-2">
              {menuItems.map(item => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`block px-4 py-3 rounded-lg mb-1 transition-all ${
                    activeMenu === item.id
                      ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md'
                      : 'text-gray-600 hover:bg-pink-50 active:bg-pink-100'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-4 md:py-8">
        {children}
      </main>
    </div>
  );
};

// ==================== DASHBOARD ====================
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20">Cargando...</div>;
  }

  const StatCard = ({ title, value, subtitle, color, icon }) => (
    <div className={`bg-white rounded-2xl p-6 shadow-lg border-2 border-${color}-200 hover:shadow-xl transition-shadow`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold text-${color}-600 mb-2`}>{value}</p>
      <p className="text-gray-500 text-sm">{subtitle}</p>
    </div>
  );

  return (
    <div data-testid="dashboard">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Ventas Hoy"
          value={stats?.today?.sales || 0}
          subtitle={`$${(stats?.today?.total || 0).toLocaleString('es-CO')} COP`}
          color="pink"
          icon="💰"
        />
        <StatCard
          title="Ventas Semana"
          value={stats?.week?.sales || 0}
          subtitle={`$${(stats?.week?.total || 0).toLocaleString('es-CO')} COP`}
          color="purple"
          icon="📊"
        />
        <StatCard
          title="Ventas Mes"
          value={stats?.month?.sales || 0}
          subtitle={`$${(stats?.month?.total || 0).toLocaleString('es-CO')} COP`}
          color="blue"
          icon="📈"
        />
        <StatCard
          title="Productos"
          value={stats?.products?.total || 0}
          subtitle={`${stats?.products?.low_stock || 0} con stock bajo`}
          color="green"
          icon="📦"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link to="/sales" className="p-4 bg-gradient-to-r from-pink-400 to-pink-500 rounded-xl text-white text-center hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">🛒</div>
            <div className="font-semibold">Nueva Venta</div>
          </Link>
          <Link to="/orders" className="p-4 bg-gradient-to-r from-green-400 to-green-500 rounded-xl text-white text-center hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">📋</div>
            <div className="font-semibold">Ver Pedidos</div>
          </Link>
          <Link to="/products" className="p-4 bg-gradient-to-r from-purple-400 to-purple-500 rounded-xl text-white text-center hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">📦</div>
            <div className="font-semibold">Agregar Producto</div>
          </Link>
          <Link to="/reports" className="p-4 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl text-white text-center hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">📈</div>
            <div className="font-semibold">Ver Reportes</div>
          </Link>
        </div>
      </div>

      {/* Link to Store */}
      <div className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">🛍️ Portal de Clientes</h3>
            <p className="text-white/90">Comparte este enlace para que tus clientes hagan pedidos</p>
          </div>
          <a
            href="/tienda"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-orange-600 px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-shadow"
          >
            Abrir Tienda →
          </a>
        </div>
      </div>
    </div>
  );
};

// ==================== PRODUCTS ====================
const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [filterCategory, showLowStock]);

  const loadCategories = async () => {
    try {
      const response = await api.getCategories();
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (showLowStock) params.low_stock = true;
      
      const response = await api.getProducts(params);
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      category: formData.get('category'),
      price: parseFloat(formData.get('price')),
      stock: parseInt(formData.get('stock')),
      min_stock: parseInt(formData.get('min_stock')),
      supplier: formData.get('supplier')
    };

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, data);
      } else {
        await api.createProduct(data);
      }
      setShowModal(false);
      setEditingProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error al guardar el producto');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await api.deleteProduct(id);
        loadProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div data-testid="products-page">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Inventario</h2>
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow"
          data-testid="add-product-btn"
        >
          + Agregar Producto
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
          >
            <option value="">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <label className="flex items-center space-x-2 px-4 py-2 bg-pink-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="text-sm font-medium text-gray-700">Solo stock bajo</span>
          </label>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-pink-400 to-purple-400 text-white">
            <tr>
              <th className="px-6 py-4 text-left">Producto</th>
              <th className="px-6 py-4 text-left">Categoría</th>
              <th className="px-6 py-4 text-right">Precio</th>
              <th className="px-6 py-4 text-right">Stock</th>
              <th className="px-6 py-4 text-right">Stock Mín</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product, index) => (
              <tr key={product.id} className={index % 2 === 0 ? 'bg-pink-50' : 'bg-white'}>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-semibold text-gray-800">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.description}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {product.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-semibold">
                  ${product.price.toLocaleString('es-CO')}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    product.stock <= product.min_stock
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-gray-600">{product.min_stock}</td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setShowModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 mx-2"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-800 mx-2"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingProduct?.name}
                    className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoría *</label>
                  <select
                    name="category"
                    required
                    defaultValue={editingProduct?.category}
                    className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                  >
                    <option value="">Seleccionar...</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Precio (COP) *</label>
                  <input
                    type="number"
                    name="price"
                    required
                    step="100"
                    defaultValue={editingProduct?.price}
                    className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock *</label>
                  <input
                    type="number"
                    name="stock"
                    required
                    defaultValue={editingProduct?.stock}
                    className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock Mínimo *</label>
                  <input
                    type="number"
                    name="min_stock"
                    required
                    defaultValue={editingProduct?.min_stock || 10}
                    className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor</label>
                  <input
                    type="text"
                    name="supplier"
                    defaultValue={editingProduct?.supplier}
                    className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <textarea
                    name="description"
                    rows="3"
                    defaultValue={editingProduct?.description}
                    className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                  }}
                  className="px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg"
                  data-testid="save-product-btn"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== SALES ====================
const Sales = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [notes, setNotes] = useState('');
  const [searchProduct, setSearchProduct] = useState('');

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await api.getProducts({});
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.getCustomers({});
      setCustomers(response.data);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: product.price,
        subtotal: product.price
      }]);
    }
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product_id !== productId));
    } else {
      setCart(cart.map(item =>
        item.product_id === productId
          ? { ...item, quantity, subtotal: quantity * item.price }
          : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleSubmitSale = async () => {
    if (cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }
    if (!customerName.trim()) {
      alert('Ingresa el nombre del cliente');
      return;
    }

    try {
      const saleData = {
        customer_id: selectedCustomer || null,
        customer_name: customerName,
        items: cart,
        total: calculateTotal(),
        payment_method: paymentMethod,
        notes: notes
      };

      await api.createSale(saleData);
      alert('¡Venta registrada exitosamente!');
      
      // Reset form
      setCart([]);
      setSelectedCustomer('');
      setCustomerName('');
      setPaymentMethod('Efectivo');
      setNotes('');
    } catch (error) {
      console.error('Error creating sale:', error);
      alert('Error al registrar la venta');
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div data-testid="sales-page">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Nueva Venta</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Productos</h3>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg mb-4 focus:outline-none focus:border-pink-400"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="border-2 border-pink-100 rounded-xl p-4 hover:border-pink-300 transition-colors cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  <h4 className="font-semibold text-gray-800 mb-1">{product.name}</h4>
                  <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-pink-600">
                      ${product.price.toLocaleString('es-CO')}
                    </span>
                    <span className="text-sm text-gray-600">
                      Stock: {product.stock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart */}
        <div>
          <div className="bg-white rounded-2xl p-6 shadow-lg sticky top-24">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Carrito</h3>
            
            {/* Customer Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente 
                {selectedCustomer && customers.find(c => c.id === selectedCustomer)?.phone && (
                  <span className="ml-2 text-xs text-green-600">📱 Recibirá comprobante por WhatsApp</span>
                )}
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => {
                  setSelectedCustomer(e.target.value);
                  const customer = customers.find(c => c.id === e.target.value);
                  if (customer) setCustomerName(customer.name);
                }}
                className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg mb-2 focus:outline-none focus:border-pink-400"
              >
                <option value="">Cliente ocasional (sin comprobante)</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.phone ? `📱 ${customer.phone}` : '(sin teléfono)'}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Nombre del cliente *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
              />
              {!selectedCustomer && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 Selecciona un cliente registrado para enviar comprobante por WhatsApp
                </p>
              )}
            </div>

            {/* Cart Items */}
            <div className="mb-4 max-h-60 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Carrito vacío</p>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="border-b border-pink-100 py-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-800 text-sm">{item.product_name}</span>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="w-6 h-6 bg-pink-100 rounded hover:bg-pink-200"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="w-6 h-6 bg-pink-100 rounded hover:bg-pink-200"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-semibold text-pink-600">
                        ${item.subtotal.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
              >
                <option>Efectivo</option>
                <option>Tarjeta</option>
                <option>Transferencia</option>
                <option>Nequi</option>
                <option>Daviplata</option>
              </select>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="2"
                placeholder="Notas opcionales..."
                className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
              />
            </div>

            {/* Total */}
            <div className="border-t-2 border-pink-200 pt-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold text-gray-800">Total:</span>
                <span className="text-2xl font-bold text-pink-600">
                  ${calculateTotal().toLocaleString('es-CO')} COP
                </span>
              </div>
              <button
                onClick={handleSubmitSale}
                disabled={cart.length === 0}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="complete-sale-btn"
              >
                Completar Venta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== CUSTOMERS ====================
const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await api.getCustomers({});
      setCustomers(response.data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      email: formData.get('email')
    };

    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, data);
      } else {
        await api.createCustomer(data);
      }
      setShowModal(false);
      setEditingCustomer(null);
      loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Error al guardar el cliente');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      try {
        await api.deleteCustomer(id);
        loadCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div data-testid="customers-page">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Clientes</h2>
        <button
          onClick={() => {
            setEditingCustomer(null);
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow"
          data-testid="add-customer-btn"
        >
          + Agregar Cliente
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
        <input
          type="text"
          placeholder="Buscar clientes por nombre o teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{customer.name}</h3>
                  <p className="text-sm text-gray-500">{customer.phone}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingCustomer(customer);
                    setShowModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(customer.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  🗑️
                </button>
              </div>
            </div>
            {customer.address && (
              <p className="text-sm text-gray-600 mb-2">
                📍 {customer.address}
              </p>
            )}
            {customer.email && (
              <p className="text-sm text-gray-600">
                ✉️ {customer.email}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingCustomer?.name}
                    className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono * 
                    <span className="ml-2 text-xs text-green-600">🇨🇴 +57 se agrega automáticamente</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-pink-200 rounded-l-lg">
                      +57
                    </span>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="3201234567"
                      defaultValue={editingCustomer?.phone?.replace('57', '')}
                      className="w-full px-4 py-2 border-2 border-pink-200 rounded-r-lg focus:outline-none focus:border-pink-400"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Solo ingresa tu número celular sin el 57
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                  <input
                    type="text"
                    name="address"
                    defaultValue={editingCustomer?.address}
                    className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingCustomer?.email}
                    className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCustomer(null);
                  }}
                  className="px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg"
                  data-testid="save-customer-btn"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== REPORTS ====================
const Reports = () => {
  const [period, setPeriod] = useState('daily');
  const [reportData, setReportData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [reportType, setReportType] = useState('ventas'); // 'ventas' o 'inventario'
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    if (reportType === 'ventas') {
      setLoading(true);
      try {
        const response = await api.getSalesReport({ period });
        setReportData(response.data);
      } catch (error) {
        console.error('Error loading report:', error);
        alert('Error al cargar el reporte');
      } finally {
        setLoading(false);
      }
    }
  };

  const loadInventoryReport = async () => {
    setLoading(true);
    try {
      const response = await api.getInventoryReport();
      setInventoryData(response.data);
    } catch (error) {
      console.error('Error loading inventory report:', error);
      alert('Error al cargar el reporte de inventario');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      if (reportType === 'ventas') {
        const response = await api.exportReport({ period });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `reporte_ventas_${period}_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const response = await api.exportInventoryReport();
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `inventario_valorizado_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Error al exportar el reporte');
    }
  };

  useEffect(() => {
    if (reportType === 'ventas') {
      loadReport();
    } else {
      loadInventoryReport();
    }
  }, [period, reportType]);

  return (
    <div data-testid="reports-page">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">📈 Reportes</h2>

      {/* Report Type Selector */}
      <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setReportType('ventas')}
              className={`px-6 py-2 rounded-lg font-semibold ${reportType === 'ventas' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              📊 Ventas
            </button>
            <button
              onClick={() => setReportType('inventario')}
              className={`px-6 py-2 rounded-lg font-semibold ${reportType === 'inventario' ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              📦 Inventario Valorizado
            </button>
          </div>
          <button
            onClick={handleExport}
            className="bg-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-600 flex items-center space-x-2"
            data-testid="export-report-btn"
          >
            <span>📥</span>
            <span>Exportar a Excel</span>
          </button>
        </div>
      </div>

      {/* Sales Report */}
      {reportType === 'ventas' && (
        <>
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <div className="flex space-x-4">
              <button onClick={() => setPeriod('daily')} className={`px-6 py-2 rounded-lg font-semibold ${period === 'daily' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                Diario
              </button>
              <button onClick={() => setPeriod('weekly')} className={`px-6 py-2 rounded-lg font-semibold ${period === 'weekly' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                Semanal
              </button>
              <button onClick={() => setPeriod('monthly')} className={`px-6 py-2 rounded-lg font-semibold ${period === 'monthly' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                Mensual
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">Cargando reporte...</div>
          ) : reportData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-200">
                  <h3 className="text-gray-600 text-sm font-medium mb-2">Total Ventas</h3>
                  <p className="text-4xl font-bold text-pink-600">{reportData.total_sales}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200">
                  <h3 className="text-gray-600 text-sm font-medium mb-2">Ingresos Totales</h3>
                  <p className="text-4xl font-bold text-purple-600">${reportData.total_revenue.toLocaleString('es-CO')}</p>
                  <p className="text-sm text-gray-500 mt-1">COP</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
                  <h3 className="text-gray-600 text-sm font-medium mb-2">Venta Promedio</h3>
                  <p className="text-4xl font-bold text-blue-600">${Math.round(reportData.average_sale).toLocaleString('es-CO')}</p>
                  <p className="text-sm text-gray-500 mt-1">COP</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-pink-400 to-purple-400 px-6 py-4">
                  <h3 className="text-xl font-bold text-white">Productos Más Vendidos</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-pink-50">
                    <tr>
                      <th className="px-6 py-4 text-left">#</th>
                      <th className="px-6 py-4 text-left">Producto</th>
                      <th className="px-6 py-4 text-right">Cantidad</th>
                      <th className="px-6 py-4 text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.top_products.map((product, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-pink-50'}>
                        <td className="px-6 py-4">
                          <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}</span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-800">{product.name}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">{product.quantity}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-green-600">${product.revenue.toLocaleString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </>
      )}

      {/* Inventory Report */}
      {reportType === 'inventario' && (
        <>
          {loading ? (
            <div className="text-center py-20">Cargando reporte...</div>
          ) : inventoryData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200">
                  <h3 className="text-gray-600 text-sm font-medium mb-2">Total Productos</h3>
                  <p className="text-4xl font-bold text-green-600">{inventoryData.summary.total_products}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
                  <h3 className="text-gray-600 text-sm font-medium mb-2">Total Unidades</h3>
                  <p className="text-4xl font-bold text-blue-600">{inventoryData.summary.total_items}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200">
                  <h3 className="text-gray-600 text-sm font-medium mb-2">Valor Total Inventario</h3>
                  <p className="text-3xl font-bold text-purple-600">${inventoryData.summary.total_value.toLocaleString('es-CO')}</p>
                  <p className="text-sm text-gray-500 mt-1">COP</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-red-200">
                  <h3 className="text-gray-600 text-sm font-medium mb-2">Stock Bajo</h3>
                  <p className="text-4xl font-bold text-red-600">{inventoryData.summary.low_stock_count}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-green-400 to-teal-400 px-6 py-4">
                  <h3 className="text-xl font-bold text-white">Inventario por Categoría</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-green-50">
                    <tr>
                      <th className="px-6 py-4 text-left">Categoría</th>
                      <th className="px-6 py-4 text-right">Productos</th>
                      <th className="px-6 py-4 text-right">Unidades</th>
                      <th className="px-6 py-4 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(inventoryData.by_category).map(([category, data], index) => (
                      <tr key={category} className={index % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
                        <td className="px-6 py-4 font-semibold text-gray-800">{category}</td>
                        <td className="px-6 py-4 text-right">{data.products}</td>
                        <td className="px-6 py-4 text-right">{data.items}</td>
                        <td className="px-6 py-4 text-right font-semibold text-green-600">${data.value.toLocaleString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-purple-400 to-pink-400 px-6 py-4">
                  <h3 className="text-xl font-bold text-white">Top 10 Productos por Valor</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-purple-50">
                    <tr>
                      <th className="px-6 py-4 text-left">Producto</th>
                      <th className="px-6 py-4 text-right">Stock</th>
                      <th className="px-6 py-4 text-right">Costo Unit.</th>
                      <th className="px-6 py-4 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.items.slice(0, 10).map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-purple-50'}>
                        <td className="px-6 py-4 font-semibold text-gray-800">{item.name}</td>
                        <td className="px-6 py-4 text-right">{item.stock}</td>
                        <td className="px-6 py-4 text-right">${item.cost.toLocaleString('es-CO')}</td>
                        <td className="px-6 py-4 text-right font-semibold text-purple-600">${item.value.toLocaleString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
};

// ==================== PROFILE ====================
const Profile = () => {
  const [logoPreview, setLogoPreview] = useState(null);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        localStorage.setItem('novaventa_logo', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const savedLogo = localStorage.getItem('novaventa_logo');
    if (savedLogo) {
      setLogoPreview(savedLogo);
    }
  }, []);

  return (
    <div data-testid="profile-page">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Perfil</h2>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          {/* Logo Upload */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Logo de la Empresa</h3>
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-pink-200">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white font-bold text-3xl">
                    N
                  </div>
                )}
              </div>
              <div>
                <label className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-2 rounded-lg font-semibold cursor-pointer hover:shadow-lg inline-block">
                  Subir Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">PNG, JPG hasta 2MB</p>
              </div>
            </div>
          </div>

          {/* Business Info */}
          <div className="border-t-2 border-pink-100 pt-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Información del Negocio</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                <input
                  type="text"
                  defaultValue="NOVAVENTA"
                  className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                <input
                  type="text"
                  defaultValue="3217366758"
                  className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                <input
                  type="text"
                  placeholder="Dirección del negocio"
                  className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="correo@novaventa.com"
                  className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
                />
              </div>
            </div>
            <button className="mt-6 w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-bold hover:shadow-lg">
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Portal de Clientes (sin layout admin) */}
        <Route path="/tienda" element={<Store />} />
        
        {/* Panel Administrativo */}
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;