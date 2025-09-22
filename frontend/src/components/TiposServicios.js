import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Wrench, DollarSign, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TiposServicios = () => {
  const [tiposServicios, setTiposServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio_base: '',
    duracion_estimada: ''
  });

  useEffect(() => {
    fetchTiposServicios();
  }, []);

  const fetchTiposServicios = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/tipos-servicios`);
      setTiposServicios(response.data);
    } catch (error) {
      console.error('Error fetching service types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        precio_base: parseFloat(formData.precio_base),
        duracion_estimada: formData.duracion_estimada ? parseInt(formData.duracion_estimada) : null
      };

      if (editingTipo) {
        await axios.put(`${API}/tipos-servicios/${editingTipo.servicio_tipo_id}`, dataToSend);
      } else {
        await axios.post(`${API}/tipos-servicios`, dataToSend);
      }
      
      setShowModal(false);
      setEditingTipo(null);
      resetForm();
      fetchTiposServicios();
    } catch (error) {
      console.error('Error saving service type:', error);
      alert('Error al guardar el tipo de servicio');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio_base: '',
      duracion_estimada: ''
    });
  };

  const handleEdit = (tipo) => {
    setEditingTipo(tipo);
    setFormData({
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      precio_base: tipo.precio_base.toString(),
      duracion_estimada: tipo.duracion_estimada ? tipo.duracion_estimada.toString() : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (tipoId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este tipo de servicio?')) {
      try {
        await axios.delete(`${API}/tipos-servicios/${tipoId}`);
        fetchTiposServicios();
      } catch (error) {
        console.error('Error deleting service type:', error);
        alert('Error al eliminar el tipo de servicio');
      }
    }
  };

  const handleNewServiceType = () => {
    setEditingTipo(null);
    resetForm();
    setShowModal(true);
  };

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
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tipos de Servicios</h1>
          <p className="mt-2 text-gray-600">Configura los diferentes tipos de lavado y sus precios</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleNewServiceType}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Tipo de Servicio
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Wrench className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Tipos de Servicios</dt>
                  <dd className="text-2xl font-bold text-gray-900">{tiposServicios.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Precio Promedio</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    ${tiposServicios.length > 0 
                      ? (tiposServicios.reduce((sum, tipo) => sum + tipo.precio_base, 0) / tiposServicios.length).toFixed(2)
                      : '0.00'
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Duración Promedio</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {tiposServicios.length > 0 
                      ? Math.round(tiposServicios
                          .filter(tipo => tipo.duracion_estimada)
                          .reduce((sum, tipo) => sum + tipo.duracion_estimada, 0) / 
                          tiposServicios.filter(tipo => tipo.duracion_estimada).length) || 0
                      : 0
                    } min
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Types Grid */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Lista de Tipos de Servicios</h3>
        </div>
        <div className="border-t border-gray-200">
          {tiposServicios.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay tipos de servicios</h3>
              <p className="mt-1 text-sm text-gray-500">Comienza agregando un nuevo tipo de servicio.</p>
              <div className="mt-6">
                <button onClick={handleNewServiceType} className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Tipo de Servicio
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {tiposServicios.map((tipo) => (
                <div key={tipo.servicio_tipo_id} className="bg-white border border-gray-200 rounded-lg p-6 card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Wrench className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-gray-900">{tipo.nombre}</h3>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(tipo)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tipo.servicio_tipo_id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {tipo.descripcion && (
                    <p className="text-sm text-gray-600 mb-4">{tipo.descripcion}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-green-600">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span className="text-lg font-bold">${tipo.precio_base.toFixed(2)}</span>
                    </div>
                    {tipo.duracion_estimada && (
                      <div className="flex items-center text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-sm">{tipo.duracion_estimada} min</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingTipo ? 'Editar Tipo de Servicio' : 'Nuevo Tipo de Servicio'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">
                    Nombre del Servicio *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Lavado Básico, Lavado Completo, etc."
                  />
                </div>

                <div>
                  <label className="form-label">
                    Descripción
                  </label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Describe qué incluye este servicio..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Precio Base *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        className="form-input pl-10"
                        value={formData.precio_base}
                        onChange={(e) => setFormData({ ...formData, precio_base: e.target.value })}
                        placeholder="25.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">
                      Duración Estimada (minutos)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        min="1"
                        className="form-input pl-10"
                        value={formData.duracion_estimada}
                        onChange={(e) => setFormData({ ...formData, duracion_estimada: e.target.value })}
                        placeholder="30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editingTipo ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TiposServicios;