/**
 * Shared brand palette for customer screens.
 *
 * These are the colour values that were duplicated verbatim across ~10 customer
 * screens. Values match the canonical brand palette in tamagui.config.ts
 * (`beautyTokens`) but are kept as a plain RN-friendly object here.
 *
 * Screens that need extra one-off colours (star fills, error backgrounds, a
 * lighter accent tint, etc.) spread this and add their own:
 *   const C = { ...PALETTE, accentBlueLight: '#BFD8EE' };
 *
 * NOTE: bookings/[id]/reschedule.tsx uses a deliberately different (lighter)
 * palette and intentionally does NOT import this.
 */
export const PALETTE = {
  surface: '#F2F2F2',
  surface2: '#E9E9EB',
  line: '#DCDCDF',
  text: '#0F1115',
  textMuted: '#6B6F77',
  accentBlue: '#CFE3F5',
  accentBlueDeep: '#7DA8CF',
  accentBlueText: '#1a3a52',
  ink: '#0A0A0B',
  success: '#2F7A47',
  successHover: '#256238',
  danger: '#C0392B',
  white: '#FFFFFF',
} as const;
