import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Bike, Users, ClipboardList, AlertCircle, TrendingUp, Wrench } from 'lucide-react';

const Dashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await axios.get(`${API}/stats/dashboard`);
      setStats(response.data);
    } catch (error) {
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout} title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-orange-500 text-xl">Cargando dashboard...</div>
        </div>
      </Layout>
    );
  }

  const StatCard = ({ icon: Icon, label, value, color, trend }) => (
    <Card className="glass p-6 hover:border-orange-500/30 transition-all fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-400 text-sm mb-1">{label}</p>
          <p className={`text-4xl font-bebas ${color}`}>{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-500 text-xs font-medium">{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </Card>
  );

  return (
    <Layout user={user} onLogout={onLogout} title="Dashboard">
      <div data-testid="dashboard" className="space-y-8">
        {/* Bienvenida */}
        <div className="fade-in">
          <h1 className="text-4xl font-bebas text-white mb-2">¡Bienvenido, {user.nombre}!</h1>
          <p className="text-zinc-400">Aquí está el resumen de tu taller</p>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Bike}
            label="Total de Motos"
            value={stats?.totales?.motos || 0}
            color="text-orange-500"
          />
          <StatCard
            icon={Users}
            label="Clientes Registrados"
            value={stats?.totales?.clientes || 0}
            color="text-blue-500"
          />
          <StatCard
            icon={ClipboardList}
            label="Órdenes Totales"
            value={stats?.totales?.ordenes || 0}
            color="text-green-500"
          />
          <StatCard
            icon={Wrench}
            label="En Proceso"
            value={stats?.ordenes_por_estado?.en_proceso || 0}
            color="text-yellow-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Órdenes por estado */}
          <Card className="glass p-6 fade-in">
            <h3 className="text-xl font-bebas text-white mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-500" />
              Estado de Órdenes
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                <span className="text-zinc-300">Pendientes</span>
                <span className="badge badge-gray">{stats?.ordenes_por_estado?.pendientes || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                <span className="text-zinc-300">En Proceso</span>
                <span className="badge badge-blue">{stats?.ordenes_por_estado?.en_proceso || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                <span className="text-zinc-300">Completadas</span>
                <span className="badge badge-green">{stats?.ordenes_por_estado?.completadas || 0}</span>
              </div>
            </div>
          </Card>

          {/* Recordatorios */}
          <Card className="glass p-6 fade-in">
            <h3 className="text-xl font-bebas text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Recordatorios de Mantenimiento
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats?.recordatorios && stats.recordatorios.length > 0 ? (
                stats.recordatorios.map((recordatorio, index) => (
                  <div key={index} className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                    <p className="text-white font-medium text-sm">{recordatorio.moto_info}</p>
                    <p className="text-zinc-400 text-xs mt-1">{recordatorio.cliente}</p>
                    <p className="text-orange-500 text-xs mt-2 font-medium">{recordatorio.mensaje}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay recordatorios pendientes</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Últimas órdenes */}
        <Card className="glass p-6 fade-in">
          <h3 className="text-xl font-bebas text-white mb-4">Últimas Órdenes de Trabajo</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-400 font-medium text-sm py-3 px-4">Moto</th>
                  <th className="text-left text-zinc-400 font-medium text-sm py-3 px-4">Cliente</th>
                  <th className="text-left text-zinc-400 font-medium text-sm py-3 px-4">Tipo</th>
                  <th className="text-left text-zinc-400 font-medium text-sm py-3 px-4">Estado</th>
                  <th className="text-left text-zinc-400 font-medium text-sm py-3 px-4">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {stats?.ultimas_ordenes && stats.ultimas_ordenes.length > 0 ? (
                  stats.ultimas_ordenes.map((orden) => (
                    <tr key={orden.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                      <td className="py-3 px-4 text-white font-medium">
                        {orden.moto_info.marca} {orden.moto_info.modelo}
                      </td>
                      <td className="py-3 px-4 text-zinc-300">{orden.moto_info.cliente_nombre}</td>
                      <td className="py-3 px-4">
                        <span className="badge badge-orange text-xs">{orden.tipo_servicio}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge text-xs ${
                          orden.estado === 'completado' ? 'badge-green' :
                          orden.estado === 'en_proceso' ? 'badge-blue' : 'badge-gray'
                        }`}>
                          {orden.estado.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-sm">
                        {new Date(orden.fecha_inicio).toLocaleDateString('es-ES')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-zinc-500">
                      No hay órdenes registradas todavía
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;