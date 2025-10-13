import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Bike, Users, ClipboardList, LogOut, Wrench } from 'lucide-react';

const Layout = ({ children, user, onLogout, title }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Clientes', path: '/clientes', icon: Users },
    { name: 'Motos', path: '/motos', icon: Bike },
    { name: 'Órdenes', path: '/ordenes', icon: ClipboardList },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-zinc-900 border-r border-zinc-800 z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bebas text-gradient">MotoService</h1>
              <p className="text-xs text-zinc-500">Gestión Profesional</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    active
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white font-medium text-sm">{user.nombre}</p>
              <p className="text-zinc-500 text-xs">{user.email}</p>
            </div>
          </div>
          <Button
            data-testid="logout-button"
            onClick={onLogout}
            variant="outline"
            className="w-full border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;