import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Share,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { Button } from '../../src/components/ui/Button';
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

export default function CreateSessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const codeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

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

    Animated.spring(codeAnim, {
      toValue: 1,
      tension: 50,
      friction: 5,
      useNativeDriver: true,
    }).start();

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
  const isReady = sessionCode && !isLoadingRestaurants && restaurantCount > 0;

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
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackFromCreate}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.pageTitle}>{t('create.heroTitle')}</Text>
        <Text style={styles.pageSub}>{t('create.heroSub')}</Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('create.yourName')}</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('create.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {!sessionCode && (
          <View style={styles.settingsCard}>
            <Text style={styles.settingsSectionLabel}>{t('create.gameMode')}</Text>
            <View style={styles.timerChipRow}>
              {GAME_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.timerChip,
                    gameMode === mode && styles.timerChipSelected,
                  ]}
                  onPress={() => handleSelectGameMode(mode)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.timerChipText,
                      gameMode === mode && styles.timerChipTextSelected,
                    ]}
                  >
                    {modeTitle(mode)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.switchSub}>{modeHint(gameMode)}</Text>

            {gameMode !== 'roulette' && (
              <>
                <Text style={[styles.settingsSectionLabel, styles.settingsGap]}>
                  {t('create.roundTimer')}
                </Text>
                <View style={styles.timerChipRow}>
                  {TIMER_OPTION_VALUES.map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.timerChip,
                        timerDuration === value && styles.timerChipSelected,
                      ]}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setTimerDuration(value);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.timerChipText,
                          timerDuration === value && styles.timerChipTextSelected,
                        ]}
                      >
                        {value === 0
                          ? t('create.timerOff')
                          : formatTimerChipLabel(value)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.switchRow}>
              <View style={styles.switchLabelCol}>
                <Text style={styles.switchTitle}>{t('create.switchUnanimousTitle')}</Text>
                <Text style={styles.switchSub}>{t('create.switchUnanimousSub')}</Text>
              </View>
              <Switch
                value={requireUnanimousKeepBrowsing}
                onValueChange={setRequireUnanimousKeepBrowsing}
                trackColor={{ true: colors.primary + 'AA', false: colors.border }}
                thumbColor={colors.surfaceElevated}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabelCol}>
                <Text style={styles.switchTitle}>{t('create.switchLobbyTitle')}</Text>
                <Text style={styles.switchSub}>{t('create.switchLobbySub')}</Text>
              </View>
              <Switch
                value={requireLobbyReady}
                onValueChange={setRequireLobbyReady}
                trackColor={{ true: colors.primary + 'AA', false: colors.border }}
                thumbColor={colors.surfaceElevated}
              />
            </View>
          </View>
        )}

        {/* Filter Toggle */}
        {!sessionCode && (
          <View style={styles.filterBlock}>
            <TouchableOpacity
              style={styles.filterToggle}
              onPress={() => {
                Haptics.selectionAsync();
                setShowFilters(!showFilters);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.filterToggleText}>
                {t('create.filters')}
                {activeFilterCount > 0 && (
                  <Text style={styles.filterBadge}> ({activeFilterCount})</Text>
                )}
              </Text>
              <Text style={styles.filterToggleArrow}>
                {showFilters ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {showFilters && (
              <View style={styles.filterSection}>
                <FilterPicker filters={filters} onChange={setFilters} />
              </View>
            )}
          </View>
        )}

        {!sessionCode ? (
          <Button
            title={t('create.createBtn')}
            onPress={handleCreate}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!displayName.trim()}
          />
        ) : (
          <Animated.View
            style={[styles.codeContainer, { transform: [{ scale: codeAnim }] }]}
          >
            <Text style={styles.codeLabel}>{t('create.sessionCode')}</Text>
            <Text style={styles.codeValue}>{sessionCode}</Text>

            {session && (
              <Text style={styles.modeSelectedLine}>
                {t('create.modeSelected', { mode: modeTitle(session.gameMode) })}
              </Text>
            )}

            {isLoadingRestaurants ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>{t('create.findingRestaurants')}</Text>
                {userLocation?.city && (
                  <Text style={styles.locationText}>
                    📍 {userLocation.city}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.readySection}>
                {userLocation?.city && (
                  <View style={styles.locationBadge}>
                    <Text style={styles.locationBadgeText}>
                      📍 {userLocation.city}
                    </Text>
                  </View>
                )}

                <Text style={styles.restaurantCountText}>
                  {t('create.restaurantsFound', { count: restaurantCount })}
                </Text>

                {sourceCounts && (
                  <View style={styles.sourceRow}>
                    {sourceCounts.wolt && (
                      <View style={[styles.sourceBadge, { backgroundColor: '#00C2E8' + '22' }]}>
                        <Text style={[styles.sourceBadgeText, { color: '#00A8D0' }]}>
                          Wolt · {sourceCounts.wolt}
                        </Text>
                      </View>
                    )}
                    {sourceCounts.tenbis && (
                      <View style={[styles.sourceBadge, { backgroundColor: '#FF6900' + '22' }]}>
                        <Text style={[styles.sourceBadgeText, { color: '#E05E00' }]}>
                          10bis · {sourceCounts.tenbis}
                        </Text>
                      </View>
                    )}
                    {sourceCounts.google && (
                      <View style={[styles.sourceBadge, { backgroundColor: '#4285F4' + '22' }]}>
                        <Text style={[styles.sourceBadgeText, { color: '#3B78DC' }]}>
                          Google · {sourceCounts.google}
                        </Text>
                      </View>
                    )}
                    {sourceCounts.mock && (
                      <View style={[styles.sourceBadge, { backgroundColor: colors.primaryMuted }]}>
                        <Text style={[styles.sourceBadgeText, { color: colors.primary }]}>
                          {t('create.sourceSample')} · {sourceCounts.mock}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {loadError && (
                  <Text style={styles.errorText}>{loadError}</Text>
                )}
              </View>
            )}

            <View style={styles.codeActions}>
              <Button
                title={t('create.shareCode')}
                onPress={handleShare}
                variant="secondary"
                size="md"
              />
              <Button
                title={isReady ? t('create.letsGo') : t('common.loading')}
                onPress={handleStart}
                variant="primary"
                size="lg"
                fullWidth
                disabled={!isReady}
                loading={isLoadingRestaurants}
              />
            </View>
          </Animated.View>
        )}
      </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  backButton: { marginBottom: spacing.lg, alignSelf: 'flex-start' },
  backText: { ...typography.bodyMedium, color: colors.textSecondary },
  pageTitle: {
    ...typography.heroTitle,
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
  },
  pageSub: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  form: { gap: spacing.lg, marginBottom: spacing.lg },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  settingsSectionLabel: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  settingsGap: {
    marginTop: spacing.sm,
  },
  timerChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timerChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  timerChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  timerChipText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  timerChipTextSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  switchLabelCol: { flex: 1, gap: 4 },
  switchTitle: {
    ...typography.bodySemiBold,
    color: colors.text,
    fontSize: 15,
  },
  switchSub: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  inputGroup: { gap: spacing.sm },
  label: { ...typography.bodySemiBold, color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  codeContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.lg,
  },
  codeLabel: { ...typography.label, color: colors.textMuted, fontSize: 10 },
  codeValue: {
    ...typography.heroTitle,
    color: colors.primary,
    fontSize: 40,
    letterSpacing: 8,
  },
  modeSelectedLine: {
    ...typography.bodySemiBold,
    color: colors.primary,
    textAlign: 'center',
  },

  loadingSection: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  loadingText: { ...typography.captionMedium, color: colors.textSecondary },
  locationText: { ...typography.caption, color: colors.textMuted },

  readySection: { alignItems: 'center', gap: spacing.sm },
  locationBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  locationBadgeText: { ...typography.captionMedium, color: colors.primary },
  restaurantCountText: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  sourceBadgeText: { ...typography.captionMedium, fontSize: 11 },
  errorText: { ...typography.caption, color: colors.warning, textAlign: 'center' },

  codeActions: { width: '100%', gap: spacing.md, alignItems: 'center', marginTop: spacing.sm },

  filterBlock: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  filterToggleText: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  filterBadge: {
    color: colors.primary,
    fontWeight: '700',
  },
  filterToggleArrow: {
    fontSize: 12,
    color: colors.textMuted,
  },
  filterSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
});
