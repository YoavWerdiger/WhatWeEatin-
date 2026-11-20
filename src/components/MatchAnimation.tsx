import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated as RNAnimated,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { MatchResult, RestaurantSource, SessionUser } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing, shadows } from '../theme/spacing';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { GlassButton, GlassIconButton } from './native/GlassButton';
import { useTranslation } from '../i18n/t';
import { SOURCE_LABELS, PRICE_LABELS } from '../utils/constants';
import { openRestaurantLink } from '../utils/openRestaurantLink';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONTENT_WIDTH = SCREEN_WIDTH - spacing.xl * 2;

interface MatchAnimationProps {
  result: MatchResult;
  onContinue: () => void;
  onOrderNow: () => void;
  /** Leave the session from the result screen (the overlay hides the screen's own header). */
  onLeave?: () => void;
  /** When true, show who still needs to confirm "keep browsing". */
  requireUnanimousKeepBrowsing?: boolean;
  sessionUsers?: SessionUser[];
  keepBrowsingApprovedBy?: string[];
  currentUserId?: string;
  /** Play fade/scale-out, then call onExitComplete. */
  exiting?: boolean;
  onExitComplete?: () => void;
}

export function MatchAnimation({
  result,
  onContinue,
  onOrderNow,
  onLeave,
  requireUnanimousKeepBrowsing = false,
  sessionUsers = [],
  keepBrowsingApprovedBy = [],
  currentUserId,
  exiting = false,
  onExitComplete,
}: MatchAnimationProps) {
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const sourceLabels: Record<RestaurantSource, string> = {
    wolt: t('match.sourceWolt'),
    tenbis: t('match.sourceTenbis'),
    google: t('match.sourceGoogle'),
    mock: t('match.sourceMock'),
  };
  const overlayOpacity = useRef(new RNAnimated.Value(0)).current;
  const scaleAnim = useRef(new RNAnimated.Value(0)).current;
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(50)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      x: new RNAnimated.Value(SCREEN_WIDTH / 2),
      y: new RNAnimated.Value(SCREEN_HEIGHT / 2),
      opacity: new RNAnimated.Value(1),
      rotate: new RNAnimated.Value(0),
      scale: new RNAnimated.Value(0),
    })),
  ).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    overlayOpacity.setValue(0);
    RNAnimated.timing(overlayOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    RNAnimated.sequence([
      RNAnimated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
      RNAnimated.parallel([
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        RNAnimated.spring(slideAnim, {
          toValue: 0,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    confettiAnims.forEach((anim, i) => {
      const delay = i * 50;
      const targetX = Math.random() * SCREEN_WIDTH;
      const targetY = Math.random() * SCREEN_HEIGHT * 0.7;

      RNAnimated.sequence([
        RNAnimated.delay(delay),
        RNAnimated.parallel([
          RNAnimated.spring(anim.scale, {
            toValue: 1,
            tension: 40,
            friction: 5,
            useNativeDriver: true,
          }),
          RNAnimated.timing(anim.x, {
            toValue: targetX,
            duration: 1000,
            useNativeDriver: true,
          }),
          RNAnimated.timing(anim.y, {
            toValue: targetY,
            duration: 1000,
            useNativeDriver: true,
          }),
          RNAnimated.timing(anim.rotate, {
            toValue: Math.random() * 720 - 360,
            duration: 1500,
            useNativeDriver: true,
          }),
          RNAnimated.sequence([
            RNAnimated.delay(800),
            RNAnimated.timing(anim.opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    });
  }, []);


  useEffect(() => {
    if (!exiting) return;
    RNAnimated.parallel([
      RNAnimated.timing(overlayOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      RNAnimated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 280,
        useNativeDriver: true,
      }),
      RNAnimated.timing(fadeAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onExitComplete?.();
    });
  }, [exiting]);

  const emojis = ['🎉', '🍕', '🔥', '🎊', '✨', '🍔', '🌮', '🍣', '💫', '⭐'];
  const textDir = isRTL ? 'rtl' : 'ltr';
  const showUnanimous =
    requireUnanimousKeepBrowsing && sessionUsers.length > 1;
  const alreadyApproved =
    !!(
      showUnanimous &&
      currentUserId &&
      keepBrowsingApprovedBy.includes(currentUserId)
    );

  return (
    <RNAnimated.View
      style={[styles.container, { opacity: overlayOpacity }]}
      pointerEvents={exiting ? 'none' : 'auto'}
    >
      {confettiAnims.map((anim, i) => (
        <RNAnimated.Text
          key={i}
          pointerEvents="none"
          style={[
            styles.confetti,
            {
              opacity: anim.opacity,
              transform: [
                { translateX: anim.x },
                { translateY: anim.y },
                { scale: anim.scale },
                {
                  rotate: anim.rotate.interpolate({
                    inputRange: [-360, 360],
                    outputRange: ['-360deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          {emojis[i % emojis.length]}
        </RNAnimated.Text>
      ))}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, spacing.sm) + spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.md,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <RNAnimated.View
          style={[
            styles.hero,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={[styles.matchTitle, { writingDirection: textDir }]}>
            {t('match.title')}
          </Text>

          <View style={styles.restaurantCard}>
            <Image
              source={{ uri: result.restaurant.image }}
              style={styles.restaurantImage}
            />
            <View style={styles.restaurantInfo}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.restaurantName, { writingDirection: textDir }]}
                  numberOfLines={2}
                >
                  {result.restaurant.name}
                </Text>
                {result.restaurant.source !== 'mock' && (
                  <View style={styles.sourceBadge}>
                    <Text style={styles.sourceBadgeText}>
                      {SOURCE_LABELS[result.restaurant.source]}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.restaurantMeta, { writingDirection: textDir }]}
                numberOfLines={3}
              >
                ★ {result.restaurant.rating} · {result.restaurant.cuisine} ·{' '}
                {result.restaurant.deliveryTime}
                {` · ${PRICE_LABELS[result.restaurant.priceLevel] ?? '$$'}`}
                {result.restaurant.deliveryFee
                  ? ` · ${result.restaurant.deliveryFee}`
                  : ''}
                {result.restaurant.distance
                  ? ` · ${result.restaurant.distance}`
                  : ''}
                {result.restaurant.minimumOrder
                  ? ` · min ${result.restaurant.minimumOrder}`
                  : ''}
              </Text>
            </View>
          </View>
        </RNAnimated.View>

        <RNAnimated.View
          style={[
            styles.bottomSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.agreedUsers}>
            <Text style={[styles.agreedTitle, { writingDirection: textDir }]}>
              {result.agreedUsers.length === 1
                ? t('match.agreedOne')
                : t('match.agreedMany', { count: result.agreedUsers.length })}
            </Text>
            <View style={styles.avatarRow}>
              {result.agreedUsers.map((user, i) => (
                <View
                  key={user.id}
                  style={[styles.avatarWrapper, { marginLeft: i > 0 ? -8 : 0 }]}
                >
                  <Avatar name={user.name} color={user.avatar} size={36} />
                </View>
              ))}
            </View>
          </View>

          {showUnanimous && (
            <View style={styles.unanimousBox}>
              <Text
                style={[styles.unanimousTitle, { writingDirection: textDir }]}
              >
                {t('match.keepBrowsingTitle')}
              </Text>
              <Text
                style={[styles.unanimousHint, { writingDirection: textDir }]}
              >
                {t('match.keepBrowsingHint')}
              </Text>
              <Text
                style={[styles.unanimousCount, { writingDirection: textDir }]}
              >
                {t('match.playersIn', {
                  done: keepBrowsingApprovedBy.length,
                  total: sessionUsers.length,
                })}
              </Text>
              <View style={styles.unanimousRow}>
                {sessionUsers.map((u) => {
                  const done = keepBrowsingApprovedBy.includes(u.id);
                  const isMe = currentUserId && u.id === currentUserId;
                  return (
                    <View
                      key={u.id}
                      style={[
                        styles.unanimousChip,
                        done && styles.unanimousChipDone,
                      ]}
                    >
                      <Text
                        style={[
                          styles.unanimousChipText,
                          done && styles.unanimousChipTextDone,
                          { writingDirection: textDir },
                        ]}
                        numberOfLines={1}
                      >
                        {u.name}
                        {isMe ? t('match.youSuffix') : ''}
                        {done ? ' ✓' : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.actions}>
            {result.restaurant.externalUrl ? (
              <GlassButton
                title={sourceLabels[result.restaurant.source]}
                onPress={() =>
                  openRestaurantLink(
                    result.restaurant.externalUrl,
                    result.restaurant.source,
                  )
                }
              />
            ) : (
              <GlassButton title={t('match.orderNow')} onPress={onOrderNow} />
            )}
            <GlassButton
              title={
                alreadyApproved
                  ? t('match.waitingOthers')
                  : showUnanimous
                    ? t('match.iWantKeepBrowsing')
                    : t('match.keepBrowsing')
              }
              onPress={onContinue}
              prominent={false}
              color="#FFFFFF"
              disabled={alreadyApproved}
            />
            {onLeave && (
              <Button
                title={t('common.leave').replace(/[→←]/g, '').trim()}
                onPress={onLeave}
                variant="ghost"
                size="sm"
                textStyle={styles.leaveText}
              />
            )}
          </View>
        </RNAnimated.View>
      </ScrollView>
      {onLeave && (
        <View style={[styles.closeButton, { top: Math.max(insets.top, spacing.sm) + spacing.xs }]}>
          <GlassIconButton
            systemImage="xmark"
            accessibilityLabel={t('common.leave').replace(/[→←]/g, '').trim()}
            onPress={onLeave}
            color="#FFFFFF"
          />
        </View>
      )}
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    position: 'absolute',
    start: spacing.md,
    zIndex: 10,
  },
  leaveText: {
    color: 'rgba(255,255,255,0.6)',
  },
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 1000,
    elevation: 1000,
  },
  scroll: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  confetti: {
    position: 'absolute',
    fontSize: 24,
    zIndex: 1,
  },
  continueBtn: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    width: CONTENT_WIDTH,
  },
  matchTitle: {
    ...typography.largeTitle,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.lg,
    // clear the floating close button on both sides,
    paddingHorizontal: 44,
  },
  restaurantCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    width: '100%',
    ...shadows.lg,
  },
  restaurantImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  restaurantInfo: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceBadgeText: {
    ...typography.caption2,
    fontWeight: '600',
    color: colors.primary,
  },
  restaurantName: {
    ...typography.subtitle,
    color: colors.text,
    flexShrink: 1,
  },
  restaurantMeta: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  bottomSection: {
    alignItems: 'center',
    width: CONTENT_WIDTH,
    gap: spacing.md,
  },
  agreedUsers: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  agreedTitle: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.85)',
    borderRadius: 20,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
    alignItems: 'center',
  },
  unanimousBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: spacing.sm,
  },
  unanimousTitle: {
    ...typography.subheadline,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  unanimousHint: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
    textAlign: 'center',
  },
  unanimousCount: {
    ...typography.captionMedium,
    color: colors.primaryLight,
    textAlign: 'center',
  },
  unanimousRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  unanimousChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    maxWidth: '100%',
  },
  unanimousChipDone: {
    backgroundColor: 'rgba(46, 204, 113, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.5)',
  },
  unanimousChipText: {
    ...typography.caption1,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  unanimousChipTextDone: {
    color: '#B8F5D0',
  },
});
