/**
 * useAutosave — debounced wizard autosave.
 * ----------------------------------------
 * Watches a step's `fields` object and PATCHes `href` ~800ms after the
 * last change (skipping the initial mount / hydrate), so a provider's
 * edits persist without hitting Continue. Returns a live save state the
 * WizardLayout footer renders ("Saving…" / "Saved" / "Couldn't save").
 *
 * Mirrors the web wizard's autosave (beauty-business-application.component).
 */
import { useEffect, useRef, useState } from 'react';

import { patchApplicationStep } from '@/services/businessApply';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutosaveOpts {
  href?: string;
  step: string;
  fields: Record<string, unknown>;
  /** Skip while the screen is still loading or a Continue submit is in flight. */
  skip?: boolean;
}

export function useAutosave({ href, step, fields, skip }: UseAutosaveOpts): SaveState {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  // Serialize the fields so the effect fires on value changes, not on every
  // render where `fields` is a fresh object literal.
  const key = JSON.stringify(fields);

  useEffect(() => {
    // Skip the first run — that's the hydrate, not a user edit.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (skip || !href) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaveState('saving');
      try {
        await patchApplicationStep(href, step, fields);
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, href, step, skip]);

  return saveState;
}
