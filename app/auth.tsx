import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { spacing, borderRadius, shadows } from '../src/theme/spacing';
import { useAuthStore } from '../src/store/authStore';
import { useTranslation } from '../src/i18n/t';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
/** iOS-only OAuth client (optional). If unset, the Web client ID is used — do not pass an empty string. */
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || undefined;
const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || undefined;

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    loginAnonymously,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [googlePolicyHint, setGooglePolicyHint] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const finishingGoogleRef = useRef(false);

  const projectFullName = useMemo(() => {
    const owner = Constants.expoConfig?.owner;
    const slug = Constants.expoConfig?.slug;
    if (owner && slug) return `@${owner}/${slug}`;
    return null;
  }, []);

  /**
   * Expo Go: Web client + https://auth.expo.io/@owner/slug (never whatweeatin:// on Web client).
   * Standalone / TestFlight: iOS OAuth client (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) — redirect is
   * com.whatweeatin.app:/oauthredirect automatically (expo-auth-session SDK 54 + iosClientId).
   * Web client ID stays required for Firebase signInWithCredential token exchange.
   */
  const expoProxyRedirectUri = projectFullName
    ? `https://auth.expo.io/${projectFullName}`
    : undefined;

  const googleAuthConfig = useMemo(
    () => ({
      clientId: GOOGLE_WEB_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID,
      ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
      ...(GOOGLE_ANDROID_CLIENT_ID ? { androidClientId: GOOGLE_ANDROID_CLIENT_ID } : {}),
      ...(isExpoGo && expoProxyRedirectUri
        ? { redirectUri: expoProxyRedirectUri }
        : {}),
    }),
    [expoProxyRedirectUri],
  );

  // Not useIdTokenAuthRequest: off web it forces response_type=code, and in Expo Go only
  // the Web client exists — Google refuses to exchange a Web-client code without a
  // client_secret ("client_secret is missing"). Ask for the id_token directly there
  // (implicit flow; the provider adds the nonce). Native builds keep code + PKCE with the
  // iOS/Android client, which Google exchanges without a secret.
  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    ...googleAuthConfig,
    ...(isExpoGo ? { responseType: AuthSession.ResponseType.IdToken } : {}),
  });

  const finishGoogleSignIn = useCallback(
    async (idToken: string | undefined) => {
      if (!idToken || finishingGoogleRef.current) return;
      finishingGoogleRef.current = true;
      try {
        await loginWithGoogle(idToken);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/');
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        finishingGoogleRef.current = false;
      }
    },
    [loginWithGoogle, router],
  );

  useEffect(() => {
    if (!__DEV__ || !googleRequest?.redirectUri) return;

    console.log('[Google OAuth] redirectUri →', googleRequest.redirectUri);
    console.log('[Google OAuth] EAS project:', projectFullName, Constants.easConfig?.projectId);

    if (isExpoGo) {
      console.log(
        '[Google OAuth] Web client only — Authorized redirect URI:',
        expoProxyRedirectUri,
        '\nJavaScript origin: https://auth.expo.io',
      );
      return;
    }

    if (Platform.OS === 'ios' && !GOOGLE_IOS_CLIENT_ID) {
      console.warn(
        '[Google OAuth] TestFlight/production iOS: set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (Google Cloud → OAuth → iOS, bundle com.whatweeatin.app). Do NOT add custom schemes to the Web client.',
      );
    } else if (Platform.OS === 'ios') {
      console.log(
        '[Google OAuth] iOS client configured — redirect uses bundle ID (not Web client URIs). Firebase still needs EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.',
      );
    }
  }, [googleRequest?.redirectUri, projectFullName, expoProxyRedirectUri]);

  useEffect(() => {
    if (googleResponse?.type === 'error') {
      if (__DEV__) {
        console.warn('[Google OAuth] error response:', googleResponse);
      }
      const expoProxy = projectFullName
        ? `https://auth.expo.io/${projectFullName}`
        : 'https://auth.expo.io/@YOUR_OWNER/YOUR_SLUG';
      setGooglePolicyHint(t('auth.googlePolicyHint', { expoProxy }));
    }
    if (googleResponse?.type === 'success') {
      setGooglePolicyHint(null);
    }
  }, [googleResponse, t, projectFullName]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      void finishGoogleSignIn(googleResponse.params.id_token);
    }
  }, [googleResponse, finishGoogleSignIn]);

  const handleGooglePress = async () => {
    setGooglePolicyHint(null);
    clearError();
    if (!googleRequest?.url || !GOOGLE_WEB_CLIENT_ID) return;

    // Expo Go + auth.expo.io: must open /start so the proxy stores returnUrl (deep link back to Expo Go).
    if (isExpoGo && projectFullName) {
      setGoogleBusy(true);
      try {
        const returnUrl = AuthSession.getDefaultReturnUrl();
        const startUrl = `https://auth.expo.io/${projectFullName}/start?${new URLSearchParams({
          authUrl: googleRequest.url,
          returnUrl,
        }).toString()}`;
        if (__DEV__) {
          console.log('[Google OAuth] Expo Go proxy start →', startUrl.slice(0, 120), '…');
          console.log('[Google OAuth] App returnUrl →', returnUrl);
        }
        const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);
        if (result.type !== 'success') {
          if (__DEV__) console.warn('[Google OAuth] proxy session ended:', result.type);
          return;
        }
        const parsed = googleRequest.parseReturnUrl(result.url);
        if (parsed.type !== 'success') {
          if (__DEV__) console.warn('[Google OAuth] parse error:', parsed);
          const expoProxy = `https://auth.expo.io/${projectFullName}`;
          setGooglePolicyHint(t('auth.googlePolicyHint', { expoProxy }));
          return;
        }

        // Implicit flow: the id_token comes back directly — no code exchange (which would
        // need the Web client's secret).
        await finishGoogleSignIn(parsed.params.id_token);
      } finally {
        setGoogleBusy(false);
      }
      return;
    }

    await promptGoogle();
  };

  const handleEmailAuth = async () => {
    clearError();
    try {
      if (mode === 'register') {
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSkip = async () => {
    await loginAnonymously();
    router.replace('/');
  };

  const toggleMode = () => {
    clearError();
    setMode((m) => (m === 'login' ? 'register' : 'login'));
  };

  const isFormValid =
    mode === 'register'
      ? email.trim() && password.length >= 6 && name.trim()
      : email.trim() && password.length >= 1;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('auth.title')}</Text>
              <Text style={styles.subtitle}>
                {mode === 'login'
                  ? t('auth.subtitleLogin')
                  : t('auth.subtitleRegister')}
              </Text>
            </View>

            {/* Google Sign-In */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => {
                void handleGooglePress();
              }}
              disabled={isLoading || googleBusy || !GOOGLE_WEB_CLIENT_ID || !googleRequest}
              activeOpacity={0.8}
            >
              {googleBusy ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>{t('auth.continueGoogle')}</Text>
                </>
              )}
            </TouchableOpacity>

            {!GOOGLE_WEB_CLIENT_ID ? (
              <Text style={styles.configHint}>{t('auth.configHint')}</Text>
            ) : null}

            {googlePolicyHint ? (
              <View style={styles.policyHintBox}>
                <Text style={styles.policyHintText}>{googlePolicyHint}</Text>
              </View>
            ) : null}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Form */}
            <View style={styles.form}>
              {mode === 'register' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('auth.name')}</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('auth.placeholderName')}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.email')}</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.placeholderEmail')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.password')}</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={
                    mode === 'register'
                      ? t('auth.placeholderPasswordRegister')
                      : t('auth.placeholderPasswordLogin')
                  }
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                />
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !isFormValid && styles.primaryButtonDisabled,
                ]}
                onPress={handleEmailAuth}
                disabled={!isFormValid || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={toggleMode}
            >
              <Text style={styles.switchModeText}>
                {mode === 'login'
                  ? t('auth.switchToRegister')
                  : t('auth.switchToLogin')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>{t('auth.skipGuest')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.largeTitle,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4285F4',
  },
  googleText: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  configHint: {
    ...typography.caption,
    color: colors.warning,
    textAlign: 'center',
  },
  policyHintBox: {
    backgroundColor: 'rgba(243, 156, 18, 0.12)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.35)',
  },
  policyHintText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },

  errorBox: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  errorText: {
    ...typography.captionMedium,
    color: colors.danger,
    textAlign: 'center',
  },

  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    ...shadows.md,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.onPrimary,
  },

  switchModeButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchModeText: {
    ...typography.bodyMedium,
    color: colors.primaryDark,
  },

  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    ...typography.captionMedium,
    color: colors.textMuted,
  },
});
