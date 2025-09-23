import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ClientsPage from './components/ClientsPage';
import LoansPage from './components/LoansPage';
import PaymentsPage from './components/PaymentsPage';
import ReportsPage from './components/ReportsPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    // Set default authorization header
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Set authorization header if token exists
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <div className="flex h-screen bg-gray-100">
                  <Sidebar />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Header user={user} onLogout={handleLogout} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/clients" element={<ClientsPage />} />
                        <Route path="/loans" element={<LoansPage />} />
                        <Route path="/payments" element={<PaymentsPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;