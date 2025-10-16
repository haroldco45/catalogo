import React, { useState, useEffect } from 'react';
import * as api from '../api';

const Purchases = () => {
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [cart, setCart] = useState([]);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
    loadPurchases();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await api.getProducts({});
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPurchases = async () => {
    try {
      const response = await api.getPurchases();
      setPurchases(response.data);
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (!existing) {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        cost: product.cost || 0,
        subtotal: product.cost || 0
      }]);
    }
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product_id !== productId));
    } else {
      setCart(cart.map(item =>
        item.product_id === productId
          ? { ...item, quantity, subtotal: quantity * item.cost }
          : item
      ));
    }
  };

  const updateCost = (productId, cost) => {
    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, cost, subtotal: item.quantity * cost }
        : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleSubmitPurchase = async () => {
    if (cart.length === 0) {
      alert('Agrega productos a la compra');
      return;
    }
    if (!supplier.trim()) {
      alert('Ingresa el nombre del proveedor');
      return;
    }

    try {
      const purchaseData = {
        supplier,
        items: cart,
        total: calculateTotal(),
        notes
      };

      await api.createPurchase(purchaseData);
      alert('¡Compra registrada! El inventario se ha actualizado.');
      
      setCart([]);
      setSupplier('');
      setNotes('');
      loadProducts();
      loadPurchases();
    } catch (error) {
      console.error('Error creating purchase:', error);
      alert('Error al registrar la compra');
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-20">Cargando...</div>;
  }

  return (
    <div data-testid="purchases-page">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">📥 Compras / Entrada de Inventario</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Seleccionar Productos</h3>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg mb-4"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="border-2 border-pink-100 rounded-xl p-4 hover:border-pink-300 cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  <h4 className="font-semibold text-gray-800">{product.name}</h4>
                  <p className="text-sm text-gray-500">{product.category}</p>
                  <p className="text-sm text-gray-600">Stock actual: <strong>{product.stock}</strong></p>
                  <p className="text-sm text-gray-600">Costo: ${product.cost?.toLocaleString('es-CO') || 0}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-2xl p-6 shadow-lg sticky top-24">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Detalle de Compra</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor *</label>
              <input
                type="text"
                placeholder="Nombre del proveedor"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg"
              />
            </div>

            <div className="mb-4 max-h-80 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Selecciona productos</p>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="border-b border-pink-100 py-3">
                    <p className="font-semibold text-sm mb-2">{item.product_name}</p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-600">Cantidad:</label>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="w-8 h-8 bg-pink-100 rounded"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 border border-pink-200 rounded text-center"
                          />
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="w-8 h-8 bg-pink-100 rounded"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Costo Unitario:</label>
                        <input
                          type="number"
                          value={item.cost}
                          onChange={(e) => updateCost(item.product_id, parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-pink-200 rounded"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-sm font-bold text-pink-600">
                        Subtotal: ${item.subtotal.toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="2"
                placeholder="Notas opcionales..."
                className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg"
              />
            </div>

            <div className="border-t-2 border-pink-200 pt-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-2xl font-bold text-pink-600">
                  ${calculateTotal().toLocaleString('es-CO')} COP
                </span>
              </div>
              <button
                onClick={handleSubmitPurchase}
                disabled={cart.length === 0}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >
                ✅ Registrar Compra
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Historial de Compras</h3>
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-400 to-green-500 text-white">
              <tr>
                <th className="px-6 py-4 text-left">Número</th>
                <th className="px-6 py-4 text-left">Proveedor</th>
                <th className="px-6 py-4 text-left">Fecha</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase, index) => (
                <tr key={purchase.id} className={index % 2 === 0 ? 'bg-green-50' : 'bg-white'}>
                  <td className="px-6 py-4 font-semibold">#{purchase.purchase_number}</td>
                  <td className="px-6 py-4">{purchase.supplier}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(purchase.created_at).toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">
                    ${purchase.total.toLocaleString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Purchases;
