import { io } from 'socket.io-client';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(BASE || '/', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
