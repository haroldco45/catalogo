import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verificar token y cargar datos de usuario si es necesario
    } else {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
    setLoading(false);
  }, [token]);

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// Components
const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const data = isLogin ? { email, password } : { email, password, name };
      
      const response = await axios.post(`${API}${endpoint}`, data);
      login(response.data.token, response.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-700 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="heading-2 text-gray-900 mb-2">Menu Maestro</h1>
          <p className="body-medium text-gray-600">Tu asistente gastronómico personalizado</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${isLogin ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${!isLogin ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block body-small text-gray-700 mb-2">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tu nombre"
                />
              </div>
            )}
            
            <div>
              <label className="block body-small text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tu@email.com"
              />
            </div>
            
            <div>
              <label className="block body-small text-gray-700 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg body-small">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const ProfileSetup = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    edad: '',
    peso: '',
    altura: '',
    genero: 'masculino',
    tipo_cuerpo: 'mesomorfo',
    nivel_actividad: 'moderado',
    objetivo: 'mantener',
    alergias: '',
    enfermedades: '',
    preferencias_alimenticias: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const profileData = {
        edad: parseInt(formData.edad),
        peso: parseFloat(formData.peso),
        altura: parseFloat(formData.altura),
        genero: formData.genero,
        tipo_cuerpo: formData.tipo_cuerpo,
        nivel_actividad: formData.nivel_actividad,
        objetivo: formData.objetivo,
        alergias: formData.alergias.split(',').map(a => a.trim()).filter(a => a),
        enfermedades: formData.enfermedades.split(',').map(e => e.trim()).filter(e => e),
        preferencias_alimenticias: formData.preferencias_alimenticias
      };

      await axios.post(`${API}/profile`, profileData);
      onComplete();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const togglePreferencia = (pref) => {
    setFormData(prev => ({
      ...prev,
      preferencias_alimenticias: prev.preferencias_alimenticias.includes(pref)
        ? prev.preferencias_alimenticias.filter(p => p !== pref)
        : [...prev.preferencias_alimenticias, pref]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="heading-2 text-gray-900 mb-2">Configura tu Perfil</h1>
          <p className="body-medium text-gray-600">Necesitamos algunos datos para personalizar tus recetas</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Datos Básicos */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block body-small font-medium text-gray-700 mb-2">Edad</label>
                <input
                  type="number"
                  value={formData.edad}
                  onChange={(e) => setFormData({...formData, edad: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="25"
                />
              </div>
              <div>
                <label className="block body-small font-medium text-gray-700 mb-2">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.peso}
                  onChange={(e) => setFormData({...formData, peso: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="70"
                />
              </div>
              <div>
                <label className="block body-small font-medium text-gray-700 mb-2">Altura (cm)</label>
                <input
                  type="number"
                  value={formData.altura}
                  onChange={(e) => setFormData({...formData, altura: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="170"
                />
              </div>
            </div>

            {/* Género */}
            <div>
              <label className="block body-small font-medium text-gray-700 mb-2">Género</label>
              <div className="grid grid-cols-3 gap-3">
                {['masculino', 'femenino', 'otro'].map(gen => (
                  <button
                    key={gen}
                    type="button"
                    onClick={() => setFormData({...formData, genero: gen})}
                    className={`py-3 px-4 rounded-lg border-2 transition-all ${formData.genero === gen ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    {gen.charAt(0).toUpperCase() + gen.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Nivel de Actividad */}
            <div>
              <label className="block body-small font-medium text-gray-700 mb-2">Nivel de Actividad</label>
              <select
                value={formData.nivel_actividad}
                onChange={(e) => setFormData({...formData, nivel_actividad: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sedentario">Sedentario (poco o ningún ejercicio)</option>
                <option value="ligero">Ligero (ejercicio 1-3 días/semana)</option>
                <option value="moderado">Moderado (ejercicio 3-5 días/semana)</option>
                <option value="activo">Activo (ejercicio 6-7 días/semana)</option>
                <option value="muy_activo">Muy Activo (ejercicio intenso diario)</option>
              </select>
            </div>

            {/* Objetivo */}
            <div>
              <label className="block body-small font-medium text-gray-700 mb-2">Objetivo</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {value: 'perder_peso', label: 'Perder Peso'},
                  {value: 'mantener', label: 'Mantener'},
                  {value: 'ganar_musculo', label: 'Ganar Músculo'}
                ].map(obj => (
                  <button
                    key={obj.value}
                    type="button"
                    onClick={() => setFormData({...formData, objetivo: obj.value})}
                    className={`py-3 px-4 rounded-lg border-2 transition-all ${formData.objetivo === obj.value ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    {obj.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferencias Alimenticias */}
            <div>
              <label className="block body-small font-medium text-gray-700 mb-2">Preferencias Alimenticias</label>
              <div className="flex flex-wrap gap-2">
                {['vegetariano', 'vegano', 'sin_gluten', 'sin_lactosa', 'keto', 'bajo_en_sodio'].map(pref => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => togglePreferencia(pref)}
                    className={`py-2 px-4 rounded-full text-sm transition-all ${
                      formData.preferencias_alimenticias.includes(pref)
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {pref.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Alergias */}
            <div>
              <label className="block body-small font-medium text-gray-700 mb-2">Alergias (separadas por comas)</label>
              <input
                type="text"
                value={formData.alergias}
                onChange={(e) => setFormData({...formData, alergias: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: maní, mariscos, frutos secos"
              />
            </div>

            {/* Enfermedades */}
            <div>
              <label className="block body-small font-medium text-gray-700 mb-2">Condiciones Médicas (separadas por comas)</label>
              <input
                type="text"
                value={formData.enfermedades}
                onChange={(e) => setFormData({...formData, enfermedades: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: diabetes, hipertensión, colesterol"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg body-small">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Guardando...' : 'Guardar Perfil'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [generatingMeal, setGeneratingMeal] = useState(false);
  const [mealForm, setMealForm] = useState({
    tipo_comida: 'desayuno',
    ingredientes_deseados: '',
    ingredientes_excluir: ''
  });
  const { logout, user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([
        axios.get(`${API}/stats`),
        axios.get(`${API}/meal-history?limit=10`)
      ]);
      setStats(statsRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const res = await axios.get(`${API}/daily-suggestions`);
      setSuggestions(res.data);
    } catch (err) {
      console.error('Error cargando sugerencias:', err);
    }
  };

  const generateMeal = async () => {
    setGeneratingMeal(true);
    try {
      const data = {
        tipo_comida: mealForm.tipo_comida,
        ingredientes_deseados: mealForm.ingredientes_deseados.split(',').map(i => i.trim()).filter(i => i),
        ingredientes_excluir: mealForm.ingredientes_excluir.split(',').map(i => i.trim()).filter(i => i)
      };
      
      const res = await axios.post(`${API}/generate-meal`, data);
      setHistory([res.data, ...history]);
      setMealForm({
        tipo_comida: 'desayuno',
        ingredientes_deseados: '',
        ingredientes_excluir: ''
      });
      await loadData();
      setActiveTab('history');
    } catch (err) {
      alert('Error generando receta: ' + (err.response?.data?.detail || err.message));
    } finally {
      setGeneratingMeal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-900"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h1 className="heading-4 text-gray-900">Menu Maestro</h1>
              <p className="caption text-gray-600">Hola, {user?.name || 'Usuario'}</p>
            </div>
          </div>
          <button onClick={logout} className="btn-secondary">
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              {id: 'home', label: 'Inicio', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'},
              {id: 'generate', label: 'Generar Receta', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6'},
              {id: 'suggestions', label: 'Sugerencias Diarias', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'},
              {id: 'history', label: 'Historial', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'}
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'suggestions' && !suggestions) loadSuggestions();
                }}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span className="hidden sm:inline body-small font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'home' && stats && (
          <div className="space-y-6">
            <h2 className="heading-3 text-gray-900">Panel de Control</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h3 className="body-medium font-semibold text-gray-900">Calorías Objetivo</h3>
                </div>
                <p className="heading-2 text-gray-900">{stats.calorias_objetivo}</p>
                <p className="caption text-gray-600">kcal/día</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="body-medium font-semibold text-gray-900">Calorías Hoy</h3>
                </div>
                <p className="heading-2 text-gray-900">{stats.calorias_hoy}</p>
                <p className="caption text-gray-600">{stats.progreso_hoy}% del objetivo</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="body-medium font-semibold text-gray-900">Comidas Hoy</h3>
                </div>
                <p className="heading-2 text-gray-900">{stats.comidas_hoy}</p>
                <p className="caption text-gray-600">registradas</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <h3 className="body-medium font-semibold text-gray-900">Total Recetas</h3>
                </div>
                <p className="heading-2 text-gray-900">{stats.total_recetas_generadas}</p>
                <p className="caption text-gray-600">generadas</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-8 border border-purple-100">
              <h3 className="heading-3 text-gray-900 mb-2">¡Comienza tu día con una receta personalizada!</h3>
              <p className="body-medium text-gray-600 mb-4">Genera recetas adaptadas a tu perfil nutricional y preferencias</p>
              <button onClick={() => setActiveTab('generate')} className="btn-primary">
                Generar Nueva Receta
              </button>
            </div>
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="heading-3 text-gray-900 mb-6">Generar Nueva Receta</h2>
            
            <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
              <div>
                <label className="block body-small font-medium text-gray-700 mb-2">Tipo de Comida</label>
                <div className="grid grid-cols-3 gap-3">
                  {['desayuno', 'almuerzo', 'cena'].map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => setMealForm({...mealForm, tipo_comida: tipo})}
                      className={`py-3 px-4 rounded-lg border-2 transition-all capitalize ${
                        mealForm.tipo_comida === tipo
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block body-small font-medium text-gray-700 mb-2">Ingredientes Deseados (opcional)</label>
                <input
                  type="text"
                  value={mealForm.ingredientes_deseados}
                  onChange={(e) => setMealForm({...mealForm, ingredientes_deseados: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: pollo, aguacate, arroz (separados por comas)"
                />
              </div>

              <div>
                <label className="block body-small font-medium text-gray-700 mb-2">Ingredientes a Excluir (opcional)</label>
                <input
                  type="text"
                  value={mealForm.ingredientes_excluir}
                  onChange={(e) => setMealForm({...mealForm, ingredientes_excluir: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: cebolla, ajo (separados por comas)"
                />
              </div>

              <button
                onClick={generateMeal}
                disabled={generatingMeal}
                className="btn-primary w-full"
              >
                {generatingMeal ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Generando receta e imagen...
                  </span>
                ) : 'Generar Receta'}
              </button>

              {generatingMeal && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="body-small text-blue-800">
                    ⏳ Este proceso puede tomar 30-60 segundos mientras generamos tu receta personalizada y la imagen del plato...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div>
            <h2 className="heading-3 text-gray-900 mb-6">Sugerencias Diarias</h2>
            
            {!suggestions ? (
              <div className="text-center py-12">
                <button onClick={loadSuggestions} className="btn-primary">
                  Cargar Sugerencias Personalizadas
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <p className="body-medium text-gray-600">Objetivo calórico diario: <span className="font-semibold text-gray-900">{suggestions.calorias_objetivo} kcal</span></p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {suggestions.sugerencias.map((sug, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                      <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700 mb-3 capitalize">
                        {sug.tipo_comida}
                      </div>
                      <h3 className="heading-4 text-gray-900 mb-2">{sug.nombre}</h3>
                      <p className="body-small text-gray-600 mb-4">{sug.calorias} kcal</p>
                      <div className="space-y-1">
                        <p className="caption text-gray-500 font-medium">Ingredientes principales:</p>
                        <ul className="space-y-1">
                          {sug.ingredientes.map((ing, i) => (
                            <li key={i} className="caption text-gray-600 flex items-center gap-2">
                              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                              {ing}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h2 className="heading-3 text-gray-900 mb-6">Historial de Recetas</h2>
            
            {history.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="body-medium text-gray-600 mb-4">Aún no has generado ninguna receta</p>
                <button onClick={() => setActiveTab('generate')} className="btn-primary">
                  Generar Primera Receta
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {history.map((meal) => (
                  <div key={meal.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                    {meal.imagen_base64 && (
                      <img
                        src={`data:image/png;base64,${meal.imagen_base64}`}
                        alt={meal.nombre}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700 capitalize">
                          {meal.tipo_comida}
                        </span>
                        <span className="caption text-gray-500">
                          {new Date(meal.fecha_creacion).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h3 className="heading-4 text-gray-900 mb-3">{meal.nombre}</h3>
                      
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        <div className="text-center">
                          <p className="caption text-gray-500">Calorías</p>
                          <p className="body-small font-semibold text-gray-900">{meal.calorias}</p>
                        </div>
                        <div className="text-center">
                          <p className="caption text-gray-500">Proteínas</p>
                          <p className="body-small font-semibold text-gray-900">{meal.proteinas.toFixed(1)}g</p>
                        </div>
                        <div className="text-center">
                          <p className="caption text-gray-500">Carbs</p>
                          <p className="body-small font-semibold text-gray-900">{meal.carbohidratos.toFixed(1)}g</p>
                        </div>
                        <div className="text-center">
                          <p className="caption text-gray-500">Grasas</p>
                          <p className="body-small font-semibold text-gray-900">{meal.grasas.toFixed(1)}g</p>
                        </div>
                      </div>

                      <details className="group">
                        <summary className="cursor-pointer list-none flex items-center justify-between body-small font-medium text-gray-700 hover:text-gray-900">
                          Ver detalles
                          <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <div className="mt-4 space-y-3">
                          <div>
                            <p className="caption font-medium text-gray-700 mb-1">Ingredientes:</p>
                            <ul className="space-y-1">
                              {meal.ingredientes.map((ing, i) => (
                                <li key={i} className="caption text-gray-600 flex items-center gap-2">
                                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                  {ing}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="caption font-medium text-gray-700 mb-1">Preparación:</p>
                            <p className="caption text-gray-600 whitespace-pre-line">{meal.preparacion}</p>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Main = () => {
  const { token, loading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (token && !loading) {
      checkProfile();
    } else {
      setCheckingProfile(false);
    }
  }, [token, loading]);

  const checkProfile = async () => {
    try {
      const res = await axios.get(`${API}/profile`);
      setProfile(res.data);
    } catch (err) {
      console.error('Error checking profile:', err);
    } finally {
      setCheckingProfile(false);
    }
  };

  if (loading || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-900"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Login />;
  }

  if (!profile?.configured) {
    return <ProfileSetup onComplete={() => checkProfile()} />;
  }

  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
}

export default App;
