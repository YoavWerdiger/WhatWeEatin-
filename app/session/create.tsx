import React, { useState, useEffect, useMemo } from 'react';
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
  I18nManager,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  Keyframe,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { colors } from '../../src/theme/colors';
import { typography, fontFamilies } from '../../src/theme/typography';
import { spacing, borderRadius, continuous } from '../../src/theme/spacing';
import { GlassButton } from '../../src/components/native/GlassButton';
import { Glass } from '../../src/components/ui/Glass';
import { TimeDial } from '../../src/components/TimeDial';
import { useSessionStore } from '../../src/store/sessionStore';
import { useUserStore } from '../../src/store/userStore';
import { useAuthStore } from '../../src/store/authStore';
import { SessionFilters, GameMode } from '../../src/types';
import FilterPicker from '../../src/components/FilterPicker';
import { useTranslation } from '../../src/i18n/t';

type Step = 'name' | 'mode' | 'timer' | 'rules' | 'filters' | 'ready';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const AUTO_ADVANCE_MS = 220;
// Selected cards: a light wash of the brand orange over the glass.
const SELECTED_TINT = 'rgba(255, 107, 53, 0.22)';
const plain = (s: string) => s.replace(/[→←]/g, '').trim();

// One question per screen; the next one slides in from the reading direction.
function stepEnter(direction: 1 | -1) {
  const from = 28 * direction * (I18nManager.isRTL ? -1 : 1);
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateX: from }] },
    100: { opacity: 1, transform: [{ translateX: 0 }], easing: EASE_OUT },
  }).duration(240);
}

const MODE_OPTIONS: { mode: GameMode; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'swipe', icon: 'albums' },
  { mode: 'roulette', icon: 'dice' },
];

