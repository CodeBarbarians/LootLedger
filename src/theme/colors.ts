export const colors = {
  background: '#0f0d0a',
  backgroundAlt: '#141009',
  card: '#14100a',
  cardAlt: '#17130b',
  cardInset: '#1c150c',
  border: '#241c14',
  borderStrong: '#2a2115',

  accent: '#FF5A1F',
  accentHover: '#ff7a45',
  accentOn: '#141009',

  textPrimary: '#F4EFE6',
  textSecondary: '#9b938a',
  textMuted: '#7c746b',
  textFaint: '#5f5850',
  placeholder: '#5f5850',

  success: '#5CD98C',
  successBg: '#12241a',
  successBorder: '#1f4230',

  danger: '#FF6B5C',
  dangerBg: '#2a1512',
  dangerBorder: '#5c2b25',

  warning: '#F2C14E',
  warningBg: '#2a2312',
  warningBorder: '#4a3f1e',

  info: '#4FB6E0',
  infoBg: '#101f26',
  infoBorder: '#1f3a45',
} as const;

export type ColorToken = keyof typeof colors;
