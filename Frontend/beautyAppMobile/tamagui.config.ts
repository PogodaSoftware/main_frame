import { defaultConfig } from '@tamagui/config/v4';
import { createFont, createTamagui } from 'tamagui';

// Brand palette extracted from Frontend/beautyApp/src/styles.scss.
// Typed as `any` so the raw color strings can be passed to Tamagui props
// that otherwise insist on a theme token; runtime accepts hex strings fine.
export const beautyTokens: Record<string, any> = {
  surface: '#F2F2F2',
  surface2: '#E9E9EB',
  line: '#DCDCDF',
  text: '#0F1115',
  textMuted: '#6B6F77',
  accentBlue: '#CFE3F5',
  accentBlueDeep: '#7DA8CF',
  accentBlueText: '#1a3a52',
  ink: '#0A0A0B',
  inkSoft: '#1F1F22',
  success: '#2F7A47',
  successHover: '#256238',
  successDeep: '#1D4F2C',
  successBg: '#E5F2EA',
  danger: '#C0392B',
  dangerHover: '#9F2F23',
  dangerBg: '#FCE8E5',
  warning: '#F59E0B',
  warningHover: '#D38B00',
  warningBg: '#FFF4DA',
  warningText: '#8A6A1F',
  white: '#FFFFFF',
  fontBody:
    'Inter_400Regular, Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontDisplay:
    'CormorantGaramond_500Medium, "Cormorant Garamond", "Playfair Display", Georgia, serif',
  navHeight: 64,
  phoneMax: 430,
};

// Inter for body / UI; Cormorant Garamond for display headings.
// Family strings match the names exported by @expo-google-fonts/* (which are
// the same names registered by `useFonts` in `app/_layout.tsx`). On web the
// browser falls back to system Inter / serif until the font files load.
const bodyFont = createFont({
  family: 'Inter_400Regular',
  size: { ...defaultConfig.fonts.body.size },
  lineHeight: { ...defaultConfig.fonts.body.lineHeight },
  weight: { ...defaultConfig.fonts.body.weight },
  letterSpacing: { ...defaultConfig.fonts.body.letterSpacing },
  face: {
    400: { normal: 'Inter_400Regular' },
    500: { normal: 'Inter_500Medium' },
    600: { normal: 'Inter_600SemiBold' },
    700: { normal: 'Inter_700Bold' },
  },
});

const headingFont = createFont({
  family: 'CormorantGaramond_500Medium',
  size: { ...defaultConfig.fonts.heading.size },
  lineHeight: { ...defaultConfig.fonts.heading.lineHeight },
  weight: { ...defaultConfig.fonts.heading.weight },
  letterSpacing: { ...defaultConfig.fonts.heading.letterSpacing },
  face: {
    400: { normal: 'CormorantGaramond_400Regular' },
    500: { normal: 'CormorantGaramond_500Medium' },
    600: { normal: 'CormorantGaramond_600SemiBold' },
    700: { normal: 'CormorantGaramond_700Bold' },
  },
});

const config = createTamagui({
  ...defaultConfig,
  fonts: {
    ...defaultConfig.fonts,
    body: bodyFont,
    heading: headingFont,
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      background: beautyTokens.surface,
      color: beautyTokens.text,
      brandGreen: beautyTokens.success,
      brandGreenHover: beautyTokens.successHover,
      brandInk: beautyTokens.ink,
      brandDanger: beautyTokens.danger,
      brandAccentBlue: beautyTokens.accentBlue,
      brandAccentBlueDeep: beautyTokens.accentBlueDeep,
      brandLine: beautyTokens.line,
      brandSurface: beautyTokens.surface,
      brandSurface2: beautyTokens.surface2,
      brandTextMuted: beautyTokens.textMuted,
    },
    dark: {
      ...defaultConfig.themes.dark,
      background: '#0e0e10',
      color: '#f4f4f5',
      brandGreen: beautyTokens.success,
      brandGreenHover: beautyTokens.successHover,
      brandInk: beautyTokens.ink,
      brandDanger: beautyTokens.danger,
      brandAccentBlue: beautyTokens.accentBlue,
      brandAccentBlueDeep: beautyTokens.accentBlueDeep,
      brandLine: beautyTokens.line,
      brandSurface: beautyTokens.surface,
      brandSurface2: beautyTokens.surface2,
      brandTextMuted: beautyTokens.textMuted,
    },
  },
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
