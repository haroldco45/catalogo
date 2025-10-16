// Store (Tienda) - Portal de Clientes para hacer pedidos
import React, { useState, useEffect } from 'react';
import * as api from '../api';

const Store = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [filterCategory]);

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
      
      const response = await api.getProducts(params);
      setProducts(response.data.filter(p => p.stock > 0)); // Solo mostrar con stock
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(cart.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item
        ));
      } else {
        alert(`Solo hay ${product.stock} unidades disponibles`);
      }
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
    const product = products.find(p => p.id === productId);
    if (quantity > product.stock) {
      alert(`Solo hay ${product.stock} unidades disponibles`);
      return;
    }
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

  const handleCheckout = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const orderData = {
      customer_name: formData.get('name'),
      customer_phone: formData.get('phone'),
      customer_address: formData.get('address'),
      customer_email: formData.get('email') || '',
      items: cart,
      total: calculateTotal(),
      notes: formData.get('notes') || ''
    };

    try {
      await api.createOrder(orderData);
      alert('¡Pedido realizado exitosamente! Recibirás un WhatsApp con la confirmación.');
      setCart([]);
      setShowCheckout(false);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error al realizar el pedido. Intenta nuevamente.');
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className=\"flex items-center justify-center min-h-screen\"><div className=\"text-xl\">Cargando catálogo...</div></div>;
  }

  return (
    <div className=\"min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50\">
      {/* Header */}
      <header className=\"bg-white/90 backdrop-blur-sm border-b-2 border-pink-200 sticky top-0 z-40 shadow-md\">
        <div className=\"container mx-auto px-6 py-4\">
          <div className=\"flex items-center justify-between\">
            <div>
              <h1 className=\"text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent\">
                🛍️ NOVAVENTA
              </h1>
              <p className=\"text-sm text-gray-600\">Catálogo de Productos</p>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className=\"relative bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow\"
              data-testid=\"cart-button\"
            >
              🛒 Carrito ({cart.length})
              {cart.length > 0 && (
                <span className=\"absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center\">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className=\"container mx-auto px-6 py-8\">
        {/* Filters */}
        <div className=\"bg-white rounded-2xl p-6 shadow-lg mb-8\">
          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
            <input
              type=\"text\"
              placeholder=\"🔍 Buscar productos...\"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className=\"px-4 py-3 border-2 border-pink-200 rounded-xl focus:outline-none focus:border-pink-400 text-lg\"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className=\"px-4 py-3 border-2 border-pink-200 rounded-xl focus:outline-none focus:border-pink-400 text-lg\"
            >
              <option value=\"\">📂 Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Grid */}
        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6\">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className=\"bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1\"
            >
              <div className=\"h-48 bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center\">
                <span className=\"text-6xl\">📦</span>
              </div>
              <div className=\"p-5\">
                <div className=\"mb-2\">
                  <span className=\"px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold\">
                    {product.category}
                  </span>
                </div>
                <h3 className=\"text-lg font-bold text-gray-800 mb-2\">{product.name}</h3>
                <p className=\"text-sm text-gray-600 mb-3 line-clamp-2\">{product.description}</p>
                <div className=\"flex items-center justify-between mb-3\">
                  <div>
                    <p className=\"text-2xl font-bold text-pink-600\">${product.price.toLocaleString('es-CO')}</p>
                    <p className=\"text-xs text-gray-500\">Stock: {product.stock} unidades</p>
                  </div>
                </div>
                <button
                  onClick={() => addToCart(product)}
                  className=\"w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow\"
                  data-testid={`add-to-cart-${product.id}`}
                >
                  Agregar al Carrito
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className=\"text-center py-20\">
            <p className=\"text-2xl text-gray-400\">No hay productos disponibles</p>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className=\"fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4\">
          <div className=\"bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto\">
            <div className=\"flex justify-between items-center mb-6\">
              <h2 className=\"text-2xl font-bold text-gray-800\">🛒 Tu Pedido</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className=\"text-gray-500 hover:text-gray-700 text-3xl\"
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className=\"text-center py-10\">
                <p className=\"text-xl text-gray-400\">Tu carrito está vacío</p>
                <button
                  onClick={() => setShowCheckout(false)}
                  className=\"mt-4 px-6 py-2 bg-pink-500 text-white rounded-lg\"
                >
                  Seguir comprando
                </button>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className=\"mb-6 max-h-60 overflow-y-auto\">
                  {cart.map(item => (
                    <div key={item.product_id} className=\"flex justify-between items-center border-b border-pink-100 py-3\">
                      <div className=\"flex-1\">
                        <p className=\"font-semibold text-gray-800\">{item.product_name}</p>
                        <p className=\"text-sm text-gray-600\">${item.price.toLocaleString('es-CO')} c/u</p>
                      </div>
                      <div className=\"flex items-center space-x-3\">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className=\"w-8 h-8 bg-pink-100 rounded-full hover:bg-pink-200\"
                        >
                          -
                        </button>
                        <span className=\"w-8 text-center font-semibold\">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className=\"w-8 h-8 bg-pink-100 rounded-full hover:bg-pink-200\"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className=\"text-red-500 hover:text-red-700 ml-2\"
                        >
                          🗑️
                        </button>
                      </div>
                      <p className=\"ml-4 font-bold text-pink-600 w-24 text-right\">
                        ${item.subtotal.toLocaleString('es-CO')}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className=\"border-t-2 border-pink-200 pt-4 mb-6\">
                  <div className=\"flex justify-between items-center text-2xl font-bold\">
                    <span>Total:</span>
                    <span className=\"text-pink-600\">${calculateTotal().toLocaleString('es-CO')} COP</span>
                  </div>
                </div>

                {/* Checkout Form */}
                <form onSubmit={handleCheckout}>
                  <h3 className=\"text-lg font-bold text-gray-800 mb-4\">📋 Datos de Entrega</h3>
                  <div className=\"space-y-4\">
                    <div>
                      <label className=\"block text-sm font-medium text-gray-700 mb-2\">Nombre completo *</label>
                      <input
                        type=\"text\"
                        name=\"name\"
                        required
                        placeholder=\"Tu nombre\"
                        className=\"w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400\"
                      />
                    </div>
                    <div>
                      <label className=\"block text-sm font-medium text-gray-700 mb-2\">
                        Teléfono (WhatsApp) * 
                        <span className=\"ml-2 text-xs text-green-600\">🇨🇴 +57 se agrega automáticamente</span>
                      </label>
                      <div className=\"flex\">
                        <span className=\"inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-pink-200 rounded-l-lg\">
                          +57
                        </span>
                        <input
                          type=\"tel\"
                          name=\"phone\"
                          required
                          placeholder=\"3001234567\"
                          className=\"w-full px-4 py-2 border-2 border-pink-200 rounded-r-lg focus:outline-none focus:border-pink-400\"
                        />
                      </div>
                      <p className=\"text-xs text-gray-500 mt-1\">Recibirás confirmación por WhatsApp</p>
                    </div>
                    <div>
                      <label className=\"block text-sm font-medium text-gray-700 mb-2\">Dirección de entrega *</label>
                      <input
                        type=\"text\"
                        name=\"address\"
                        required
                        placeholder=\"Calle, número, barrio, ciudad\"
                        className=\"w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400\"
                      />
                    </div>
                    <div>
                      <label className=\"block text-sm font-medium text-gray-700 mb-2\">Email (opcional)</label>
                      <input
                        type=\"email\"
                        name=\"email\"
                        placeholder=\"tu@email.com\"
                        className=\"w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400\"
                      />
                    </div>
                    <div>
                      <label className=\"block text-sm font-medium text-gray-700 mb-2\">Notas adicionales</label>
                      <textarea
                        name=\"notes\"
                        rows=\"2\"
                        placeholder=\"Instrucciones especiales, preferencias de entrega, etc.\"
                        className=\"w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400\"
                      />
                    </div>
                  </div>
                  <button
                    type=\"submit\"
                    className=\"w-full mt-6 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-shadow\"
                    data-testid=\"confirm-order-btn\"
                  >
                    ✅ Confirmar Pedido
                  </button>
                  <p className=\"text-xs text-center text-gray-500 mt-3\">
                    Al confirmar, recibirás un WhatsApp con los detalles de tu pedido
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Store;
