import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MatchAnimation } from '../../src/components/MatchAnimation';
import { FingerChooser } from '../../src/components/FingerChooser';
import { Avatar } from '../../src/components/ui/Avatar';
import { Glass } from '../../src/components/ui/Glass';
import { HomeMosaic } from '../../src/components/HomeMosaic';

// Glass tints, as on the create flow: resting white, chosen orange
const RESTING_TINT = 'rgba(255, 255, 255, 0.6)';
const ORANGE_SOFT = 'rgba(255, 107, 53, 0.22)';
const ORANGE_ON = 'rgba(255, 107, 53, 0.9)';
import { useSessionStore } from '../../src/store/sessionStore';
import { useUserStore } from '../../src/store/userStore';
import { getFirebaseUid, isFirebaseConfigured } from '../../src/services/firebase';
import { useParticipantNoticeAlert } from '../../src/hooks/useParticipantNoticeAlert';
import { openRestaurantLink } from '../../src/utils/openRestaurantLink';
import { useTranslation } from '../../src/i18n/t';
import { colors } from '../../src/theme/colors';
import { typography, fontFamilies } from '../../src/theme/typography';
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
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState<string | null>(null);

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

  // Picker helpers: the most common cuisines as quick filters, plus search by name / cuisine
  const cuisines = useMemo(() => {
    const count = new Map<string, number>();
    for (const r of restaurants) if (r.cuisine) count.set(r.cuisine, (count.get(r.cuisine) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c]) => c);
  }, [restaurants]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants.filter(
      (r) =>
        (!cuisine || r.cuisine === cuisine) &&
        (!q || r.name.toLowerCase().includes(q) || r.cuisine?.toLowerCase().includes(q)),
    );
  }, [restaurants, query, cuisine]);

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
          {/* Tonight's places drifting under a pale veil — something for the glass to refract */}
          <HomeMosaic photos={restaurants.map((r) => r.image)} heightRatio={1} tone="light" />
          <View style={styles.topBar}>
            <Pressable onPress={handleLeave} hitSlop={12}>
              <Text style={styles.leaveText}>{t('common.leave')}</Text>
            </Pressable>
            <Glass radius={borderRadius.full} tint={ORANGE_SOFT} style={styles.codePill}>
              <Text style={styles.codeValue}>{session.code}</Text>
            </Glass>
          </View>

          {showPicker ? (
            <>
              <Text style={styles.title}>{t('finger.pickTitle')}</Text>
              <Text style={styles.subtitle}>{t('finger.pickSub')}</Text>
              <Glass radius={borderRadius.full} tint={RESTING_TINT} style={styles.search}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('finger.searchPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  autoCorrect={false}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
              </Glass>
              {cuisines.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsBar}>
                  {cuisines.map((c) => {
                    const on = cuisine === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setCuisine(on ? null : c);
                        }}
                      >
                        <Glass radius={borderRadius.full} interactive tint={on ? ORANGE_ON : RESTING_TINT} style={styles.chip}>
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{c}</Text>
                        </Glass>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
              {/* Compact rows: more places per screen, quicker to scan than big tiles */}
              <FlatList
                data={visible}
                keyExtractor={(r) => r.id}
                contentContainerStyle={styles.list}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={styles.empty}>{t('finger.noResults')}</Text>}
                renderItem={({ item }) => {
                  const selected = item.id === myPickId;
                  return (
                    <Pressable onPress={() => handlePick(item)}>
                      <Glass
                        radius={borderRadius.lg}
                        interactive
                        tint={selected ? ORANGE_SOFT : RESTING_TINT}
                        style={styles.row}
                      >
                      <Image source={{ uri: item.image }} style={styles.rowPhoto} contentFit="cover" cachePolicy="memory-disk" />
                      <View style={styles.rowText}>
                        <Text style={styles.tileName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.tileMeta} numberOfLines={1}>
                          {[item.cuisine, `★ ${item.rating}`, item.deliveryTime].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      )}
                      </Glass>
                    </Pressable>
                  );
                }}
              />
            </>
          ) : (
            <View style={styles.waiting}>
              {/* Progress and what happens next — so the wait is understandable */}
              <Text style={styles.waitTitle}>
                {allPicked ? t('finger.putFingersGuest', { name: hostName }) : t('finger.waitingTitle')}
              </Text>
              <Text style={styles.waitProgress}>
                {t('finger.progress', { done: users.filter((u) => !!picksMap[u.id]).length, total: users.length })}
              </Text>
              {!allPicked ? <Text style={styles.waitNext}>{t('finger.nextStep', { name: hostName })}</Text> : null}

              <ScrollView contentContainerStyle={styles.players} showsVerticalScrollIndicator={false}>
                {users.map((u) => {
                  const pick = restaurants.find((r) => r.id === picksMap[u.id]);
                  const isMe = u.id === participantId;
                  return (
                    <Glass key={u.id} radius={borderRadius.lg} tint={RESTING_TINT} style={[styles.playerCard, !pick && styles.playerCardPending]}>
                      {pick ? (
                        <Image source={{ uri: pick.image }} style={styles.playerPhoto} contentFit="cover" cachePolicy="memory-disk" />
                      ) : (
                        <View style={[styles.playerPhoto, styles.playerPhotoPending]}>
                          <Ionicons name="hourglass-outline" size={22} color={colors.textMuted} />
                        </View>
                      )}
                      <View style={styles.playerText}>
                        <View style={styles.playerHead}>
                          <Avatar name={u.name} color={u.avatar} size={22} />
                          <Text style={styles.playerName} numberOfLines={1}>
                            {u.name}
                            {isMe ? t('match.youSuffix') : ''}
                          </Text>
                        </View>
                        <Text style={pick ? styles.playerPick : styles.playerChoosing} numberOfLines={1}>
                          {pick ? pick.name : t('finger.choosing')}
                        </Text>
                      </View>
                      {pick ? <Ionicons name="checkmark-circle" size={24} color={colors.accentDark} /> : null}
                    </Glass>
                  );
                })}
              </ScrollView>

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
  codePill: { paddingHorizontal: 12, paddingVertical: 6 },
  codeValue: { ...typography.subheadline, fontWeight: '700', color: colors.primaryDark, letterSpacing: 2 },
  title: { ...typography.largeTitle, color: colors.text, marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text, paddingVertical: 0 },
  // flexShrink 0: the list below squeezed the bar and clipped the chips
  chipsBar: { flexGrow: 0, flexShrink: 0, height: 48, marginTop: spacing.sm },
  chipsBarContent: { alignItems: 'center' },
  chips: { gap: 8, paddingVertical: 4, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { ...typography.subheadline, color: colors.text, fontWeight: '600' },
  chipTextOn: { color: '#FFFFFF' },
  list: { paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: 8,
  },
  rowPhoto: { width: 56, height: 56, borderRadius: 12 },
  rowText: { flex: 1, gap: 2 },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  tileName: { ...typography.headline, color: colors.text },
  tileMeta: { ...typography.footnote, color: colors.textSecondary },
  waiting: { flex: 1, paddingTop: spacing.xl },
  waitTitle: {
    fontFamily: fontFamilies.rounded,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: colors.text,
  },
  waitProgress: { ...typography.title2, color: colors.primary, marginTop: spacing.xs, fontVariant: ['tabular-nums'] },
  waitNext: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  players: { paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: 10,
  },
  playerCardPending: { opacity: 0.75 },
  playerPhoto: { width: 60, height: 60, borderRadius: 14 },
  playerPhotoPending: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border },
  playerText: { flex: 1, gap: 4 },
  playerHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  playerName: { ...typography.subheadline, color: colors.textSecondary, fontWeight: '600', flexShrink: 1 },
  playerPick: { ...typography.headline, color: colors.text },
  playerChoosing: { ...typography.headline, color: colors.textMuted },
  changeBtn: { alignSelf: 'center', marginTop: spacing.xl },
  changeText: { ...typography.body, color: colors.primaryDark, fontWeight: '600' },
});
