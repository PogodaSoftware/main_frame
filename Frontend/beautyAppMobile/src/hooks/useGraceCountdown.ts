import { useEffect, useState } from 'react';

/**
 * Live MM:SS countdown to a grace-window deadline. Returns the formatted
 * remaining time (e.g. "4:44"), or null once the window has elapsed / when
 * no deadline is set. Ticks once a second.
 */
function remaining(endsAt: string | null | undefined): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (isNaN(end)) return null;
  const diffMs = end - Date.now();
  if (diffMs <= 0) return null;
  const total = Math.floor(diffMs / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function useGraceCountdown(endsAt: string | null | undefined): string | null {
  const [label, setLabel] = useState<string | null>(() => remaining(endsAt));

  useEffect(() => {
    setLabel(remaining(endsAt));
    if (!endsAt) return;
    const id = setInterval(() => setLabel(remaining(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return label;
}
