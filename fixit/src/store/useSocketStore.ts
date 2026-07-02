import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './useAuthStore';

// The centralized socket backend URL (matching the partner app)
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'https://fixit-v2.onrender.com';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  connect: () => {
    if (get().socket) return;
    
    const token = useAuthStore.getState().token;
    console.log('Connecting user socket with auth token to:', SOCKET_URL);
    const socketInstance = io(SOCKET_URL, {
      auth: { token }
    });
    
    socketInstance.on('connect', () => {
      set({ isConnected: true });
      console.log('User socket connected:', socketInstance.id);
    });
    
    socketInstance.on('disconnect', () => {
      set({ isConnected: false });
      console.log('User socket disconnected');
    });
    
    set({ socket: socketInstance });
  },
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  }
}));
