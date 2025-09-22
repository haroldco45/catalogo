import React, { useState } from 'react';
import axios from 'axios';
import { Car, Eye, EyeOff, Shield, Building } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const response = await axios.post(`${API}/auth/login`, {
          username: formData.username,
          password: formData.password
        });
        
        const { access_token, user } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        onLogin(user, access_token);
      } else {
        // Register
        await axios.post(`${API}/auth/register`, {
          username: formData.username,
          password: formData.password,
          email: formData.email,
          full_name: formData.full_name,
          role: 'user'
        });
        
        alert('Usuario registrado exitosamente. Ahora puedes iniciar sesión.');
        setIsLogin(true);
        setFormData({ username: formData.username, password: '', email: '', full_name: '' });
      }
    } catch (error) {
      console.error('Auth error:', error);
      const message = error.response?.data?.detail || 'Error en la autenticación';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const createAdminUser = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/setup/admin`);
      alert(`${response.data.message}\nUsuario: admin\nContraseña: admin123`);
    } catch (error) {
      console.error('Error creating admin:', error);
      alert('Error al crear usuario administrador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg">
              <Car className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Lavadero Pro
          </h2>
          <p className="mt-2 text-sm text-blue-100">
            {isLogin ? 'Inicia sesión en tu cuenta' : 'Crea una nueva cuenta'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label">
                Usuario
              </label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Ingresa tu usuario"
                disabled={loading}
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="form-label">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ingresa tu email"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="form-label">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Ingresa tu nombre completo"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div>
              <label className="form-label">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Ingresa tu contraseña"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cargando...
                  </div>
                ) : (
                  <>
                    {isLogin ? (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Iniciar Sesión
                      </>
                    ) : (
                      <>
                        <Building className="h-4 w-4 mr-2" />
                        Registrarse
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ username: '', password: '', email: '', full_name: '' });
              }}
              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              disabled={loading}
            >
              {isLogin 
                ? '¿No tienes cuenta? Regístrate aquí' 
                : '¿Ya tienes cuenta? Inicia sesión aquí'
              }
            </button>
          </div>

          {/* Create Admin Button */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={createAdminUser}
              className="text-gray-600 hover:text-gray-800 text-xs font-medium underline"
              disabled={loading}
            >
              Crear usuario administrador inicial
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-blue-100">
            Sistema de gestión de lavadero profesional
          </p>
          <p className="text-xs text-blue-200 mt-1">
            © 2024 Lavadero Pro. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;