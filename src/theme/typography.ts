import { Platform, TextStyle } from 'react-native';

// SF Pro Rounded on iOS (Roboto on Android). No style here sets letterSpacing.
// Sizes and leading follow Apple's default Dynamic Type scale.
export const fontFamilies = {
  /** SF Mono / Roboto Mono — codes, counts, timers. */
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
  /** SF Pro Rounded — the app's typeface (every text style below uses it). */
  rounded: Platform.select({ ios: 'ui-rounded', default: undefined }),
} as const;

const REGULAR = '400' as const;
const MEDIUM = '500' as const;
const SEMIBOLD = '600' as const;
const BOLD = '700' as const;

const scale = {
  // — Apple text styles —
  /** One per app at most — the home screen title. */
  display: { fontSize: 40, lineHeight: 46, fontWeight: BOLD },
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: BOLD },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: SEMIBOLD },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: SEMIBOLD },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: SEMIBOLD },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: SEMIBOLD },
  body: { fontSize: 17, lineHeight: 22, fontWeight: REGULAR },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: REGULAR },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: REGULAR },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: REGULAR },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: REGULAR },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: REGULAR },

  /** Session codes and other figures that must line up. */
  code: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: SEMIBOLD,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },

  // — Legacy names, mapped onto the scale above —
  heroTitle: { fontSize: 34, lineHeight: 41, fontWeight: BOLD },
  title: { fontSize: 28, lineHeight: 34, fontWeight: SEMIBOLD },
  subtitle: { fontSize: 20, lineHeight: 25, fontWeight: SEMIBOLD },
  bodyMedium: { fontSize: 17, lineHeight: 22, fontWeight: MEDIUM },
  bodySemiBold: { fontSize: 17, lineHeight: 22, fontWeight: SEMIBOLD },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: REGULAR },
  captionMedium: { fontSize: 13, lineHeight: 18, fontWeight: MEDIUM },
  label: { fontSize: 13, lineHeight: 18, fontWeight: MEDIUM },
  button: { fontSize: 17, lineHeight: 22, fontWeight: SEMIBOLD },
  buttonSmall: { fontSize: 15, lineHeight: 20, fontWeight: SEMIBOLD },
} satisfies Record<string, TextStyle>;

// One typeface across the app: SF Pro Rounded (as on the session code and the home title).
// Hebrew/Arabic glyphs fall back to the system font for those scripts.
export const typography = Object.fromEntries(
  Object.entries(scale).map(([k, v]) => [k, { fontFamily: fontFamilies.rounded, ...v }]),
) as { [K in keyof typeof scale]: (typeof scale)[K] & { fontFamily?: string } };
