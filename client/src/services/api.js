import axios from 'axios';

/**
 * Resolves the backend API base URL safely across development and production environments.
 * In production builds, warns explicitly if VITE_API_BASE_URL was omitted at build time,
 * falling back to relative '/api' rather than silently sending user traffic to localhost:5000.
 */
const resolveBaseUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (envBaseUrl && typeof envBaseUrl === 'string' && envBaseUrl.trim()) {
    return envBaseUrl.trim().replace(/\/+$/, '');
  }

  if (import.meta.env.PROD) {
    console.warn(
      '[FlowForge AI] Warning: VITE_API_BASE_URL is not configured for this production build. ' +
      'Falling back to relative "/api". If frontend and backend are hosted on separate domains, ' +
      'set VITE_API_BASE_URL in your hosting provider build configuration.'
    );
    return '/api';
  }

  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Attach Authorization Bearer token to outgoing requests if available
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('flowforge_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // LocalStorage access may fail in restricted browser environments
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Health check API
 */
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

/**
 * Register a new user
 * @param {{ name: string, email: string, password: string }} userData
 */
export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

/**
 * Log in an existing user
 * @param {{ email: string, password: string }} credentials
 */
export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

/**
 * Fetch authenticated user profile
 */
export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

/**
 * Workflow API Methods
 */
export const createWorkflow = async (workflowData) => {
  const response = await api.post('/workflows', workflowData);
  return response.data;
};

export const getWorkflows = async () => {
  const response = await api.get('/workflows');
  return response.data;
};

export const getWorkflowById = async (id) => {
  const response = await api.get(`/workflows/${id}`);
  return response.data;
};

export const updateWorkflow = async (id, workflowData) => {
  const response = await api.put(`/workflows/${id}`, workflowData);
  return response.data;
};

export const deleteWorkflow = async (id) => {
  const response = await api.delete(`/workflows/${id}`);
  return response.data;
};

/**
 * Execution API Methods
 */
export const executeWorkflow = async (workflowId) => {
  const response = await api.post(`/workflows/${workflowId}/execute`);
  return response.data;
};

export const getWorkflowExecutions = async (workflowId) => {
  const response = await api.get(`/workflows/${workflowId}/executions`);
  return response.data;
};

export const getExecutionById = async (executionId) => {
  const response = await api.get(`/executions/${executionId}`);
  return response.data;
};

/**
 * Format API errors into human-readable messages without exposing sensitive data
 * @param {Error} error
 * @returns {string}
 */
export const getErrorMessage = (error) => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.response?.status === 401) {
    return 'Invalid credentials. Please verify your email and password.';
  }
  if (error?.response?.status === 409) {
    return 'An account with this email already exists.';
  }
  if (error?.message) {
    return error.message;
  }
  return 'A network error occurred. Please verify the backend server is reachable.';
};

export default api;
