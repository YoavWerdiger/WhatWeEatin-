import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, continuous } from '../../theme/spacing';
import { PressableScale } from './PressableScale';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <PressableScale
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      {/* Label stays laid out while loading so the button never changes width */}
      <View style={[styles.row, loading && styles.hidden]}>
        {icon}
        <Text
          style={[
            styles.text,
            styles[`text_${variant}`],
            styles[`text_${size}`],
            icon ? { marginStart: spacing.sm } : undefined,
            textStyle,
          ]}
        >
          {title}
        </Text>
      </View>
      {loading && (
        <ActivityIndicator
          style={StyleSheet.absoluteFill}
          color={
            variant === 'primary'
              ? colors.onPrimary
              : variant === 'danger'
                ? colors.textInverse
                : colors.primaryDark
          }
          size="small"
        />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    ...continuous,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: {
    opacity: 0,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },

  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primaryMuted,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
  },

  size_sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  size_md: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  size_lg: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 16,
  },

  text: {
    ...typography.button,
  },
  text_primary: {
    color: colors.onPrimary,
  },
  text_secondary: {
    color: colors.primaryDark,
  },
  text_ghost: {
    color: colors.primaryDark,
  },
  text_danger: {
    color: colors.textInverse,
  },
  text_sm: {
    ...typography.buttonSmall,
  },
  text_md: {
    ...typography.button,
  },
  text_lg: {
    ...typography.button,
  },
});
