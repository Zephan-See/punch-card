import { createContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { api } from './api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear any legacy Apps Script token that no longer works
    const legacyToken = localStorage.getItem('token');
    if (legacyToken && !legacyToken.startsWith('eyJ')) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session ? { id: session.user.id, token: session.access_token } : null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? { id: session.user.id, token: session.access_token } : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    if (res.error) throw new Error(res.error);
    return res;
  };

  const register = async (name, email, password) => {
    const res = await api.register(name, email, password);
    if (res.error) throw new Error(res.error);
    return res;
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
