// Exact palette from the Code Barbarians Budget design.
export const colors = {
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
} as const;

export type ColorToken = keyof typeof colors;

// Default category color cycle, in seed order.
export const CATEGORY_PALETTE = ['#FF5A1F', '#F2A03D', '#e0654f', '#7FC25A', '#C8C0B6', '#A9714B'];
