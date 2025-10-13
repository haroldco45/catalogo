import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft, Check, X, Clock, CheckCircle2, Save, 
  Bike, Calendar, Gauge, User, Wrench, DollarSign 
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

const OrdenDetalle = ({ user, onLogout }) => {
  const { ordenId } = useParams();
  const navigate = useNavigate();
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrden();
  }, [ordenId]);

  const loadOrden = async () => {
    try {
      const response = await axios.get(`${API}/ordenes/${ordenId}`);
      setOrden(response.data);
    } catch (error) {
      toast.error('Error al cargar la orden');
      navigate('/ordenes');
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistUpdate = (itemId, field, value) => {
    setOrden(prev => ({
      ...prev,
      checklist: prev.checklist.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Calcular el costo total
      const costoTotal = orden.checklist.reduce((sum, item) => sum + (item.costo || 0), 0);
      
      await axios.put(`${API}/ordenes/${ordenId}`, {
        checklist: orden.checklist,
        costo_total: costoTotal
      });
      toast.success('Cambios guardados exitosamente');
      loadOrden(); // Recargar para obtener los datos actualizados
    } catch (error) {
      toast.error('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleCompletarOrden = async () => {
    if (!window.confirm('¿Marcar esta orden como completada?')) return;

    setSaving(true);
    try {
      const costoTotal = orden.checklist.reduce((sum, item) => sum + (item.costo || 0), 0);
      
      await axios.put(`${API}/ordenes/${ordenId}`, {
        estado: 'completado',
        fecha_completado: new Date().toISOString(),
        checklist: orden.checklist,
        costo_total: costoTotal
      });
      toast.success('Orden completada exitosamente');
      loadOrden();
    } catch (error) {
      toast.error('Error al completar orden');
    } finally {
      setSaving(false);
    }
  };

  const getEstadoColor = (estado) => {
    const colors = {
      pendiente: 'bg-zinc-500',
      en_proceso: 'bg-blue-500',
      completado: 'bg-green-500',
      no_aplica: 'bg-zinc-600'
    };
    return colors[estado] || 'bg-zinc-500';
  };

  const getEstadoIcon = (estado) => {
    const icons = {
      pendiente: Clock,
      en_proceso: Wrench,
      completado: CheckCircle2,
      no_aplica: X
    };
    const Icon = icons[estado] || Clock;
    return <Icon className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-orange-500 text-xl">Cargando orden...</div>
        </div>
      </Layout>
    );
  }

  if (!orden) {
    return null;
  }

  // Agrupar checklist por categoría
  const checklistPorCategoria = orden.checklist.reduce((acc, item) => {
    if (!acc[item.categoria]) {
      acc[item.categoria] = [];
    }
    acc[item.categoria].push(item);
    return acc;
  }, {});

  const categorias = Object.keys(checklistPorCategoria);

  // Estadísticas del checklist
  const totalItems = orden.checklist.length;
  const completados = orden.checklist.filter(item => item.estado === 'completado').length;
  const enProceso = orden.checklist.filter(item => item.estado === 'en_proceso').length;
  const progreso = Math.round((completados / totalItems) * 100);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="orden-detalle-page" className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between fade-in">
          <div className="flex items-center gap-4">
            <Button
              data-testid="back-button"
              variant="outline"
              onClick={() => navigate('/ordenes')}
              className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bebas text-white mb-2">
                Orden de Trabajo #{orden.id.slice(0, 8)}
              </h1>
              <div className="flex items-center gap-3">
                <span className={`badge ${
                  orden.estado === 'completado' ? 'badge-green' :
                  orden.estado === 'en_proceso' ? 'badge-blue' : 'badge-gray'
                }`}>
                  {orden.estado.replace('_', ' ')}
                </span>
                <span className="badge badge-orange">{orden.tipo_servicio}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              data-testid="save-button"
              onClick={handleSave}
              disabled={saving || orden.estado === 'completado'}
              className="bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              <Save className="w-5 h-5 mr-2" />
              Guardar Cambios
            </Button>
            {orden.estado !== 'completado' && (
              <Button
                data-testid="complete-button"
                onClick={handleCompletarOrden}
                disabled={saving}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Completar Orden
              </Button>
            )}
          </div>
        </div>

        {/* Información de la moto */}
        <Card className="glass p-6 fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Bike className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1">Motocicleta</p>
                <p className="text-white font-semibold">
                  {orden.moto_info.marca} {orden.moto_info.modelo}
                </p>
                <p className="text-zinc-400 text-sm">{orden.moto_info.placa}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1">Cliente</p>
                <p className="text-white font-semibold">{orden.moto_info.cliente_nombre}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Gauge className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1">Kilometraje</p>
                <p className="text-white font-semibold">{orden.kilometraje_servicio.toLocaleString()} km</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1">Fecha de Inicio</p>
                <p className="text-white font-semibold">
                  {new Date(orden.fecha_inicio).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Progreso */}
        <Card className="glass p-6 fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bebas text-white">Progreso del Servicio</h3>
            <span className="text-3xl font-bebas text-orange-500">{progreso}%</span>
          </div>
          <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bebas text-white">{completados}</p>
              <p className="text-zinc-400 text-sm">Completados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bebas text-blue-500">{enProceso}</p>
              <p className="text-zinc-400 text-sm">En Proceso</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bebas text-zinc-500">{totalItems - completados - enProceso}</p>
              <p className="text-zinc-400 text-sm">Pendientes</p>
            </div>
          </div>
        </Card>

        {/* Checklist por categoría */}
        <div className="space-y-6">
          {categorias.map((categoria) => (
            <Card key={categoria} className="glass p-6 fade-in">
              <h3 className="text-2xl font-bebas text-gradient mb-4 flex items-center gap-2">
                <Wrench className="w-6 h-6 text-orange-500" />
                {categoria}
              </h3>
              <div className="space-y-3">
                {checklistPorCategoria[categoria].map((item) => (
                  <div
                    key={item.id}
                    data-testid={`checklist-item-${item.id}`}
                    className={`p-4 rounded-lg border-l-4 transition-all status-${item.estado}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Estado */}
                      <div className="flex-shrink-0">
                        <Select
                          value={item.estado}
                          onValueChange={(value) => handleChecklistUpdate(item.id, 'estado', value)}
                          disabled={orden.estado === 'completado'}
                        >
                          <SelectTrigger 
                            data-testid={`estado-select-${item.id}`}
                            className={`w-40 ${getEstadoColor(item.estado)} text-white border-0`}
                          >
                            <div className="flex items-center gap-2">
                              {getEstadoIcon(item.estado)}
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="en_proceso">En Proceso</SelectItem>
                            <SelectItem value="completado">Completado</SelectItem>
                            <SelectItem value="no_aplica">No Aplica</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Descripción */}
                      <div className="flex-1">
                        <p className="text-white font-medium mb-2">{item.descripcion}</p>
                        <Input
                          data-testid={`notas-input-${item.id}`}
                          type="text"
                          placeholder="Notas adicionales..."
                          value={item.notas || ''}
                          onChange={(e) => handleChecklistUpdate(item.id, 'notas', e.target.value)}
                          disabled={orden.estado === 'completado'}
                          className="bg-zinc-900/50 border-zinc-700 text-zinc-300 text-sm"
                        />
                      </div>

                      {/* Costo */}
                      <div className="flex-shrink-0 w-32">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-orange-500" />
                          <span className="text-zinc-400 text-xs">Costo</span>
                        </div>
                        <Input
                          data-testid={`costo-input-${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.costo || ''}
                          onChange={(e) => handleChecklistUpdate(item.id, 'costo', parseFloat(e.target.value) || 0)}
                          disabled={orden.estado === 'completado'}
                          className="bg-zinc-900/50 border-zinc-700 text-white font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Resumen de costos */}
        <Card className="glass p-6 fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bebas text-white mb-1">Costo Total del Servicio</h3>
              <p className="text-zinc-400 text-sm">Incluye mano de obra y repuestos</p>
            </div>
            <div className="text-right">
              <p className="text-5xl font-bebas text-gradient">
                €{orden.checklist.reduce((sum, item) => sum + (item.costo || 0), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        {/* Notas generales */}
        {orden.notas_generales && (
          <Card className="glass p-6 fade-in">
            <h3 className="text-xl font-bebas text-white mb-3">Notas Generales</h3>
            <p className="text-zinc-300">{orden.notas_generales}</p>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default OrdenDetalle;
