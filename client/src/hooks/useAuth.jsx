import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate session on load
  useEffect(() => {
    async function checkSession() {
      const token = localStorage.getItem('transitops_token');
      const cachedUser = localStorage.getItem('transitops_user');
      
      if (token && cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
          // Proactively verify token status with /me
          const data = await authService.getMe();
          setUser(data.user);
          localStorage.setItem('transitops_user', JSON.stringify(data.user));
        } catch (error) {
          console.error('Session restoration failed:', error);
          logout();
        }
      }
      setLoading(false);
    }
    checkSession();
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const data = await authService.login(username, password);
      localStorage.setItem('transitops_token', data.token);
      localStorage.setItem('transitops_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (error) {
      throw error.response?.data?.message || 'Login failed. Network or server error.';
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('transitops_token');
    localStorage.removeItem('transitops_user');
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      await authService.updateProfile(profileData);
      
      // Update local states
      const data = await authService.getMe();
      setUser(data.user);
      localStorage.setItem('transitops_user', JSON.stringify(data.user));
      return data.user;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update profile details.';
    }
  };

  // Helper check for role permission
  const hasPermission = (permissionKey) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return user.permissions && user.permissions[permissionKey] === true;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfile, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
