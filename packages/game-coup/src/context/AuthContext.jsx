// packages/game-coup/src/context/AuthContext.jsx
import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    // optionally persist between refreshes:
    try {
      const raw = localStorage.getItem('coup_auth');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  function saveAuth(obj) {
    setAuth(obj);
    try { localStorage.setItem('coup_auth', JSON.stringify(obj)); } catch(e) {}
  }

  function clearAuth() {
    setAuth(null);
    try { localStorage.removeItem('coup_auth'); } catch(e) {}
  }

  return (
    <AuthContext.Provider value={{ auth, saveAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
