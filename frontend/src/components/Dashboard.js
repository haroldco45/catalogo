import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [recentDebts, setRecentDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, debtsRes] = await Promise.all([
        axios.get(`${API}/dashboard/summary`),
        axios.get(`${API}/reports/all-debts`)
      ]);
      
      setSummary(summaryRes.data);
      // Show only top 5 debts sorted by total due
      const sortedDebts = debtsRes.data
        .sort((a, b) => b.total_due - a.total_due)
        .slice(0, 5);
      setRecentDebts(sortedDebts);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
            <div className="card-title">Total Clientes</div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <div className="card-value">{summary?.total_clients || 0}</div>
          <div className="card-change positive">Clientes activos</div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Préstamos Activos</div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
          <div className="card-value">{summary?.total_loans || 0}</div>
          <div className="card-change positive">Préstamos otorgados</div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Capital Pendiente</div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
          <div className="card-value">
            {formatCurrency(summary?.total_capital_outstanding || 0)}
          </div>
          <div className="card-change">Capital por cobrar</div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Intereses Pendientes</div>
            <ArrowUpRight className="w-8 h-8 text-purple-500" />
          </div>
          <div className="card-value">
            {formatCurrency(summary?.total_interest_due || 0)}
          </div>
          <div className="card-change">Intereses por cobrar</div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Cartera Total</div>
            <DollarSign className="w-8 h-8 text-blue-600" />
          </div>
          <div className="card-value">
            {formatCurrency(summary?.total_portfolio || 0)}
          </div>
          <div className="card-change">Capital + Intereses</div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">Préstamos Vencidos</div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div className="card-value">{summary?.overdue_loans || 0}</div>
          <div className="card-change negative">Requieren atención</div>
        </div>
      </div>

      {/* Recent Debts Table */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Principales Deudas Pendientes</h2>
        </div>
        
        {recentDebts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Cédula</th>
                  <th>Capital</th>
                  <th>Intereses</th>
                  <th>Total Deuda</th>
                  <th>Modalidad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentDebts.map((debt) => (
                  <tr key={debt.loan_id}>
                    <td className="font-medium">{debt.client_name}</td>
                    <td>{debt.client_cedula}</td>
                    <td>{formatCurrency(debt.remaining_capital)}</td>
                    <td>{formatCurrency(debt.interest_due)}</td>
                    <td className="font-semibold">{formatCurrency(debt.total_due)}</td>
                    <td>
                      <span className="text-sm text-gray-600">
                        {getModalityName(debt.modality)}
                      </span>
                    </td>
                    <td>
                      <span 
                        className={`status-badge ${
                          debt.days_overdue > 0 ? 'status-overdue' : 'status-active'
                        }`}
                      >
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
            <DollarSign className="empty-state-icon" />
            <div className="empty-state-title">No hay deudas pendientes</div>
            <div className="empty-state-description">
              Todos los préstamos están al día o no hay préstamos activos.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;