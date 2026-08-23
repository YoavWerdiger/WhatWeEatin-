import { Image, StyleSheet, Text, View } from "react-native";
import { Candidate } from "../types/app";
import { colors, radius, spacing, typography } from "../theme/tokens";

interface RestaurantCardProps {
  candidate: Candidate;
}

function priceSymbols(priceLevel: number): string {
  return "$".repeat(Math.max(1, Math.min(4, priceLevel)));
}

export function RestaurantCard({ candidate }: RestaurantCardProps) {
  const { restaurant } = candidate;
  return (
    <View style={styles.card}>
      <Image
        style={styles.image}
        source={{
          uri:
            restaurant.imageUrl ??
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
        }}
      />
      <View style={styles.body}>
        <Text style={styles.name}>{restaurant.name}</Text>
        <Text style={styles.meta}>
          Rating {restaurant.rating.toFixed(1)}  |  {priceSymbols(restaurant.priceLevel)}  |  {candidate.etaMinutes}m
        </Text>
        <Text style={styles.metaSecondary}>{Math.round(candidate.distanceMeters / 100) / 10} km away</Text>
        <View style={styles.tagRow}>
          {restaurant.cuisineTags.slice(0, 3).map((tag) => (
            <View style={styles.tag} key={`${restaurant.id}-${tag}`}>
              <Text style={styles.tagText}>{tag.replace(/_/g, " ")}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  image: {
    width: "100%",
    height: 260,
    backgroundColor: colors.surfaceSoft,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.subtitle,
    fontWeight: "800",
  },
  meta: {
    color: colors.textSecondary,
    fontSize: typography.label,
    fontWeight: "600",
  },
  metaSecondary: {
    color: colors.textSecondary,
    fontSize: typography.tiny,
    fontWeight: "500",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
  tag: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagText: {
    color: colors.textSecondary,
    fontSize: typography.tiny,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
