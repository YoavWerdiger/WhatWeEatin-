import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  Keyframe,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { MatchResult, RestaurantSource, SessionUser } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { Avatar } from './ui/Avatar';
import { Glass } from './ui/Glass';
import { GlassButton } from './native/GlassButton';
import { useTranslation } from '../i18n/t';
import { PRICE_LABELS } from '../utils/constants';
import { openRestaurantLink } from '../utils/openRestaurantLink';

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
  /** Play the fade-out, then call onExitComplete. */
  exiting?: boolean;
  onExitComplete?: () => void;
}

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const LIGHT_RED = '#FF8A80';

const heroEnter = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }, { rotate: '-4deg' }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { rotate: '0deg' }], easing: EASE_OUT },
}).duration(480);

const rise = (i: number) => FadeInDown.duration(320).delay(120 + i * 70);

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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const r = result.restaurant;

  const sourceLabels: Record<RestaurantSource, string> = {
    wolt: t('match.sourceWolt'),
    tenbis: t('match.sourceTenbis'),
    google: t('match.sourceGoogle'),
    mock: t('match.sourceMock'),
  };

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    opacity.set(withTiming(1, { duration: 220, easing: EASE_OUT }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!exiting) return;
    opacity.set(
      withTiming(0, { duration: 220, easing: EASE_OUT }, (finished) => {
        if (finished && onExitComplete) scheduleOnRN(onExitComplete);
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exiting]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  const showUnanimous = requireUnanimousKeepBrowsing && sessionUsers.length > 1;
  const alreadyApproved = !!(
    showUnanimous &&
    currentUserId &&
    keepBrowsingApprovedBy.includes(currentUserId)
  );

  const meta = [
    { icon: 'star' as const, text: String(r.rating) },
    { icon: 'restaurant-outline' as const, text: r.cuisine },
    { icon: 'time-outline' as const, text: r.deliveryTime },
    { icon: 'wallet-outline' as const, text: PRICE_LABELS[r.priceLevel] ?? '$$' },
    ...(r.deliveryFee ? [{ icon: 'bicycle-outline' as const, text: r.deliveryFee }] : []),
    ...(r.distance ? [{ icon: 'location-outline' as const, text: r.distance }] : []),
  ].filter((m) => !!m.text);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, fade]} pointerEvents={exiting ? 'none' : 'auto'}>
      {/* The winner's photo is the backdrop — rich content for the glass to sit on */}
      <Image source={{ uri: r.image }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={14} />
      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.head}>
          <Animated.Text entering={rise(1)} style={styles.title}>
            {t('match.title')}
          </Animated.Text>
        </View>

        {/* The winner, front and centre — it lands like a card on the table */}
        <Animated.View entering={reduceMotion ? FadeIn.duration(200) : heroEnter} style={styles.heroWrap}>
          <View style={styles.hero}>
            <Image source={{ uri: r.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          </View>
        </Animated.View>

        <View style={styles.body}>
          <Animated.View entering={rise(2)} style={styles.nameBlock}>
            <Text style={styles.name} numberOfLines={2}>
              {r.name}
            </Text>
            <View style={styles.pills}>
              {meta.map((m) => (
                <Glass
                  key={m.icon}
                  radius={borderRadius.full}
                  variant="clear"
                  scheme="dark"
                  dark
                  tint="rgba(255, 255, 255, 0.16)"
                  style={styles.pill}
                >
                  <Ionicons name={m.icon} size={13} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.pillText}>{m.text}</Text>
                </Glass>
              ))}
            </View>
          </Animated.View>

          {result.agreedUsers.length > 0 && (
          <Animated.View entering={rise(3)}>
            <Glass radius={borderRadius.full} variant="clear" scheme="dark" dark style={styles.agreed}>
              <View style={styles.avatars}>
                {result.agreedUsers.map((u, i) => (
                  <View key={u.id} style={[styles.avatarRing, i > 0 && styles.avatarOverlap]}>
                    <Avatar name={u.name} color={u.avatar} size={28} />
                  </View>
                ))}
              </View>
              <Text style={styles.agreedText}>
                {result.agreedUsers.length === 1
                  ? t('match.agreedOne')
                  : t('match.agreedMany', { count: result.agreedUsers.length })}
              </Text>
            </Glass>
          </Animated.View>
          )}

          {showUnanimous && (
            <Animated.View entering={rise(4)}>
              <Glass radius={borderRadius.lg} variant="clear" scheme="dark" dark style={styles.vote}>
                <View style={styles.voteHead}>
                  <Text style={styles.voteTitle}>{t('match.keepBrowsingTitle')}</Text>
                  <Text style={styles.voteCount}>
                    {keepBrowsingApprovedBy.length}/{sessionUsers.length}
                  </Text>
                </View>
                <Text style={styles.voteHint}>{t('match.keepBrowsingHint')}</Text>
                <View style={styles.voteChips}>
                  {sessionUsers.map((u) => {
                    const done = keepBrowsingApprovedBy.includes(u.id);
                    const isMe = currentUserId && u.id === currentUserId;
                    return (
                      <Glass
                        key={u.id}
                        radius={borderRadius.full}
                        variant="clear"
                        scheme="dark"
                        dark
                        tint={done ? 'rgba(34, 163, 90, 0.6)' : undefined}
                        style={styles.voteChip}
                      >
                        {done && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                        <Text style={styles.voteChipText} numberOfLines={1}>
                          {u.name}
                          {isMe ? t('match.youSuffix') : ''}
                        </Text>
                      </Glass>
                    );
                  })}
                </View>
              </Glass>
            </Animated.View>
          )}

          <Animated.View entering={rise(5)} style={styles.actions}>
            <GlassButton
              title={r.externalUrl ? sourceLabels[r.source] : t('match.orderNow')}
              onPress={
                r.externalUrl ? () => openRestaurantLink(r.externalUrl, r.source) : onOrderNow
              }
            />
            {/* Secondary choices share one row, split evenly */}
            <View style={styles.actionRow}>
              <View style={styles.actionCell}>
                <GlassButton
                  title={
                    alreadyApproved ? t('match.waitingOthers') : t('match.keepBrowsing')
              }
              onPress={onContinue}
              prominent={false}
              scheme="dark"
              color="#FFFFFF"
              disabled={alreadyApproved}
            />
              </View>
              {onLeave && (
                <View style={styles.actionCell}>
                  <GlassButton
                    title={t('common.leave')}
                    onPress={onLeave}
                    prominent={false}
                    scheme="dark"
                    color={LIGHT_RED}
                  />
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  head: { alignItems: 'center', gap: spacing.md },
  title: { ...typography.largeTitle, color: '#FFFFFF', textAlign: 'center' },

  body: { gap: spacing.md },
  // Shadow lives on the wrapper: overflow:hidden on the card itself would clip it.
  heroWrap: {
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  hero: {
    width: '100%',
    aspectRatio: 0.95,
    maxHeight: 420,
    alignSelf: 'center',
    borderRadius: borderRadius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  nameBlock: { gap: spacing.sm },
  name: { ...typography.title1, color: '#FFFFFF' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { ...typography.footnote, fontWeight: '500', color: '#FFFFFF' },

  agreed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    paddingStart: 6,
    paddingEnd: 14,
    paddingVertical: 6,
  },
  avatars: { flexDirection: 'row' },
  avatarRing: { borderRadius: 16, borderWidth: 2, borderColor: 'rgba(0,0,0,0.35)' },
  avatarOverlap: { marginStart: -8 },
  agreedText: { ...typography.subheadline, fontWeight: '600', color: '#FFFFFF' },

  vote: { padding: spacing.md, gap: spacing.sm },
  voteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  voteTitle: { ...typography.headline, color: '#FFFFFF' },
  voteCount: { ...typography.subheadline, fontWeight: '600', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  voteHint: { ...typography.footnote, color: 'rgba(255,255,255,0.75)' },
  voteChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  voteChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5 },
  voteChipText: { ...typography.footnote, color: '#FFFFFF', maxWidth: 160 },

  actions: { gap: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionCell: { flex: 1 },
});
