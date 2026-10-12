import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../services/api';

const AuthContext = createContext(null);

export const TOKEN_STORAGE_KEY = 'flowforge_token';
export const USER_STORAGE_KEY = 'flowforge_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Validate stored token against /api/auth/me on app initialization
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        if (response?.success) {
          const profile = response.user || {
            id: response.userId,
            role: response.role,
          };
          setUser((prev) => ({ ...prev, ...profile }));
        }
      } catch {
        // Token is invalid or expired — clean up client storage
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
        } catch {
          // ignore storage error
        }
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (newToken, newUser) => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      if (newUser) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      }
    } catch {
      // storage unavailable
    }
    setToken(newToken);
    setUser(newUser || null);
  };

  const logout = () => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // storage unavailable
    }
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedFields };
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // storage unavailable
      }
      return merged;
    });
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
