import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Restaurant, RestaurantSource } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing, shadows } from '../theme/spacing';
import { PRICE_LABELS } from '../utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
export const CARD_HEIGHT = CARD_WIDTH * 1.35;

const SOURCE_CONFIG: Record<RestaurantSource, { label: string; color: string; bg: string }> = {
  wolt: { label: 'Wolt', color: '#00A8D0', bg: 'rgba(0,200,232,0.25)' },
  tenbis: { label: '10bis', color: '#FF6900', bg: 'rgba(255,105,0,0.25)' },
  google: { label: 'Google', color: '#4285F4', bg: 'rgba(66,133,244,0.25)' },
  mock: { label: 'Sample', color: '#FFFFFF', bg: 'rgba(255,255,255,0.18)' },
};

interface SwipeCardProps {
  restaurant: Restaurant;
}

export function SwipeCard({ restaurant }: SwipeCardProps) {
  const stars = '★'.repeat(Math.floor(restaurant.rating));
  const src = SOURCE_CONFIG[restaurant.source];

  return (
    <View style={styles.card}>
      <Image source={{ uri: restaurant.image }} style={styles.image} />

      {restaurant.source !== 'mock' && (
        <View style={[styles.sourceBadge, { backgroundColor: src.bg }]}>
          <Text style={[styles.sourceText, { color: src.color }]}>
            {src.label}
          </Text>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.88)']}
        locations={[0.3, 0.6, 1]}
        style={styles.gradient}
      >
        <View style={styles.infoContainer}>
          <View style={styles.tagsRow}>
            <View style={styles.cuisineBadge}>
              <Text style={styles.cuisineText}>{restaurant.cuisine}</Text>
            </View>
            {restaurant.isOpen && (
              <View style={styles.openBadge}>
                <View style={styles.openDot} />
                <Text style={styles.openText}>Open</Text>
              </View>
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
            <View style={styles.metaChip}>
              <Text style={styles.metaEmoji}>🕐</Text>
              <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaEmoji}>💰</Text>
              <Text style={styles.metaText}>
                {PRICE_LABELS[restaurant.priceLevel]}
              </Text>
            </View>
            {restaurant.deliveryFee && (
              <View style={styles.metaChip}>
                <Text style={styles.metaEmoji}>🚚</Text>
                <Text style={styles.metaText}>{restaurant.deliveryFee}</Text>
              </View>
            )}
            {!restaurant.deliveryFee && restaurant.distance && (
              <View style={styles.metaChip}>
                <Text style={styles.metaEmoji}>📍</Text>
                <Text style={styles.metaText}>{restaurant.distance}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
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
    resizeMode: 'cover',
  },
  sourceBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 5,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg + 4,
    paddingHorizontal: spacing.lg,
  },
  infoContainer: {
    gap: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 2,
  },
  cuisineBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cuisineText: {
    ...typography.captionMedium,
    color: '#FFFFFF',
    fontSize: 12,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(46,204,113,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2ECC71',
  },
  openText: {
    ...typography.captionMedium,
    color: '#2ECC71',
    fontSize: 12,
  },
  name: {
    ...typography.title,
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 30,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stars: {
    color: '#FFD700',
    fontSize: 14,
    letterSpacing: 1,
  },
  ratingNum: {
    ...typography.bodySemiBold,
    color: '#FFFFFF',
    fontSize: 15,
  },
  separator: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  reviewCount: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaEmoji: {
    fontSize: 12,
  },
  metaText: {
    ...typography.captionMedium,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
});
