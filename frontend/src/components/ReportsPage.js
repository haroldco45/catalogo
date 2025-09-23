import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, TrendingUp, AlertTriangle, Users, DollarSign } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReportsPage = () => {
  const [allDebts, setAllDebts] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientDebt, setClientDebt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingClientDebt, setLoadingClientDebt] = useState(false);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      const [debtsRes, clientsRes] = await Promise.all([
        axios.get(`${API}/reports/all-debts`),
        axios.get(`${API}/clients`)
      ]);
      
      setAllDebts(debtsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDebt = async (clientId) => {
    if (!clientId) {
      setClientDebt(null);
      return;
    }

    setLoadingClientDebt(true);
    try {
      const response = await axios.get(`${API}/reports/client-debt/${clientId}`);
      setClientDebt(response.data);
    } catch (error) {
      console.error('Error fetching client debt:', error);
      setClientDebt(null);
    } finally {
      setLoadingClientDebt(false);
    }
  };

  const handleClientChange = (clientId) => {
    setSelectedClient(clientId);
    fetchClientDebt(clientId);
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
        return '6.7% c/8 días';
      case 2:
        return '10% mensual c/15 días';
      case 3:
        return '10% mensual - Capital al final';
      default:
        return 'N/A';
    }
  };

  // Calculate summary statistics
  const totalCapitalOutstanding = allDebts.reduce((sum, debt) => sum + debt.remaining_capital, 0);
  const totalInterestDue = allDebts.reduce((sum, debt) => sum + debt.interest_due, 0);
  const totalPortfolio = totalCapitalOutstanding + totalInterestDue;
  const overdueDebts = allDebts.filter(debt => debt.days_overdue > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Total Capital Pendiente</div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
          <div className="card-value">{formatCurrency(totalCapitalOutstanding)}</div>
          <div className="card-change">Capital por cobrar</div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Total Intereses</div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
          <div className="card-value">{formatCurrency(totalInterestDue)}</div>
          <div className="card-change">Intereses pendientes</div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Cartera Total</div>
            <FileText className="w-8 h-8 text-purple-500" />
          </div>
          <div className="card-value">{formatCurrency(totalPortfolio)}</div>
          <div className="card-change">Capital + Intereses</div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Préstamos Vencidos</div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div className="card-value">{overdueDebts.length}</div>
          <div className="card-change negative">Requieren atención</div>
        </div>
      </div>

      {/* Client Debt Report */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Reporte por Cliente</h2>
          <div className="flex items-center gap-2">
            <select
              value={selectedClient}
              onChange={(e) => handleClientChange(e.target.value)}
              className="form-select max-w-xs"
            >
              <option value="">Seleccionar cliente...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} - {client.cedula}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {selectedClient && (
          <div className="p-6">
            {loadingClientDebt ? (
              <div className="flex items-center justify-center h-32">
                <div className="loading-spinner"></div>
              </div>
            ) : clientDebt ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="dashboard-card">
                  <div className="card-title">Cliente</div>
                  <div className="card-value text-lg">{clientDebt.client_name}</div>
                  <div className="card-change">{clientDebt.client_cedula}</div>
                </div>
                
                <div className="dashboard-card">
                  <div className="card-title">Capital Pendiente</div>
                  <div className="card-value text-lg">{formatCurrency(clientDebt.total_capital)}</div>
                  <div className="card-change">Por cobrar</div>
                </div>
                
                <div className="dashboard-card">
                  <div className="card-title">Intereses Pendientes</div>
                  <div className="card-value text-lg">{formatCurrency(clientDebt.total_interest)}</div>
                  <div className="card-change">Acumulados</div>
                </div>
                
                <div className="dashboard-card">
                  <div className="card-title">Deuda Total</div>
                  <div className="card-value text-lg">{formatCurrency(clientDebt.total_due)}</div>
                  <div className="card-change">{clientDebt.active_loans} préstamos activos</div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <Users className="empty-state-icon" />
                <div className="empty-state-title">No se encontró información</div>
                <div className="empty-state-description">
                  El cliente seleccionado no tiene deudas pendientes.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* All Debts Table */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Todas las Deudas Pendientes</h2>
        </div>
        
        {allDebts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Cédula</th>
                  <th>Monto Préstamo</th>
                  <th>Capital Pendiente</th>
                  <th>Intereses</th>
                  <th>Total Deuda</th>
                  <th>Modalidad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {allDebts.map((debt) => (
                  <tr key={debt.loan_id}>
                    <td className="font-medium">{debt.client_name}</td>
                    <td>{debt.client_cedula}</td>
                    <td>{formatCurrency(debt.amount)}</td>
                    <td className="font-semibold">{formatCurrency(debt.remaining_capital)}</td>
                    <td className="font-semibold text-orange-600">
                      {formatCurrency(debt.interest_due)}
                    </td>
                    <td className="font-bold text-blue-600">
                      {formatCurrency(debt.total_due)}
                    </td>
                    <td>
                      <span className="text-sm">
                        {getModalityName(debt.modality)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${
                        debt.days_overdue > 0 ? 'status-overdue' : 'status-active'
                      }`}>
                        {debt.days_overdue > 0 
                          ? `${debt.days_overdue} días vencido`
                          : 'Al día'
                        }
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <FileText className="empty-state-icon" />
            <div className="empty-state-title">No hay deudas pendientes</div>
            <div className="empty-state-description">
              Todos los préstamos han sido pagados completamente.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;