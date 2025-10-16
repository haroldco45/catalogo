import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Products API
export const getCategories = () => axios.get(`${API}/categories`);
export const getProducts = (params) => axios.get(`${API}/products`, { params });
export const getProduct = (id) => axios.get(`${API}/products/${id}`);
export const createProduct = (data) => axios.post(`${API}/products`, data);
export const updateProduct = (id, data) => axios.put(`${API}/products/${id}`, data);
export const deleteProduct = (id) => axios.delete(`${API}/products/${id}`);

// Customers API
export const getCustomers = (params) => axios.get(`${API}/customers`, { params });
export const getCustomer = (id) => axios.get(`${API}/customers/${id}`);
export const createCustomer = (data) => axios.post(`${API}/customers`, data);
export const updateCustomer = (id, data) => axios.put(`${API}/customers/${id}`, data);
export const deleteCustomer = (id) => axios.delete(`${API}/customers/${id}`);

// Sales API
export const getSales = (params) => axios.get(`${API}/sales`, { params });
export const getSale = (id) => axios.get(`${API}/sales/${id}`);
export const createSale = (data) => axios.post(`${API}/sales`, data);

// Dashboard API
export const getDashboardStats = () => axios.get(`${API}/dashboard/stats`);

// Reports API
export const getSalesReport = (params) => axios.get(`${API}/reports/sales`, { params });
export const exportReport = (params) => {
  return axios.get(`${API}/reports/export`, { 
    params,
    responseType: 'blob'
  });
};
