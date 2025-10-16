import { useNavigate, useLocation } from "react-router-dom";
import { Calendar, Users, FileText, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Sidebar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    toast.success("Sesión cerrada");
    navigate("/login");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Users, label: "Pacientes", path: "/patients" },
    { icon: Calendar, label: "Citas", path: "/appointments" },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">DentalCare</h1>
            <p className="text-xs text-gray-500">Sistema de Gestión</p>
          </div>
        </div>
      </div>

      <div className="flex-1 py-6">
        <nav className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                data-testid={`menu-${item.label.toLowerCase()}`}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-700 shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="mb-3 p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Conectado como</p>
          <p className="font-semibold text-gray-900 text-sm">{user?.name}</p>
          <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
        </div>
        <Button
          data-testid="logout-button"
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center justify-center space-x-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </Button>
      </div>
    </div>
  );
};