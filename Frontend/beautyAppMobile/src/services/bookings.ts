/**
 * Booking + chat write endpoints (REST). The screens themselves come
 * from BFF resolvers; only mutations and chat polling live here.
 */
import { api } from '@/services/api';

export interface ChatMessage {
  id: number;
  booking_id: number;
  sender_type: 'customer' | 'business';
  sender_id: number;
  body: string;
  created_at: string;
}

export interface ChatThreadResponse {
  booking_id: number;
  is_active: boolean;
  expires_at: string;
  peer_name: string;
  service_name: string;
  slot_at?: string;
  messages: ChatMessage[];
}

export async function createBooking(serviceId: number, slotAt: string): Promise<{ id: number }> {
  const resp = await api.post('/api/beauty/protected/bookings/', {
    service_id: serviceId,
    slot_at: slotAt,
  });
  return resp.data;
}

export async function rescheduleBooking(bookingId: number, slotAt: string): Promise<void> {
  await api.post(`/api/beauty/protected/bookings/${bookingId}/reschedule/`, {
    slot_at: slotAt,
  });
}

export async function cancelBooking(bookingId: number): Promise<void> {
  await api.post(`/api/beauty/protected/bookings/${bookingId}/cancel/`);
}

export async function cancelBookingGrace(bookingId: number): Promise<void> {
  await api.post(`/api/beauty/protected/bookings/${bookingId}/cancel-grace/`);
}

export async function getChatThread(bookingId: number): Promise<ChatThreadResponse> {
  const resp = await api.get<ChatThreadResponse>(
    `/api/beauty/protected/bookings/${bookingId}/chat/`,
  );
  return resp.data;
}

export interface MyBookingsResponse {
  upcoming?: MyBooking[];
  past?: MyBooking[];
  bookings?: MyBooking[];
  items?: MyBooking[];
}

export interface MyBooking {
  id: number;
  status: string;
  slot_at?: string;
  service: { id: number; name: string };
  provider?: { id: number; name: string };
}

export async function listMyBookings(): Promise<MyBookingsResponse> {
  const resp = await api.get<MyBookingsResponse>(
    '/api/beauty/protected/bookings/',
  );
  return resp.data;
}

export async function sendChatMessage(bookingId: number, body: string): Promise<ChatMessage> {
  const resp = await api.post<ChatMessage>(
    `/api/beauty/protected/bookings/${bookingId}/chat/send/`,
    { body },
  );
  return resp.data;
}

/**
 * Render `isoTime` in the provider's local timezone (e.g. "America/New_York")
 * if the envelope exposed one. Falls back to the browser's local timezone
 * if `timezone` is null/undefined. Used for booking slot times so a
 * customer in Pacific time sees the New York studio's 6 PM slot as 6 PM,
 * not 3 PM.
 */
export function formatTimeInTz(
  isoTime: string,
  timezone?: string | null,
  opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' },
): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      ...opts,
      timeZone: timezone || undefined,
    }).format(new Date(isoTime));
  } catch {
    return new Date(isoTime).toLocaleTimeString();
  }
}

export function formatDateInTz(
  isoTime: string,
  timezone?: string | null,
  opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      ...opts,
      timeZone: timezone || undefined,
    }).format(new Date(isoTime));
  } catch {
    return new Date(isoTime).toLocaleDateString();
  }
}

export function formatStatus(status: string): string {
  switch (status) {
    case 'booked': return 'Confirmed';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    case 'cancelled_by_customer': return 'Cancelled by you';
    case 'cancelled_by_business': return 'Cancelled by business';
    case 'cancelled_immediate': return 'Cancelled';
    default: return status;
  }
}
