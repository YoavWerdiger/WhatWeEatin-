import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MatchAnimation } from '../../src/components/MatchAnimation';
import { FingerChooser } from '../../src/components/FingerChooser';
import { Avatar } from '../../src/components/ui/Avatar';
import { useSessionStore } from '../../src/store/sessionStore';
import { useUserStore } from '../../src/store/userStore';
import { getFirebaseUid, isFirebaseConfigured } from '../../src/services/firebase';
import { useParticipantNoticeAlert } from '../../src/hooks/useParticipantNoticeAlert';
import { openRestaurantLink } from '../../src/utils/openRestaurantLink';
import { useTranslation } from '../../src/i18n/t';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { Restaurant } from '../../src/types';

/**
 * Finger mode: everyone picks a place on their own phone; when all have picked, the host's phone
 * becomes the finger chooser (each finger = one of the picks); the chosen one is the match for all.
 */
export default function FingerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUserStore();
  const firebaseUid = useSessionStore((s) => s.firebaseUid);
  const {
    session,
    matchResult,
    pickFingerRestaurant,
    chooseFingerWinner,
    confirmRouletteMatch,
    approveKeepBrowsing,
    finalizeKeepBrowsingIfComplete,
    leaveSession,
  } = useSessionStore();

  useParticipantNoticeAlert();

  const [displayedMatch, setDisplayedMatch] = useState(matchResult);
  const [matchExiting, setMatchExiting] = useState(false);
  const [changing, setChanging] = useState(false);

  const myUid = getFirebaseUid() ?? firebaseUid ?? user.id;
  const participantId =
    session?.users.find((u) => u.id === myUid)?.id ??
    session?.users.find((u) => u.id === firebaseUid || u.id === user.id)?.id ??
    myUid;
  const isHost = !isFirebaseConfigured() || (myUid != null && session?.hostId === myUid);
  const hostName = session?.users.find((u) => u.id === session.hostId)?.name ?? '';

  const restaurants = session?.restaurants ?? [];
  const picksMap = session?.fingerPicks ?? {};
  const myPickId = picksMap[participantId];
  const users = session?.users ?? [];
  const allPicked = users.length > 0 && users.every((u) => !!picksMap[u.id]);
  // One entry per player, in join order — each finger is dealt the next one
  const picks = useMemo(
    () =>
      users
        .map((u) => restaurants.find((r) => r.id === picksMap[u.id]))
        .filter((r): r is Restaurant => !!r),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users, restaurants, JSON.stringify(picksMap)],
  );

  useEffect(() => {
    if (session?.status === 'waiting') router.replace('/session/lobby');
  }, [session?.status, router]);

  useEffect(() => {
    if (!session) router.replace('/');
  }, [session, router]);

  useEffect(() => {
    if (matchResult) {
      setDisplayedMatch(matchResult);
      setMatchExiting(false);
    } else if (displayedMatch) {
      setMatchExiting(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchResult]);

  useEffect(() => {
    finalizeKeepBrowsingIfComplete();
  }, [session?.keepBrowsingApprovedBy, session?.status, session?.users, matchResult, finalizeKeepBrowsingIfComplete]);

  // The host's chooser already played the reveal — lock the match right away
  useEffect(() => {
    if (!session?.rouletteResult || matchResult || !isHost) return;
    confirmRouletteMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.rouletteResult?.spunAt]);

  const handlePick = (r: Restaurant) => {
    void Haptics.selectionAsync();
    pickFingerRestaurant(participantId, r.id);
    setChanging(false);
  };

  const handleChosen = useCallback(
    (restaurantId: string) => {
      chooseFingerWinner(restaurantId);
    },
    [chooseFingerWinner],
  );

  const handleLeave = () => {
    leaveSession(participantId);
    router.replace('/');
  };

  const handleOrderNow = () => {
    const restaurant = displayedMatch?.restaurant;
    if (restaurant?.externalUrl) {
      void openRestaurantLink(restaurant.externalUrl, restaurant.source);
      return;
    }
    Alert.alert(t('swipe.orderTitle'), t('swipe.orderBody', { name: restaurant?.name ?? '' }), [{ text: t('common.ok') }]);
  };

  if (!session) return null;

  const showChooser = allPicked && isHost && !displayedMatch;
  const showPicker = !myPickId || changing;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {showChooser ? (
        <FingerChooser
          picks={picks}
          title={t('finger.putFingersHost')}
          holdLabel={t('finger.holdStill')}
          onChosen={handleChosen}
        />
      ) : (
        <SafeAreaView style={styles.safe}>
          <View style={styles.topBar}>
            <Pressable onPress={handleLeave} hitSlop={12}>
              <Text style={styles.leaveText}>{t('common.leave')}</Text>
            </Pressable>
            <View style={styles.codePill}>
              <Text style={styles.codeValue}>{session.code}</Text>
            </View>
          </View>

          {showPicker ? (
            <>
              <Text style={styles.title}>{t('finger.pickTitle')}</Text>
              <Text style={styles.subtitle}>{t('finger.pickSub')}</Text>
              <FlatList
                data={restaurants}
                keyExtractor={(r) => r.id}
                numColumns={2}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.grid}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const selected = item.id === myPickId;
                  return (
                    <Pressable onPress={() => handlePick(item)} style={[styles.tile, selected && styles.tileSelected]}>
                      <Image source={{ uri: item.image }} style={styles.tilePhoto} contentFit="cover" cachePolicy="memory-disk" />
                      <View style={styles.tileInfo}>
                        <Text style={styles.tileName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.tileMeta} numberOfLines={1}>
                          {item.cuisine} · ★ {item.rating}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            </>
          ) : (
            <View style={styles.waiting}>
              <Text style={styles.title}>
                {allPicked ? t('finger.putFingersGuest', { name: hostName }) : t('finger.waitingTitle')}
              </Text>
              {/* Who has picked — with each player's choice */}
              <View style={styles.players}>
                {users.map((u) => {
                  const pick = restaurants.find((r) => r.id === picksMap[u.id]);
                  return (
                    <View key={u.id} style={styles.playerRow}>
                      <Avatar name={u.name} color={u.avatar} size={36} />
                      <Text style={styles.playerName} numberOfLines={1}>
                        {u.name}
                      </Text>
                      {pick ? (
                        <View style={styles.pickChip}>
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          <Text style={styles.pickChipText} numberOfLines={1}>
                            {pick.name}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.pendingText}>…</Text>
                      )}
                    </View>
                  );
                })}
              </View>
              {!allPicked ? (
                <Pressable onPress={() => setChanging(true)} style={styles.changeBtn} hitSlop={8}>
                  <Text style={styles.changeText}>{t('finger.change')}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </SafeAreaView>
      )}

      {displayedMatch && (
        <MatchAnimation
          result={displayedMatch}
          onContinue={() => approveKeepBrowsing(participantId)}
          onOrderNow={handleOrderNow}
          onLeave={handleLeave}
          requireUnanimousKeepBrowsing={session.requireUnanimousKeepBrowsing}
          sessionUsers={session.users}
          keepBrowsingApprovedBy={session.keepBrowsingApprovedBy}
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
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, paddingHorizontal: spacing.lg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  leaveText: { ...typography.body, color: colors.primaryDark, fontWeight: '600' },
  codePill: { backgroundColor: colors.primaryMuted, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full },
  codeValue: { ...typography.subheadline, fontWeight: '700', color: colors.primaryDark, letterSpacing: 2 },
  title: { ...typography.largeTitle, color: colors.text, marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md },
  grid: { paddingBottom: spacing.xxl, gap: spacing.sm },
  gridRow: { gap: spacing.sm },
  tile: { flex: 1, borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 3, borderColor: 'transparent' },
  tileSelected: { borderColor: colors.primary },
  tilePhoto: { width: '100%', aspectRatio: 1.2 },
  tileInfo: { padding: spacing.sm, gap: 2 },
  tileName: { ...typography.headline, color: colors.text },
  tileMeta: { ...typography.footnote, color: colors.textSecondary },
  waiting: { flex: 1 },
  players: { marginTop: spacing.lg, gap: spacing.sm },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  playerName: { ...typography.headline, color: colors.text, flexShrink: 1 },
  pickChip: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    maxWidth: 180,
  },
  pickChipText: { ...typography.footnote, color: '#FFFFFF', fontWeight: '600' },
  pendingText: { marginLeft: 'auto', ...typography.headline, color: colors.textMuted },
  changeBtn: { alignSelf: 'center', marginTop: spacing.xl },
  changeText: { ...typography.body, color: colors.primaryDark, fontWeight: '600' },
});
