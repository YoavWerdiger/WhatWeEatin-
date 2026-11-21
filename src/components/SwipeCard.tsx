import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Glass } from './ui/Glass';
import { Ionicons } from '@expo/vector-icons';
import { Restaurant, RestaurantSource } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing, shadows } from '../theme/spacing';
import { PRICE_LABELS } from '../utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
export const CARD_HEIGHT = CARD_WIDTH * 1.35;
const META_ICON = 'rgba(255,255,255,0.85)';

// Brand colours — the source pill is stained with the delivery app's colour.
const SOURCE_CONFIG: Record<RestaurantSource, { label: string; brand: string }> = {
  wolt: { label: 'Wolt', brand: 'rgba(0, 157, 224, 0.85)' },
  tenbis: { label: '10bis', brand: 'rgba(255, 102, 0, 0.85)' },
  google: { label: 'Google', brand: 'rgba(66, 133, 244, 0.85)' },
  mock: { label: 'Sample', brand: 'rgba(255, 255, 255, 0.2)' },
};

const PILL_TINT = 'rgba(255, 255, 255, 0.22)';

/** Rounded clear glass over the photo; dark scheme keeps the white text legible. */
function Pill({
  children,
  style,
  tint,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tint?: string;
}) {
  return (
    // Untinted clear glass all but vanished over dark photos — a light frost keeps the capsule visible
    <Glass radius={borderRadius.full} variant="clear" scheme="dark" dark tint={tint ?? PILL_TINT} style={[styles.pill, style]}>
      {children}
    </Glass>
  );
}

interface SwipeCardProps {
  restaurant: Restaurant;
  /** Smaller card (match screen) — sized directly, not scaled: a transform stops the glass pills rendering */
  width?: number;
}

export function SwipeCard({ restaurant, width }: SwipeCardProps) {
  const stars = '★'.repeat(Math.floor(restaurant.rating));
  const src = SOURCE_CONFIG[restaurant.source];
  // Some sources have no photo (empty string) or a dead link — show a placeholder, not an empty card
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const hasImage = !!restaurant.image && failedUri !== restaurant.image;

  return (
    <View style={[styles.card, width ? { width, height: width * (CARD_HEIGHT / CARD_WIDTH) } : null]}>
      {/* expo-image: memory+disk cache, so a prefetched photo shows instantly */}
      {hasImage ? (
        <Image
          source={{ uri: restaurant.image }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
          recyclingKey={restaurant.id}
          onError={() => setFailedUri(restaurant.image)}
        />
      ) : (
        <LinearGradient
          colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.image, styles.placeholder]}
        >
          <Ionicons name="restaurant" size={72} color="rgba(255,255,255,0.85)" />
        </LinearGradient>
      )}

      {restaurant.source !== 'mock' && (
        <View style={styles.sourceBadge} pointerEvents="none">
          <Pill tint={src.brand}>
            <Text style={styles.sourceText}>{src.label}</Text>
          </Pill>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.88)']}
        locations={[0.3, 0.6, 1]}
        style={styles.gradient}
      >
        <View style={styles.infoContainer}>
          <View style={styles.tagsRow}>
            <Pill>
              <Text style={styles.cuisineText}>{restaurant.cuisine}</Text>
            </Pill>
            {restaurant.isOpen && (
              <Pill>
                <View style={styles.openDot} />
                <Text style={styles.openText}>Open</Text>
              </Pill>
            )}
          </View>

          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>

          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{stars}</Text>
            <Text style={styles.ratingNum}>{restaurant.rating}</Text>
            {restaurant.reviewCount > 0 && (
              <>
                <Text style={styles.separator}>·</Text>
                <Text style={styles.reviewCount}>
                  {restaurant.reviewCount} reviews
                </Text>
              </>
            )}
          </View>

          <View style={styles.metaRow}>
            <Pill>
              <Ionicons name="time-outline" size={14} color={META_ICON} />
              <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
            </Pill>
            <Pill>
              <Ionicons name="wallet-outline" size={14} color={META_ICON} />
              <Text style={styles.metaText}>
                {PRICE_LABELS[restaurant.priceLevel]}
              </Text>
            </Pill>
            {restaurant.deliveryFee && (
              <Pill>
                <Ionicons name="bicycle-outline" size={14} color={META_ICON} />
                <Text style={styles.metaText}>{restaurant.deliveryFee}</Text>
              </Pill>
            )}
            {!restaurant.deliveryFee && restaurant.distance && (
              <Pill>
                <Ionicons name="location-outline" size={14} color={META_ICON} />
                <Text style={styles.metaText}>{restaurant.distance}</Text>
              </Pill>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.card,
    ...shadows.xl,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: CARD_HEIGHT * 0.25,
  },
  // Centred across the top of the card
  sourceBadge: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  sourceText: {
    ...typography.caption1,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gradient: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg + 4,
    paddingHorizontal: spacing.lg,
  },
  infoContainer: {
    gap: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 2,
  },
  cuisineText: {
    ...typography.caption1,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2ECC71',
  },
  openText: {
    ...typography.caption1,
    fontWeight: '500',
    color: '#2ECC71',
  },
  name: {
    ...typography.title1,
    color: '#FFFFFF',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    ...typography.footnote,
    color: '#FFD700',
  },
  ratingNum: {
    ...typography.subheadline,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  separator: {
    ...typography.subheadline,
    color: 'rgba(255,255,255,0.4)',
  },
  reviewCount: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    ...typography.caption1,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
});
