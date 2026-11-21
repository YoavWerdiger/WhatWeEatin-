import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { Animated,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CardStack, CardStackRef } from '../../src/components/CardStack';
import { Timer } from '../../src/components/Timer';
import { UserList } from '../../src/components/UserList';
import { MatchAnimation } from '../../src/components/MatchAnimation';
import { RoundCountdown } from '../../src/components/RoundCountdown';
import { GlassButton, GlassCircleButton } from '../../src/components/native/GlassButton';
import { Glass } from '../../src/components/ui/Glass';
import { Restaurant, VoteType } from '../../src/types';
import { useSessionStore } from '../../src/store/sessionStore';
import { useUserStore } from '../../src/store/userStore';
import { getFirebaseUid } from '../../src/services/firebase';
import { colors } from '../../src/theme/colors';
import { typography, fontFamilies } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { getMutualPositiveRestaurants } from '../../src/utils/matching';
import { openRestaurantLink } from '../../src/utils/openRestaurantLink';
import { useParticipantNoticeAlert } from '../../src/hooks/useParticipantNoticeAlert';
import { useTranslation } from '../../src/i18n/t';

function shuffleRestaurants(items: Restaurant[]): Restaurant[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

export default function SwipeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const cardStackRef = useRef<CardStackRef>(null);
  const firebaseUid = useSessionStore((s) => s.firebaseUid);
  const {
    session,
    currentCardIndex,
    matchResult,
    isTimerRunning,
    timeRemaining,
    castVote,
    nextCard,
    checkForMatch,
    confirmMutualMatch,
    approveKeepBrowsing,
    finalizeKeepBrowsingIfComplete,
    triggerAIDecision,
    tickTimer,
    leaveSession,
  } = useSessionStore();

  const rawParticipantId = getFirebaseUid() ?? firebaseUid ?? user.id;
  const participantId =
    session?.users.find((u) => u.id === rawParticipantId)?.id ??
    session?.users.find(
      (u) => u.id === firebaseUid || u.id === user.id,
    )?.id ??
    rawParticipantId;

  useParticipantNoticeAlert();

  const [duelState, setDuelState] = useState<{
    champion: Restaurant;
    queue: Restaurant[];
  } | null>(null);

  const [displayedMatch, setDisplayedMatch] = useState(matchResult);
  const [matchExiting, setMatchExiting] = useState(false);
  // Count the round in only when arriving at its first card.
  const [showCountdown, setShowCountdown] = useState(
    () => useSessionStore.getState().currentCardIndex === 0 && !matchResult,
  );
  const endCountdown = useCallback(() => setShowCountdown(false), []);
  const chromeOpacity = useRef(new Animated.Value(matchResult ? 0 : 1)).current;

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (session?.status === 'waiting') {
      router.replace('/session/lobby');
    }
  }, [session?.status, router]);

  useEffect(() => {
    if (!session) {
      router.replace('/');
      return;
    }
    if (session.gameMode === 'finger' && session.status === 'swiping') {
      router.replace('/session/finger');
      return;
    }
    if (
      session.gameMode === 'roulette' &&
      (session.status === 'swiping' ||
        session.status === 'matched' ||
        session.status === 'expired')
    ) {
      router.replace('/session/roulette');
    }
  }, [session, router]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(tickTimer, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  useEffect(() => {
    if (matchResult) {
      setDisplayedMatch(matchResult);
      setMatchExiting(false);
      Animated.timing(chromeOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else if (displayedMatch) {
      setMatchExiting(true);
      Animated.timing(chromeOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [matchResult]);

  /** When another player’s votes sync from Firestore, re-evaluate match without waiting for local swipe. */
  useEffect(() => {
    const s = useSessionStore.getState().session;
    if (!s || s.status !== 'swiping') return;
    useSessionStore.getState().checkForMatch();
  }, [session?.votes, session?.status]);

  useEffect(() => {
    finalizeKeepBrowsingIfComplete();
  }, [
    session?.keepBrowsingApprovedBy,
    session?.status,
    session?.users,
    matchResult,
    finalizeKeepBrowsingIfComplete,
  ]);

  const mutualPicks = useMemo(() => {
    if (!session) return [];
    return getMutualPositiveRestaurants(
      session.restaurants,
      session.votes,
      session.users,
    );
  }, [session?.restaurants, session?.votes, session?.users]);

  const duelTotalBattles =
    mutualPicks.length >= 2 ? mutualPicks.length - 1 : 0;

  const startDuel = useCallback(() => {
    if (mutualPicks.length < 2) return;
    const shuffled = shuffleRestaurants(mutualPicks);
    const [champion, ...queue] = shuffled;
    if (!champion) return;
    setDuelState({ champion, queue });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [mutualPicks]);

  const pickDuelWinner = useCallback(
    (side: 'champion' | 'challenger') => {
      if (!duelState) return;
      const challenger = duelState.queue[0];
      if (!challenger) return;

      const nextChampion =
        side === 'champion' ? duelState.champion : challenger;
      const nextQueue = duelState.queue.slice(1);

      if (nextQueue.length === 0) {
        confirmMutualMatch(nextChampion);
        setDuelState(null);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setDuelState({ champion: nextChampion, queue: nextQueue });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    [duelState, confirmMutualMatch],
  );

  const cancelDuel = useCallback(() => {
    setDuelState(null);
  }, []);

  const handleSwipe = useCallback(
    (restaurant: Restaurant, direction: VoteType) => {
      castVote(participantId, restaurant.id, direction);
      nextCard(participantId);
      const match = checkForMatch();
      if (match) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    [participantId, castVote, nextCard, checkForMatch],
  );

  const handleAIDecision = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const result = triggerAIDecision();
    if (!result) {
      Alert.alert(t('swipe.aiTitle'), t('swipe.finishedSubtitle'));
    }
  };

  const handleMatchContinue = () => {
    approveKeepBrowsing(participantId);
  };

  const handleOrderNow = () => {
    const restaurant = matchResult?.restaurant;
    if (restaurant?.externalUrl) {
      void openRestaurantLink(restaurant.externalUrl, restaurant.source);
      return;
    }
    Alert.alert(
      t('swipe.orderTitle'),
      t('swipe.orderBody', { name: restaurant?.name ?? '' }),
      [{ text: t('common.ok') }],
    );
  };

  const handleLeave = () => {
    leaveSession(participantId);
    router.replace('/');
  };

  if (!session) {
    return null;
  }

  const isFinished = currentCardIndex >= session.restaurants.length;
  const chromeHidden = !!displayedMatch && !matchExiting;
  const hasBackdrop = !isFinished && !!session.restaurants[currentCardIndex]?.image;

  return (
    <View style={styles.root}>
      {/* Backdrop — same recipe as the match screen: the current photo, lightly blurred, under a dark gradient */}
      {hasBackdrop ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ExpoImage
            source={{ uri: session.restaurants[currentCardIndex].image }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={14}
            cachePolicy="memory-disk"
            transition={300}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.85)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : null}
      {/* Native nav bar — system Liquid Glass on iOS 26; hidden under the match overlay */}
      <Stack.Screen
        options={{
          headerTitle: () => (chromeHidden ? null : <UserList users={session.users} compact light={hasBackdrop} />),
        }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('common.leave')}
          onPress={handleLeave}
          hidden={chromeHidden}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidden={chromeHidden}>
          <View style={styles.headerEnd}>
            {session.timerDuration > 0 && (
              <Timer timeRemaining={timeRemaining} totalTime={session.timerDuration} compact />
            )}
            <Text style={[styles.counterText, hasBackdrop && styles.textOnPhoto]}>
              {Math.min(currentCardIndex + 1, session.restaurants.length)}
              <Text style={[styles.counterTotal, hasBackdrop && styles.textOnPhotoMuted]}>/{session.restaurants.length}</Text>
            </Text>
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <View style={[styles.container, { paddingTop: insets.top + 44, paddingBottom: insets.bottom + 100 }]}>
        <View style={styles.cardArea}>
          {isFinished ? (
            <ScrollView
              style={styles.finishedScroll}
              contentContainerStyle={styles.finishedContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.finishedBadge}>
                <Ionicons name="flag" size={30} color="#FFFFFF" />
              </View>
              <Text style={styles.finishedTitle}>{t('swipe.finishedTitle')}</Text>
              <Text style={styles.finishedSubtitle}>{t('swipe.finishedSubtitle')}</Text>

              {mutualPicks.length > 0 && (
                <View style={styles.shortlistSection}>
                  {duelState ? (
                    <>
                      <Text style={styles.duelKicker}>Round 2</Text>
                      <Text style={styles.duelTitle}>Who stays?</Text>
                      <Text style={styles.duelRound}>
                        Match {duelTotalBattles - duelState.queue.length + 1} of {duelTotalBattles}
                      </Text>

                      <View style={styles.duelRow}>
                        <DuelCard
                          restaurant={duelState.champion}
                          label={t('swipe.champion')}
                          onPress={() => pickDuelWinner('champion')}
                        />
                        <Glass radius={22} style={styles.vsBubble}>
                          <Text style={styles.vsGlyph}>VS</Text>
                        </Glass>
                        <DuelCard
                          restaurant={duelState.queue[0]}
                          label={t('swipe.challenger')}
                          onPress={() => pickDuelWinner('challenger')}
                        />
                      </View>

                      <Pressable onPress={cancelDuel} hitSlop={8} style={styles.duelCancel}>
                        <Text style={styles.duelCancelText}>{t('swipe.duelCancel')}</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      {mutualPicks.length > 1 ? (
                        <>
                          <Text style={styles.shortlistTitleBold}>{t('swipe.pickyTitle')}</Text>
                          <Text style={styles.shortlistSubtitle}>
                            {t('swipe.pickySub', { count: mutualPicks.length })}
                          </Text>
                          <GlassButton title={t('swipe.duelCtaTitle')} onPress={startDuel} />
                          <Text style={styles.duelCtaHint}>{t('swipe.duelCtaHint')}</Text>
                          <Text style={styles.orDivider}>{t('swipe.orList')}</Text>
                        </>
                      ) : (
                        <Text style={styles.shortlistTitle}>{t('swipe.oneOverlap')}</Text>
                      )}

                      <View style={styles.shortlistList}>
                        {mutualPicks.map((r, i) => (
                          <View key={r.id}>
                            <Pressable
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                confirmMutualMatch(r);
                              }}
                              accessibilityRole="button"
                            >
                              <Glass radius={borderRadius.lg} interactive style={styles.shortlistRow}>
                                <Image source={{ uri: r.image }} style={styles.shortlistThumb} />
                                <View style={styles.shortlistText}>
                                  <Text style={styles.shortlistName} numberOfLines={1}>{r.name}</Text>
                                  <Text style={styles.shortlistMeta} numberOfLines={1}>{r.cuisine}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                              </Glass>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              )}

              <Pressable onPress={handleAIDecision} accessibilityRole="button" style={styles.aiWrap}>
                <Glass radius={borderRadius.lg} interactive style={styles.aiCard}>
                  <View style={styles.aiIcon}>
                    <Ionicons name="dice" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.shortlistText}>
                    <Text style={styles.aiText}>{t('swipe.aiTitle')}</Text>
                    <Text style={styles.aiHint}>{t('swipe.aiHint')}</Text>
                  </View>
                </Glass>
              </Pressable>
            </ScrollView>
          ) : (
            // Hidden (not unmounted) under a match, so keep browsing resumes in place.
            <View style={[styles.deck, displayedMatch && styles.deckHidden]} pointerEvents={displayedMatch ? 'none' : 'auto'}>
              <CardStack
                ref={cardStackRef}
                restaurants={session.restaurants}
                currentIndex={currentCardIndex}
                onSwipe={handleSwipe}
              />
            </View>
          )}
        </View>

      </View>

      {/* Game controls float above the deck: big pass / like, small "decide for us" */}
      {!isFinished && !chromeHidden && (
        <View
          pointerEvents="box-none"
          style={[styles.gameControls, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
        >
          <GlassCircleButton
            systemImage="xmark"
            size={76}
            prominent
            color={colors.danger}
            iconColor="#FFFFFF"
            accessibilityLabel={t('swipeActions.pass')}
            onPress={() => cardStackRef.current?.swipeLeft()}
          />
          <GlassCircleButton
            systemImage="dice"
            size={56}
            iconColor={colors.textSecondary}
            accessibilityLabel={t('swipe.aiSmall')}
            onPress={handleAIDecision}
          />
          <GlassCircleButton
            systemImage="heart.fill"
            size={76}
            prominent
            color={colors.accentDark}
            iconColor="#FFFFFF"
            accessibilityLabel={t('swipeActions.like')}
            onPress={() => cardStackRef.current?.swipeRight()}
          />
        </View>
      )}

      {showCountdown && !displayedMatch && (
        <RoundCountdown goLabel={t('swipe.go')} onDone={endCountdown} />
      )}

      {displayedMatch && (
        <MatchAnimation
          result={displayedMatch}
          onContinue={handleMatchContinue}
          onOrderNow={handleOrderNow}
          onLeave={handleLeave}
          requireUnanimousKeepBrowsing={session.requireUnanimousKeepBrowsing}
          sessionUsers={session.users}
          keepBrowsingApprovedBy={session.keepBrowsingApprovedBy ?? []}
          currentUserId={participantId}
          exiting={matchExiting}
          onExitComplete={() => {
            setDisplayedMatch(null);
            setMatchExiting(false);
          }}
        />
      )}
    </View>
  );
}

/** One side of the duel: the photo up top, glass below. */
function DuelCard({
  restaurant,
  label,
  onPress,
}: {
  restaurant: Restaurant | undefined;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!restaurant} style={styles.duelCell} accessibilityRole="button">
      <Glass radius={borderRadius.lg} interactive style={styles.duelCard}>
        {restaurant?.image ? <Image source={{ uri: restaurant.image }} style={styles.duelPhoto} /> : null}
        <View style={styles.duelBody}>
          <Text style={styles.duelVs}>{label}</Text>
          <Text style={styles.duelName} numberOfLines={2}>{restaurant?.name ?? '—'}</Text>
          <Text style={styles.duelCuisine} numberOfLines={1}>{restaurant?.cuisine ?? ''}</Text>
        </View>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // flex:1 keeps the hidden deck in place under a match; center so the card sits mid-area, not at the top
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deckHidden: { opacity: 0 },
  gameControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingTop: spacing.sm,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  textOnPhoto: { color: '#FFFFFF' },
  textOnPhotoMuted: { color: 'rgba(255,255,255,0.6)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  closeIcon: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cardCounter: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    ...shadows.sm,
  },
  headerEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  counterText: {
    ...typography.subheadline,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: colors.text,
  },
  counterTotal: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 2,
    alignItems: 'center',
  },

  finishedScroll: { flex: 1, alignSelf: 'stretch' },
  finishedContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  finishedBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishedTitle: { ...typography.largeTitle, color: colors.text, textAlign: 'center' },
  finishedSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  shortlistSection: { alignSelf: 'stretch', gap: 12, marginTop: spacing.sm },
  shortlistTitleBold: { ...typography.title2, color: colors.text, textAlign: 'center' },
  shortlistSubtitle: { ...typography.subheadline, color: colors.textSecondary, textAlign: 'center' },
  shortlistTitle: { ...typography.headline, color: colors.text, textAlign: 'center' },
  duelCtaHint: { ...typography.footnote, color: colors.textSecondary, textAlign: 'center' },
  orDivider: { ...typography.footnote, color: colors.textMuted, textAlign: 'center' },
  shortlistList: { gap: spacing.sm },
  shortlistRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  shortlistThumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: colors.borderLight },
  shortlistText: { flex: 1, gap: 2 },
  shortlistName: { ...typography.headline, color: colors.text },
  shortlistMeta: { ...typography.subheadline, color: colors.textSecondary },

  duelKicker: { ...typography.footnote, fontWeight: '600', color: colors.primaryDark, textAlign: 'center' },
  duelTitle: { ...typography.title1, color: colors.text, textAlign: 'center' },
  duelRound: { ...typography.footnote, color: colors.textMuted, textAlign: 'center' },
  duelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  duelCell: { flex: 1 },
  duelCard: { overflow: 'hidden' },
  duelPhoto: { width: '100%', aspectRatio: 1.2, backgroundColor: colors.borderLight },
  duelBody: { padding: 12, gap: 2 },
  duelVs: { ...typography.caption1, fontWeight: '600', color: colors.textSecondary },
  duelName: { ...typography.headline, color: colors.text },
  duelCuisine: { ...typography.footnote, color: colors.textSecondary },
  vsBubble: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  vsGlyph: { ...typography.footnote, fontWeight: '700', color: colors.text },
  duelCancel: { alignSelf: 'center', paddingVertical: spacing.sm },
  duelCancelText: { ...typography.subheadline, color: colors.textSecondary },

  aiWrap: { alignSelf: 'stretch', marginTop: spacing.sm },
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiText: { ...typography.headline, color: colors.text },
  aiHint: { ...typography.footnote, color: colors.textSecondary },

  aiSmall: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  aiSmallText: {
    ...typography.captionMedium,
    color: colors.textMuted,
  },
});
