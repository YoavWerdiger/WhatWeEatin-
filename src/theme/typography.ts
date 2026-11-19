import { TextStyle } from 'react-native';

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
} as const;

export const typography: Record<string, TextStyle> = {
  heroTitle: {
    fontFamily: fontFamilies.black,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 20,
    lineHeight: 26,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySemiBold: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  captionMedium: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    lineHeight: 22,
  },
  buttonSmall: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    lineHeight: 18,
  },
};
