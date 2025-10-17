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
    if (window.confirm('¿Cambiar estado del pedido?')) {
      try {
        await api.updateOrderStatus(orderId, newStatus);
        loadOrders();
        loadStats();
        if (selectedOrder && selectedOrder.id === orderId) {
          const response = await api.getOrder(orderId);
          setSelectedOrder(response.data);
        }
        alert('Estado actualizado. Notificación enviada por WhatsApp.');
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
    return <div className="text-center py-20">Cargando pedidos...</div>;
  }

  return (
    <div data-testid="orders-page">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-8">📋 Pedidos</h2>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4 mb-4 md:mb-8">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl md:rounded-2xl p-3 md:p-4 text-center">
            <p className="text-2xl md:text-3xl mb-1">⏳</p>
            <p className="text-xl md:text-2xl font-bold text-yellow-700">{stats.by_status.pendiente}</p>
            <p className="text-xs text-yellow-600">Pendientes</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl md:rounded-2xl p-3 md:p-4 text-center">
            <p className="text-2xl md:text-3xl mb-1">✅</p>
            <p className="text-xl md:text-2xl font-bold text-blue-700">{stats.by_status.confirmado}</p>
            <p className="text-xs text-blue-600">Confirmados</p>
          </div>
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl md:rounded-2xl p-3 md:p-4 text-center">
            <p className="text-2xl md:text-3xl mb-1">📦</p>
            <p className="text-xl md:text-2xl font-bold text-purple-700">{stats.by_status.en_preparacion}</p>
            <p className="text-xs text-purple-600">En Preparación</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-xl md:rounded-2xl p-3 md:p-4 text-center">
            <p className="text-2xl md:text-3xl mb-1">🎉</p>
            <p className="text-xl md:text-2xl font-bold text-green-700">{stats.by_status.entregado}</p>
            <p className="text-xs text-green-600">Entregados</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl md:rounded-2xl p-3 md:p-4 text-center">
            <p className="text-2xl md:text-3xl mb-1">❌</p>
            <p className="text-xl md:text-2xl font-bold text-red-700">{stats.by_status.cancelado}</p>
            <p className="text-xs text-red-600">Cancelados</p>
          </div>
          <div className="bg-pink-50 border-2 border-pink-200 rounded-xl md:rounded-2xl p-3 md:p-4 text-center">
            <p className="text-2xl md:text-3xl mb-1">📊</p>
            <p className="text-xl md:text-2xl font-bold text-pink-700">{stats.today}</p>
            <p className="text-xs text-pink-600">Hoy</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg mb-4 md:mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-semibold text-xs md:text-sm active:scale-95 transition-all ${filterStatus === '' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Todos
          </button>
          {['Pendiente', 'Confirmado', 'En Preparación', 'Entregado', 'Cancelado'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-semibold text-xs md:text-sm active:scale-95 transition-all ${filterStatus === status ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              <span className="hidden sm:inline">{getStatusIcon(status)} {status}</span>
              <span className="sm:hidden">{getStatusIcon(status)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {orders.map(order => (
          <div
            key={order.id}
            className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl active:scale-98 transition-all cursor-pointer"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="flex justify-between items-start mb-3 md:mb-4">
              <div>
                <p className="text-xs md:text-sm text-gray-500">Pedido</p>
                <p className="text-base md:text-lg font-bold text-gray-800">#{order.order_number}</p>
              </div>
              <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold border-2 ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)} <span className="hidden sm:inline">{order.status}</span>
              </span>
            </div>
            <div className="mb-3 md:mb-4">
              <p className="text-xs md:text-sm text-gray-600 truncate">👤 {order.customer_name}</p>
              <p className="text-xs md:text-sm text-gray-600">📱 {order.customer_phone}</p>
            </div>
            <div className="flex justify-between items-center border-t border-pink-100 pt-2 md:pt-3">
              <p className="text-lg md:text-xl font-bold text-pink-600">${order.total.toLocaleString('es-CO')}</p>
              <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('es-CO')}</p>
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && <div className="text-center py-10 md:py-20"><p className="text-xl md:text-2xl text-gray-400">No hay pedidos</p></div>}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-800">Pedido #{selectedOrder.order_number}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700 active:scale-90 text-3xl md:text-4xl">×</button>
            </div>
            <div className="mb-4 md:mb-6">
              <span className={`inline-block px-3 md:px-4 py-1.5 md:py-2 rounded-full text-sm md:text-lg font-semibold border-2 ${getStatusColor(selectedOrder.status)}`}>
                {getStatusIcon(selectedOrder.status)} {selectedOrder.status}
              </span>
            </div>
            <div className="mb-4 md:mb-6 bg-pink-50 rounded-lg md:rounded-xl p-3 md:p-4">
              <h4 className="font-bold text-gray-800 mb-2 text-sm md:text-base">👤 Cliente</h4>
              <p className="text-xs md:text-sm"><strong>Nombre:</strong> {selectedOrder.customer_name}</p>
              <p className="text-xs md:text-sm"><strong>Teléfono:</strong> {selectedOrder.customer_phone}</p>
              <p className="text-xs md:text-sm"><strong>Dirección:</strong> {selectedOrder.customer_address}</p>
            </div>
            <div className="mb-4 md:mb-6">
              <h4 className="font-bold text-gray-800 mb-2 md:mb-3 text-sm md:text-base">📦 Productos</h4>
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 border-b gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs md:text-sm truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-600">${item.price.toLocaleString('es-CO')} x {item.quantity}</p>
                  </div>
                  <p className="font-bold text-pink-600 text-sm md:text-base whitespace-nowrap">${item.subtotal.toLocaleString('es-CO')}</p>
                </div>
              ))}
              <div className="flex justify-between pt-3">
                <p className="text-lg font-bold">Total:</p>
                <p className="text-2xl font-bold text-pink-600">${selectedOrder.total.toLocaleString('es-CO')}</p>
              </div>
            </div>
            <div className="border-t-2 border-pink-200 pt-6">
              <h4 className="font-bold text-gray-800 mb-3">Cambiar Estado:</h4>
              <div className="grid grid-cols-2 gap-3">
                {selectedOrder.status === 'Pendiente' && (
                  <button onClick={() => handleStatusChange(selectedOrder.id, 'Confirmado')} className="bg-blue-500 text-white py-3 rounded-xl font-semibold">✅ Confirmar</button>
                )}
                {selectedOrder.status === 'Confirmado' && (
                  <button onClick={() => handleStatusChange(selectedOrder.id, 'En Preparación')} className="bg-purple-500 text-white py-3 rounded-xl font-semibold">📦 En Preparación</button>
                )}
                {selectedOrder.status === 'En Preparación' && (
                  <button onClick={() => handleStatusChange(selectedOrder.id, 'Entregado')} className="bg-green-500 text-white py-3 rounded-xl font-semibold">🎉 Entregado</button>
                )}
                {selectedOrder.status !== 'Cancelado' && selectedOrder.status !== 'Entregado' && (
                  <button onClick={() => handleStatusChange(selectedOrder.id, 'Cancelado')} className="bg-red-500 text-white py-3 rounded-xl font-semibold">❌ Cancelar</button>
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
