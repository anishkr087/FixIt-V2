import { create } from 'zustand';

export interface BookingState {
  activeBooking: {
    jobId: string;
    status: string;
    message: string;
    partner?: {
      name: string;
      phone: string;
      rating: number;
      experience: number;
    } | null;
  } | null;
  partnerLocation: { lat: number; lng: number } | null;
  setBooking: (booking: any) => void;
  setPartnerLocation: (loc: { lat: number; lng: number }) => void;
  clearBooking: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  activeBooking: null,
  partnerLocation: null,
  setBooking: (booking) => set({ activeBooking: booking }),
  setPartnerLocation: (loc) => set({ partnerLocation: loc }),
  clearBooking: () => set({ activeBooking: null, partnerLocation: null })
}));
