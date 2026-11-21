import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../src/theme/colors';
import { typography, fontFamilies } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { GlassButton } from '../../src/components/native/GlassButton';
import { Glass } from '../../src/components/ui/Glass';
import { Avatar } from '../../src/components/ui/Avatar';
import { HomeMosaic } from '../../src/components/HomeMosaic';
import { useSessionStore } from '../../src/store/sessionStore';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { useTranslation } from '../../src/i18n/t';

const CODE_LENGTH = 6;
const charLand = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 1.5 }, { translateY: -6 }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }], easing: Easing.bezier(0.23, 1, 0.32, 1) },
}).duration(200);
const RESTING_TINT = 'rgba(255, 255, 255, 0.6)';
const plain = (s: string) => s.replace(/[→←]/g, '').trim();

export default function JoinSessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setName } = useUserStore();
  const { joinSession, joinRemoteSession, isOnline, initAuth } = useSessionStore();
  const [code, setCode] = useState('');
  const authUser = useAuthStore((s) => s.user);
  // Signed in with a name on the account → the name field is hidden and the account name is used
  const signedInName =
    authUser && authUser.provider !== 'anonymous' ? authUser.displayName?.trim() || '' : '';
  const [displayName, setDisplayName] = useState(signedInName || user.name);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeFocused, setCodeFocused] = useState(false);
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const codeInputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // Wrong code: a short horizontal shake — the "no" head-shake.
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  const canJoin = code.length === CODE_LENGTH && !!displayName.trim();

  const handleJoin = async (codeToJoin = code) => {
    if (codeToJoin.length < CODE_LENGTH || !displayName.trim() || isJoining) return;
    setName(displayName);
    setIsJoining(true);
    setError(null);

    try {
      let success = false;

      if (isOnline) {
        success = await joinRemoteSession(codeToJoin, user.id, displayName);
      }

      if (!success) {
        success = joinSession(codeToJoin, user.id, displayName);
      }

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push('/session/lobby');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(t('join.alertBody'));
        const ease = { duration: 50, easing: Easing.inOut(Easing.quad) };
        shake.value = withSequence(
          withTiming(-8, ease),
          withTiming(8, ease),
          withTiming(-5, ease),
          withTiming(5, ease),
          withTiming(0, ease),
        );
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) handleCodeChange(text);
  };

  const handleCodeChange = (text: string) => {
    const next = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(next);
    if (error) setError(null);
    if (next.length > code.length) void Haptics.selectionAsync();
    // Last character typed (or a full code pasted) — join right away.
    if (next.length === CODE_LENGTH && displayName.trim()) {
      void handleJoin(next);
    }
  };

  return (
    <View style={styles.container}>
      {/* The other side of the lobby: same grid hero, and the code lands where it fades */}
      <HomeMosaic heightRatio={0.46} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="chevron.backward"
          accessibilityLabel={plain(t('common.back'))}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </Stack.Toolbar>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* A glass pill so the small label stays readable over the grid */}
          <Glass radius={borderRadius.full} tint="rgba(255, 255, 255, 0.75)" style={styles.kickerPill}>
            <Text style={styles.kicker}>{t('join.kicker')}</Text>
          </Glass>
          <Text style={styles.title}>{t('join.heroTitle')}</Text>

          <Animated.View style={[styles.codeWrap, shakeStyle]}>
            <Pressable
              style={styles.codeRow}
              onPress={() => codeInputRef.current?.focus()}
              accessibilityRole="none"
            >
              {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                const char = code[i];
                const isActive = codeFocused && i === Math.min(code.length, CODE_LENGTH - 1);
                return (
                  <Glass
                    key={i}
                    radius={borderRadius.md}
                    tint={RESTING_TINT}
                    style={[styles.codeBox, isActive && styles.codeBoxActive, !!error && styles.codeBoxError]}
                  >
                    {char ? (
                      // Each character lands in its tile
                      <Animated.Text key={`${i}-${char}`} entering={charLand} style={styles.codeChar}>
                        {char}
                      </Animated.Text>
                    ) : isActive ? (
                      <View style={styles.caret} />
                    ) : null}
                  </Glass>
                );
              })}
            </Pressable>
          </Animated.View>
          {/* One real input drives the six tiles — keeps paste, autofill and VoiceOver working */}
          <TextInput
            ref={codeInputRef}
            value={code}
            onChangeText={handleCodeChange}
            onFocus={() => setCodeFocused(true)}
            onBlur={() => setCodeFocused(false)}
            maxLength={CODE_LENGTH}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            textContentType="oneTimeCode"
            accessibilityLabel={t('join.sessionCode')}
            style={styles.hiddenInput}
            caretHidden
          />
          {error ? (
            <Animated.Text entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={styles.errorText}>
              {error}
            </Animated.Text>
          ) : (
            <Pressable onPress={handlePaste} hitSlop={8} accessibilityRole="button" style={styles.pasteWrap}>
              <Glass radius={borderRadius.full} interactive tint={RESTING_TINT} style={styles.pasteChip}>
                <Ionicons name="clipboard-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.pasteText}>{t('join.paste')}</Text>
              </Glass>
            </Pressable>
          )}

          {/* Guests: who you'll appear as — tap to change */}
          {!signedInName ? (
            <Glass radius={borderRadius.full} tint={RESTING_TINT} style={styles.nameChip}>
              <Avatar name={displayName || '?'} size={30} />
              <Text style={styles.nameLabel}>{t('join.joiningAs')}</Text>
              <TextInput
                style={styles.nameInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('join.namePlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
                textContentType="nickname"
                returnKeyType="go"
                onSubmitEditing={() => void handleJoin()}
              />
              <Ionicons name="pencil" size={14} color={colors.textMuted} />
            </Glass>
          ) : null}
        </ScrollView>

        {/* Sits right on the keyboard when it's up; above the home indicator otherwise */}
        <View style={[styles.bottomBar, { paddingBottom: keyboardUp ? spacing.sm : Math.max(insets.bottom, spacing.md) }]}>
          <GlassButton
            title={t('join.button')}
            onPress={() => void handleJoin()}
            disabled={!canJoin}
            loading={isJoining}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const SCREEN_H = Dimensions.get('window').height;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
    // The title sits where the grid has faded, like the code on the lobby
    paddingTop: SCREEN_H * 0.27,
  },
  kickerPill: { paddingHorizontal: 12, paddingVertical: 5 },
  kicker: { ...typography.footnote, fontWeight: '700', color: colors.primaryDark },
  title: {
    fontFamily: fontFamilies.rounded,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: colors.text,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },

  codeWrap: { alignSelf: 'stretch' },
  // Codes read left-to-right in every locale
  codeRow: {
    flexDirection: 'row',
    direction: 'ltr',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  codeBox: {
    flex: 1,
    aspectRatio: 0.78,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: { borderColor: colors.primary },
  codeBoxError: { borderColor: colors.danger },
  codeChar: {
    fontFamily: fontFamilies.rounded,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    color: colors.text,
  },
  caret: { width: 2, height: 28, borderRadius: 1, backgroundColor: colors.primary },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  errorText: { ...typography.subheadline, fontWeight: '600', color: colors.danger, textAlign: 'center' },
  pasteWrap: { alignSelf: 'center' },
  pasteChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  pasteText: { ...typography.subheadline, fontWeight: '600', color: colors.primaryDark },

  nameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingStart: 6,
    paddingEnd: spacing.md,
    height: 44,
    marginTop: spacing.lg,
    alignSelf: 'center',
    minWidth: 220,
  },
  nameLabel: { ...typography.subheadline, color: colors.textSecondary },
  nameInput: { ...typography.headline, color: colors.text, flexGrow: 1, minWidth: 60, paddingVertical: 0 },

  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
