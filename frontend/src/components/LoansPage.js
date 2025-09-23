import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, DollarSign, Calendar, AlertTriangle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LoansPage = () => {
  const [loans, setLoans] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
    modality: 1,
    start_date: new Date().toISOString().split('T')[0],
    duration_months: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [loansRes, clientsRes] = await Promise.all([
        axios.get(`${API}/loans`),
        axios.get(`${API}/clients`)
      ]);
      
      setLoans(loansRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        duration_months: formData.duration_months ? parseInt(formData.duration_months) : null
      };
      
      await axios.post(`${API}/loans`, submitData);
      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Error creating loan:', error);
      alert(error.response?.data?.detail || 'Error al crear préstamo');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      client_id: '',
      amount: '',
      modality: 1,
      start_date: new Date().toISOString().split('T')[0],
      duration_months: ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getModalityName = (modality) => {
    switch (modality) {
      case 1:
        return '6.7% cada 8 días';
      case 2:
        return '10% mensual - Pagos cada 15 días';
      case 3:
        return '10% mensual - Capital al final';
      default:
        return 'N/A';
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'N/A';
  };

  const filteredLoans = loans.filter(loan => {
    const clientName = getClientName(loan.client_id).toLowerCase();
    return clientName.includes(searchTerm.toLowerCase()) ||
           loan.amount.toString().includes(searchTerm);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por cliente o monto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus size={16} />
          Nuevo Préstamo
        </button>
      </div>

      {/* Loans Table */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Préstamos Activos ({filteredLoans.length})</h2>
        </div>
        
        {filteredLoans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Monto</th>
                  <th>Modalidad</th>
                  <th>Fecha Inicio</th>
                  <th>Duración</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((loan) => (
                  <tr key={loan.id}>
                    <td className="font-medium">{getClientName(loan.client_id)}</td>
                    <td className="font-semibold">{formatCurrency(loan.amount)}</td>
                    <td>
                      <span className="text-sm">
                        {getModalityName(loan.modality)}
                      </span>
                    </td>
                    <td>{new Date(loan.start_date).toLocaleDateString('es-CO')}</td>
                    <td>
                      {loan.duration_months ? `${loan.duration_months} meses` : 'N/A'}
                    </td>
                    <td>
                      <span className="status-badge status-active">
                        Activo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <DollarSign className="empty-state-icon" />
            <div className="empty-state-title">
              {searchTerm ? 'No se encontraron préstamos' : 'No hay préstamos registrados'}
            </div>
            <div className="empty-state-description">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda'
                : 'Comienza creando tu primer préstamo'
              }
            </div>
            {!searchTerm && (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary inline-flex items-center gap-2 mt-4"
              >
                <Plus size={16} />
                Crear Préstamo
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
              <h3 className="modal-title">Nuevo Préstamo</h3>
              <button onClick={handleCloseModal} className="modal-close">×</button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Cliente</label>
                    <select
                      value={formData.client_id}
                      onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                      className="form-select"
                      required
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name} - {client.cedula}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Monto del Préstamo</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="form-input"
                      placeholder="Ej: 1000000"
                      min="1"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Modalidad</label>
                    <select
                      value={formData.modality}
                      onChange={(e) => setFormData({...formData, modality: parseInt(e.target.value)})}
                      className="form-select"
                      required
                    >
                      <option value={1}>6.7% cada 8 días</option>
                      <option value={2}>10% mensual - Pagos cada 15 días</option>
                      <option value={3}>10% mensual - Capital al final</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Fecha de Inicio</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="form-input"
                      required
                    />
                  </div>
                  
                  {(formData.modality === 2 || formData.modality === 3) && (
                    <div className="form-group">
                      <label className="form-label">Duración (meses)</label>
                      <input
                        type="number"
                        value={formData.duration_months}
                        onChange={(e) => setFormData({...formData, duration_months: e.target.value})}
                        className="form-input"
                        placeholder="Ej: 12"
                        min="1"
                        required={formData.modality === 2 || formData.modality === 3}
                      />
                    </div>
                  )}
                </div>
                
                <div className="form-actions">
                  <button type="button" onClick={handleCloseModal} className="btn-cancel">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    Crear Préstamo
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

export default LoansPage;