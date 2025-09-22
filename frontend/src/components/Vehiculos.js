import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Car, User, Calendar } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Vehiculos = () => {
  const [vehiculos, setVehiculos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehiculo, setEditingVehiculo] = useState(null);
  const [formData, setFormData] = useState({
    placa: '',
    tipo: 'Auto',
    marca: '',
    modelo: '',
    color: '',
    ano: '',
    cliente_id: ''
  });

  const tiposVehiculo = ['Auto', 'Moto', 'Camión', 'Camioneta'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vehiculosRes, clientesRes] = await Promise.all([
        axios.get(`${API}/vehiculos`),
        axios.get(`${API}/clientes`)
      ]);
      setVehiculos(vehiculosRes.data);
      setClientes(clientesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClienteNombre = (clienteId) => {
    const cliente = clientes.find(c => c.cliente_id === clienteId);
    return cliente ? cliente.nombre : 'Cliente no encontrado';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        ano: formData.ano ? parseInt(formData.ano) : null
      };

      if (editingVehiculo) {
        await axios.put(`${API}/vehiculos/${editingVehiculo.vehiculo_id}`, dataToSend);
      } else {
        await axios.post(`${API}/vehiculos`, dataToSend);
      }
      
      setShowModal(false);
      setEditingVehiculo(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert('Error al guardar el vehículo');
    }
  };

  const resetForm = () => {
    setFormData({
      placa: '',
      tipo: 'Auto',
      marca: '',
      modelo: '',
      color: '',
      ano: '',
      cliente_id: ''
    });
  };

  const handleEdit = (vehiculo) => {
    setEditingVehiculo(vehiculo);
    setFormData({
      placa: vehiculo.placa,
      tipo: vehiculo.tipo,
      marca: vehiculo.marca || '',
      modelo: vehiculo.modelo || '',
      color: vehiculo.color || '',
      ano: vehiculo.ano ? vehiculo.ano.toString() : '',
      cliente_id: vehiculo.cliente_id
    });
    setShowModal(true);
  };

  const handleDelete = async (vehiculoId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este vehículo?')) {
      try {
        await axios.delete(`${API}/vehiculos/${vehiculoId}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting vehicle:', error);
        alert('Error al eliminar el vehículo');
      }
    }
  };

  const handleNewVehicle = () => {
    setEditingVehiculo(null);
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
          <h1 className="text-3xl font-bold text-gray-900">Vehículos</h1>
          <p className="mt-2 text-gray-600">Gestiona la información de los vehículos</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleNewVehicle}
            className="btn-primary"
            disabled={clientes.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Vehículo
          </button>
        </div>
      </div>

      {clientes.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                No hay clientes registrados
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Necesitas tener al menos un cliente registrado antes de poder agregar vehículos.
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
                <Car className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Total Vehículos</dt>
                  <dd className="text-2xl font-bold text-gray-900">{vehiculos.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        {tiposVehiculo.map(tipo => (
          <div key={tipo} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Car className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500">{tipo}s</dt>
                    <dd className="text-xl font-bold text-gray-900">
                      {vehiculos.filter(v => v.tipo === tipo).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vehicles Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Lista de Vehículos</h3>
        </div>
        <div className="border-t border-gray-200">
          {vehiculos.length === 0 ? (
            <div className="text-center py-12">
              <Car className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay vehículos</h3>
              <p className="mt-1 text-sm text-gray-500">Comienza agregando un nuevo vehículo.</p>
              {clientes.length > 0 && (
                <div className="mt-6">
                  <button onClick={handleNewVehicle} className="btn-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Vehículo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {vehiculos.map((vehiculo) => (
                <li key={vehiculo.vehiculo_id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Car className="h-6 w-6 text-green-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {vehiculo.placa} - {vehiculo.tipo}
                          </div>
                          <div className="text-sm text-gray-500">
                            {vehiculo.marca && vehiculo.modelo && `${vehiculo.marca} ${vehiculo.modelo}`}
                            {vehiculo.ano && ` (${vehiculo.ano})`}
                            {vehiculo.color && ` - ${vehiculo.color}`}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <User className="h-4 w-4 mr-1" />
                            <span>{getClienteNombre(vehiculo.cliente_id)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(vehiculo)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vehiculo.vehiculo_id)}
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
                {editingVehiculo ? 'Editar Vehículo' : 'Nuevo Vehículo'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Cliente *</label>
                  <select
                    required
                    className="form-select"
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                  >
                    <option value="">Seleccionar cliente</option>
                    {clientes.map(cliente => (
                      <option key={cliente.cliente_id} value={cliente.cliente_id}>
                        {cliente.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Placa *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={formData.placa}
                      onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                      placeholder="ABC123"
                    />
                  </div>

                  <div>
                    <label className="form-label">Tipo *</label>
                    <select
                      required
                      className="form-select"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    >
                      {tiposVehiculo.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Marca</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.marca}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      placeholder="Toyota, Honda, etc."
                    />
                  </div>

                  <div>
                    <label className="form-label">Modelo</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.modelo}
                      onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                      placeholder="Corolla, Civic, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Color</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="Blanco, Negro, etc."
                    />
                  </div>

                  <div>
                    <label className="form-label">Año</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.ano}
                      onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                      placeholder="2020"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
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
                  {editingVehiculo ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehiculos;