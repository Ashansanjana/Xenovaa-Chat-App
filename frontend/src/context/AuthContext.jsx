import { createContext, useContext, useEffect, useState } from 'react';
import { loginRequest, registerRequest, getCurrentUserRequest } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('xenovaa_token');
    if (!token) {
      setLoading(false);
      return;
    }

    getCurrentUserRequest()
      .then(({ user }) => setUser(user))
      .catch(() => {
        localStorage.removeItem('xenovaa_token');
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { user, token } = await loginRequest(email, password);
    localStorage.setItem('xenovaa_token', token);
    setUser(user);
    return user;
  }

  async function register(payload) {
    const { user, token } = await registerRequest(payload);
    localStorage.setItem('xenovaa_token', token);
    setUser(user);
    return user;
  }

  function logout() {
    localStorage.removeItem('xenovaa_token');
    setUser(null);
  }

  function updateUser(updatedUser) {
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider.');
  return ctx;
}
