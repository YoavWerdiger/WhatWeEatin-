import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
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
import { spacing, borderRadius } from '../../src/theme/spacing';
import { Button } from '../../src/components/ui/Button';
import { UserList } from '../../src/components/UserList';
import { useSessionStore } from '../../src/store/sessionStore';
import { useUserStore } from '../../src/store/userStore';
import { getFirebaseUid, isFirebaseConfigured } from '../../src/services/firebase';
import { useParticipantNoticeAlert } from '../../src/hooks/useParticipantNoticeAlert';
import { SESSION, getPlayRouteForGameMode } from '../../src/utils/constants';
import { useTranslation } from '../../src/i18n/t';

export default function LobbyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUserStore();
  const initAuth = useSessionStore((s) => s.initAuth);
  const firebaseUid = useSessionStore((s) => s.firebaseUid);
  const leaveSession = useSessionStore((s) => s.leaveSession);
  const toggleLobbyReady = useSessionStore((s) => s.toggleLobbyReady);
  const { session, startSwiping } = useSessionStore();
  useParticipantNoticeAlert();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (session?.status === 'swiping' || session?.status === 'matched' || session?.status === 'expired') {
      router.replace(getPlayRouteForGameMode(session.gameMode));
    }
  }, [session?.status, session?.gameMode, router]);

  useEffect(() => {
    if (!session) {
      router.replace('/');
    }
  }, [session, router]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!session) {
    return null;
  }

  const playPath = getPlayRouteForGameMode(session.gameMode);

  const modeLabel =
    session.gameMode === 'roulette'
      ? t('lobby.modeRoulette')
      : t('lobby.modeSwipe');

  const handleStart = () => {
    if (session.requireLobbyReady) {
      const ready = new Set(session.lobbyReadyIds ?? []);
      const allReady = session.users.every((u) => ready.has(u.id));
      if (!allReady) {
        Alert.alert(t('lobby.alertAlmostTitle'), t('lobby.alertAlmostBody'));
        return;
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    startSwiping();
    router.replace(playPath);
  };

  const myUid = getFirebaseUid() ?? firebaseUid ?? user.id;

  const handleLeaveLobby = () => {
    leaveSession(myUid);
    router.replace('/');
  };

  const isHost =
    !isFirebaseConfigured() || (myUid != null && session.hostId === myUid);
  const canStart = session.users.length >= SESSION.MIN_USERS;
  const readySet = new Set(session.lobbyReadyIds ?? []);
  const allReady =
    !session.requireLobbyReady ||
    session.users.every((u) => readySet.has(u.id));
  const imReady = readySet.has(myUid);

  const formatTimer = (sec: number) => {
    if (sec <= 0) return t('lobby.timerOff');
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s === 0
      ? t('lobby.timerMin', { m })
      : t('lobby.timerMmSs', { m, s: s.toString().padStart(2, '0') });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleLeaveLobby} hitSlop={12}>
            <Text style={styles.leaveText}>{t('common.leave')}</Text>
          </TouchableOpacity>
          <View style={styles.codePill}>
            <Text style={styles.codeValue}>{session.code}</Text>
          </View>
        </View>

        <Text style={styles.metaLine}>
          {session.users.length} {t('lobby.players')} · {session.restaurants.length}{' '}
          {t('lobby.spots')} · {formatTimer(session.timerDuration)}
        </Text>
        <Text style={styles.modeLine}>
          {t('lobby.modeActive', { mode: modeLabel })}
        </Text>

        <View style={styles.players}>
          <UserList users={session.users} />
        </View>

        {session.requireLobbyReady && (
          <TouchableOpacity
            style={[styles.readyButton, imReady && styles.readyButtonActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleLobbyReady(myUid);
            }}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.readyButtonText, imReady && styles.readyButtonTextActive]}
            >
              {imReady ? t('lobby.readyDone') : t('lobby.readyTap')}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          {isHost ? (
            <>
              {!canStart || (session.requireLobbyReady && !allReady) ? (
                <Text style={styles.hint}>
                  {!canStart
                    ? t('lobby.waitNeedPlayers', { min: SESSION.MIN_USERS })
                    : t('lobby.waitHostCanStart')}
                </Text>
              ) : null}
              <Button
                title={
                  !canStart
                    ? t('lobby.btnNeedPlayers', { min: SESSION.MIN_USERS })
                    : session.requireLobbyReady && !allReady
                      ? t('lobby.btnWaitAll')
                      : t('lobby.btnStart')
                }
                onPress={handleStart}
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canStart || (session.requireLobbyReady && !allReady)}
              />
            </>
          ) : (
            <Text style={styles.guestHint}>{t('lobby.guestHint')}</Text>
          )}
        </View>
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
    paddingTop: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  leaveText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  codePill: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  codeValue: {
    ...typography.bodySemiBold,
    color: colors.primary,
    letterSpacing: 3,
  },
  metaLine: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  modeLine: {
    ...typography.captionMedium,
    color: colors.primary,
    marginBottom: spacing.xl,
  },
  players: {
    flex: 1,
  },
  readyButton: {
    alignSelf: 'stretch',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  readyButtonActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
  },
  readyButtonText: {
    ...typography.bodySemiBold,
    color: colors.textSecondary,
  },
  readyButtonTextActive: {
    color: colors.accentDark,
  },
  footer: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  guestHint: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
