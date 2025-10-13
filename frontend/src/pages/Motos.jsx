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
import { Plus, Bike, Gauge, Edit, Trash2, Calendar } from 'lucide-react';

const Motos = ({ user, onLogout }) => {
  const [motos, setMotos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMoto, setEditingMoto] = useState(null);
  const [formData, setFormData] = useState({
    cliente_id: '',
    marca: '',
    modelo: '',
    año: new Date().getFullYear(),
    placa: '',
    vin: '',
    kilometraje_actual: 0,
    color: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [motosRes, clientesRes] = await Promise.all([
        axios.get(`${API}/motos`),
        axios.get(`${API}/clientes`)
      ]);
      setMotos(motosRes.data);
      setClientes(clientesRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cliente_id) {
      toast.error('Debes seleccionar un cliente');
      return;
    }

    try {
      if (editingMoto) {
        await axios.put(`${API}/motos/${editingMoto.id}`, {
          kilometraje_actual: formData.kilometraje_actual,
          color: formData.color
        });
        toast.success('Moto actualizada exitosamente');
      } else {
        await axios.post(`${API}/motos`, formData);
        toast.success('Moto registrada exitosamente');
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar moto');
    }
  };

  const handleEdit = (moto) => {
    setEditingMoto(moto);
    setFormData({
      cliente_id: moto.cliente_id,
      marca: moto.marca,
      modelo: moto.modelo,
      año: moto.año,
      placa: moto.placa,
      vin: moto.vin || '',
      kilometraje_actual: moto.kilometraje_actual,
      color: moto.color || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (motoId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta moto?')) return;
    
    try {
      await axios.delete(`${API}/motos/${motoId}`);
      toast.success('Moto eliminada exitosamente');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar moto');
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      marca: '',
      modelo: '',
      año: new Date().getFullYear(),
      placa: '',
      vin: '',
      kilometraje_actual: 0,
      color: ''
    });
    setEditingMoto(null);
  };

  return (
    <Layout user={user} onLogout={onLogout} title="Motos">
      <div data-testid="motos-page" className="space-y-6">
        <div className="flex items-center justify-between fade-in">
          <div>
            <h1 className="text-4xl font-bebas text-white mb-2">Motos</h1>
            <p className="text-zinc-400">Administra todas las motocicletas del taller</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-moto-button"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                <Plus className="w-5 h-5 mr-2" />
                Registrar Moto
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bebas text-gradient">
                  {editingMoto ? 'Editar Moto' : 'Registrar Nueva Moto'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Cliente *</label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                    disabled={editingMoto !== null}
                  >
                    <SelectTrigger data-testid="moto-cliente-select" className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre} - {cliente.telefono}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Marca *</label>
                    <Input
                      data-testid="moto-marca-input"
                      type="text"
                      placeholder="Honda, Yamaha, Suzuki..."
                      value={formData.marca}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      required
                      disabled={editingMoto !== null}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Modelo *</label>
                    <Input
                      data-testid="moto-modelo-input"
                      type="text"
                      placeholder="CBR 600RR, YZF-R6..."
                      value={formData.modelo}
                      onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                      required
                      disabled={editingMoto !== null}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Año *</label>
                    <Input
                      data-testid="moto-ano-input"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={formData.año}
                      onChange={(e) => setFormData({ ...formData, año: parseInt(e.target.value) })}
                      required
                      disabled={editingMoto !== null}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Placa *</label>
                    <Input
                      data-testid="moto-placa-input"
                      type="text"
                      placeholder="ABC-1234"
                      value={formData.placa}
                      onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                      required
                      disabled={editingMoto !== null}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">VIN (Número de Chasis)</label>
                  <Input
                    data-testid="moto-vin-input"
                    type="text"
                    placeholder="17 caracteres"
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                    disabled={editingMoto !== null}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Kilometraje Actual *</label>
                    <Input
                      data-testid="moto-kilometraje-input"
                      type="number"
                      min="0"
                      value={formData.kilometraje_actual}
                      onChange={(e) => setFormData({ ...formData, kilometraje_actual: parseInt(e.target.value) })}
                      required
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Color</label>
                    <Input
                      data-testid="moto-color-input"
                      type="text"
                      placeholder="Rojo, Negro, Azul..."
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>

                <Button
                  data-testid="moto-submit-button"
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  {editingMoto ? 'Actualizar Moto' : 'Registrar Moto'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-orange-500 text-xl">Cargando motos...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {motos.length > 0 ? (
              motos.map((moto) => (
                <Card key={moto.id} className="glass p-6 fade-in hover:border-orange-500/30">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                        <Bike className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white">{moto.marca}</h3>
                        <p className="text-zinc-400 text-sm">{moto.modelo}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        data-testid={`edit-moto-${moto.id}`}
                        onClick={() => handleEdit(moto)}
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-blue-400 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        data-testid={`delete-moto-${moto.id}`}
                        onClick={() => handleDelete(moto.id)}
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                      <span className="text-zinc-400 text-sm">Placa</span>
                      <span className="text-white font-semibold">{moto.placa}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                      <span className="text-zinc-400 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Año
                      </span>
                      <span className="text-white font-semibold">{moto.año}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                      <span className="text-zinc-300 text-sm flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-orange-500" />
                        Kilometraje
                      </span>
                      <span className="text-orange-500 font-bold">{moto.kilometraje_actual.toLocaleString()} km</span>
                    </div>
                    {moto.color && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                        <span className="text-zinc-400 text-sm">Color</span>
                        <span className="text-white">{moto.color}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-zinc-800">
                      <p className="text-zinc-500 text-xs mb-1">Propietario</p>
                      <p className="text-white font-medium">{moto.cliente_nombre}</p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-16">
                <div className="text-zinc-500 mb-4">
                  <Bike className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl mb-2">No hay motos registradas</p>
                  <p className="text-sm">Comienza registrando tu primera motocicleta</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Motos;