import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius } from '../theme/spacing';
import { Glass } from './ui/Glass';

const LIGHT_RED = '#FF6B6B';

/** "Leave session" as a red glass pill — the same everywhere a screen has its own top bar. */
export function LeaveButton({ label, onPress, dark = false }: { label: string; onPress: () => void; dark?: boolean }) {
  const color = dark ? LIGHT_RED : colors.danger;
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
      <Glass
        radius={borderRadius.full}
        interactive
        scheme={dark ? 'dark' : 'light'}
        dark={dark}
        tint={dark ? 'rgba(255, 107, 107, 0.16)' : 'rgba(217, 45, 32, 0.1)'}
        style={styles.pill}
      >
        <Ionicons name="exit-outline" size={16} color={color} />
        <Text style={[styles.text, { color }]}>{label}</Text>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  text: { ...typography.subheadline, fontWeight: '700' },
});
