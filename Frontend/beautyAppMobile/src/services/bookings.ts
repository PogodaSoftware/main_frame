/**
 * Booking + chat shared types and timezone/format helpers.
 * All data + mutations now flow through BFF resolvers / action-links;
 * this module only holds shared types and pure formatters.
 */

export interface ChatMessage {
  id: number;
  booking_id: number;
  sender_type: 'customer' | 'business';
  sender_id: number;
  body: string;
  created_at: string;
}

export interface MyBooking {
  id: number;
  status: string;
  slot_at?: string;
  service: { id: number; name: string };
  provider?: { id: number; name: string };
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