export default function CreateSessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
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

  const [displayName, setDisplayName] = useState(authUser?.displayName || user.name);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [filters, setFilters] = useState<SessionFilters>({
    cuisines: [],
    kosherOnly: false,
    maxPriceLevel: 4,
    styles: [],
  });
  const [gameMode, setGameMode] = useState<GameMode>('swipe');
  const [timerDuration, setTimerDuration] = useState(120);
  const [requireUnanimousKeepBrowsing, setRequireUnanimousKeepBrowsing] = useState(true);
  const [requireLobbyReady, setRequireLobbyReady] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Roulette has no round timer, so its flow skips that question.
  const steps = useMemo<Step[]>(
    () =>
      sessionCode
        ? ['ready']
        : ['name', 'mode', ...(gameMode === 'swipe' ? (['timer'] as const) : []), 'rules', 'filters'],
    [gameMode, sessionCode],
  );
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastQuestion = !sessionCode && stepIndex === steps.length - 1;

  const goTo = (index: number) => {
    setDirection(index > stepIndex ? 1 : -1);
    setStepIndex(index);
  };
  const next = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goTo(stepIndex + 1);
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
    setDirection(1);
    setStepIndex(0);
    setSessionCode(code);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await loadRestaurants(filters);
  };

  const handleShare = async () => {
    if (!sessionCode) return;
    try {
      await Share.share({ message: t('create.shareMessage', { code: sessionCode }) });
    } catch {}
  };

  const leave = () => {
    if (session) leaveSession(firebaseUid || authUser?.uid || user.id);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const handleBack = () => {
    if (!sessionCode && stepIndex > 0) goTo(stepIndex - 1);
    else leave();
  };

  // Picking a card is the answer — move on without an extra tap.
  const choose = (apply: () => void) => {
    void Haptics.selectionAsync();
    apply();
    setTimeout(() => goTo(stepIndex + 1), AUTO_ADVANCE_MS);
  };

  const restaurantCount = session?.restaurants.length || 0;
  const isReady = !!sessionCode && !isLoadingRestaurants && restaurantCount > 0;
  const questionCount = steps.length;

  const modeTitle = (mode: GameMode) =>
    mode === 'roulette' ? t('create.modeRoulette') : t('create.modeSwipe');
  const modeHint = (mode: GameMode) =>
    mode === 'roulette' ? t('create.modeRouletteHint') : t('create.modeSwipeHint');

  const optional = step === 'rules' || step === 'filters';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () =>
            sessionCode ? null : <Progress current={stepIndex} total={questionCount} />,
        }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={sessionCode || stepIndex === 0 ? 'xmark' : 'chevron.backward'}
          accessibilityLabel={plain(t('common.back'))}
          onPress={handleBack}
        />
      </Stack.Toolbar>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, { paddingBottom: spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View key={step} entering={reduceMotion ? FadeIn.duration(150) : stepEnter(direction)}>
            {step === 'name' && (
              <Question title={t('create.qName')} sub={t('create.qNameSub')}>
                <NameGreeting name={displayName} greet={(n) => t('create.greet', { name: n })} />
                <TextInput
                  style={styles.bigInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder={t('create.namePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  autoCorrect={false}
                  textContentType="nickname"
                  returnKeyType="next"
                  onSubmitEditing={() => displayName.trim() && next()}
                />
              </Question>
            )}

            {step === 'mode' && (
              <Question title={t('create.qMode')}>
                <View style={styles.cards}>
                  {MODE_OPTIONS.map(({ mode, icon }, i) => (
                    <OptionCard
                      key={mode}
                      index={i}
                      icon={icon}
                      title={modeTitle(mode)}
                      hint={modeHint(mode)}
                      selected={gameMode === mode}
                      onPress={() => choose(() => setGameMode(mode))}
                    />
                  ))}
                </View>
              </Question>
            )}

            {step === 'timer' && (
              <Question title={t('create.qTimer')} sub={t('create.qTimerSub')}>
                <TimeDial
                  value={timerDuration}
                  onChange={setTimerDuration}
                  unlimitedLabel={t('create.timerUnlimited')}
                  accessibilityLabel={t('create.qTimer')}
                />
              </Question>
            )}

            {step === 'rules' && (
              <Question title={t('create.qRules')} sub={t('create.qRulesSub')}>
                <View style={styles.cards}>
                  <RuleCard
                    index={0}
                    icon="people"
                    title={t('create.switchUnanimousTitle')}
                    hint={t('create.switchUnanimousSub')}
                    value={requireUnanimousKeepBrowsing}
                    onChange={setRequireUnanimousKeepBrowsing}
                  />
                  <RuleCard
                    index={1}
                    icon="hand-left"
                    title={t('create.switchLobbyTitle')}
                    hint={t('create.switchLobbySub')}
                    value={requireLobbyReady}
                    onChange={setRequireLobbyReady}
                  />
                </View>
              </Question>
            )}

            {step === 'filters' && (
              <Question title={t('create.qFilters')} sub={t('create.qFiltersSub')}>
                <FilterPicker filters={filters} onChange={setFilters} />
              </Question>
            )}

            {step === 'ready' && sessionCode && (
              <Question title={t('create.readyTitle')} sub={t('create.readySub')}>
                <View style={[styles.card, styles.ticket]}>
                  <Text style={styles.ticketLabel}>{t('create.sessionCode')}</Text>
                  <Text
                    style={styles.ticketCode}
                    selectable
                    accessibilityLabel={sessionCode.split('').join(' ')}
                  >
                    {sessionCode}
                  </Text>
                  <Pressable
                    onPress={handleShare}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="share-outline" size={18} color={colors.primaryDark} />
                    <Text style={styles.shareText}>{t('create.shareCode')}</Text>
                  </Pressable>
                  <View style={styles.separatorFull} />
                  {isLoadingRestaurants ? (
                    <View style={styles.statusRow}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.statusText}>{t('create.findingRestaurants')}</Text>
                    </View>
                  ) : (
                    <Animated.View entering={FadeIn.duration(200)} style={styles.statusRow}>
                      <Ionicons name="restaurant-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.statusText}>
                        {t('create.restaurantsFound', { count: restaurantCount })}
                        {userLocation?.city ? ` · ${userLocation.city}` : ''}
                      </Text>
                    </Animated.View>
                  )}
                  {loadError && <Text style={styles.errorText}>{loadError}</Text>}
                </View>
              </Question>
            )}
          </Animated.View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {step === 'ready' ? (
            <GlassButton
              title={isReady ? plain(t('create.letsGo')) : t('common.loading')}
              onPress={() => router.push('/session/lobby')}
              disabled={!isReady}
              loading={isLoadingRestaurants}
            />
          ) : (
            <View style={styles.actionsRow}>
              {optional && (
                <View style={styles.flex}>
                  <GlassButton
                    title={t('create.skip')}
                    prominent={false}
                    onPress={isLastQuestion ? handleCreate : next}
                  />
                </View>
              )}
              <View style={optional ? styles.flexWide : styles.flex}>
                <GlassButton
                  title={isLastQuestion ? t('create.createBtn') : t('create.continue')}
                  onPress={isLastQuestion ? handleCreate : next}
                  disabled={step === 'name' && !displayName.trim()}
                />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ now: current + 1, max: total }}>
      {Array.from({ length: total }).map((_, i) => (
        <ProgressSegment key={i} filled={i <= current} />
      ))}
    </View>
  );
}

function ProgressSegment({ filled }: { filled: boolean }) {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(filled ? 1 : 0.18, { duration: 200, easing: EASE_OUT }),
  }));
  return <Animated.View style={[styles.segment, style]} />;
}

