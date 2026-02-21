import axios from 'axios';
import { io, Socket } from 'socket.io-client';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Axios instance ──
export const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Socket.io singleton ──
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(API_BASE, { autoConnect: true });
  }
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
