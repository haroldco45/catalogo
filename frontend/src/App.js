import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import "./App.css";
import axios from "axios";

// Icons
import { 
  Home, 
  Users, 
  Car, 
  Wrench, 
  ClipboardList, 
  BarChart3, 
  Search,
  Menu,
  X,
  Settings,
  LogOut,
  User
} from "lucide-react";

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Login from './components/Login';
import Clientes from './components/Clientes';
import Vehiculos from './components/Vehiculos';
import Servicios from './components/Servicios';
import TiposServicios from './components/TiposServicios';
import Reportes from './components/Reportes';
import Buscar from './components/Buscar';
import ConfiguracionNegocio from './components/ConfiguracionNegocio';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Layout Component
const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businessConfig, setBusinessConfig] = useState(null);
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchBusinessConfig();
  }, []);

  const fetchBusinessConfig = async () => {
    try {
      const response = await axios.get(`${API}/business/config`);
      setBusinessConfig(response.data);
    } catch (error) {
      console.error('Error fetching business config:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Vehículos', href: '/vehiculos', icon: Car },
    { name: 'Servicios', href: '/servicios', icon: ClipboardList },
    { name: 'Tipos de Servicio', href: '/tipos-servicios', icon: Wrench },
    { name: 'Reportes', href: '/reportes', icon: BarChart3 },
    { name: 'Buscar', href: '/buscar', icon: Search },
    ...(user?.role === 'admin' ? [{ name: 'Configuración', href: '/configuracion', icon: Settings }] : [])
  ];

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <SidebarContent navigation={navigation} currentPath={location.pathname} businessConfig={businessConfig} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <SidebarContent navigation={navigation} currentPath={location.pathname} businessConfig={businessConfig} />
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900 md:hidden">
                {businessConfig?.business_name || 'Lavadero Pro'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-500">
                <User className="h-4 w-4 mr-2" />
                <span>{user?.full_name || user?.username}</span>
                {user?.role === 'admin' && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const SidebarContent = ({ navigation, currentPath, businessConfig }) => (
  <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
    <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
      <div className="flex items-center flex-shrink-0 px-4">
        <div className="flex items-center">
          {businessConfig?.logo_url ? (
            <img 
              src={businessConfig.logo_url} 
              alt="Logo" 
              className="h-8 w-8 rounded-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center ${businessConfig?.logo_url ? 'hidden' : ''}`}>
            <Car className="h-5 w-5 text-white" />
          </div>
          <div className="ml-3">
            <span className="text-lg font-bold text-gray-900">
              {businessConfig?.business_name || 'Lavadero Pro'}
            </span>
            {businessConfig?.owner_name && (
              <p className="text-xs text-gray-500">{businessConfig.owner_name}</p>
            )}
          </div>
        </div>
      </div>
      <nav className="mt-5 flex-1 px-2 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`${
                isActive
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors`}
            >
              <Icon className={`${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'} mr-3 flex-shrink-0 h-6 w-6`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  </div>
);

// Dashboard Component
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/dashboard/estadisticas`);
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Servicios Hoy',
      value: stats?.servicios_hoy || 0,
      icon: ClipboardList,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      name: 'Ingresos Hoy',
      value: `$${(stats?.ingresos_hoy || 0).toFixed(2)}`,
      icon: BarChart3,
      color: 'text-green-600 bg-green-100',
    },
    {
      name: 'Servicios Mes',
      value: stats?.servicios_mes || 0,
      icon: ClipboardList,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      name: 'Ingresos Mes',
      value: `$${(stats?.ingresos_mes || 0).toFixed(2)}`,
      icon: BarChart3,
      color: 'text-orange-600 bg-orange-100',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Resumen general de tu lavadero</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`p-3 rounded-md ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                      <dd className="text-lg font-medium text-gray-900">{stat.value}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Total Clientes</dt>
                  <dd className="text-2xl font-bold text-gray-900">{stats?.clientes_total || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Car className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Total Vehículos</dt>
                  <dd className="text-2xl font-bold text-gray-900">{stats?.vehiculos_total || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Wrench className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Servicio Popular</dt>
                  <dd className="text-lg font-bold text-gray-900">
                    {stats?.servicio_mas_popular || 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function AppContent() {
  const { isAuthenticated, loading, login, user } = useAuth();

  // Initialize data on first auth
  useEffect(() => {
    if (isAuthenticated()) {
      const initializeData = async () => {
        try {
          await axios.post(`${API}/inicializar-datos`);
        } catch (error) {
          console.error('Error initializing data:', error);
        }
      };

      initializeData();
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/vehiculos" element={<Vehiculos />} />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/tipos-servicios" element={<TiposServicios />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/buscar" element={<Buscar />} />
            {user?.role === 'admin' && (
              <Route path="/configuracion" element={<ConfiguracionNegocio user={user} />} />
            )}
          </Routes>
        </Layout>
      </BrowserRouter>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;