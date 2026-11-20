import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Dish, Restaurant } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { Glass } from './ui/Glass';
import { fetchWoltDishes } from '../services/restaurants';
import { openRestaurantLink } from '../utils/openRestaurantLink';
import { SOURCE_LABELS } from '../utils/constants';
import { CARD_WIDTH, CARD_HEIGHT } from './SwipeCard';

interface CardBackProps {
  restaurant: Restaurant;
  /** True once the card has been flipped — dishes load only then. */
  active: boolean;
}

/** The back of a swipe card: what the delivery app knows about the place. */
export function CardBack({ restaurant: r, active }: CardBackProps) {
  const [dishes, setDishes] = useState<Dish[] | undefined>(r.dishes);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || dishes?.length || r.source !== 'wolt' || !r.slug) return;
    let alive = true;
    setLoading(true);
    fetchWoltDishes(r.slug).then((d) => {
      if (!alive) return;
      setDishes(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [active, r.slug, r.source, dishes?.length]);

  const facts = [
    { icon: 'time-outline' as const, text: r.deliveryTime },
    { icon: 'bicycle-outline' as const, text: r.deliveryFee },
    { icon: 'bag-handle-outline' as const, text: r.minimumOrder },
    { icon: 'location-outline' as const, text: r.address || r.distance },
  ].filter((f): f is { icon: typeof f.icon; text: string } => !!f.text);

  return (
    <View style={styles.card}>
      <Image source={{ uri: r.image }} style={StyleSheet.absoluteFill} blurRadius={24} />
      <View style={[StyleSheet.absoluteFill, styles.dim]} />

      <View style={styles.content}>
        <View style={styles.head}>
          <Text style={styles.name} numberOfLines={2}>
            {r.name}
          </Text>
          {r.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {r.description}
            </Text>
          ) : null}
          {r.tags?.length ? (
            <View style={styles.tags}>
              {r.tags.slice(0, 4).map((tag) => (
                <Glass key={tag} radius={borderRadius.full} variant="clear" scheme="dark" dark style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </Glass>
              ))}
            </View>
          ) : null}
        </View>

        {facts.length > 0 && (
          <Glass radius={borderRadius.md} variant="clear" scheme="dark" dark style={styles.facts}>
            {facts.map((f) => (
              <View key={f.icon} style={styles.fact}>
                <Ionicons name={f.icon} size={15} color="rgba(255,255,255,0.8)" />
                <Text style={styles.factText} numberOfLines={1}>
                  {f.text}
                </Text>
              </View>
            ))}
          </Glass>
        )}

        <View style={styles.dishes}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            dishes?.slice(0, 4).map((d, i) => (
              <Animated.View key={`${d.name}-${i}`} entering={FadeIn.duration(200).delay(i * 50)} style={styles.dish}>
                {d.image ? <Image source={{ uri: d.image }} style={styles.dishPhoto} /> : null}
                <Text style={styles.dishName} numberOfLines={1}>
                  {d.name}
                </Text>
                {d.price ? <Text style={styles.dishPrice}>{d.price}</Text> : null}
              </Animated.View>
            ))
          )}
        </View>

        {r.externalUrl ? (
          <Pressable
            onPress={() => openRestaurantLink(r.externalUrl, r.source)}
            accessibilityRole="link"
            hitSlop={8}
            style={styles.linkWrap}
          >
            <Glass radius={borderRadius.full} variant="clear" scheme="dark" dark interactive style={styles.link}>
              <Text style={styles.linkText}>{SOURCE_LABELS[r.source]}</Text>
              <Ionicons name="open-outline" size={14} color="#FFFFFF" />
            </Glass>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const DISH_W = (CARD_WIDTH - spacing.lg * 2 - spacing.sm) / 2;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.text,
  },
  dim: { backgroundColor: 'rgba(0,0,0,0.55)' },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  head: { gap: spacing.sm },
  name: { ...typography.title2, color: '#FFFFFF' },
  description: { ...typography.subheadline, color: 'rgba(255,255,255,0.85)' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { ...typography.caption1, fontWeight: '500', color: '#FFFFFF' },
  facts: { padding: 12, gap: 8 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factText: { ...typography.footnote, color: '#FFFFFF', flex: 1 },
  dishes: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignContent: 'flex-start', justifyContent: 'center' },
  dish: { width: DISH_W, gap: 2 },
  dishPhoto: { width: '100%', height: DISH_W * 0.62, borderRadius: borderRadius.sm, backgroundColor: 'rgba(255,255,255,0.1)' },
  dishName: { ...typography.caption1, fontWeight: '600', color: '#FFFFFF' },
  dishPrice: { ...typography.caption1, color: 'rgba(255,255,255,0.75)' },
  linkWrap: { alignSelf: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  linkText: { ...typography.subheadline, fontWeight: '600', color: '#FFFFFF' },
});
