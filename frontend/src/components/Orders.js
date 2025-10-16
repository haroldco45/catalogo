// Orders Management - Panel Administrativo
import React, { useState, useEffect } from 'react';
import * as api from '../api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
    loadStats();
  }, [filterStatus]);

  const loadOrders = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      
      const response = await api.getOrders(params);
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.getOrdersStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    if (window.confirm(`¿Cambiar estado del pedido a "${newStatus}"?`)) {
      try {
        await api.updateOrderStatus(orderId, newStatus);
        loadOrders();
        loadStats();
        if (selectedOrder && selectedOrder.id === orderId) {
          const response = await api.getOrder(orderId);
          setSelectedOrder(response.data);
        }
        alert('Estado actualizado. Se ha enviado notificación al cliente por WhatsApp.');
      } catch (error) {
        console.error('Error updating status:', error);
        alert('Error al actualizar el estado');
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pendiente': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'Confirmado': 'bg-blue-100 text-blue-700 border-blue-300',
      'En Preparación': 'bg-purple-100 text-purple-700 border-purple-300',
      'Entregado': 'bg-green-100 text-green-700 border-green-300',
      'Cancelado': 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Pendiente': '⏳',
      'Confirmado': '✅',
      'En Preparación': '📦',
      'Entregado': '🎉',
      'Cancelado': '❌'
    };
    return icons[status] || '📋';
  };

  if (loading) {
    return <div className=\"text-center py-20\">Cargando pedidos...</div>;
  }

  return (
    <div data-testid=\"orders-page\">
      <div className=\"flex justify-between items-center mb-8\">
        <h2 className=\"text-3xl font-bold text-gray-800\">📋 Pedidos</h2>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className=\"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8\">
          <div className=\"bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 text-center\">
            <p className=\"text-3xl mb-1\">⏳</p>
            <p className=\"text-2xl font-bold text-yellow-700\">{stats.by_status.pendiente}</p>
            <p className=\"text-xs text-yellow-600\">Pendientes</p>
          </div>
          <div className=\"bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-center\">
            <p className=\"text-3xl mb-1\">✅</p>
            <p className=\"text-2xl font-bold text-blue-700\">{stats.by_status.confirmado}</p>
            <p className=\"text-xs text-blue-600\">Confirmados</p>
          </div>
          <div className=\"bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 text-center\">
            <p className=\"text-3xl mb-1\">📦</p>
            <p className=\"text-2xl font-bold text-purple-700\">{stats.by_status.en_preparacion}</p>
            <p className=\"text-xs text-purple-600\">En Preparación</p>
          </div>
          <div className=\"bg-green-50 border-2 border-green-200 rounded-2xl p-4 text-center\">
            <p className=\"text-3xl mb-1\">🎉</p>
            <p className=\"text-2xl font-bold text-green-700\">{stats.by_status.entregado}</p>
            <p className=\"text-xs text-green-600\">Entregados</p>
          </div>
          <div className=\"bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center\">
            <p className=\"text-3xl mb-1\">❌</p>
            <p className=\"text-2xl font-bold text-red-700\">{stats.by_status.cancelado}</p>
            <p className=\"text-xs text-red-600\">Cancelados</p>
          </div>
          <div className=\"bg-pink-50 border-2 border-pink-200 rounded-2xl p-4 text-center\">
            <p className=\"text-3xl mb-1\">📊</p>
            <p className=\"text-2xl font-bold text-pink-700\">{stats.today}</p>
            <p className=\"text-xs text-pink-600\">Hoy</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className=\"bg-white rounded-2xl p-6 shadow-lg mb-6\">
        <div className=\"flex flex-wrap gap-2\">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filterStatus === ''
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {['Pendiente', 'Confirmado', 'En Preparación', 'Entregado', 'Cancelado'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filterStatus === status
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getStatusIcon(status)} {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
        {orders.map(order => (
          <div
            key={order.id}
            className=\"bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer\"
            onClick={() => setSelectedOrder(order)}
          >
            <div className=\"flex justify-between items-start mb-4\">
              <div>
                <p className=\"text-sm text-gray-500\">Pedido</p>
                <p className=\"text-lg font-bold text-gray-800\">#{order.order_number}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)} {order.status}
              </span>
            </div>

            <div className=\"mb-4\">
              <p className=\"text-sm text-gray-600\">👤 {order.customer_name}</p>
              <p className=\"text-sm text-gray-600\">📱 {order.customer_phone}</p>
              <p className=\"text-sm text-gray-600\">📍 {order.customer_address}</p>
            </div>

            <div className=\"mb-4 border-t border-pink-100 pt-3\">
              <p className=\"text-xs text-gray-500 mb-2\">Productos:</p>
              {order.items.slice(0, 2).map((item, idx) => (
                <p key={idx} className=\"text-sm text-gray-700\">
                  • {item.product_name} x{item.quantity}
                </p>
              ))}
              {order.items.length > 2 && (
                <p className=\"text-xs text-gray-500\">+{order.items.length - 2} más</p>
              )}
            </div>

            <div className=\"flex justify-between items-center border-t border-pink-100 pt-3\">
              <div>
                <p className=\"text-xs text-gray-500\">Total</p>
                <p className=\"text-xl font-bold text-pink-600\">${order.total.toLocaleString('es-CO')}</p>
              </div>
              <p className=\"text-xs text-gray-500\">
                {new Date(order.created_at).toLocaleDateString('es-CO')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className=\"text-center py-20\">
          <p className=\"text-2xl text-gray-400\">No hay pedidos {filterStatus && `con estado "${filterStatus}"`}</p>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className=\"fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4\">
          <div className=\"bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto\">
            <div className=\"flex justify-between items-start mb-6\">
              <div>
                <h3 className=\"text-2xl font-bold text-gray-800\">Pedido #{selectedOrder.order_number}</h3>
                <p className=\"text-sm text-gray-500\">
                  {new Date(selectedOrder.created_at).toLocaleString('es-CO')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className=\"text-gray-500 hover:text-gray-700 text-3xl\"
              >
                ×
              </button>
            </div>

            {/* Status */}
            <div className=\"mb-6\">
              <p className=\"text-sm font-medium text-gray-700 mb-2\">Estado Actual:</p>
              <span className={`inline-block px-4 py-2 rounded-full text-lg font-semibold border-2 ${getStatusColor(selectedOrder.status)}`}>
                {getStatusIcon(selectedOrder.status)} {selectedOrder.status}
              </span>
            </div>

            {/* Customer Info */}
            <div className=\"mb-6 bg-pink-50 rounded-xl p-4\">
              <h4 className=\"font-bold text-gray-800 mb-2\">👤 Información del Cliente</h4>
              <p className=\"text-sm text-gray-700\"><strong>Nombre:</strong> {selectedOrder.customer_name}</p>
              <p className=\"text-sm text-gray-700\"><strong>Teléfono:</strong> {selectedOrder.customer_phone}</p>
              <p className=\"text-sm text-gray-700\"><strong>Dirección:</strong> {selectedOrder.customer_address}</p>
              {selectedOrder.customer_email && (
                <p className=\"text-sm text-gray-700\"><strong>Email:</strong> {selectedOrder.customer_email}</p>
              )}
            </div>

            {/* Items */}
            <div className=\"mb-6\">
              <h4 className=\"font-bold text-gray-800 mb-3\">📦 Productos</h4>
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className=\"flex justify-between items-center border-b border-pink-100 py-2\">
                  <div className=\"flex-1\">
                    <p className=\"font-semibold text-gray-800\">{item.product_name}</p>
                    <p className=\"text-sm text-gray-600\">${item.price.toLocaleString('es-CO')} x {item.quantity}</p>
                  </div>
                  <p className=\"font-bold text-pink-600\">${item.subtotal.toLocaleString('es-CO')}</p>
                </div>
              ))}
              <div className=\"flex justify-between items-center pt-3\">
                <p className=\"text-lg font-bold\">Total:</p>
                <p className=\"text-2xl font-bold text-pink-600\">${selectedOrder.total.toLocaleString('es-CO')} COP</p>
              </div>
            </div>

            {/* Notes */}
            {selectedOrder.notes && (
              <div className=\"mb-6 bg-yellow-50 rounded-xl p-4\">
                <h4 className=\"font-bold text-gray-800 mb-2\">📝 Notas</h4>
                <p className=\"text-sm text-gray-700\">{selectedOrder.notes}</p>
              </div>
            )}

            {/* Status Change Buttons */}
            <div className=\"border-t-2 border-pink-200 pt-6\">
              <h4 className=\"font-bold text-gray-800 mb-3\">Cambiar Estado:</h4>
              <div className=\"grid grid-cols-2 gap-3\">
                {selectedOrder.status !== 'Confirmado' && selectedOrder.status !== 'Entregado' && selectedOrder.status !== 'Cancelado' && (
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'Confirmado')}
                    className=\"bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600\"
                  >
                    ✅ Confirmar
                  </button>
                )}
                {selectedOrder.status === 'Confirmado' && (
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'En Preparación')}
                    className=\"bg-purple-500 text-white py-3 rounded-xl font-semibold hover:bg-purple-600\"
                  >
                    📦 En Preparación
                  </button>
                )}
                {selectedOrder.status === 'En Preparación' && (
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'Entregado')}
                    className=\"bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600\"
                  >
                    🎉 Entregado
                  </button>
                )}
                {selectedOrder.status !== 'Cancelado' && selectedOrder.status !== 'Entregado' && (
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'Cancelado')}
                    className=\"bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600\"
                  >
                    ❌ Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
