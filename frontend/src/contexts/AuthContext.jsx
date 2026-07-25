import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { getDashboardPath } from '../utils/helpers';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const setTokens = useCallback((tokens) => {
    if (tokens?.accessToken) {
      localStorage.setItem('accessToken', tokens.accessToken);
    }
    if (tokens?.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  }, []);

  const clearTokens = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await authAPI.getProfile();
      const profile = data.user || data;
      setUser(profile);
      setIsAuthenticated(true);
      return profile;
    } catch {
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
      return null;
    }
  }, [clearTokens]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetchProfile();
      }
      setLoading(false);
    };
    initAuth();
  }, [fetchProfile]);

  const login = async (credentials) => {
    const data = await authAPI.login(credentials);
    if (data.requires2FA && data.twoFactorToken) {
      return { requires2FA: true, twoFactorToken: data.twoFactorToken };
    }
    const { user: userData, tokens } = data;
    setTokens(tokens);
    setUser(userData);
    setIsAuthenticated(true);
    return { user: userData, redirectTo: getDashboardPath(userData.role) };
  };

  const verify2FA = async ({ twoFactorToken, code }) => {
    const data = await authAPI.verify2FALogin({ twoFactorToken, code });
    const { user: userData, tokens } = data;
    setTokens(tokens);
    setUser(userData);
    setIsAuthenticated(true);
    return { user: userData, redirectTo: getDashboardPath(userData.role) };
  };

  const register = async (userData) => {
    const data = await authAPI.register(userData);
    return data;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch {
      // Continue logout even if API fails
    } finally {
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const refreshAuth = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    const data = await authAPI.refreshToken(refreshToken);
    setTokens(data);
    return data;
  };

  const updateUser = (updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return roles.includes(user.role);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    verify2FA,
    register,
    logout,
    refreshAuth,
    fetchProfile,
    updateUser,
    hasRole,
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
