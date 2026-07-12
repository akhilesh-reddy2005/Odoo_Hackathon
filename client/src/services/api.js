import axios from 'axios';

// Create Axios Instance
const api = axios.create({
  baseURL: '', // Empty because we rely on Vite's proxy configs ('/api')
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('transitops_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global Error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized (expired token), clear cache and redirect
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('transitops_token');
      localStorage.removeItem('transitops_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  login: async (username, password) => {
    const response = await api.post('/api/auth/login', { username, password });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.put('/api/auth/profile', data);
    return response.data;
  },
  getRoles: async () => {
    const response = await api.get('/api/auth/roles');
    return response.data;
  },
  updateRolePermissions: async (roleId, permissions) => {
    const response = await api.put('/api/auth/roles', { roleId, permissions });
    return response.data;
  },
};

// Vehicles Services
export const vehicleService = {
  getAll: async (params) => {
    const response = await api.get('/api/vehicles', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/api/vehicles/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/api/vehicles', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/api/vehicles/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/api/vehicles/${id}`);
    return response.data;
  },
};

// Drivers Services
export const driverService = {
  getAll: async (params) => {
    const response = await api.get('/api/drivers', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/api/drivers/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/api/drivers', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/api/drivers/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/api/drivers/${id}`);
    return response.data;
  },
};

// Trips Services
export const tripService = {
  getAll: async (params) => {
    const response = await api.get('/api/trips', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/api/trips/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/api/trips', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/api/trips/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/api/trips/${id}`);
    return response.data;
  },
  dispatch: async (id) => {
    const response = await api.patch(`/api/trips/${id}/dispatch`);
    return response.data;
  },
  complete: async (id, currentOdometer) => {
    const response = await api.patch(`/api/trips/${id}/complete`, { current_odometer: currentOdometer });
    return response.data;
  },
  cancel: async (id) => {
    const response = await api.patch(`/api/trips/${id}/cancel`);
    return response.data;
  },
};

// Maintenance Services
export const maintenanceService = {
  getAll: async (params) => {
    const response = await api.get('/api/maintenance', { params });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/api/maintenance', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/api/maintenance/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/api/maintenance/${id}`);
    return response.data;
  },
};

// Fuel Log Services
export const fuelService = {
  getAll: async (params) => {
    const response = await api.get('/api/fuel', { params });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/api/fuel', data);
    return response.data;
  },
};

// Expenses Services
export const expenseService = {
  getAll: async (params) => {
    const response = await api.get('/api/expenses', { params });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/api/expenses', data);
    return response.data;
  },
};

// Analytics Services
export const analyticsService = {
  getDashboard: async () => {
    const response = await api.get('/api/analytics/dashboard');
    return response.data;
  },
  getCharts: async () => {
    const response = await api.get('/api/analytics/charts');
    return response.data;
  },
};

export default api;
