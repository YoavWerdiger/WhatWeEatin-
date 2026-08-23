import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";

interface TagChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function TagChip({ label, selected = false, onPress }: TagChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, selected ? styles.selectedLabel : styles.unselectedLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  selected: {
    backgroundColor: colors.primary,
  },
  unselected: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderWidth: 1,
  },
  label: {
    fontSize: typography.label,
    fontWeight: "600",
  },
  selectedLabel: {
    color: colors.white,
  },
  unselectedLabel: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.85,
  },
});
