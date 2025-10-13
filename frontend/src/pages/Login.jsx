import { useState } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Wrench, Lock, Mail } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const response = await axios.post(`${API}${endpoint}`, formData);
      
      onLogin(response.data.user, response.data.token);
      toast.success(isRegister ? '¡Registro exitoso!' : '¡Bienvenido!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8 fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-4 shadow-lg">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bebas text-gradient mb-2">MotoService</h1>
          <p className="text-zinc-400 text-sm">Sistema profesional de gestión de mantenimiento</p>
        </div>

        {/* Formulario */}
        <div className="glass p-8 fade-in">
          <div className="flex gap-2 mb-6">
            <button
              data-testid="login-tab"
              onClick={() => setIsRegister(false)}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                !isRegister
                  ? 'bg-orange-500 text-white'
                  : 'bg-transparent text-zinc-400 hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              data-testid="register-tab"
              onClick={() => setIsRegister(true)}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                isRegister
                  ? 'bg-orange-500 text-white'
                  : 'bg-transparent text-zinc-400 hover:text-white'
              }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Nombre Completo</label>
                <Input
                  data-testid="register-name-input"
                  type="text"
                  placeholder="Juan Pérez"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required={isRegister}
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  data-testid="login-email-input"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 pl-11"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  data-testid="login-password-input"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 pl-11"
                />
              </div>
            </div>

            <Button
              data-testid="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              {loading ? 'Cargando...' : isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-500 text-xs mt-6">
          Sistema de gestión profesional para talleres de motos
        </p>
      </div>
    </div>
  );
};

export default Login;