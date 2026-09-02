interface ColorPalette {
  background: string;
  backgroundDeep: string;
  card: string;
  cardAlt: string;
  cardInset: string;
  border: string;
  borderStrong: string;
  divider: string;
  accent: string;
  accentHover: string;
  accentOn: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  placeholder: string;
  success: string;
  successBg: string;
  successBorder: string;
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  warning: string;
  warningBg: string;
  warningBorder: string;
  info: string;
  infoBg: string;
  infoBorder: string;
}

// Exact palette from the Code Barbarians Budget design.
const darkColors: ColorPalette = {
  background: '#0F0D0A',
  backgroundDeep: '#0a0907', // json preview / phone-frame backdrop
  card: '#141009',
  cardAlt: '#141009',
  cardInset: '#0F0D0A', // inputs/keypad keys nested inside a card
  border: '#241c14',
  borderStrong: '#3a2f22', // dashed borders, hover state, sheet input borders
  divider: '#1c160f', // hairline row separators (spend log, settings list)

  accent: '#FF5A1F',
  accentHover: '#ff7a45',
  accentOn: '#0F0D0A',

  textPrimary: '#F4EFE6',
  textSecondary: '#9b938a',
  textMuted: '#7c746b',
  textFaint: '#5f5850',
  placeholder: '#5f5850',

  success: '#7FC25A',
  successBg: '#16220f',
  successBorder: '#2a3a1a',

  danger: '#e0654f',
  dangerBg: '#2a1215',
  dangerBorder: '#4a231f',

  warning: '#F2A03D',
  warningBg: '#2a2312',
  warningBorder: '#4a3f1e',

  info: '#C8C0B6',
  infoBg: '#1c1a17',
  infoBorder: '#3a352d',
};

// Light companion theme — same brand accent, warm "light peach" surfaces instead
// of the near-black dark surfaces above.
const lightColors: ColorPalette = {
  background: '#FBF1E4',
  backgroundDeep: '#F4E2C9',
  card: '#FFFBF6',
  cardAlt: '#FFFBF6',
  cardInset: '#FBF1E4',
  border: '#EAD7BC',
  borderStrong: '#D9BD93',
  divider: '#F0E1CA',

  accent: '#FF5A1F',
  accentHover: '#ff7a45',
  accentOn: '#0F0D0A',

  textPrimary: '#2B1D12',
  textSecondary: '#6B5A47',
  textMuted: '#8A7A66',
  textFaint: '#A89880',
  placeholder: '#A89880',

  success: '#3F8A2E',
  successBg: '#E3F0D9',
  successBorder: '#C3DEB0',

  danger: '#D14F3A',
  dangerBg: '#FBE4DF',
  dangerBorder: '#F0BFB2',

  warning: '#C97F1E',
  warningBg: '#FBEBD3',
  warningBorder: '#EFD09C',

  info: '#6B5D4E',
  infoBg: '#F0E6D8',
  infoBorder: '#DDCBB0',
};

export type ColorToken = keyof ColorPalette;
export type ThemeMode = 'dark' | 'light';

// `colors` is a live, mutable object — every screen imports and reads it directly
// (`colors.background`, etc.) at render time rather than through a hook, so theme
// switching works by mutating these same property values in place via
// `applyColorTheme`, then forcing a full app remount to re-run every render with
// the new values. Replacing this export with a new object reference would not
// propagate to files that imported `colors` before the switch.
export const colors: ColorPalette = { ...darkColors };

export function applyColorTheme(mode: ThemeMode) {
  Object.assign(colors, mode === 'light' ? lightColors : darkColors);
}

// Reads a palette without activating it — the theme transition needs the colors of
// the mode it is animating *towards* while the current one is still applied.
export function getPalette(mode: ThemeMode): ColorPalette {
  return mode === 'light' ? lightColors : darkColors;
}

// Default category color cycle, in seed order. Kept identical across themes —
// these are user-facing data colors, not surface colors.
export const CATEGORY_PALETTE = ['#FF5A1F', '#F2A03D', '#e0654f', '#7FC25A', '#C8C0B6', '#A9714B'];
