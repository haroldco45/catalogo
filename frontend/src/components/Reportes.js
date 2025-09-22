import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, TrendingUp, Calendar, DollarSign, Download, Eye } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Reportes = () => {
  const [reporteIngresos, setReporteIngresos] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [diasReporte, setDiasReporte] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportes();
  }, [diasReporte]);

  const fetchReportes = async () => {
    try {
      setLoading(true);
      const [reporteRes, estadisticasRes] = await Promise.all([
        axios.get(`${API}/reportes/ingresos?dias=${diasReporte}`),
        axios.get(`${API}/dashboard/estadisticas`)
      ]);
      setReporteIngresos(reporteRes.data);
      setEstadisticas(estadisticasRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalIngresos = reporteIngresos.reduce((sum, item) => sum + item.total_ingresos, 0);
  const totalServicios = reporteIngresos.reduce((sum, item) => sum + item.total_servicios, 0);
  const promedioIngresos = reporteIngresos.length > 0 ? totalIngresos / reporteIngresos.length : 0;

  const exportToCSV = () => {
    const headers = ['Fecha', 'Total Servicios', 'Total Ingresos'];
    const csvContent = [
      headers,
      ...reporteIngresos.map(item => [
        item.fecha,
        item.total_servicios,
        item.total_ingresos.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_ingresos_${diasReporte}_dias.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="mt-2 text-gray-600">Análisis detallado de ingresos y servicios</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select
            className="form-select"
            value={diasReporte}
            onChange={(e) => setDiasReporte(parseInt(e.target.value))}
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={60}>Últimos 60 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
          <button
            onClick={exportToCSV}
            className="btn-secondary"
            disabled={reporteIngresos.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Total Ingresos</dt>
                  <dd className="text-2xl font-bold text-gray-900">${totalIngresos.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Total Servicios</dt>
                  <dd className="text-2xl font-bold text-gray-900">{totalServicios}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Promedio Diario</dt>
                  <dd className="text-2xl font-bold text-gray-900">${promedioIngresos.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Días con Servicios</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {reporteIngresos.filter(item => item.total_servicios > 0).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Evolución de Ingresos</h3>
            <Eye className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {reporteIngresos.slice(-10).map((item, index) => {
              const maxIngresos = Math.max(...reporteIngresos.map(r => r.total_ingresos));
              const porcentaje = maxIngresos > 0 ? (item.total_ingresos / maxIngresos) * 100 : 0;
              
              return (
                <div key={index} className="flex items-center">
                  <div className="w-20 text-sm text-gray-600 font-medium">
                    {new Date(item.fecha).toLocaleDateString('es-ES', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="relative">
                      <div className="overflow-hidden h-4 text-xs flex rounded bg-gray-200">
                        <div
                          style={{ width: `${porcentaje}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-sm text-gray-900 font-medium text-right">
                    ${item.total_ingresos.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Services Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Servicios por Día</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {reporteIngresos.slice(-10).map((item, index) => {
              const maxServicios = Math.max(...reporteIngresos.map(r => r.total_servicios));
              const porcentaje = maxServicios > 0 ? (item.total_servicios / maxServicios) * 100 : 0;
              
              return (
                <div key={index} className="flex items-center">
                  <div className="w-20 text-sm text-gray-600 font-medium">
                    {new Date(item.fecha).toLocaleDateString('es-ES', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="relative">
                      <div className="overflow-hidden h-4 text-xs flex rounded bg-gray-200">
                        <div
                          style={{ width: `${porcentaje}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-sm text-gray-900 font-medium text-right">
                    {item.total_servicios}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Reporte Detallado - Últimos {diasReporte} días
          </h3>
        </div>
        <div className="border-t border-gray-200">
          {reporteIngresos.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay datos</h3>
              <p className="mt-1 text-sm text-gray-500">
                No se encontraron servicios en los últimos {diasReporte} días.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Servicios
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ingresos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Promedio por Servicio
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reporteIngresos.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(item.fecha).toLocaleDateString('es-ES', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <BarChart3 className="h-4 w-4 text-blue-500 mr-2" />
                          {item.total_servicios}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-green-500 mr-2" />
                          ${item.total_ingresos.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${item.total_servicios > 0 ? (item.total_ingresos / item.total_servicios).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      {estadisticas && (
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estadísticas Generales</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{estadisticas.servicios_hoy}</div>
              <div className="text-sm text-gray-500">Servicios Hoy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${estadisticas.ingresos_hoy.toFixed(2)}</div>
              <div className="text-sm text-gray-500">Ingresos Hoy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{estadisticas.clientes_total}</div>
              <div className="text-sm text-gray-500">Total Clientes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{estadisticas.vehiculos_total}</div>
              <div className="text-sm text-gray-500">Total Vehículos</div>
            </div>
          </div>
          {estadisticas.servicio_mas_popular && (
            <div className="mt-4 text-center">
              <div className="text-lg font-medium text-gray-900">Servicio Más Popular</div>
              <div className="text-xl font-bold text-indigo-600">{estadisticas.servicio_mas_popular}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reportes;