import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Mail, Phone, MapPin, Edit, Trash2 } from 'lucide-react';

const Clientes = ({ user, onLogout }) => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      const response = await axios.get(`${API}/clientes`);
      setClientes(response.data);
    } catch (error) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await axios.put(`${API}/clientes/${editingCliente.id}`, formData);
        toast.success('Cliente actualizado exitosamente');
      } else {
        await axios.post(`${API}/clientes`, formData);
        toast.success('Cliente creado exitosamente');
      }
      setDialogOpen(false);
      resetForm();
      loadClientes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar cliente');
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      email: cliente.email || '',
      direccion: cliente.direccion || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (clienteId) => {
    if (!window.confirm('¿Estás seguro de eliminar este cliente?')) return;
    
    try {
      await axios.delete(`${API}/clientes/${clienteId}`);
      toast.success('Cliente eliminado exitosamente');
      loadClientes();
    } catch (error) {
      toast.error('Error al eliminar cliente');
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', telefono: '', email: '', direccion: '' });
    setEditingCliente(null);
  };

  return (
    <Layout user={user} onLogout={onLogout} title="Clientes">
      <div data-testid="clientes-page" className="space-y-6">
        <div className="flex items-center justify-between fade-in">
          <div>
            <h1 className="text-4xl font-bebas text-white mb-2">Clientes</h1>
            <p className="text-zinc-400">Gestiona tu base de clientes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-cliente-button"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bebas text-gradient">
                  {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Nombre Completo *</label>
                  <Input
                    data-testid="cliente-nombre-input"
                    type="text"
                    placeholder="Juan Pérez"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Teléfono *</label>
                  <Input
                    data-testid="cliente-telefono-input"
                    type="tel"
                    placeholder="+34 600 000 000"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    required
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
                  <Input
                    data-testid="cliente-email-input"
                    type="email"
                    placeholder="juan@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Dirección</label>
                  <Input
                    data-testid="cliente-direccion-input"
                    type="text"
                    placeholder="Calle Principal 123"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <Button
                  data-testid="cliente-submit-button"
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  {editingCliente ? 'Actualizar Cliente' : 'Crear Cliente'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-orange-500 text-xl">Cargando clientes...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientes.length > 0 ? (
              clientes.map((cliente) => (
                <Card key={cliente.id} className="glass p-6 fade-in hover:border-orange-500/30">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">{cliente.nombre}</h3>
                      <span className="text-xs text-zinc-500">ID: {cliente.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        data-testid={`edit-cliente-${cliente.id}`}
                        onClick={() => handleEdit(cliente)}
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-blue-400 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        data-testid={`delete-cliente-${cliente.id}`}
                        onClick={() => handleDelete(cliente.id)}
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-zinc-400">
                      <Phone className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">{cliente.telefono}</span>
                    </div>
                    {cliente.email && (
                      <div className="flex items-center gap-3 text-zinc-400">
                        <Mail className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">{cliente.email}</span>
                      </div>
                    )}
                    {cliente.direccion && (
                      <div className="flex items-center gap-3 text-zinc-400">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">{cliente.direccion}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-16">
                <div className="text-zinc-500 mb-4">
                  <p className="text-xl mb-2">No hay clientes registrados</p>
                  <p className="text-sm">Comienza agregando tu primer cliente</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Clientes;