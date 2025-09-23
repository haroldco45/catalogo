import React from 'react';
import { useLocation } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';

const Header = ({ user, onLogout }) => {
  const location = useLocation();
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard';
      case '/clients':
        return 'Gestión de Clientes';
      case '/loans':
        return 'Gestión de Préstamos';
      case '/payments':
        return 'Registro de Pagos';
      case '/reports':
        return 'Reportes y Análisis';
      default:
        return 'PRESTAMOS OPORTUNOS';
    }
  };

  return (
    <header className="header">
      <h1 className="header-title">{getPageTitle()}</h1>
      
      <div className="user-menu">
        <div className="user-info">
          <User size={18} />
          <span>{user?.username}</span>
        </div>
        
        <button 
          onClick={onLogout}
          className="logout-btn"
          title="Cerrar Sesión"
        >
          <LogOut size={16} />
          Salir
        </button>
      </div>
    </header>
  );
};

export default Header;