import { Image, Linking, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { MatchWithRestaurant } from "../types/app";

interface MatchScreenProps {
  result: MatchWithRestaurant;
  onRestart: () => void;
}

function priceSymbols(priceLevel: number): string {
  return "$".repeat(Math.max(1, Math.min(4, priceLevel)));
}

export function MatchScreen({ result, onRestart }: MatchScreenProps) {
  const onOrderNow = () => {
    const query = encodeURIComponent(result.restaurant.name);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() => undefined);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>This is what we eatin'</Text>
        <Text style={styles.bannerSubtitle}>
          Decided by {result.match.decidedBy === "consensus" ? "full consensus" : "smart auto-pick"}
        </Text>
      </View>

      <View style={styles.card}>
        <Image
          source={{
            uri:
              result.restaurant.imageUrl ??
              "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80",
          }}
          style={styles.image}
        />
        <View style={styles.body}>
          <Text style={styles.name}>{result.restaurant.name}</Text>
          <Text style={styles.meta}>
            Rating {result.restaurant.rating.toFixed(1)} | {priceSymbols(result.restaurant.priceLevel)} |{" "}
            {result.restaurant.etaMinutes ?? 20}m
          </Text>
          <Text style={styles.hint}>No more overthinking. Tap order and eat.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton title="Order now" onPress={onOrderNow} variant="success" />
        <AppButton title="Keep browsing" onPress={onRestart} variant="secondary" />
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
    justifyContent: "space-between",
  },
  banner: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  bannerTitle: {
    color: colors.black,
    fontSize: typography.title,
    fontWeight: "900",
  },
  bannerSubtitle: {
    color: colors.black,
    fontSize: typography.label,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginTop: spacing.lg,
    flex: 1,
  },
  image: {
    width: "100%",
    height: 280,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.subtitle,
    fontWeight: "900",
  },
  meta: {
    color: colors.textSecondary,
    fontSize: typography.label,
    fontWeight: "600",
  },
  hint: {
    color: colors.textSecondary,
    fontSize: typography.body,
  },
  footer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },
});
