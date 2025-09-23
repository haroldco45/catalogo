import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, CreditCard, DollarSign } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    loan_id: '',
    amount: '',
    type: 'interest',
    payment_date: new Date().toISOString().split('T')[0]
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
      
      // Fetch all payments for all loans
      const allPayments = [];
      for (const loan of loansRes.data) {
        try {
          const paymentsRes = await axios.get(`${API}/payments/loan/${loan.id}`);
          allPayments.push(...paymentsRes.data.map(payment => ({
            ...payment,
            loan: loan,
            client: clientsRes.data.find(c => c.id === loan.client_id)
          })));
        } catch (error) {
          console.error(`Error fetching payments for loan ${loan.id}:`, error);
        }
      }
      
      // Sort payments by date (newest first)
      allPayments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
      setPayments(allPayments);
      
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
        amount: parseFloat(formData.amount)
      };
      
      await axios.post(`${API}/payments`, submitData);
      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Error creating payment:', error);
      alert(error.response?.data?.detail || 'Error al registrar pago');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      loan_id: '',
      amount: '',
      type: 'interest',
      payment_date: new Date().toISOString().split('T')[0]
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getLoanInfo = (loanId) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return { client: 'N/A', amount: 0 };
    
    const client = clients.find(c => c.id === loan.client_id);
    return {
      client: client ? client.name : 'N/A',
      amount: loan.amount
    };
  };

  const filteredPayments = payments.filter(payment => {
    const clientName = payment.client?.name?.toLowerCase() || '';
    return clientName.includes(searchTerm.toLowerCase()) ||
           payment.amount.toString().includes(searchTerm) ||
           payment.type.toLowerCase().includes(searchTerm.toLowerCase());
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
            placeholder="Buscar por cliente, monto o tipo..."
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
          Registrar Pago
        </button>
      </div>

      {/* Payments Table */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Registro de Pagos ({filteredPayments.length})</h2>
        </div>
        
        {filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Préstamo</th>
                  <th>Monto Pago</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{new Date(payment.payment_date).toLocaleDateString('es-CO')}</td>
                    <td className="font-medium">
                      {payment.client?.name || 'N/A'}
                    </td>
                    <td>
                      <div className="text-sm">
                        <div className="font-medium">
                          {formatCurrency(payment.loan?.amount || 0)}
                        </div>
                        <div className="text-gray-500">
                          {payment.loan?.start_date ? 
                            new Date(payment.loan.start_date).toLocaleDateString('es-CO') : 
                            'N/A'
                          }
                        </div>
                      </div>
                    </td>
                    <td className="font-semibold text-green-600">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td>
                      <span className={`status-badge ${
                        payment.type === 'capital' ? 'status-paid' : 'status-active'
                      }`}>
                        {payment.type === 'capital' ? 'Capital' : 'Interés'}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge status-paid">
                        Procesado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <CreditCard className="empty-state-icon" />
            <div className="empty-state-title">
              {searchTerm ? 'No se encontraron pagos' : 'No hay pagos registrados'}
            </div>
            <div className="empty-state-description">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda'
                : 'Los pagos registrados aparecerán aquí'
              }
            </div>
            {!searchTerm && (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary inline-flex items-center gap-2 mt-4"
              >
                <Plus size={16} />
                Registrar Pago
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
              <h3 className="modal-title">Registrar Pago</h3>
              <button onClick={handleCloseModal} className="modal-close">×</button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Préstamo</label>
                    <select
                      value={formData.loan_id}
                      onChange={(e) => setFormData({...formData, loan_id: e.target.value})}
                      className="form-select"
                      required
                    >
                      <option value="">Seleccionar préstamo...</option>
                      {loans.map(loan => {
                        const client = clients.find(c => c.id === loan.client_id);
                        return (
                          <option key={loan.id} value={loan.id}>
                            {client?.name} - {formatCurrency(loan.amount)} 
                            ({new Date(loan.start_date).toLocaleDateString('es-CO')})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Monto del Pago</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="form-input"
                      placeholder="Ej: 50000"
                      min="1"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Tipo de Pago</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="form-select"
                      required
                    >
                      <option value="interest">Interés</option>
                      <option value="capital">Capital</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Fecha de Pago</label>
                    <input
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                      className="form-input"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-actions">
                  <button type="button" onClick={handleCloseModal} className="btn-cancel">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    Registrar Pago
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

export default PaymentsPage;