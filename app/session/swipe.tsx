import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { Animated,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CardStack, CardStackRef } from '../../src/components/CardStack';
import { SwipeActions } from '../../src/components/SwipeActions';
import { Timer } from '../../src/components/Timer';
import { UserList } from '../../src/components/UserList';
import { MatchAnimation } from '../../src/components/MatchAnimation';
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

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.container}>
        <Animated.View
          style={[styles.header, { opacity: chromeOpacity }]}
          pointerEvents={displayedMatch && !matchExiting ? 'none' : 'auto'}
        >

            <TouchableOpacity onPress={handleLeave} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>

            <UserList users={session.users} compact />

            <View style={styles.headerEnd}>
              {session.timerDuration > 0 && (
                <Timer
                  timeRemaining={timeRemaining}
                  totalTime={session.timerDuration}
                  compact
                />
              )}
              <View style={styles.cardCounter}>
                <Text style={styles.counterText}>
                  {Math.min(currentCardIndex + 1, session.restaurants.length)}
                  <Text style={styles.counterTotal}>/{session.restaurants.length}</Text>
                </Text>
              </View>
            </View>
                  </Animated.View>

        <View style={styles.cardArea}>
          {isFinished ? (
            <View style={styles.finishedContainer}>
              <Text style={styles.finishedEmoji}>🤔</Text>
              <Text style={styles.finishedTitle}>{t('swipe.finishedTitle')}</Text>
              <Text style={styles.finishedSubtitle}>
                {t('swipe.finishedSubtitle')}
              </Text>

              {mutualPicks.length > 0 && (
                <View style={styles.shortlistSection}>
                  {duelState ? (
                    <>
                      <Text style={styles.duelKicker}>Round 2</Text>
                      <Text style={styles.duelTitle}>Who stays?</Text>
                      <Text style={styles.duelRound}>
                        Match {duelTotalBattles - duelState.queue.length + 1} of{' '}
                        {duelTotalBattles}
                      </Text>

                      <View style={styles.duelRow}>
                        <TouchableOpacity
                          style={[styles.duelCard, styles.duelCardLeft]}
                          activeOpacity={0.88}
                          onPress={() => pickDuelWinner('champion')}
                        >
                          <Text style={styles.duelVs}>{t('swipe.champion')}</Text>
                          <Text style={styles.duelName} numberOfLines={3}>
                            {duelState.champion.name}
                          </Text>
                          <Text style={styles.duelCuisine} numberOfLines={1}>
                            {duelState.champion.cuisine}
                          </Text>
                        </TouchableOpacity>

                        <Text style={styles.vsGlyph}>VS</Text>

                        <TouchableOpacity
                          style={[styles.duelCard, styles.duelCardRight]}
                          activeOpacity={0.88}
                          onPress={() => pickDuelWinner('challenger')}
                          disabled={!duelState.queue[0]}
                        >
                          <Text style={styles.duelVs}>{t('swipe.challenger')}</Text>
                          <Text style={styles.duelName} numberOfLines={3}>
                            {duelState.queue[0]?.name ?? '—'}
                          </Text>
                          <Text style={styles.duelCuisine} numberOfLines={1}>
                            {duelState.queue[0]?.cuisine ?? ''}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.duelCancel}
                        onPress={cancelDuel}
                        hitSlop={{ top: 8, bottom: 8 }}
                      >
                        <Text style={styles.duelCancelText}>{t('swipe.duelCancel')}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      {mutualPicks.length > 1 ? (
                        <>
                          <Text style={styles.shortlistTitleBold}>
                            {t('swipe.pickyTitle')}
                          </Text>
                          <Text style={styles.shortlistSubtitle}>
                            {t('swipe.pickySub', { count: mutualPicks.length })}
                          </Text>
                          <TouchableOpacity
                            style={styles.duelCta}
                            activeOpacity={0.9}
                            onPress={startDuel}
                          >
                            <Text style={styles.duelCtaTitle}>{t('swipe.duelCtaTitle')}</Text>
                            <Text style={styles.duelCtaHint}>{t('swipe.duelCtaHint')}</Text>
                          </TouchableOpacity>
                          <Text style={styles.orDivider}>{t('swipe.orList')}</Text>
                        </>
                      ) : (
                        <Text style={styles.shortlistTitle}>
                          {t('swipe.oneOverlap')}
                        </Text>
                      )}

                      <ScrollView
                        style={styles.shortlistScroll}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                      >
                        {mutualPicks.map((r) => (
                          <TouchableOpacity
                            key={r.id}
                            style={styles.shortlistRow}
                            activeOpacity={0.85}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              confirmMutualMatch(r);
                            }}
                          >
                            <Text style={styles.shortlistName} numberOfLines={1}>
                              {r.name}
                            </Text>
                            <Text style={styles.shortlistMeta} numberOfLines={1}>
                              {r.cuisine}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.aiButton} onPress={handleAIDecision}>
                <Text style={styles.aiEmoji}>🤷</Text>
                <Text style={styles.aiText}>{t('swipe.aiTitle')}</Text>
                <Text style={styles.aiHint}>{t('swipe.aiHint')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CardStack
              ref={cardStackRef}
              restaurants={session.restaurants}
              currentIndex={currentCardIndex}
              onSwipe={handleSwipe}
            />
          )}
        </View>

        {!isFinished && (
          <Animated.View
            style={[styles.bottomSection, { opacity: chromeOpacity }]}
            pointerEvents={displayedMatch && !matchExiting ? 'none' : 'auto'}
          >

            <SwipeActions
              onDislike={() => cardStackRef.current?.swipeLeft()}
              onLike={() => cardStackRef.current?.swipeRight()}
            />

            <TouchableOpacity style={styles.aiSmall} onPress={handleAIDecision}>
              <Text style={styles.aiSmallText}>{t('swipe.aiSmall')}</Text>
            </TouchableOpacity>
                    </Animated.View>
        )}
      </SafeAreaView>

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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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

  finishedContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  finishedEmoji: { fontSize: 64 },
  finishedTitle: { ...typography.title, color: colors.text },
  finishedSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  shortlistSection: {
    width: '100%',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  shortlistTitleBold: {
    ...typography.title2,
    color: colors.text,
    textAlign: 'center',
  },
  shortlistSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.xs,
  },
  duelCta: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    ...shadows.md,
  },
  duelCtaTitle: {
    ...typography.headline,
    color: colors.onPrimary,
  },
  duelCtaHint: {
    ...typography.caption,
    color: 'rgba(28,28,30,0.8)',
    textAlign: 'center',
  },
  orDivider: {
    ...typography.captionMedium,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  duelKicker: {
    ...typography.captionMedium,
    color: colors.superlike,
    textAlign: 'center',
  },
  duelTitle: {
    ...typography.title2,
    textAlign: 'center',
    color: colors.text,
  },
  duelRound: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  duelRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    width: '100%',
  },
  duelCard: {
    flex: 1,
    minHeight: 140,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    justifyContent: 'center',
    borderWidth: 2,
    ...shadows.sm,
  },
  duelCardLeft: {
    backgroundColor: colors.surface,
    borderColor: colors.accent + '99',
  },
  duelCardRight: {
    backgroundColor: colors.surface,
    borderColor: colors.superlike + '99',
  },
  duelVs: {
    ...typography.caption1,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  duelName: {
    ...typography.headline,
    color: colors.text,
  },
  duelCuisine: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  vsGlyph: {
    ...typography.headline,
    alignSelf: 'center',
    color: colors.textMuted,
  },
  duelCancel: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  duelCancelText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  shortlistTitle: {
    ...typography.subheadline,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  shortlistScroll: {
    maxHeight: 220,
    width: '100%',
  },
  shortlistRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  shortlistName: {
    ...typography.headline,
    color: colors.text,
  },
  shortlistMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  aiButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    width: '100%',
    ...shadows.md,
    borderWidth: 2,
    borderColor: colors.primaryMuted,
  },
  aiEmoji: { fontSize: 40 },
  aiText: { ...typography.subtitle, color: colors.text },
  aiHint: { ...typography.caption, color: colors.textMuted },

  aiSmall: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  aiSmallText: {
    ...typography.captionMedium,
    color: colors.textMuted,
  },
});
