import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useError } from '../contexts/ErrorContext'; // Import the new error context


interface User {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  accessToken: string | null;
  handleOAuthCallback: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { setError } = useError(); // Use the setError function from the new context

  useEffect(() => {
    const storedToken = localStorage.getItem('github_token');
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (accessToken: string) => {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${accessToken}` },
      });
      setUser(response.data);
      setLoading(false); // ✅ Only mark loading false after fetch finishes
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setError('Failed to fetch user data. Please try logging in again.'); // Set a user-friendly error
      localStorage.removeItem('github_token');
      setToken(null);
      setLoading(false);
    }
  };

  const login = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/callback`;
    const scope = 'repo user';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
  };

  const handleOAuthCallback = async (code: string) => {
    setLoading(true); // ✅ Keep loading until user fetched
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/auth/github/callback?code=${code}`
      );
      const { access_token, user } = response.data;
      localStorage.setItem('github_token', access_token);
      setToken(access_token);
      setUser(user);
    } catch (error: any) {
      console.error('OAuth callback failed:', error);
      // Determine the error message to display
      const errorMessage = error.response?.data?.detail || 'GitHub authentication failed. Please try again.';
      setError(errorMessage); // Set the error for the user to see
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('github_token');
    setToken(null);
    setUser(null);
    setError(null); // Clear any existing errors on logout
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, accessToken: token, handleOAuthCallback }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

