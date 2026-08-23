import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { TagChip } from "../components/TagChip";
import { colors, radius, spacing, typography } from "../theme/tokens";

const cuisineOptions = ["pizza", "sushi", "burger", "healthy", "middle_eastern", "vegan"];

interface CreateSessionScreenProps {
  radiusKm: number;
  budgetLevel: number;
  selectedCuisines: string[];
  loading: boolean;
  setRadiusKm: (value: number) => void;
  setBudgetLevel: (value: number) => void;
  toggleCuisine: (value: string) => void;
  onCreate: () => void;
  onBack: () => void;
}

export function CreateSessionScreen(props: CreateSessionScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>What We Eatin’</Text>
      <Text style={styles.title}>Set the vibe. Keep it simple.</Text>
      <Text style={styles.subtitle}>Location locked to Tel Aviv for MVP. Pick preferences and go.</Text>

      <View style={styles.block}>
        <Text style={styles.label}>How far?</Text>
        <View style={styles.rowWrap}>
          {[2, 5, 8, 12].map((distance) => (
            <TagChip
              key={distance}
              label={`${distance} km`}
              selected={props.radiusKm === distance}
              onPress={() => props.setRadiusKm(distance)}
            />
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Budget</Text>
        <View style={styles.rowWrap}>
          {[1, 2, 3, 4].map((budget) => (
            <TagChip
              key={budget}
              label={"$".repeat(budget)}
              selected={props.budgetLevel === budget}
              onPress={() => props.setBudgetLevel(budget)}
            />
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Craving</Text>
        <View style={styles.rowWrap}>
          {cuisineOptions.map((cuisine) => (
            <TagChip
              key={cuisine}
              label={cuisine.replace(/_/g, " ")}
              selected={props.selectedCuisines.includes(cuisine)}
              onPress={() => props.toggleCuisine(cuisine)}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton title="Let’s Go" onPress={props.onCreate} loading={props.loading} />
        <AppButton title="Back" onPress={props.onBack} variant="ghost" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  brand: {
    color: colors.primary,
    fontSize: typography.subtitle,
    fontWeight: "900",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.title,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: -spacing.sm,
  },
  block: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  label: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.label,
    marginBottom: spacing.sm,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  footer: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
