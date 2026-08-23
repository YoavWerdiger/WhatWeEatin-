import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { TagChip } from "../components/TagChip";
import { colors, radius, spacing, typography } from "../theme/tokens";

const cuisineOptions = ["pizza", "sushi", "burger", "healthy", "middle_eastern", "vegan"];

interface CreateSessionScreenProps {
  latitude: string;
  longitude: string;
  radiusKm: number;
  budgetLevel: number;
  selectedCuisines: string[];
  loading: boolean;
  setLatitude: (value: string) => void;
  setLongitude: (value: string) => void;
  setRadiusKm: (value: number) => void;
  setBudgetLevel: (value: number) => void;
  toggleCuisine: (value: string) => void;
  onCreate: () => void;
  onBack: () => void;
}

export function CreateSessionScreen(props: CreateSessionScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>What we eatin'?</Text>
      <Text style={styles.subtitle}>Set the vibe. Keep it simple. Pick faster.</Text>

      <View style={styles.block}>
        <Text style={styles.label}>Location</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.half]}
            value={props.latitude}
            onChangeText={props.setLatitude}
            keyboardType="decimal-pad"
            placeholder="Lat"
            placeholderTextColor={colors.textSecondary}
          />
          <TextInput
            style={[styles.input, styles.half]}
            value={props.longitude}
            onChangeText={props.setLongitude}
            keyboardType="decimal-pad"
            placeholder="Lng"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Distance preference</Text>
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
              label={`$`.repeat(budget)}
              selected={props.budgetLevel === budget}
              onPress={() => props.setBudgetLevel(budget)}
            />
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Quick food preferences</Text>
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
        <AppButton title="Back" onPress={props.onBack} variant="ghost" />
        <AppButton title="Let's Go" onPress={props.onCreate} loading={props.loading} />
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
    paddingTop: spacing.xl + spacing.md,
    gap: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.title,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.xs,
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
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  half: {
    flex: 1,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.body,
  },
  footer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
