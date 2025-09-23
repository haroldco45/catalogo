import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  CreditCard, 
  FileText,
  Building2 
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Préstamos', href: '/loans', icon: DollarSign },
    { name: 'Pagos', href: '/payments', icon: CreditCard },
    { name: 'Reportes', href: '/reports', icon: FileText },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Building2 className="nav-icon" />
          PRÉSTAMOS OPORTUNOS
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;