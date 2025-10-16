import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Login } from "@/components/Login";
import { Dashboard } from "@/components/Dashboard";
import { Patients } from "@/components/Patients";
import { Appointments } from "@/components/Appointments";
import { MedicalHistory } from "@/components/MedicalHistory";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await api.get("/auth/me");
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
                  <Sidebar user={user} setUser={setUser} />
                  <div className="flex-1 overflow-auto">
                    <Routes>
                      <Route path="/" element={<Dashboard user={user} />} />
                      <Route path="/patients" element={<Patients />} />
                      <Route path="/appointments" element={<Appointments user={user} />} />
                      <Route path="/medical-history/:patientId" element={<MedicalHistory />} />
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                  </div>
                </div>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;