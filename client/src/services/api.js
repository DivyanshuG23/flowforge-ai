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

// Centralized handling for expired or invalid authentication sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || '';

    // Ignore 401s on login/register/google endpoints to allow standard credential validation messages
    const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register') || requestUrl.includes('/auth/google');

    // Only handle HTTP 401 Unauthorized on authenticated routes — never treat 403 Forbidden as expired session
    if (status === 401 && !isAuthEndpoint) {
      try {
        localStorage.removeItem('flowforge_token');
        localStorage.removeItem('flowforge_user');
      } catch {
        // Ignore storage access restrictions
      }

      // Safe redirect to /login avoiding redirect loops
      if (typeof window !== 'undefined' && window.location) {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          try {
            sessionStorage.setItem(
              'flowforge_redirect_after_login',
              currentPath + window.location.search
            );
          } catch {
            // Ignore sessionStorage restrictions
          }
          window.location.href = '/login?session_expired=true';
        }
      }
    }

    return Promise.reject(error);
  }
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
 * Authenticate or register a user via Google ID token credential
 * Uses a request-specific 45s timeout to safely accommodate cloud cold starts and JWKS cert retrieval.
 * @param {{ idToken?: string, credential?: string }} data
 */
export const googleLoginUser = async (data) => {
  const response = await api.post('/auth/google', data, { timeout: 45000 });
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
 * Update authenticated user profile
 * @param {{ name?: string, currentPassword?: string, newPassword?: string }} profileData
 */
export const updateProfile = async (profileData) => {
  const response = await api.put('/auth/profile', profileData);
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

export const duplicateWorkflow = async (id) => {
  const response = await api.post(`/workflows/${id}/duplicate`);
  return response.data;
};

export const getWorkflowTemplates = async () => {
  const response = await api.get('/workflows/templates');
  return response.data;
};

export const instantiateTemplate = async (templateId, customPayload = {}) => {
  const response = await api.post('/workflows/from-template', { templateId, ...customPayload });
  return response.data;
};

export const getWorkflowTriggers = async (workflowId) => {
  const response = await api.get(`/workflows/${workflowId}/triggers`);
  return response.data;
};

export const updateWorkflowSchedule = async (workflowId, scheduleData) => {
  const response = await api.put(`/workflows/${workflowId}/schedule`, scheduleData);
  return response.data;
};

export const updateWorkflowWebhook = async (workflowId, webhookData) => {
  const response = await api.put(`/workflows/${workflowId}/webhook`, webhookData);
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

export const getUserExecutions = async (params = {}) => {
  const response = await api.get('/executions', { params });
  return response.data;
};

export const getUserExecutionStats = async () => {
  const response = await api.get('/executions/stats');
  return response.data;
};

export const getExecutionById = async (executionId) => {
  const response = await api.get(`/executions/${executionId}`);
  return response.data;
};

export const rerunExecution = async (executionId) => {
  const response = await api.post(`/executions/${executionId}/rerun`);
  return response.data;
};

export const deleteExecution = async (executionId) => {
  const response = await api.delete(`/executions/${executionId}`);
  return response.data;
};

export const purgeFailedExecutions = async () => {
  const response = await api.post('/executions/purge-failed');
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
    const requestUrl = error?.config?.url || '';
    if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')) {
      return 'Invalid credentials. Please verify your email and password.';
    }
    return 'Your session has expired. Please sign in again.';
  }
  if (error?.response?.status === 403) {
    return 'Access denied. You do not have permission to perform this action.';
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

