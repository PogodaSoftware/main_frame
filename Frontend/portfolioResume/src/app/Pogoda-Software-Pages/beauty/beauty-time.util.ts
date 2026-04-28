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
    // Format the date half ("Mon, Apr 20") and the time half
    // ("2:30 PM EDT") with separate formatters so the middot
    // separator stays predictable across locales — combining
    // formatToParts pieces from a single formatter leaks the
    // locale's comma between date and time into the time half.
    const dateFmt = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timeFmt = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    return `${dateFmt.format(d)} · ${timeFmt.format(d)}`;
  } catch {
    return d.toLocaleString();
  }
}
