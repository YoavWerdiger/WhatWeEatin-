import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

interface BadgeProps {
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

const variantColors = {
  default: { bg: colors.primaryMuted, text: colors.primary },
  success: { bg: 'rgba(46, 204, 113, 0.12)', text: colors.accent },
  warning: { bg: 'rgba(243, 156, 18, 0.12)', text: colors.warning },
  info: { bg: 'rgba(52, 152, 219, 0.12)', text: colors.info },
};

export function Badge({ text, variant = 'default' }: BadgeProps) {
  const colorSet = variantColors[variant];

  return (
    <View style={[styles.container, { backgroundColor: colorSet.bg }]}>
      <Text style={[styles.text, { color: colorSet.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  text: {
    ...typography.captionMedium,
  },
});
