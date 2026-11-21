import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { spacing, borderRadius, shadows } from '../src/theme/spacing';
import { GlassButton } from '../src/components/native/GlassButton';
import { useUserStore } from '../src/store/userStore';
import { useAuthStore } from '../src/store/authStore';
import { useSessionStore } from '../src/store/sessionStore';
import { useTranslation } from '../src/i18n/t';
import { AdBanner } from '../src/components/ads/AdBanner';
import { HomeMosaic } from '../src/components/HomeMosaic';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUserStore();
  const authUser = useAuthStore((s) => s.user);
  const initSessionAuth = useSessionStore((s) => s.initAuth);
  const displayName = authUser?.displayName || user.name;

  useEffect(() => {
    initSessionAuth();
  }, []);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Backdrop: a tilted grid of food photos drifting under an orange wash */}
      <HomeMosaic />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.title}>{t('home.title')}</Text>
        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>

        <View style={styles.actions}>
          <GlassButton
            title={t('home.createSession')}
            onPress={() => router.push('/session/create')}
          />
          <GlassButton
            title={t('home.joinSession')}
            prominent={false}
            onPress={() => router.push('/session/join')}
          />
        </View>
      </Animated.View>

      <View style={styles.footer}>
        {/* Low-risk placement: between sessions on home — never on swipe stack */}
        <AdBanner placement="home_footer" />
        <GlassButton
          title={
            authUser?.provider === 'anonymous'
              ? t('home.guestHint')
              : displayName || authUser?.email || t('home.signedIn')
          }
          prominent={false}
          fullWidth={false}
          onPress={() => router.push(authUser?.provider === 'anonymous' ? '/auth' : '/account')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  // White over the orange wash
  title: {
    ...typography.display,
    color: '#FFFFFF',
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    width: '100%',
  },
});