/** The name field answers back: an avatar with your initial, then a hello. */
function NameGreeting({ name, greet }: { name: string; greet: (first: string) => string }) {
  const first = name.trim().split(/\s+/)[0] ?? '';
  const ready = first.length >= 2;
  // Nothing to show until there is a letter — no placeholder avatar.
  if (!first) return null;
  return (
    <View style={styles.greet}>
      <Animated.View entering={ZoomIn.duration(220)} style={[styles.greetAvatar, ready && styles.greetAvatarReady]}>
          <Animated.Text key={first.charAt(0)} entering={ZoomIn.duration(220)} style={[styles.greetInitial, ready && styles.greetInitialReady]}>
            {first.charAt(0).toUpperCase()}
          </Animated.Text>
      </Animated.View>
      {ready ? (
        <Animated.Text entering={FadeInDown.duration(260)} style={styles.greetText} numberOfLines={1}>
          {greet(first)}
        </Animated.Text>
      ) : null}
    </View>
  );
}

function Question({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={styles.question}>
      <View style={styles.questionHead}>
        <Text style={styles.questionTitle} accessibilityRole="header">
          {title}
        </Text>
        {sub ? <Text style={styles.questionSub}>{sub}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function OptionCard({
  index = 0,
  icon,
  title,
  hint,
  selected,
  onPress,
}: {
  index?: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(260).delay(index * 60)}>
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}>
      <Glass
        radius={borderRadius.lg}
        interactive
        tint={selected ? SELECTED_TINT : undefined}
        style={styles.option}
      >
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Ionicons name={icon} size={24} color={selected ? '#FFFFFF' : colors.primaryDark} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionHint}>{hint}</Text>
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={selected ? colors.primary : colors.border}
      />
      </Glass>
    </Pressable>
    </Animated.View>
  );
}

/** A house rule as a card you flip: tap anywhere, the switch shows the state. */
function RuleCard({
  index,
  icon,
  title,
  hint,
  value,
  onChange,
}: {
  index: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const toggle = () => {
    void Haptics.selectionAsync();
    onChange(!value);
  };
  return (
    <Animated.View entering={FadeInDown.duration(260).delay(index * 60)}>
      <Pressable
        onPress={toggle}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityLabel={title}
        accessibilityHint={hint}
      >
        <Glass radius={borderRadius.lg} interactive tint={value ? SELECTED_TINT : undefined} style={styles.rule}>
          <View style={[styles.optionIcon, value && styles.optionIconSelected]}>
            <Ionicons name={icon} size={24} color={value ? '#FFFFFF' : colors.primaryDark} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{title}</Text>
            <Text style={styles.optionHint}>{hint}</Text>
          </View>
          <Switch
            value={value}
            onValueChange={() => toggle()}
            trackColor={{ true: colors.primary, false: undefined }}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          />
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexWide: { flex: 2 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  progress: { flexDirection: 'row', gap: 4, width: 160 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.primary },

  question: { gap: spacing.lg },
  questionHead: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  questionTitle: { ...typography.largeTitle, color: colors.text },
  questionSub: { ...typography.body, color: colors.textSecondary },

  greet: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  greetAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetAvatarReady: { backgroundColor: colors.primary },
  greetInitial: { ...typography.title3, color: colors.textMuted },
  greetInitialReady: { color: colors.onPrimary },
  greetText: { ...typography.headline, color: colors.text },
  bigInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...continuous,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },

  cards: { gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: { backgroundColor: colors.primary },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { ...typography.headline, color: colors.text },
  optionHint: { ...typography.subheadline, color: colors.textSecondary },


  card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, ...continuous, overflow: 'hidden' },
  cardPadded: { padding: spacing.md },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginStart: spacing.md },
  separatorFull: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, alignSelf: 'stretch' },

  ticket: { alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  ticketLabel: { ...typography.footnote, color: colors.textSecondary },
  ticketCode: { ...typography.code, fontSize: 48, lineHeight: 56, letterSpacing: 6, color: colors.text },
  shareButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  shareText: { ...typography.headline, color: colors.primaryDark },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: { ...typography.subheadline, color: colors.textSecondary },
  errorText: { ...typography.footnote, color: colors.warning, textAlign: 'center' },

  pressed: { opacity: 0.7 },

  bottomBar: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: 12 },
});
