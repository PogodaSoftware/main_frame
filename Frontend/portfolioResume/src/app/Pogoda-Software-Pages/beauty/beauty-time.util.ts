/**
 * Render a slot's ISO timestamp (with TZ offset, e.g. "2026-04-20T14:30:00+00:00")
 * in the BUSINESS provider's local timezone — NOT the viewer's. A
 * customer in PT looking at a NYC appointment must see "5:00 PM EDT",
 * never "2:00 PM PDT". The TZ abbreviation suffix makes the choice
 * unambiguous, including in border-zone towns.
 *
 * The optional `timeZone` argument is an IANA name like
 * ``"America/New_York"``. Pass the value the BFF returns at
 * ``provider.timezone`` for the booking. If omitted (legacy callers,
 * unparseable input, or runtime where ``Intl`` rejects the zone), this
 * falls back to the viewer's local time so we never blow up the page.
 *
 * Returns '' for missing or unparseable input so callers can fall back
 * to the BFF's UTC label.
 */
export function formatSlotLocal(
  iso: string | undefined | null,
  timeZone?: string | null,
): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';

  const tz = (timeZone || '').trim() || undefined;

  try {
    const dateOpts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    const timeOpts: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    };
    if (tz) {
      dateOpts.timeZone = tz;
      timeOpts.timeZone = tz;
    }
    const dateFmt = new Intl.DateTimeFormat(undefined, dateOpts);
    const timeFmt = new Intl.DateTimeFormat(undefined, timeOpts);
    return `${dateFmt.format(d)} · ${timeFmt.format(d)}`;
  } catch {
    return d.toLocaleString();
  }
}
