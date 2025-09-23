import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Edit, Trash2, User } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    cedula: '',
    cellphone: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        // Update client (not implemented in backend yet)
        console.log('Update not implemented');
      } else {
        await axios.post(`${API}/clients`, formData);
      }
      
      await fetchClients();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving client:', error);
      alert(error.response?.data?.detail || 'Error al guardar cliente');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setFormData({ name: '', cedula: '', cellphone: '' });
  };

  const handleOpenModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        cedula: client.cedula,
        cellphone: client.cellphone || ''
      });
    } else {
      setFormData({ name: '', cedula: '', cellphone: '' });
    }
    setShowModal(true);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.cedula.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
        </div>
        
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus size={16} />
          Nuevo Cliente
        </button>
      </div>

      {/* Clients Table */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Clientes Registrados ({filteredClients.length})</h2>
        </div>
        
        {filteredClients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cédula</th>
                  <th>Celular</th>
                  <th>Fecha Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td className="font-medium">{client.name}</td>
                    <td>{client.cedula}</td>
                    <td>{client.cellphone || 'N/A'}</td>
                    <td>
                      {new Date(client.created_at).toLocaleDateString('es-CO')}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(client)}
                          className="btn-secondary p-2"
                          title="Editar cliente"
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <User className="empty-state-icon" />
            <div className="empty-state-title">
              {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </div>
            <div className="empty-state-description">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda'
                : 'Comienza agregando tu primer cliente'
              }
            </div>
            {!searchTerm && (
              <button
                onClick={() => handleOpenModal()}
                className="btn-primary inline-flex items-center gap-2 mt-4"
              >
                <Plus size={16} />
                Agregar Cliente
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button onClick={handleCloseModal} className="modal-close">
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Nombre Completo</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Cédula</label>
                    <input
                      type="text"
                      value={formData.cedula}
                      onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                      className="form-input"
                      required
                      disabled={editingClient} // Can't change cedula when editing
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Celular</label>
                    <input
                      type="tel"
                      value={formData.cellphone}
                      onChange={(e) => setFormData({...formData, cellphone: e.target.value})}
                      className="form-input"
                      placeholder="Ej: 3001234567"
                    />
                  </div>
                </div>
                
                <div className="form-actions">
                  <button type="button" onClick={handleCloseModal} className="btn-cancel">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingClient ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;