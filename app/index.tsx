import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { spacing, borderRadius, shadows } from '../src/theme/spacing';
import { Button } from '../src/components/ui/Button';
import { useUserStore } from '../src/store/userStore';
import { useAuthStore } from '../src/store/authStore';
import { useSessionStore } from '../src/store/sessionStore';
import { useTranslation } from '../src/i18n/t';
import { AdBanner } from '../src/components/ads/AdBanner';

const { width } = Dimensions.get('window');

const FOOD_EMOJIS = ['🍕', '🍔', '🌮', '🍣', '🥗', '🍜', '🥘', '🍱'];

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUserStore();
  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const initSessionAuth = useSessionStore((s) => s.initAuth);
  const displayName = authUser?.displayName || user.name;

  useEffect(() => {
    initSessionAuth();
  }, []);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const emojiAnims = useRef(
    FOOD_EMOJIS.map(() => new Animated.Value(0)),
  ).current;

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

    emojiAnims.forEach((anim, i) => {
      Animated.sequence([
        Animated.delay(300 + i * 100),
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.emojiRing}>
        {FOOD_EMOJIS.map((emoji, i) => {
          const angle = (i / FOOD_EMOJIS.length) * 2 * Math.PI - Math.PI / 2;
          const radius = 100;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <Animated.Text
              key={i}
              style={[
                styles.emoji,
                {
                  transform: [
                    { translateX: x },
                    { translateY: y },
                    { scale: emojiAnims[i] },
                  ],
                  opacity: emojiAnims[i],
                },
              ]}
            >
              {emoji}
            </Animated.Text>
          );
        })}
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="What We Eatin'"
        />
      </View>

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
          <Button
            title={t('home.createSession')}
            onPress={() => router.push('/session/create')}
            variant="primary"
            size="lg"
            fullWidth
          />

          <Button
            title={t('home.joinSession')}
            onPress={() => router.push('/session/join')}
            variant="secondary"
            size="lg"
            fullWidth
          />
        </View>
      </Animated.View>

      <View style={styles.footer}>
        {/* Low-risk placement: between sessions on home — never on swipe stack */}
        <AdBanner placement="home_footer" />
        <TouchableOpacity
          style={styles.profilePill}
          onPress={() => {
            if (authUser?.provider === 'anonymous') {
              router.push('/auth');
            } else {
              router.push('/account');
            }
          }}
          onLongPress={() => logout()}
        >
          <View
            style={[
              styles.profileDot,
              {
                backgroundColor:
                  authUser?.provider === 'anonymous'
                    ? colors.textMuted
                    : colors.accent,
              },
            ]}
          />
          <Text style={styles.profileName} numberOfLines={1}>
            {authUser?.provider === 'anonymous'
              ? t('home.guestHint')
              : displayName || authUser?.email || t('home.signedIn')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  emojiRing: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
    marginTop: spacing.xl,
  },
  emoji: {
    position: 'absolute',
    fontSize: 36,
  },
  logo: {
    width: 88,
    height: 88,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.heroTitle,
    color: colors.text,
    fontSize: 48,
    lineHeight: 52,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
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
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    ...shadows.sm,
    maxWidth: '100%',
  },
  profileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  profileName: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    maxWidth: 220,
  },
});
