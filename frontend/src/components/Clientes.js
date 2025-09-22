import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, User, Phone, Mail, MapPin } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/clientes`);
      setClientes(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await axios.put(`${API}/clientes/${editingCliente.cliente_id}`, formData);
      } else {
        await axios.post(`${API}/clientes`, formData);
      }
      
      setShowModal(false);
      setEditingCliente(null);
      setFormData({ nombre: '', telefono: '', email: '', direccion: '' });
      fetchClientes();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error al guardar el cliente');
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (clienteId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      try {
        await axios.delete(`${API}/clientes/${clienteId}`);
        fetchClientes();
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('Error al eliminar el cliente');
      }
    }
  };

  const handleNewClient = () => {
    setEditingCliente(null);
    setFormData({ nombre: '', telefono: '', email: '', direccion: '' });
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
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="mt-2 text-gray-600">Gestiona la información de tus clientes</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleNewClient}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Total Clientes</dt>
                  <dd className="text-2xl font-bold text-gray-900">{clientes.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Lista de Clientes</h3>
        </div>
        <div className="border-t border-gray-200">
          {clientes.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay clientes</h3>
              <p className="mt-1 text-sm text-gray-500">Comienza agregando un nuevo cliente.</p>
              <div className="mt-6">
                <button onClick={handleNewClient} className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {clientes.map((cliente) => (
                <li key={cliente.cliente_id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{cliente.nombre}</div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            {cliente.telefono && (
                              <>
                                <Phone className="h-4 w-4 mr-1" />
                                <span className="mr-4">{cliente.telefono}</span>
                              </>
                            )}
                            {cliente.email && (
                              <>
                                <Mail className="h-4 w-4 mr-1" />
                                <span>{cliente.email}</span>
                              </>
                            )}
                          </div>
                          {cliente.direccion && (
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{cliente.direccion}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(cliente)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cliente.cliente_id)}
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
                {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre completo del cliente"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="Número de teléfono"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Correo electrónico"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Dirección
                  </label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Dirección del cliente"
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
                  {editingCliente ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;