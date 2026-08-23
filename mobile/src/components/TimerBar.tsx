import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";

interface TimerBarProps {
  totalSeconds: number;
  secondsLeft: number;
}

export function TimerBar({ totalSeconds, secondsLeft }: TimerBarProps) {
  const ratio = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const widthPercent = `${Math.round(ratio * 100)}%` as `${number}%`;
  const isUrgent = secondsLeft <= 25;

  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.label}>Pick faster</Text>
        <Text style={[styles.time, isUrgent && styles.timeUrgent]}>{secondsLeft}s</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: widthPercent }, isUrgent && styles.fillUrgent]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.label,
    fontWeight: "600",
  },
  time: {
    color: colors.textPrimary,
    fontSize: typography.label,
    fontWeight: "800",
  },
  timeUrgent: {
    color: colors.warning,
  },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  fillUrgent: {
    backgroundColor: colors.warning,
  },
});
