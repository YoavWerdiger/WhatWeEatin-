import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
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
import { useTranslation } from '../../src/i18n/t';

export default function JoinSessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, setName } = useUserStore();
  const { joinSession, joinRemoteSession, isOnline, initAuth } = useSessionStore();
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState(user.name);
  const [isJoining, setIsJoining] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleJoin = async () => {
    if (!code.trim() || !displayName.trim()) return;
    setName(displayName);
    setIsJoining(true);

    try {
      let success = false;

      if (isOnline) {
        success = await joinRemoteSession(
          code.toUpperCase(),
          user.id,
          displayName,
        );
      }

      if (!success) {
        success = joinSession(code.toUpperCase(), user.id, displayName);
      }

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push('/session/lobby');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('join.alertTitle'), t('join.alertBody'), [
          { text: t('common.ok') },
        ]);
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('join.title')}</Text>
        <Text style={styles.subtitle}>{t('join.subtitle')}</Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('join.yourName')}</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('join.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('join.sessionCode')}</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              placeholder={t('join.codePlaceholder')}
              placeholderTextColor={colors.textMuted}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        </View>

        <Button
          title={t('join.button')}
          onPress={handleJoin}
          variant="primary"
          size="lg"
          fullWidth
          disabled={code.length < 6 || !displayName.trim()}
          loading={isJoining}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  backText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  title: {
    ...typography.heroTitle,
    color: colors.text,
    fontSize: 32,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
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
  codeInput: {
    ...typography.title,
    textAlign: 'center',
    letterSpacing: 8,
    paddingVertical: spacing.lg,
  },
});
