import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { User, ApiResponse } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
      if (response.data.success && response.data.data) {
        setUser(response.data.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', {
      email,
      password,
    });

    if (response.data.success && response.data.data) {
      setUser(response.data.data.user);
    } else {
      throw new Error(response.data.error?.message || 'Login failed');
    }
  };

  const signup = async (name: string, email: string, password: string, phone?: string) => {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/signup', {
      name,
      email,
      password,
      phone,
    });

    if (response.data.success && response.data.data) {
      setUser(response.data.data.user);
    } else {
      throw new Error(response.data.error?.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
