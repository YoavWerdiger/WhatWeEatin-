import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { RestaurantCard } from "../components/RestaurantCard";
import { TimerBar } from "../components/TimerBar";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { Candidate, SwipeVote } from "../types/app";

interface SwipeScreenProps {
  candidate: Candidate | null;
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
        <Text style={styles.subHeading}>Invite code: {inviteCode}</Text>
      </View>

      <View style={styles.topBar}>
        <View style={styles.pickyBadge}>
          <Text style={styles.pickyLabel}>Picky meter</Text>
          <Text style={styles.pickyValue}>{pickyCount} rejections</Text>
        </View>
        <AppButton title="Invite" onPress={onShareInvite} variant="secondary" />
      </View>

      <TimerBar totalSeconds={totalSeconds} secondsLeft={secondsLeft} />

      <View style={styles.cardWrap}>
        {candidate ? (
          <RestaurantCard candidate={candidate} />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No active candidates left</Text>
            <Text style={styles.emptySubTitle}>Press auto pick and let us decide for you.</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <View style={styles.row}>
          <AppButton
            title="No"
            onPress={() => onVote("left_no")}
            variant="secondary"
            disabled={!candidate}
            loading={loadingVote}
          />
          <AppButton
            title="Okay"
            onPress={() => onVote("neutral")}
            variant="ghost"
            disabled={!candidate}
            loading={loadingVote}
          />
        </View>
        <View style={styles.row}>
          <AppButton
            title="Want"
            onPress={() => onVote("right_want")}
            variant="primary"
            disabled={!candidate}
            loading={loadingVote}
          />
          <AppButton
            title="Must"
            onPress={() => onVote("up_must")}
            variant="success"
            disabled={!candidate}
            loading={loadingVote}
          />
        </View>
        <AppButton title="We don't care anymore" onPress={onAutoPick} variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.sm,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: typography.title,
    fontWeight: "900",
  },
  subHeading: {
    color: colors.textSecondary,
    fontSize: typography.label,
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
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
