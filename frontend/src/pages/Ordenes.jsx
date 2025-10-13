import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, ClipboardList, Eye, Calendar, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Ordenes = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState([]);
  const [motos, setMotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [formData, setFormData] = useState({
    moto_id: '',
    tipo_servicio: 'preventivo',
    kilometraje_servicio: 0,
    fecha_inicio: new Date().toISOString().split('T')[0],
    notas_generales: ''
  });

  useEffect(() => {
    loadData();
  }, [filtroEstado]);

  const loadData = async () => {
    try {
      const motosRes = await axios.get(`${API}/motos`);
      setMotos(motosRes.data);

      const ordenesUrl = filtroEstado === 'todas' 
        ? `${API}/ordenes` 
        : `${API}/ordenes?estado=${filtroEstado}`;
      const ordenesRes = await axios.get(ordenesUrl);
      setOrdenes(ordenesRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.moto_id) {
      toast.error('Debes seleccionar una moto');
      return;
    }

    try {
      const response = await axios.post(`${API}/ordenes`, formData);
      toast.success('Orden de trabajo creada exitosamente');
      setDialogOpen(false);
      resetForm();
      loadData();
      // Navegar al detalle de la orden
      navigate(`/ordenes/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear orden');
    }
  };

  const resetForm = () => {
    setFormData({
      moto_id: '',
      tipo_servicio: 'preventivo',
      kilometraje_servicio: 0,
      fecha_inicio: new Date().toISOString().split('T')[0],
      notas_generales: ''
    });
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      pendiente: 'badge-gray',
      en_proceso: 'badge-blue',
      completado: 'badge-green'
    };
    return badges[estado] || 'badge-gray';
  };

  return (
    <Layout user={user} onLogout={onLogout} title="Órdenes">
      <div data-testid="ordenes-page" className="space-y-6">
        <div className="flex items-center justify-between fade-in">
          <div>
            <h1 className="text-4xl font-bebas text-white mb-2">Órdenes de Trabajo</h1>
            <p className="text-zinc-400">Gestiona los servicios de mantenimiento</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-orden-button"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nueva Orden
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bebas text-gradient">
                  Nueva Orden de Trabajo
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Motocicleta *</label>
                  <Select
                    value={formData.moto_id}
                    onValueChange={(value) => {
                      const moto = motos.find(m => m.id === value);
                      setFormData({ 
                        ...formData, 
                        moto_id: value,
                        kilometraje_servicio: moto?.kilometraje_actual || 0
                      });
                    }}
                  >
                    <SelectTrigger data-testid="orden-moto-select" className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Selecciona una moto" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                      {motos.map((moto) => (
                        <SelectItem key={moto.id} value={moto.id}>
                          {moto.marca} {moto.modelo} - {moto.placa} ({moto.cliente_nombre})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Tipo de Servicio *</label>
                  <Select
                    value={formData.tipo_servicio}
                    onValueChange={(value) => setFormData({ ...formData, tipo_servicio: value })}
                  >
                    <SelectTrigger data-testid="orden-tipo-select" className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectItem value="preventivo">Mantenimiento Preventivo</SelectItem>
                      <SelectItem value="correctivo">Mantenimiento Correctivo</SelectItem>
                      <SelectItem value="revision_general">Revisión General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Kilometraje *</label>
                    <Input
                      data-testid="orden-kilometraje-input"
                      type="number"
                      min="0"
                      value={formData.kilometraje_servicio}
                      onChange={(e) => setFormData({ ...formData, kilometraje_servicio: parseInt(e.target.value) })}
                      required
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Fecha de Inicio *</label>
                    <Input
                      data-testid="orden-fecha-input"
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                      required
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Notas Generales</label>
                  <textarea
                    data-testid="orden-notas-input"
                    value={formData.notas_generales}
                    onChange={(e) => setFormData({ ...formData, notas_generales: e.target.value })}
                    rows={3}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                    placeholder="Observaciones del cliente, problemas reportados, etc."
                  />
                </div>

                <Button
                  data-testid="orden-submit-button"
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  Crear Orden de Trabajo
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 fade-in">
          {['todas', 'pendiente', 'en_proceso', 'completado'].map((estado) => (
            <button
              key={estado}
              data-testid={`filter-${estado}`}
              onClick={() => setFiltroEstado(estado)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filtroEstado === estado
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {estado === 'todas' ? 'Todas' : estado.replace('_', ' ').charAt(0).toUpperCase() + estado.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-orange-500 text-xl">Cargando órdenes...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {ordenes.length > 0 ? (
              ordenes.map((orden) => (
                <Card key={orden.id} className="glass p-6 fade-in hover:border-orange-500/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/ordenes/${orden.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                          <Wrench className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-white">
                            {orden.moto_info.marca} {orden.moto_info.modelo}
                          </h3>
                          <p className="text-zinc-400 text-sm">Placa: {orden.moto_info.placa}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-zinc-500 text-xs mb-1">Cliente</p>
                          <p className="text-white font-medium">{orden.moto_info.cliente_nombre}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs mb-1">Tipo de Servicio</p>
                          <span className="badge badge-orange text-xs">{orden.tipo_servicio}</span>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs mb-1">Kilometraje</p>
                          <p className="text-white font-medium">{orden.kilometraje_servicio.toLocaleString()} km</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs mb-1">Fecha</p>
                          <p className="text-white font-medium">
                            {new Date(orden.fecha_inicio).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <span className={`badge ${getEstadoBadge(orden.estado)}`}>
                        {orden.estado.replace('_', ' ')}
                      </span>
                      <Button
                        data-testid={`view-orden-${orden.id}`}
                        variant="outline"
                        size="sm"
                        className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/ordenes/${orden.id}`);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalle
                      </Button>
                    </div>
                  </div>

                  {orden.costo_total > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Costo Total</span>
                        <span className="text-2xl font-bebas text-orange-500">
                          €{orden.costo_total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <div className="text-center py-16">
                <div className="text-zinc-500 mb-4">
                  <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl mb-2">No hay órdenes {filtroEstado !== 'todas' && `en estado "${filtroEstado}"`}</p>
                  <p className="text-sm">Crea una nueva orden de trabajo para comenzar</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Ordenes;