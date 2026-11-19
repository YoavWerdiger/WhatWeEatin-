export const colors = {
  primary: '#FF6B35',
  primaryLight: '#FF8F65',
  primaryDark: '#E5561F',
  primaryMuted: 'rgba(255, 107, 53, 0.12)',

  accent: '#2ECC71',
  accentLight: '#5DEFA0',
  accentDark: '#27AE60',

  danger: '#FF4757',
  dangerLight: '#FF6B81',

  superlike: '#3498DB',
  superlikeLight: '#5DADE2',

  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',

  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#F0F0F0',

  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.08)',

  success: '#2ECC71',
  warning: '#F39C12',
  info: '#3498DB',
} as const;

export const darkColors = {
  ...colors,
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceElevated: '#252540',
  card: '#1E1E32',

  text: '#F5F5F5',
  textSecondary: '#A0A0B8',
  textMuted: '#6B6B80',
  textInverse: '#1A1A2E',

  border: '#2A2A40',
  borderLight: '#1E1E32',
  divider: '#252540',

  shadow: 'rgba(0, 0, 0, 0.3)',
} as const;
