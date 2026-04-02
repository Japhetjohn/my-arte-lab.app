import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

// API base URL - use relative path for production, fallback to localhost for dev
const API_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
  avatar?: string;
  coverImage?: string;
  role: 'client' | 'creator' | 'admin';
  isEmailVerified: boolean;
  isVerified?: boolean;
  location?: {
    localArea?: string;
    state?: string;
    country?: string;
  };
  category?: string;
  bio?: string;
  skills?: string[];
  phoneNumber?: string;
  rating?: number;
  reviewCount?: number;
  portfolio?: PortfolioItem[];
  services?: Service[];
  createdAt: string;
}

export interface PortfolioItem {
  _id?: string;
  title: string;
  image: string;
  description: string;
  createdAt?: string;
}

export interface Service {
  _id: string;
  title: string;
  description: string;
  images: string[];
  directLink?: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  verifyEmail: (code: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (user: User) => void;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gender: 'male' | 'female' | 'other';
  avatar?: string;
  coverImage?: string;
  role: 'client' | 'creator';
  location: {
    localArea: string;
    state: string;
    country: string;
  };
  category?: string;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    token: null,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const user = localStorage.getItem('user') || sessionStorage.getItem('user');
      
      if (token && user) {
        setState({
          user: JSON.parse(user),
          isAuthenticated: true,
          isLoading: false,
          token,
        });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  // Axios interceptor for token refresh and error handling
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // Clear auth state on 401
          logout();
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data.data || response.data;

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', token);
      storage.setItem('user', JSON.stringify(user));

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        token,
      });

      toast.success('Login successful!');
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  }, []);

  const register = useCallback(async (userData: RegisterData) => {
    try {
      // Transform data to match backend expectations (flat structure)
      const { location, confirmPassword, agreeToTerms, gender, ...rest } = userData as any;
      
      // Auto-assign avatar based on gender
      const getAvatarUrl = (g: string) => {
        switch (g) {
          case 'male': return '/images/avatar-1.png';
          case 'female': return '/images/avatar-2.png';
          default: return '/images/avatar-3.png';
        }
      };
      
      // Auto-assign cover image (using hero-bg as default)
      const getCoverImageUrl = () => '/images/hero-bg.jpg';
      
      const transformedData = {
        ...rest,
        localArea: location?.localArea,
        state: location?.state,
        country: location?.country,
        avatar: getAvatarUrl(gender),
        coverImage: getCoverImageUrl(),
      };

      const response = await api.post('/auth/register', transformedData);
      const { user, token } = response.data.data || response.data;

      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        token,
      });

      toast.success('Registration successful! Please verify your email.');
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
    });

    toast.info('Logged out successfully');
  }, []);

  const verifyEmail = useCallback(async (code: string) => {
    try {
      await api.post('/auth/verify-email', { code });
      
      // Update user state
      if (state.user) {
        const updatedUser = { ...state.user, isEmailVerified: true };
        setState(prev => ({ ...prev, user: updatedUser }));
        
        const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(updatedUser));
      }

      toast.success('Email verified successfully!');
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Verification failed';
      toast.error(message);
      throw error;
    }
  }, [state.user]);

  const resendVerification = useCallback(async () => {
    try {
      await api.post('/auth/resend-verification');
      toast.success('Verification code sent!');
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Failed to resend code';
      toast.error(message);
      throw error;
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Password reset link sent to your email!');
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Failed to send reset link';
      toast.error(message);
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      toast.success('Password reset successful! Please login.');
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Password reset failed';
      toast.error(message);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      const response = await api.put('/auth/profile', data);
      const updatedUser = response.data.data?.user || response.data.user;

      setState(prev => ({ ...prev, user: updatedUser }));

      const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Update failed';
      toast.error(message);
      throw error;
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const response = await api.post('/auth/refresh-token');
      const { token } = response.data;

      const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
      storage.setItem('token', token);

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setState(prev => ({ ...prev, token }));
    } catch (error) {
      logout();
    }
  }, [logout]);

  // Direct user state update (for components that manage their own API calls)
  const updateUser = useCallback((user: User) => {
    setState(prev => ({ ...prev, user }));
    const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(user));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        updateProfile,
        refreshToken,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export api instance for use in other services
export { api };
