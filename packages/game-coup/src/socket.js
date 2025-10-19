// packages/game-coup/src/socket.js
import { io } from "socket.io-client";

let socket = null;

export function connectSocket(serverUrl) {
  console.log('Attempting to connect to server:', serverUrl);
  if (!serverUrl) throw new Error('serverUrl is required');
  if (socket && socket.connected) {
    console.log('Reusing existing connection:', socket.id);
    return socket;
  }
  socket = io(serverUrl, { 
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected to socket server:', socket.id);
    console.log('Server URL:', serverUrl);
  });
  
  socket.on('connect_error', (err) => {
    console.log('❌ Socket connection error:', err.message);
  });
  
  socket.on('disconnect', () => console.log('❌ Socket disconnected'));
  
  return socket;
}

export function getSocket() {
  return socket;
}

// helper: default server url used by UI when user didn't enter one
export function getDefaultServerUrl() {
  // priority: localStorage (persisted by Auth component) -> environment variable set at build -> fallback to common LAN host
  try {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem && localStorage.getItem('coup_server');
    if (saved) return saved;
  } catch (e) {
    // ignore
  }

  // Vite exposes import.meta.env for runtime env vars — safe access using try/catch
  try {
    if (import.meta && import.meta.env && import.meta.env.VITE_SERVER_URL) {
      return import.meta.env.VITE_SERVER_URL;
    }
  } catch (e) {
    // import.meta may be unavailable in some JS environments accessed by tools
  }

  // common default: http://<your-laptop-ip>:3000 — user should replace the IP with their laptop's local IP
  return 'http://192.168.50.233:3000';
}
