/**
 * Shared date/time formatters for customer screens.
 * Extracted from copies that were duplicated verbatim across screens.
 */

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "Mon Jan 5 · 2:30 PM EST" — viewer-local, with timezone abbreviation when
 * available. Used by the bookings list and chat screens. Returns '' on bad input.
 */
export function formatSlotLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const wd = WEEKDAYS_SHORT[d.getDay()];
  const mo = MONTHS_SHORT[d.getMonth()];
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  let tz = '';
  try {
    const part = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
      .formatToParts(d)
      .find((p) => p.type === 'timeZoneName');
    tz = part?.value ?? '';
  } catch {
    /* no tz abbreviation available */
  }
  return `${wd} ${mo} ${d.getDate()} · ${time}${tz ? ` ${tz}` : ''}`;
}

/**
 * "Mon, Jan 5, 2:30 PM EST" via Intl, optionally in a specific IANA timezone.
 * Used by booking detail and success screens. Returns '' on bad input.
 */
export function formatLocal(iso: string, tz?: string | null): string {
  if (!iso) return '';
  try {
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZoneName: 'short',
    };
    if (tz) (opts as any).timeZone = tz;
    return new Intl.DateTimeFormat(undefined, opts).format(new Date(iso));
  } catch {
    return '';
  }
}
