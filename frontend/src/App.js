import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configure axios
axios.defaults.baseURL = API;

// Utility functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

// Navigation Component
const BottomNav = ({ currentPage, setCurrentPage }) => {
  const pages = [
    { id: 'dashboard', name: 'Inicio', icon: '🏠' },
    { id: 'sales', name: 'Ventas', icon: '💰' },
    { id: 'expenses', name: 'Gastos', icon: '🛒' },
    { id: 'categories', name: 'Categorías', icon: '📂' },
    { id: 'reports', name: 'Reportes', icon: '📊' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex justify-around">
        {pages.map(page => (
          <button
            key={page.id}
            onClick={() => setCurrentPage(page.id)}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              currentPage === page.id 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-xl mb-1">{page.icon}</span>
            <span className="text-xs font-medium">{page.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    try {
      const today = getTodayString();
      const response = await axios.get(`/reports/daily/${today}`);
      setTodayData(response.data);
    } catch (error) {
      console.error('Error loading today data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const profitColor = todayData?.net_profit >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mi Tienda</h1>
        <p className="text-gray-600">{formatDate(getTodayString())}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <h3 className="text-sm font-medium opacity-90">Ventas del Día</h3>
          <p className="text-3xl font-bold">{formatCurrency(todayData?.total_sales || 0)}</p>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
          <h3 className="text-sm font-medium opacity-90">Gastos del Día</h3>
          <p className="text-3xl font-bold">{formatCurrency(todayData?.total_expenses || 0)}</p>
        </div>

        <div className={`bg-gradient-to-r ${todayData?.net_profit >= 0 ? 'from-blue-500 to-blue-600' : 'from-gray-500 to-gray-600'} rounded-xl p-6 text-white`}>
          <h3 className="text-sm font-medium opacity-90">Ganancia del Día</h3>
          <p className="text-3xl font-bold">{formatCurrency(todayData?.net_profit || 0)}</p>
        </div>
      </div>

      {/* Expenses by Category */}
      {todayData?.expenses_by_category?.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Gastos por Categoría</h3>
          <div className="space-y-3">
            {todayData.expenses_by_category.map((cat, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: cat.color }}
                  ></div>
                  <span className="text-sm font-medium">{cat.category}</span>
                </div>
                <span className="text-sm font-bold">{formatCurrency(cat.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-20"></div> {/* Space for bottom nav */}
    </div>
  );
};

// Sales Component
const Sales = () => {
  const [todaySale, setTodaySale] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadTodaySale();
  }, []);

  const loadTodaySale = async () => {
    try {
      const today = getTodayString();
      const response = await axios.get(`/daily-sales/${today}`);
      if (response.data.total_sales) {
        setTodaySale(response.data.total_sales.toString());
        setNotes(response.data.notes || '');
      }
    } catch (error) {
      console.error('Error loading today sale:', error);
    }
  };

  const saveSale = async () => {
    if (!todaySale || isNaN(todaySale) || parseFloat(todaySale) < 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/daily-sales', {
        date: getTodayString(),
        total_sales: parseFloat(todaySale),
        notes: notes.trim() || null
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('Error al guardar la venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registro de Ventas</h2>
        <p className="text-gray-600">{formatDate(getTodayString())}</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total de Ventas del Día
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">$</span>
              <input
                type="number"
                value={todaySale}
                onChange={(e) => setTodaySale(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-4 text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comentarios adicionales..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={saveSale}
            disabled={loading || !todaySale}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
              success
                ? 'bg-green-500 text-white'
                : loading || !todaySale
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? 'Guardando...' : success ? '✓ Guardado' : 'Guardar Venta'}
          </button>
        </div>
      </div>

      <div className="h-20"></div>
    </div>
  );
};

// Expenses Component
const Expenses = () => {
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
    loadTodayExpenses();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await axios.get('/expense-categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadTodayExpenses = async () => {
    try {
      const today = getTodayString();
      const response = await axios.get(`/expenses?date_str=${today}`);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  const saveExpense = async () => {
    if (!selectedCategory || !description.trim() || !amount || isNaN(amount) || parseFloat(amount) <= 0) {
      alert('Por favor completa todos los campos con valores válidos');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/expenses', {
        date: getTodayString(),
        category_id: selectedCategory,
        description: description.trim(),
        amount: parseFloat(amount)
      });
      
      // Reset form
      setSelectedCategory('');
      setDescription('');
      setAmount('');
      
      // Reload expenses
      loadTodayExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Error al guardar el gasto');
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (expenseId) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;

    try {
      await axios.delete(`/expenses/${expenseId}`);
      loadTodayExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Error al eliminar el gasto');
    }
  };

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registro de Gastos</h2>
        <p className="text-gray-600">{formatDate(getTodayString())}</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecciona una categoría</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Compra de verduras"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={saveExpense}
            disabled={loading || !selectedCategory || !description.trim() || !amount}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
              loading || !selectedCategory || !description.trim() || !amount
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? 'Guardando...' : 'Guardar Gasto'}
          </button>
        </div>
      </div>

      {/* Today's Expenses */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Gastos de Hoy</h3>
        {expenses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No hay gastos registrados hoy</p>
        ) : (
          <div className="space-y-3">
            {expenses.map(expense => (
              <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center flex-1">
                  <div 
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: expense.category_color }}
                  ></div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{expense.description}</p>
                    <p className="text-xs text-gray-500">{expense.category_name}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="font-bold text-sm mr-2">{formatCurrency(expense.amount)}</span>
                  <button
                    onClick={() => deleteExpense(expense.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-20"></div>
    </div>
  );
};

// Categories Component
const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#3B82F6' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(false);

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#6B7280', '#EC4899', '#14B8A6'
  ];

  useEffect(() => {
    loadCategories();
    initializeDefaultCategories();
  }, []);

  const initializeDefaultCategories = async () => {
    try {
      await axios.post('/init-categories');
      loadCategories();
    } catch (error) {
      console.error('Error initializing categories:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get('/expense-categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const saveCategory = async () => {
    if (!newCategory.name.trim()) {
      alert('Por favor ingresa un nombre para la categoría');
      return;
    }

    setLoading(true);
    try {
      if (editingCategory) {
        await axios.put(`/expense-categories/${editingCategory.id}`, newCategory);
        setEditingCategory(null);
      } else {
        await axios.post('/expense-categories', newCategory);
      }
      
      setNewCategory({ name: '', description: '', color: '#3B82F6' });
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error al guardar la categoría');
    } finally {
      setLoading(false);
    }
  };

  const editCategory = (category) => {
    setNewCategory({
      name: category.name,
      description: category.description || '',
      color: category.color
    });
    setEditingCategory(category);
  };

  const cancelEdit = () => {
    setNewCategory({ name: '', description: '', color: '#3B82F6' });
    setEditingCategory(null);
  };

  const deleteCategory = async (categoryId) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;

    try {
      await axios.delete(`/expense-categories/${categoryId}`);
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      if (error.response?.status === 400) {
        alert('No se puede eliminar una categoría que tiene gastos asociados');
      } else {
        alert('Error al eliminar la categoría');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Categorías de Gastos</h2>
        <p className="text-gray-600">Gestiona las categorías para organizar tus gastos</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">
          {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre
            </label>
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
              placeholder="Ej: Bebidas"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (Opcional)
            </label>
            <input
              type="text"
              value={newCategory.description}
              onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
              placeholder="Ej: Agua, gaseosas, jugos"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => setNewCategory({...newCategory, color})}
                  className={`w-8 h-8 rounded-full border-2 ${
                    newCategory.color === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveCategory}
              disabled={loading || !newCategory.name.trim()}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                loading || !newCategory.name.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Guardando...' : editingCategory ? 'Actualizar' : 'Crear'}
            </button>
            
            {editingCategory && (
              <button
                onClick={cancelEdit}
                className="px-4 py-3 rounded-lg font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Categorías Existentes</h3>
        {categories.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No hay categorías creadas</p>
        ) : (
          <div className="space-y-3">
            {categories.map(category => (
              <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center flex-1">
                  <div 
                    className="w-6 h-6 rounded-full mr-3"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    {category.description && (
                      <p className="text-sm text-gray-500">{category.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => editCategory(category)}
                    className="text-blue-500 hover:text-blue-700 p-1"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-20"></div>
    </div>
  );
};

// Reports Component
const Reports = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [dailyReport, setDailyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyReport();
    } else {
      loadMonthlyReport();
    }
  }, [selectedDate, selectedMonth, activeTab]);

  const loadDailyReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/reports/daily/${selectedDate}`);
      setDailyReport(response.data);
    } catch (error) {
      console.error('Error loading daily report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReport = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const response = await axios.get(`/reports/monthly/${year}/${month}`);
      setMonthlyReport(response.data);
    } catch (error) {
      console.error('Error loading monthly report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reportes</h2>
        <p className="text-gray-600">Analiza el rendimiento de tu tienda</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'daily'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Reporte Diario
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'monthly'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Reporte Mensual
        </button>
      </div>

      {activeTab === 'daily' ? (
        <div className="space-y-6">
          {/* Date Selector */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Fecha
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : dailyReport && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <h3 className="text-sm font-medium opacity-90">Ventas</h3>
                  <p className="text-2xl font-bold">{formatCurrency(dailyReport.total_sales)}</p>
                </div>

                <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
                  <h3 className="text-sm font-medium opacity-90">Gastos</h3>
                  <p className="text-2xl font-bold">{formatCurrency(dailyReport.total_expenses)}</p>
                </div>

                <div className={`bg-gradient-to-r ${dailyReport.net_profit >= 0 ? 'from-blue-500 to-blue-600' : 'from-gray-500 to-gray-600'} rounded-xl p-6 text-white`}>
                  <h3 className="text-sm font-medium opacity-90">Ganancia</h3>
                  <p className="text-2xl font-bold">{formatCurrency(dailyReport.net_profit)}</p>
                </div>
              </div>

              {/* Expenses by Category */}
              {dailyReport.expenses_by_category.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Gastos por Categoría</h3>
                  <div className="space-y-3">
                    {dailyReport.expenses_by_category.map((cat, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-full mr-3"
                            style={{ backgroundColor: cat.color }}
                          ></div>
                          <div>
                            <span className="font-medium">{cat.category}</span>
                            <span className="text-sm text-gray-500 ml-2">({cat.count} gastos)</span>
                          </div>
                        </div>
                        <span className="font-bold">{formatCurrency(cat.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Month Selector */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Mes
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : monthlyReport && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <h3 className="text-sm font-medium opacity-90">Ventas del Mes</h3>
                  <p className="text-2xl font-bold">{formatCurrency(monthlyReport.total_sales)}</p>
                </div>

                <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
                  <h3 className="text-sm font-medium opacity-90">Gastos del Mes</h3>
                  <p className="text-2xl font-bold">{formatCurrency(monthlyReport.total_expenses)}</p>
                </div>

                <div className={`bg-gradient-to-r ${monthlyReport.net_profit >= 0 ? 'from-blue-500 to-blue-600' : 'from-gray-500 to-gray-600'} rounded-xl p-6 text-white`}>
                  <h3 className="text-sm font-medium opacity-90">Ganancia del Mes</h3>
                  <p className="text-2xl font-bold">{formatCurrency(monthlyReport.net_profit)}</p>
                </div>
              </div>

              {/* Daily Data */}
              {monthlyReport.daily_data.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Resumen Diario</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {monthlyReport.daily_data.map((day, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                        <span className="font-medium">{formatDate(day.date)}</span>
                        <div className="flex gap-4">
                          <span className="text-green-600">V: {formatCurrency(day.sales)}</span>
                          <span className="text-red-600">G: {formatCurrency(day.expenses)}</span>
                          <span className={day.profit >= 0 ? 'text-blue-600 font-semibold' : 'text-gray-600 font-semibold'}>
                            {formatCurrency(day.profit)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Expenses by Category */}
              {monthlyReport.expenses_by_category.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Gastos Mensuales por Categoría</h3>
                  <div className="space-y-3">
                    {monthlyReport.expenses_by_category.map((cat, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-full mr-3"
                            style={{ backgroundColor: cat.color }}
                          ></div>
                          <div>
                            <span className="font-medium">{cat.category}</span>
                            <span className="text-sm text-gray-500 ml-2">({cat.count} gastos)</span>
                          </div>
                        </div>
                        <span className="font-bold">{formatCurrency(cat.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="h-20"></div>
    </div>
  );
};

// Main App Component
const MainApp = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'sales':
        return <Sales />;
      case 'expenses':
        return <Expenses />;
      case 'categories':
        return <Categories />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="p-4 pb-20">
          {renderCurrentPage()}
        </div>
        <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;