import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Shield } from "lucide-react";

export const Login = ({ setUser }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "recepcionista",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const response = await api.post(endpoint, formData);
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      toast.success(isLogin ? "Bienvenido" : "Cuenta creada exitosamente");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error en la autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
      <div className="w-full max-w-5xl flex rounded-2xl shadow-2xl overflow-hidden bg-white">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-cyan-500 p-12 flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-48 -translate-x-48"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Calendar className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">DentalCare</h1>
                <p className="text-blue-100 text-sm">Sistema de Gestión</p>
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Gestión Profesional de Citas Odontológicas
            </h2>
            <p className="text-blue-100 text-lg">
              Organiza tu consultorio, administra pacientes y citas de forma eficiente
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-sm">Calendario inteligente de citas</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <p className="text-sm">Historial clínico completo</p>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
              </h2>
              <p className="text-gray-600">
                {isLogin
                  ? "Ingresa tus credenciales para continuar"
                  : "Completa el formulario para registrarte"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Nombre completo
                  </Label>
                  <Input
                    id="name"
                    data-testid="register-name-input"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-11"
                    placeholder="Juan Pérez"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  data-testid="login-email-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-11"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="h-11"
                  placeholder="••••••••"
                />
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                    Rol
                  </Label>
                  <select
                    id="role"
                    data-testid="register-role-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-11 px-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="recepcionista">Recepcionista</option>
                    <option value="dentista">Dentista</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              )}

              <Button
                type="submit"
                data-testid="login-submit-button"
                disabled={loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Procesando...</span>
                  </div>
                ) : isLogin ? (
                  "Iniciar Sesión"
                ) : (
                  "Crear Cuenta"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                data-testid="toggle-auth-mode"
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                {isLogin
                  ? "¿No tienes cuenta? Regístrate"
                  : "¿Ya tienes cuenta? Inicia sesión"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};