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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../src/theme/colors';
import { typography, fontFamilies } from '../../src/theme/typography';
import { spacing, borderRadius, continuous } from '../../src/theme/spacing';
import { GlassButton } from '../../src/components/native/GlassButton';
import { useSessionStore } from '../../src/store/sessionStore';
import { useUserStore } from '../../src/store/userStore';
import { useTranslation } from '../../src/i18n/t';

const CODE_LENGTH = 6;
const plain = (s: string) => s.replace(/[→←]/g, '').trim();

export default function JoinSessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setName } = useUserStore();
  const { joinSession, joinRemoteSession, isOnline, initAuth } = useSessionStore();
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState(user.name);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeFocused, setCodeFocused] = useState(false);
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
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Text style={styles.title}>{t('join.title')}</Text>
          <Text style={styles.subtitle}>{t('join.subtitle')}</Text>

          <View style={styles.group}>
            <Text style={styles.groupLabel}>{t('join.sessionCode')}</Text>
            <Animated.View style={shakeStyle}>
              <Pressable
                style={styles.codeRow}
                onPress={() => codeInputRef.current?.focus()}
                accessibilityRole="none"
              >
                {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                  const char = code[i];
                  const isActive = codeFocused && i === Math.min(code.length, CODE_LENGTH - 1);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.codeBox,
                        isActive && styles.codeBoxActive,
                        !!error && styles.codeBoxError,
                      ]}
                    >
                      <Text style={styles.codeChar}>{char ?? ''}</Text>
                    </View>
                  );
                })}
              </Pressable>
            </Animated.View>
            {/* One real input drives the six boxes — keeps paste, autofill and VoiceOver working */}
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
            {error && (
              <Animated.Text
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(120)}
                style={styles.errorText}
              >
                {error}
              </Animated.Text>
            )}
          </View>

          <View style={styles.group}>
            <Text style={styles.groupLabel}>{t('join.yourName')}</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('join.namePlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
                textContentType="nickname"
                returnKeyType="go"
                onSubmitEditing={() => void handleJoin()}
              />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  title: {
    ...typography.largeTitle,
    color: colors.text,
    paddingHorizontal: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: -spacing.md,
    paddingHorizontal: spacing.xs,
  },
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
  },
  input: {
    ...typography.body,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },

  // Codes read left-to-right in every locale
  codeRow: {
    flexDirection: 'row',
    direction: 'ltr',
    gap: spacing.sm,
  },
  codeBox: {
    flex: 1,
    aspectRatio: 0.82,
    borderRadius: borderRadius.md,
    ...continuous,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: {
    borderColor: colors.primary,
  },
  codeBoxError: {
    borderColor: colors.danger,
  },
  codeChar: {
    ...typography.title1,
    fontFamily: fontFamilies.mono,
    color: colors.text,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  errorText: {
    ...typography.captionMedium,
    color: colors.danger,
    paddingHorizontal: spacing.md,
  },

  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
