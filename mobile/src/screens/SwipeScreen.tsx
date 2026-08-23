import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { SwipeableCard } from "../components/SwipeableCard";
import { TimerBar } from "../components/TimerBar";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { Candidate, SwipeVote } from "../types/app";

interface SwipeScreenProps {
  candidate: Candidate | null;
  remainingCount: number;
  secondsLeft: number;
  totalSeconds: number;
  inviteCode: string;
  pickyCount: number;
  onVote: (vote: SwipeVote) => void;
  onAutoPick: () => void;
  onShareInvite: () => void;
  loadingVote: boolean;
}

export function SwipeScreen({
  candidate,
  remainingCount,
  secondsLeft,
  totalSeconds,
  inviteCode,
  pickyCount,
  onVote,
  onAutoPick,
  onShareInvite,
  loadingVote,
}: SwipeScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>Pick faster</Text>
        <Text style={styles.subHeading}>
          {remainingCount} left · code {inviteCode}
        </Text>
      </View>

      <View style={styles.topBar}>
        <View style={styles.pickyBadge}>
          <Text style={styles.pickyLabel}>Who’s the picky one?</Text>
          <Text style={styles.pickyValue}>{pickyCount} rejections</Text>
        </View>
        <AppButton title="Invite" onPress={onShareInvite} variant="secondary" />
      </View>

      <TimerBar totalSeconds={totalSeconds} secondsLeft={secondsLeft} />

      <View style={styles.cardWrap}>
        {candidate ? (
          <SwipeableCard
            key={candidate.id}
            candidate={candidate}
            disabled={loadingVote}
            onVote={onVote}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Pool’s empty</Text>
            <Text style={styles.emptySubTitle}>We don’t care anymore. Auto-pick it.</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <View style={styles.row}>
          <AppButton title="Nope" onPress={() => onVote("left_no")} variant="secondary" disabled={!candidate || loadingVote} />
          <AppButton title="Want" onPress={() => onVote("right_want")} disabled={!candidate || loadingVote} />
          <AppButton title="Must" onPress={() => onVote("up_must")} variant="success" disabled={!candidate || loadingVote} />
        </View>
        <AppButton title="We don’t care anymore" onPress={onAutoPick} variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  header: {
    gap: 2,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: typography.title,
    fontWeight: "900",
  },
  subHeading: {
    color: colors.textSecondary,
    fontSize: typography.label,
    fontWeight: "600",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  pickyBadge: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pickyLabel: {
    color: colors.textSecondary,
    fontSize: typography.tiny,
    fontWeight: "600",
  },
  pickyValue: {
    color: colors.warning,
    fontSize: typography.label,
    fontWeight: "800",
    marginTop: 2,
  },
  cardWrap: {
    flex: 1,
    justifyContent: "center",
  },
  empty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.subtitle,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  emptySubTitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
  },
  actions: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
