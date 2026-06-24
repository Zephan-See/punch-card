import { createContext, useState, useEffect } from 'react';
import { api } from './api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (token) setUser({ token, id: userId });
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    if (res.error) throw new Error(res.error);
    localStorage.setItem('token', res.token);
    localStorage.setItem('userId', res.id);
    setUser({ token: res.token, id: res.id });
    return res;
  };

  const register = async (name, email, password) => {
    const res = await api.register(name, email, password);
    if (res.error) throw new Error(res.error);
    localStorage.setItem('token', res.token);
    localStorage.setItem('userId', res.id);
    setUser({ token: res.token, id: res.id });
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
