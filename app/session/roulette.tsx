import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MatchAnimation } from '../../src/components/MatchAnimation';
import { RouletteMap, hasCoords, MIN_MAP_PINS } from '../../src/components/RouletteMap';
import { Button } from '../../src/components/ui/Button';
import { useSessionStore } from '../../src/store/sessionStore';
import { useUserStore } from '../../src/store/userStore';
import { getFirebaseUid, isFirebaseConfigured } from '../../src/services/firebase';
import { useParticipantNoticeAlert } from '../../src/hooks/useParticipantNoticeAlert';
import { openRestaurantLink } from '../../src/utils/openRestaurantLink';
import { useTranslation } from '../../src/i18n/t';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { Restaurant } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT = 88;
const VISIBLE_ROWS = 5;
const REEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const REEL_LOOPS = 8;

function buildReel(restaurants: Restaurant[]): Restaurant[] {
  if (restaurants.length === 0) return [];
  const out: Restaurant[] = [];
  for (let i = 0; i < REEL_LOOPS; i++) {
    out.push(...restaurants);
  }
  return out;
}

export default function RouletteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUserStore();
  const firebaseUid = useSessionStore((s) => s.firebaseUid);
  const {
    session,
    matchResult,
    spinRoulette,
    confirmRouletteMatch,
    approveKeepBrowsing,
    finalizeKeepBrowsingIfComplete,
    leaveSession,
  } = useSessionStore();

  useParticipantNoticeAlert();

  const [displayedMatch, setDisplayedMatch] = useState(matchResult);
  const [matchExiting, setMatchExiting] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [landed, setLanded] = useState<Restaurant | null>(null);
  const reelOffset = useRef(new Animated.Value(0)).current;
  const lastSpunAt = useRef<number | null>(null);

  const myUid = getFirebaseUid() ?? firebaseUid ?? user.id;
  const participantId =
    session?.users.find((u) => u.id === myUid)?.id ??
    session?.users.find((u) => u.id === firebaseUid || u.id === user.id)?.id ??
    myUid;

  const isHost =
    !isFirebaseConfigured() || (myUid != null && session?.hostId === myUid);

  const restaurants = session?.restaurants ?? [];
  const reelItems = useMemo(() => buildReel(restaurants), [restaurants]);
  // Map roulette: restaurants with a real venue position (Wolt / Google); too few → the reel
  const mapRestaurants = useMemo(() => restaurants.filter(hasCoords), [restaurants]);
  const useMap = mapRestaurants.length >= MIN_MAP_PINS;
  const [mapSpin, setMapSpin] = useState<{ winnerId: string; token: number } | null>(null);
  const mapDoneRef = useRef<(() => void) | null>(null);

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
    if (session.gameMode !== 'roulette' && session.status === 'swiping') {
      router.replace('/session/swipe');
    }
  }, [session, router]);

  useEffect(() => {
    if (matchResult) {
      setDisplayedMatch(matchResult);
      setMatchExiting(false);
    } else if (displayedMatch) {
      setMatchExiting(true);
      setLanded(null);
    }
  }, [matchResult]);

  useEffect(() => {
    finalizeKeepBrowsingIfComplete();
  }, [
    session?.keepBrowsingApprovedBy,
    session?.status,
    session?.users,
    matchResult,
    finalizeKeepBrowsingIfComplete,
  ]);

  const runSpinAnimation = useCallback(
    (winner: Restaurant, onDone?: () => void) => {
      if (restaurants.length === 0 || reelItems.length === 0) return;

      const deckIndex = restaurants.findIndex((r) => r.id === winner.id);
      if (deckIndex < 0) return;

      setIsSpinning(true);
      setLanded(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Map: the sweep between pins lands on the winner (RouletteMap → handleMapLanded)
      if (useMap && hasCoords(winner)) {
        mapDoneRef.current = () => {
          setIsSpinning(false);
          setLanded(winner);
          onDone?.();
        };
        setMapSpin({ winnerId: winner.id, token: Date.now() });
        return;
      }

      const centerPad = Math.floor(VISIBLE_ROWS / 2);
      const targetLoop = REEL_LOOPS - 2;
      const targetIndex = targetLoop * restaurants.length + deckIndex;
      const targetOffset = -(targetIndex - centerPad) * ITEM_HEIGHT;

      reelOffset.setValue(0);
      Animated.timing(reelOffset, {
        toValue: targetOffset,
        duration: 3200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setIsSpinning(false);
        setLanded(winner);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onDone?.();
      });
    },
    [restaurants, reelItems.length, reelOffset, useMap],
  );

  const handleMapLanded = useCallback(() => {
    const done = mapDoneRef.current;
    mapDoneRef.current = null;
    done?.();
  }, []);

  /** Host spin or guest watching a synced result. */
  useEffect(() => {
    const result = session?.rouletteResult;
    if (!result || !session || matchResult) return;
    if (lastSpunAt.current === result.spunAt) return;

    const winner = session.restaurants.find((r) => r.id === result.restaurantId);
    if (!winner) return;

    lastSpunAt.current = result.spunAt;
    runSpinAnimation(winner, () => {
      // Host locks the match after the reel lands; guests wait for Firebase.
      const uid = getFirebaseUid() ?? firebaseUid;
      const hostOk =
        !isFirebaseConfigured() || !uid || uid === session.hostId;
      if (hostOk) {
        confirmRouletteMatch();
      }
    });
  }, [
    session?.rouletteResult?.spunAt,
    session?.rouletteResult?.restaurantId,
    matchResult,
    runSpinAnimation,
    confirmRouletteMatch,
    firebaseUid,
  ]);

  const handleSpin = () => {
    if (!isHost || isSpinning || matchResult) return;
    spinRoulette();
  };

  const handleLeave = () => {
    leaveSession(participantId);
    router.replace('/');
  };

  const handleKeepBrowsing = () => {
    approveKeepBrowsing(participantId);
  };

  const handleOrderNow = () => {
    const restaurant = displayedMatch?.restaurant;
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

  const handleMatchExitComplete = () => {
    setDisplayedMatch(null);
    setMatchExiting(false);
    lastSpunAt.current = null;
  };

  if (!session) return null;

  return (
    <View style={styles.root}>
      {/* Full-screen map behind everything; header and button float on top */}
      {useMap && (
        <View style={StyleSheet.absoluteFill}>
          <RouletteMap
            restaurants={mapRestaurants}
            spin={mapSpin}
            onLanded={handleMapLanded}
            mapPadding={{ top: 170, right: 0, bottom: 140, left: 0 }}
          />
          {/* Soft fades so the title and button read over the map */}
          <LinearGradient
            colors={[colors.background, 'rgba(242,242,247,0)']}
            style={[styles.mapFade, { top: 0, height: 230 }]}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(242,242,247,0)', colors.background]}
            style={[styles.mapFade, { bottom: 0, height: 180 }]}
            pointerEvents="none"
          />
        </View>
      )}
    <SafeAreaView style={[styles.container, useMap && styles.containerOverMap]} pointerEvents="box-none">
      <View style={styles.content} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleLeave} hitSlop={12}>
            <Text style={styles.leaveText}>{t('common.leave')}</Text>
          </TouchableOpacity>
          <View style={styles.codePill}>
            <Text style={styles.codeValue}>{session.code}</Text>
          </View>
        </View>

        <Text style={styles.title}>{t('roulette.title')}</Text>
        <Text style={styles.subtitle}>{t('roulette.subtitle')}</Text>

        {useMap ? (
          <View style={styles.mapSpacer} pointerEvents="none" />
        ) : (
        <View style={styles.reelFrame}>
          <View style={styles.reelWindow} pointerEvents="none">
            <Animated.View
              style={{
                transform: [{ translateY: reelOffset }],
              }}
            >
              {reelItems.map((r, i) => (
                <View key={`${r.id}-${i}`} style={styles.reelItem}>
                  <Image source={{ uri: r.image }} style={styles.reelThumb} />
                  <View style={styles.reelTextCol}>
                    <Text style={styles.reelName} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={styles.reelMeta} numberOfLines={1}>
                      {r.cuisine} · ★ {r.rating}
                    </Text>
                  </View>
                </View>
              ))}
            </Animated.View>
          </View>
          <View style={styles.reelPointer} pointerEvents="none" />
        </View>
        )}

        {landed && !matchResult && (
          <Text style={styles.landedText}>
            {t('roulette.landed', { name: landed.name })}
          </Text>
        )}

        <View style={styles.footer}>
          {isHost ? (
            <Button
              title={
                isSpinning
                  ? t('roulette.spinning')
                  : t('roulette.spin')
              }
              onPress={handleSpin}
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSpinning || !!matchResult || restaurants.length === 0}
            />
          ) : (
            <Text style={styles.guestHint}>
              {isSpinning
                ? t('roulette.spinning')
                : t('roulette.waitingHost')}
            </Text>
          )}
        </View>
      </View>

      {displayedMatch && (
        <MatchAnimation
          result={displayedMatch}
          onContinue={handleKeepBrowsing}
          onOrderNow={handleOrderNow}
          onLeave={handleLeave}
          requireUnanimousKeepBrowsing={session.requireUnanimousKeepBrowsing}
          sessionUsers={session.users}
          keepBrowsingApprovedBy={session.keepBrowsingApprovedBy}
          currentUserId={participantId}
          exiting={matchExiting}
          onExitComplete={handleMatchExitComplete}
        />
      )}
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  containerOverMap: { backgroundColor: 'transparent' },
  mapSpacer: { flex: 1 },
  mapFade: { position: 'absolute', left: 0, right: 0 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  leaveText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  codePill: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  codeValue: {
    ...typography.bodySemiBold,
    color: colors.primaryDark,
  },
  title: {
    ...typography.title1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  reelFrame: {
    alignSelf: 'center',
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: REEL_HEIGHT,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.lg,
  },
  reelWindow: {
    flex: 1,
  },
  reelItem: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  reelThumb: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.borderLight,
  },
  reelTextCol: {
    flex: 1,
    gap: 4,
  },
  reelName: {
    ...typography.callout,
    color: colors.text,
  },
  reelMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  reelPointer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2),
    height: ITEM_HEIGHT,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
  },
  landedText: {
    ...typography.bodySemiBold,
    color: colors.primaryDark,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: spacing.lg,
  },
  guestHint: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
