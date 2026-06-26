import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

// The centralized socket backend URL (matching the partner app)
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://192.168.31.254:5000';

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
    
    console.log('Connecting user socket to:', SOCKET_URL);
    const socketInstance = io(SOCKET_URL);
    
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
