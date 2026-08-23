import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Animated, ImageBackground, Linking, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
  const scale = useRef(new Animated.Value(0.86)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [fade, scale]);

  const onOrderNow = () => {
    const query = encodeURIComponent(`${result.restaurant.name} Tel Aviv`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() => undefined);
  };

  const image =
    result.restaurant.imageUrl ??
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1400&q=80";

  return (
    <View style={styles.screen}>
      <ImageBackground source={{ uri: image }} style={styles.hero} resizeMode="cover">
        <LinearGradient colors={["rgba(8,6,5,0.2)", "rgba(8,6,5,0.92)"]} style={styles.overlay}>
          <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
            <Text style={styles.badge}>IT’S A MATCH</Text>
            <Text style={styles.title}>This is what we eatin’</Text>
            <Text style={styles.name}>{result.restaurant.name}</Text>
            <Text style={styles.meta}>
              {result.restaurant.rating.toFixed(1)} ★ · {priceSymbols(result.restaurant.priceLevel)} ·{" "}
              {result.restaurant.etaMinutes ?? 20}m
            </Text>
            <Text style={styles.sub}>
              {result.match.decidedBy === "consensus"
                ? "Full consensus. Finally."
                : "We picked for you. You’re welcome."}
            </Text>
          </Animated.View>
        </LinearGradient>
      </ImageBackground>

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
  },
  hero: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  badge: {
    alignSelf: "flex-start",
    color: colors.black,
    backgroundColor: colors.accent,
    overflow: "hidden",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontWeight: "900",
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.title,
    fontWeight: "900",
  },
  name: {
    color: colors.primary,
    fontSize: typography.hero - 4,
    fontWeight: "900",
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: typography.label,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.sm,
  },
  footer: {
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
