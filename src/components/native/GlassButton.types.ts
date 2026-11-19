import type { StyleProp, ViewStyle } from 'react-native';

export interface GlassButtonProps {
  title: string;
  onPress: () => void;
  /** Tinted `.glassProminent` (primary action) vs. clear `.glass` (secondary). */
  prominent?: boolean;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export interface GlassIconButtonProps {
  /** SF Symbol name on iOS, e.g. 'chevron.backward', 'xmark', 'square.and.arrow.up'. */
  systemImage: string;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  /** Icon color — use a light one over dark backgrounds. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}
