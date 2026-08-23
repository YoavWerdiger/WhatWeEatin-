import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { colors, radius, spacing, typography } from "../theme/tokens";

interface HomeScreenProps {
  joinSessionId: string;
  setJoinSessionId: (value: string) => void;
  onCreatePress: () => void;
  onJoinPress: () => void;
  joining: boolean;
}

export function HomeScreen({
  joinSessionId,
  setJoinSessionId,
  onCreatePress,
  onJoinPress,
  joining,
}: HomeScreenProps) {
  return (
    <LinearGradient colors={["#0E0E10", "#1B1310", "#0E0E10"]} style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>What We Eatin'</Text>
        <Text style={styles.title}>Stop arguing. Start eating.</Text>
        <Text style={styles.subtitle}>
          Fast group decisions in under 60 seconds. Swipe. Match. Order.
        </Text>
      </View>

      <View style={styles.card}>
        <AppButton title="Start a Session" onPress={onCreatePress} />
        <View style={styles.divider} />
        <Text style={styles.inputLabel}>Got an invite code?</Text>
        <TextInput
          placeholder="Paste session id"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={joinSessionId}
          onChangeText={setJoinSessionId}
          autoCapitalize="none"
        />
        <AppButton
          title="Join Session"
          onPress={onJoinPress}
          variant="secondary"
          disabled={!joinSessionId}
          loading={joining}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  hero: {
    marginTop: spacing.xl + spacing.md,
  },
  kicker: {
    color: colors.primary,
    fontSize: typography.subtitle,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.hero,
    fontWeight: "900",
    lineHeight: 40,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: typography.label,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.body,
  },
});
