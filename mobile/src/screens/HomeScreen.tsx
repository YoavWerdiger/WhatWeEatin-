import { LinearGradient } from "expo-linear-gradient";
import {
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppButton } from "../components/AppButton";
import { colors, heroImage, radius, spacing, typography } from "../theme/tokens";

interface HomeScreenProps {
  joinSessionId: string;
  setJoinSessionId: (value: string) => void;
  onCreatePress: () => void;
  onJoinPress: () => void;
  joining: boolean;
  backendReady: boolean;
}

export function HomeScreen({
  joinSessionId,
  setJoinSessionId,
  onCreatePress,
  onJoinPress,
  joining,
  backendReady,
}: HomeScreenProps) {
  return (
    <ImageBackground source={{ uri: heroImage }} style={styles.hero} resizeMode="cover">
      <LinearGradient
        colors={["rgba(8,6,5,0.25)", "rgba(8,6,5,0.72)", "rgba(8,6,5,0.96)"]}
        style={styles.overlay}
      >
        <View style={styles.top}>
          <Text style={styles.brand}>What We Eatin'</Text>
          <Text style={styles.line}>Stop arguing. Start eating.</Text>
          <Text style={styles.support}>Decide together. Eat faster.</Text>
        </View>

        <View style={styles.bottom}>
          <AppButton title="Start a Session" onPress={onCreatePress} disabled={!backendReady} />
          <Text style={styles.or}>or join friends</Text>
          <TextInput
            placeholder="Paste invite / session id"
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
            disabled={!joinSessionId || !backendReady}
            loading={joining}
          />
          {!backendReady ? (
            <Text style={styles.hint}>Connecting to backend… keep `npm run dev` running.</Text>
          ) : (
            <Text style={styles.hint}>No more “I don’t care”.</Text>
          )}
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  top: {
    marginTop: spacing.xl,
  },
  brand: {
    color: colors.primary,
    fontSize: typography.title,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  line: {
    color: colors.textPrimary,
    fontSize: typography.hero,
    fontWeight: "900",
    lineHeight: 46,
    letterSpacing: -1,
  },
  support: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.body,
    fontWeight: "600",
  },
  bottom: {
    gap: spacing.sm,
  },
  or: {
    color: colors.textSecondary,
    textAlign: "center",
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: "rgba(22,20,18,0.88)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.body,
  },
  hint: {
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: typography.label,
    marginTop: spacing.xs,
  },
});
