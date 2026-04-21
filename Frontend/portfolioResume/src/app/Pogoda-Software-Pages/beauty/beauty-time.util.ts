/**
 * Render a slot's ISO timestamp (with TZ offset, e.g. "2026-04-20T14:30:00+00:00")
 * in the viewer's *browser-local* timezone. This lets an out-of-town
 * customer see times on their own clock, and naturally surfaces the
 * full 24 hours of slots when a provider has marked a day "Open 24h"
 * regardless of the offset between UTC and the customer's local zone.
 *
 * Returns '' for missing or unparseable input so callers can fall back
 * to the BFF's UTC label.
 */
export function formatSlotLocal(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  try {
    const fmt = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    // Format produces e.g. "Mon, Apr 20, 2:30 PM PDT" — collapse the
    // first comma to a middot for parity with the old UTC label.
    const parts = fmt.formatToParts(d);
    const date = parts
      .filter((p) => ['weekday', 'month', 'day'].includes(p.type))
      .map((p) => p.value)
      .join(' ')
      .replace(/\s+,/g, ',');
    const time = parts
      .filter((p) => ['hour', 'minute', 'dayPeriod', 'literal'].includes(p.type))
      .map((p) => p.value)
      .join('')
      .trim()
      .replace(/^,\s*/, '');
    const tz = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    return `${date} · ${time}${tz ? ' ' + tz : ''}`;
  } catch {
    return d.toLocaleString();
  }
}
