import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, ClipboardList, Car, User, Calendar, DollarSign } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Servicios = () => {
  const [servicios, setServicios] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tiposServicios, setTiposServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingServicio, setEditingServicio] = useState(null);
  const [formData, setFormData] = useState({
    vehiculo_id: '',
    servicio_tipo_id: '',
    costo: '',
    notas: '',
    estado: 'Completado'
  });

  const estados = ['Pendiente', 'En Proceso', 'Completado', 'Cancelado'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [serviciosRes, vehiculosRes, clientesRes, tiposRes] = await Promise.all([
        axios.get(`${API}/servicios`),
        axios.get(`${API}/vehiculos`),
        axios.get(`${API}/clientes`),
        axios.get(`${API}/tipos-servicios`)
      ]);
      setServicios(serviciosRes.data);
      setVehiculos(vehiculosRes.data);
      setClientes(clientesRes.data);
      setTiposServicios(tiposRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVehiculoInfo = (vehiculoId) => {
    const vehiculo = vehiculos.find(v => v.vehiculo_id === vehiculoId);
    return vehiculo ? `${vehiculo.placa} - ${vehiculo.tipo}` : 'Vehículo no encontrado';
  };

  const getClienteNombre = (vehiculoId) => {
    const vehiculo = vehiculos.find(v => v.vehiculo_id === vehiculoId);
    if (!vehiculo) return 'Cliente no encontrado';
    const cliente = clientes.find(c => c.cliente_id === vehiculo.cliente_id);
    return cliente ? cliente.nombre : 'Cliente no encontrado';
  };

  const getTipoServicioNombre = (tipoId) => {
    const tipo = tiposServicios.find(t => t.servicio_tipo_id === tipoId);
    return tipo ? tipo.nombre : 'Tipo no encontrado';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        costo: parseFloat(formData.costo)
      };

      if (editingServicio) {
        await axios.put(`${API}/servicios/${editingServicio.servicio_id}`, dataToSend);
      } else {
        await axios.post(`${API}/servicios`, dataToSend);
      }
      
      setShowModal(false);
      setEditingServicio(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving service:', error);
      alert('Error al guardar el servicio');
    }
  };

  const resetForm = () => {
    setFormData({
      vehiculo_id: '',
      servicio_tipo_id: '',
      costo: '',
      notas: '',
      estado: 'Completado'
    });
  };

  const handleEdit = (servicio) => {
    setEditingServicio(servicio);
    setFormData({
      vehiculo_id: servicio.vehiculo_id,
      servicio_tipo_id: servicio.servicio_tipo_id,
      costo: servicio.costo.toString(),
      notas: servicio.notas || '',
      estado: servicio.estado
    });
    setShowModal(true);
  };

  const handleDelete = async (servicioId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
      try {
        await axios.delete(`${API}/servicios/${servicioId}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting service:', error);
        alert('Error al eliminar el servicio');
      }
    }
  };

  const handleNewService = () => {
    setEditingServicio(null);
    resetForm();
    // Auto-seleccionar precio base si se selecciona un tipo de servicio
    if (tiposServicios.length > 0) {
      setFormData(prev => ({
        ...prev,
        servicio_tipo_id: tiposServicios[0].servicio_tipo_id,
        costo: tiposServicios[0].precio_base.toString()
      }));
    }
    setShowModal(true);
  };

  const handleTipoServicioChange = (tipoId) => {
    const tipo = tiposServicios.find(t => t.servicio_tipo_id === tipoId);
    setFormData(prev => ({
      ...prev,
      servicio_tipo_id: tipoId,
      costo: tipo ? tipo.precio_base.toString() : ''
    }));
  };

  const getEstadoBadgeClass = (estado) => {
    switch (estado) {
      case 'Completado':
        return 'badge badge-success';
      case 'En Proceso':
        return 'badge badge-warning';
      case 'Pendiente':
        return 'badge badge-info';
      case 'Cancelado':
        return 'badge badge-error';
      default:
        return 'badge badge-info';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const serviciosHoy = servicios.filter(s => {
    const today = new Date().toDateString();
    const serviceDate = new Date(s.fecha_servicio).toDateString();
    return today === serviceDate;
  });

  const ingresosTotales = servicios.reduce((sum, s) => sum + s.costo, 0);

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Servicios</h1>
          <p className="mt-2 text-gray-600">Gestiona los servicios realizados</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleNewService}
            className="btn-primary"
            disabled={vehiculos.length === 0 || tiposServicios.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Servicio
          </button>
        </div>
      </div>

      {(vehiculos.length === 0 || tiposServicios.length === 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Configuración incompleta
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  {vehiculos.length === 0 && 'Necesitas tener vehículos registrados. '}
                  {tiposServicios.length === 0 && 'Necesitas configurar tipos de servicios.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardList className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Total Servicios</dt>
                  <dd className="text-2xl font-bold text-gray-900">{servicios.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Servicios Hoy</dt>
                  <dd className="text-2xl font-bold text-gray-900">{serviciosHoy.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Ingresos Totales</dt>
                  <dd className="text-2xl font-bold text-gray-900">${ingresosTotales.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardList className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Promedio por Servicio</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    ${servicios.length > 0 ? (ingresosTotales / servicios.length).toFixed(2) : '0.00'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Lista de Servicios</h3>
        </div>
        <div className="border-t border-gray-200">
          {servicios.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay servicios</h3>
              <p className="mt-1 text-sm text-gray-500">Comienza agregando un nuevo servicio.</p>
              {vehiculos.length > 0 && tiposServicios.length > 0 && (
                <div className="mt-6">
                  <button onClick={handleNewService} className="btn-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Servicio
                  </button>
                </div>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {servicios.map((servicio) => (
                <li key={servicio.servicio_id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <ClipboardList className="h-6 w-6 text-indigo-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {getTipoServicioNombre(servicio.servicio_tipo_id)}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <Car className="h-4 w-4 mr-1" />
                            <span className="mr-4">{getVehiculoInfo(servicio.vehiculo_id)}</span>
                            <User className="h-4 w-4 mr-1" />
                            <span>{getClienteNombre(servicio.vehiculo_id)}</span>
                          </div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span className="mr-4">
                              {new Date(servicio.fecha_servicio).toLocaleDateString()}
                            </span>
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span className="font-medium">${servicio.costo.toFixed(2)}</span>
                          </div>
                          {servicio.notas && (
                            <div className="text-sm text-gray-500 mt-1">
                              <span className="italic">"{servicio.notas}"</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={getEstadoBadgeClass(servicio.estado)}>
                          {servicio.estado}
                        </span>
                        <button
                          onClick={() => handleEdit(servicio)}
                          className="text-blue-600 hover:text-blue-900 ml-2"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(servicio.servicio_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingServicio ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Vehículo *</label>
                  <select
                    required
                    className="form-select"
                    value={formData.vehiculo_id}
                    onChange={(e) => setFormData({ ...formData, vehiculo_id: e.target.value })}
                  >
                    <option value="">Seleccionar vehículo</option>
                    {vehiculos.map(vehiculo => (
                      <option key={vehiculo.vehiculo_id} value={vehiculo.vehiculo_id}>
                        {vehiculo.placa} - {vehiculo.tipo} ({getClienteNombre(vehiculo.vehiculo_id)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Tipo de Servicio *</label>
                  <select
                    required
                    className="form-select"
                    value={formData.servicio_tipo_id}
                    onChange={(e) => handleTipoServicioChange(e.target.value)}
                  >
                    <option value="">Seleccionar tipo de servicio</option>
                    {tiposServicios.map(tipo => (
                      <option key={tipo.servicio_tipo_id} value={tipo.servicio_tipo_id}>
                        {tipo.nombre} - ${tipo.precio_base.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Costo *</label>
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
                        value={formData.costo}
                        onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                        placeholder="25.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Estado *</label>
                    <select
                      required
                      className="form-select"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    >
                      {estados.map(estado => (
                        <option key={estado} value={estado}>{estado}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Notas</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Observaciones adicionales del servicio..."
                  />
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
                  {editingServicio ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Servicios;