// Light palette on the iOS grouped-background model: grey page, white cards.
// Every text role clears WCAG 4.5:1 on both `background` and `surface`
// (ratios noted on white / on #F2F2F7).
export const colors = {
  // Brand orange — fills only. As text on light surfaces use `primaryDark`.
  primary: '#FF6B35',
  primaryLight: '#FF8F65',
  primaryDark: '#C2410C', // 5.2 / 4.6
  primaryMuted: 'rgba(255, 107, 53, 0.14)',
  onPrimary: '#1C1C1E', // dark label on the orange fill — 6.0 (white is only 2.8)

  accent: '#22A35A',
  accentLight: '#5DEFA0',
  accentDark: '#15803D', // 5.0, also takes white text at 5.0

  danger: '#D92D20', // 4.8
  dangerLight: '#FF6B81',

  superlike: '#1D6FB8', // 5.2
  superlikeLight: '#5DADE2',

  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',

  text: '#1C1C1E', // 17.0 / 15.3
  textSecondary: '#55555B', // 7.4 / 6.6
  textMuted: '#6C6C71', // 5.2 / 4.7 — meta and captions only
  textInverse: '#FFFFFF',

  border: '#C6C6C8',
  borderLight: '#E5E5EA',
  divider: '#E5E5EA',

  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.08)',

  success: '#15803D',
  warning: '#B45309', // 5.0
  info: '#1D6FB8',
} as const;

export const darkColors = {
  ...colors,
  background: '#000000',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  card: '#1C1C1E',

  text: '#F2F2F7',
  textSecondary: '#AEAEB2',
  textMuted: '#8E8E93',
  textInverse: '#1C1C1E',

  border: '#38383A',
  borderLight: '#2C2C2E',
  divider: '#2C2C2E',

  shadow: 'rgba(0, 0, 0, 0.3)',
} as const;
