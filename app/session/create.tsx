import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Share,
  ActivityIndicator,
  ScrollView,
  Switch,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  Keyframe,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, continuous } from '../../src/theme/spacing';
import { GlassButton, GlassIconButton } from '../../src/components/native/GlassButton';
import { useSessionStore } from '../../src/store/sessionStore';
import { useUserStore } from '../../src/store/userStore';
import { useAuthStore } from '../../src/store/authStore';
import { SessionFilters, GameMode } from '../../src/types';
import FilterPicker from '../../src/components/FilterPicker';
import { useTranslation } from '../../src/i18n/t';
import {
  TIMER_OPTION_VALUES,
  formatTimerChipLabel,
} from '../../src/utils/constants';

const GAME_MODES: GameMode[] = ['swipe', 'roulette'];
const TIMER_OPTIONS = TIMER_OPTION_VALUES.filter((v) => v !== 0);

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// The code card arrives from just below full size — never from nothing.
const codeEnter = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.96 }, { translateY: 8 }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }], easing: EASE_OUT },
}).duration(320);

// Strip the arrow glyphs the copy uses for its text buttons.
const plain = (s: string) => s.replace(/[→←]/g, '').trim();

export default function CreateSessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setName } = useUserStore();
  const authUser = useAuthStore((s) => s.user);
  const {
    createSession,
    loadRestaurants,
    session,
    isLoadingRestaurants,
    userLocation,
    loadError,
    firebaseUid,
    initAuth,
    leaveSession,
  } = useSessionStore();

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  const [displayName, setDisplayName] = useState(
    authUser?.displayName || user.name,
  );
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SessionFilters>({
    cuisines: [],
    kosherOnly: false,
    maxPriceLevel: 4,
    styles: [],
  });
  const [gameMode, setGameMode] = useState<GameMode>('swipe');
  const [timerDuration, setTimerDuration] = useState(120);
  const [requireUnanimousKeepBrowsing, setRequireUnanimousKeepBrowsing] =
    useState(true);
  const [requireLobbyReady, setRequireLobbyReady] = useState(true);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: withTiming(showFilters ? '180deg' : '0deg', { duration: 200, easing: EASE_OUT }) },
    ],
  }));

  const activeFilterCount =
    filters.cuisines.length +
    filters.styles.length +
    (filters.kosherOnly ? 1 : 0) +
    (filters.maxPriceLevel < 4 ? 1 : 0);

  const modeTitle = (mode: GameMode) => {
    if (mode === 'roulette') return t('create.modeRoulette');
    return t('create.modeSwipe');
  };

  const modeHint = (mode: GameMode) => {
    if (mode === 'roulette') return t('create.modeRouletteHint');
    return t('create.modeSwipeHint');
  };

  const handleSelectGameMode = (mode: GameMode) => {
    void Haptics.selectionAsync();
    setGameMode(mode);
    if (mode === 'roulette') {
      setTimerDuration(0);
    } else if (timerDuration === 0) {
      setTimerDuration(120);
    }
  };

  // Segment 0 is "off"; the rest map onto TIMER_OPTIONS.
  const timerLabels = [t('create.timerOff'), ...TIMER_OPTIONS.map(formatTimerChipLabel)];
  const timerIndex = timerDuration === 0 ? 0 : TIMER_OPTIONS.indexOf(timerDuration as never) + 1;

  const handleCreate = async () => {
    setName(displayName);
    const hostId = firebaseUid || authUser?.uid || user.id;
    const code = createSession(hostId, displayName, {
      timerDuration: gameMode === 'roulette' ? 0 : timerDuration,
      requireUnanimousKeepBrowsing,
      requireLobbyReady,
      gameMode,
    });
    setSessionCode(code);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await loadRestaurants(filters);
  };

  const handleShare = async () => {
    if (!sessionCode) return;
    try {
      await Share.share({
        message: t('create.shareMessage', { code: sessionCode }),
      });
    } catch {}
  };

  const handleStart = () => {
    if (!sessionCode) return;
    router.push('/session/lobby');
  };

  const restaurantCount = session?.restaurants.length || 0;
  const isReady = !!sessionCode && !isLoadingRestaurants && restaurantCount > 0;

  const sourceCounts = session?.restaurants.reduce(
    (acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const handleBackFromCreate = () => {
    if (session) {
      leaveSession(firebaseUid || authUser?.uid || user.id);
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const bottomBarHeight = 64 + Math.max(insets.bottom, spacing.md);

  return (
    <View style={styles.container}>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="chevron.backward"
          accessibilityLabel={plain(t('common.back'))}
          onPress={handleBackFromCreate}
        />
      </Stack.Toolbar>

      <ScrollView
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: bottomBarHeight + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View>
          <Text style={styles.pageTitle}>{t('create.heroTitle')}</Text>
          <Text style={styles.pageSub}>{t('create.heroSub')}</Text>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>{t('create.yourName')}</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('create.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              editable={!sessionCode}
              returnKeyType="done"
              autoCorrect={false}
              textContentType="nickname"
            />
          </View>
        </View>

        {!sessionCode && (
          <>
            <View style={styles.group}>
              <Text style={styles.groupLabel}>{t('create.gameMode')}</Text>
              <View style={[styles.card, styles.cardPadded]}>
                <SegmentedControl
                  values={GAME_MODES.map(modeTitle)}
                  selectedIndex={GAME_MODES.indexOf(gameMode)}
                  onChange={(e) => handleSelectGameMode(GAME_MODES[e.nativeEvent.selectedSegmentIndex])}
                  tintColor={colors.primary}
                />
                <Text style={styles.hint}>{modeHint(gameMode)}</Text>

                {gameMode !== 'roulette' && (
                  <>
                    <View style={styles.separator} />
                    <Text style={styles.rowTitle}>{t('create.roundTimer')}</Text>
                    <SegmentedControl
                      values={timerLabels}
                      selectedIndex={timerIndex}
                      onChange={(e) => {
                        void Haptics.selectionAsync();
                        const i = e.nativeEvent.selectedSegmentIndex;
                        setTimerDuration(i === 0 ? 0 : TIMER_OPTIONS[i - 1]);
                      }}
                      tintColor={colors.primary}
                    />
                  </>
                )}
              </View>
            </View>

            <View style={styles.group}>
              <View style={styles.card}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelCol}>
                    <Text style={styles.rowTitle}>{t('create.switchUnanimousTitle')}</Text>
                    <Text style={styles.hint}>{t('create.switchUnanimousSub')}</Text>
                  </View>
                  <Switch
                    value={requireUnanimousKeepBrowsing}
                    onValueChange={setRequireUnanimousKeepBrowsing}
                    trackColor={{ true: colors.primary, false: undefined }}
                  />
                </View>
                <View style={[styles.separator, styles.separatorInset]} />
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelCol}>
                    <Text style={styles.rowTitle}>{t('create.switchLobbyTitle')}</Text>
                    <Text style={styles.hint}>{t('create.switchLobbySub')}</Text>
                  </View>
                  <Switch
                    value={requireLobbyReady}
                    onValueChange={setRequireLobbyReady}
                    trackColor={{ true: colors.primary, false: undefined }}
                  />
                </View>
              </View>
            </View>

            <View style={styles.group}>
              <View style={styles.card}>
                <Pressable
                  style={({ pressed }) => [styles.disclosureRow, pressed && styles.rowPressed]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setShowFilters((v) => !v);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showFilters }}
                >
                  <Text style={styles.rowTitle}>{t('create.filters')}</Text>
                  <View style={styles.disclosureEnd}>
                    {activeFilterCount > 0 && (
                      <View style={styles.countPill}>
                        <Text style={styles.countPillText}>{activeFilterCount}</Text>
                      </View>
                    )}
                    <Animated.View style={chevronStyle}>
                      <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                    </Animated.View>
                  </View>
                </Pressable>

                {showFilters && (
                  <Animated.View entering={FadeIn.duration(180)} style={styles.filterSection}>
                    <FilterPicker filters={filters} onChange={setFilters} />
                  </Animated.View>
                )}
              </View>
            </View>
          </>
        )}

        {sessionCode && (
          <Animated.View entering={codeEnter} style={[styles.card, styles.codeCard]}>
            <Text style={styles.codeLabel}>{t('create.sessionCode')}</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeValue} selectable accessibilityLabel={sessionCode.split('').join(' ')}>
                {sessionCode}
              </Text>
              <GlassIconButton
                systemImage="square.and.arrow.up"
                accessibilityLabel={t('create.shareCode')}
                onPress={handleShare}
                size={40}
              />
            </View>

            {session && (
              <Text style={styles.modeSelectedLine}>
                {t('create.modeSelected', { mode: modeTitle(session.gameMode) })}
              </Text>
            )}

            <View style={styles.separator} />

            {isLoadingRestaurants ? (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.statusText}>{t('create.findingRestaurants')}</Text>
              </View>
            ) : (
              <Animated.View entering={FadeIn.duration(200)} style={styles.readySection}>
                <Text style={styles.restaurantCountText}>
                  {t('create.restaurantsFound', { count: restaurantCount })}
                </Text>
                <View style={styles.sourceRow}>
                  {userLocation?.city && (
                    <View style={styles.sourceBadge}>
                      <Ionicons name="location" size={12} color={colors.textSecondary} />
                      <Text style={styles.sourceBadgeText}>{userLocation.city}</Text>
                    </View>
                  )}
                  {sourceCounts?.wolt ? (
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceBadgeText}>Wolt · {sourceCounts.wolt}</Text>
                    </View>
                  ) : null}
                  {sourceCounts?.tenbis ? (
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceBadgeText}>10bis · {sourceCounts.tenbis}</Text>
                    </View>
                  ) : null}
                  {sourceCounts?.google ? (
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceBadgeText}>Google · {sourceCounts.google}</Text>
                    </View>
                  ) : null}
                  {sourceCounts?.mock ? (
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceBadgeText}>
                        {t('create.sourceSample')} · {sourceCounts.mock}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {loadError && <Text style={styles.errorText}>{loadError}</Text>}
              </Animated.View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Floating action bar — content scrolls underneath the glass */}
      <View
        pointerEvents="box-none"
        style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
      >
        {!sessionCode ? (
          <GlassButton
            title={t('create.createBtn')}
            onPress={handleCreate}
            disabled={!displayName.trim()}
          />
        ) : (
          <GlassButton
            title={isReady ? plain(t('create.letsGo')) : t('common.loading')}
            onPress={handleStart}
            disabled={!isReady}
            loading={isLoadingRestaurants}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  pageTitle: {
    ...typography.largeTitle,
    color: colors.text,
    paddingHorizontal: spacing.xs,
  },
  pageSub: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 22,
    paddingHorizontal: spacing.xs,
  },

  // Grouped, inset sections — the iOS Settings rhythm
  group: { gap: spacing.sm },
  groupLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...continuous,
    overflow: 'hidden',
  },
  cardPadded: {
    padding: spacing.md,
    gap: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
  separatorInset: {
    marginStart: spacing.md,
  },
  rowTitle: {
    ...typography.body,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },

  input: {
    ...typography.body,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    textAlign: 'auto',
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  switchLabelCol: { flex: 1, gap: 2 },

  disclosureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
  },
  rowPressed: { backgroundColor: colors.borderLight },
  disclosureEnd: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  countPill: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: {
    ...typography.caption1,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: colors.onPrimary,
  },
  filterSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },

  codeCard: {
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  codeLabel: { ...typography.captionMedium, color: colors.textSecondary },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  codeValue: {
    ...typography.code,
    fontSize: 40,
    lineHeight: 48,
    color: colors.text,
  },
  modeSelectedLine: {
    ...typography.captionMedium,
    color: colors.primaryDark,
    textAlign: 'center',
  },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  statusText: { ...typography.captionMedium, color: colors.textSecondary },

  readySection: { alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  restaurantCountText: { ...typography.bodySemiBold, color: colors.text },
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  sourceBadgeText: { ...typography.footnote, color: colors.textSecondary },
  errorText: { ...typography.caption, color: colors.warning, textAlign: 'center' },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
