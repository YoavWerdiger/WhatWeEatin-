import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { spacing, borderRadius } from '../src/theme/spacing';
import { GlassButton } from '../src/components/native/GlassButton';
import { useAuthStore } from '../src/store/authStore';
import { useTranslation } from '../src/i18n/t';
import { PlateOrbit } from '../src/components/Backdrops';

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

  const MODES: Mode[] = ['login', 'register'];

  return (
    <View style={styles.container}>
      <PlateOrbit />
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <View style={styles.header}>
              <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>{t('auth.title')}</Text>
              <Text style={styles.subtitle}>
                {mode === 'login' ? t('auth.subtitleLogin') : t('auth.subtitleRegister')}
              </Text>
            </View>

            {/* Sign in / Create account — a native segmented control, not a link at the bottom */}
            <SegmentedControl
              values={[t('auth.signIn'), t('auth.createAccount')]}
              selectedIndex={MODES.indexOf(mode)}
              onChange={(e) => {
                if (MODES[e.nativeEvent.selectedSegmentIndex] !== mode) toggleMode();
              }}
            />

            <GlassButton
              title={t('auth.continueGoogle')}
              prominent={false}
              loading={googleBusy}
              disabled={isLoading || !GOOGLE_WEB_CLIENT_ID || !googleRequest}
              onPress={() => {
                void handleGooglePress();
              }}
            />
            {!GOOGLE_WEB_CLIENT_ID ? <Text style={styles.configHint}>{t('auth.configHint')}</Text> : null}
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

            {/* Grouped fields, iOS Settings style */}
            <View style={styles.fields}>
              {mode === 'register' && (
                <>
                  <TextInput
                    style={styles.field}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('auth.placeholderName')}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    textContentType="name"
                    autoComplete="name"
                    accessibilityLabel={t('auth.name')}
                  />
                  <View style={styles.fieldSeparator} />
                </>
              )}
              <TextInput
                style={styles.field}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.placeholderEmail')}
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
                accessibilityLabel={t('auth.email')}
              />
              <View style={styles.fieldSeparator} />
              <TextInput
                style={styles.field}
                value={password}
                onChangeText={setPassword}
                placeholder={
                  mode === 'register' ? t('auth.placeholderPasswordRegister') : t('auth.placeholderPasswordLogin')
                }
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                textContentType={mode === 'register' ? 'newPassword' : 'password'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                accessibilityLabel={t('auth.password')}
                returnKeyType="go"
                onSubmitEditing={() => isFormValid && void handleEmailAuth()}
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <GlassButton
              title={mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
              onPress={handleEmailAuth}
              disabled={!isFormValid}
              loading={isLoading}
            />

            <Pressable onPress={handleSkip} hitSlop={8} style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
              <Text style={styles.skipText}>{t('auth.skipGuest')}</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.lg },
  content: { paddingHorizontal: spacing.md, gap: spacing.md },
  header: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  logo: { width: 64, height: 64, marginBottom: spacing.sm },
  title: { ...typography.largeTitle, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  configHint: { ...typography.footnote, color: colors.warning, textAlign: 'center' },
  policyHintBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    padding: spacing.md,
  },
  policyHintText: { ...typography.footnote, color: colors.textSecondary },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dividerText: { ...typography.footnote, color: colors.textMuted },
  fields: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  field: { ...typography.body, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 14 },
  fieldSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginStart: spacing.md },
  errorText: { ...typography.footnote, color: colors.danger, textAlign: 'center' },
  skipButton: { alignSelf: 'center', paddingVertical: spacing.sm },
  skipText: { ...typography.subheadline, fontWeight: '600', color: colors.textSecondary },
  pressed: { opacity: 0.6 },
});
