import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, continuous } from '../../src/theme/spacing';
import { GlassButton, GlassIconButton } from '../../src/components/native/GlassButton';
import { UserList } from '../../src/components/UserList';
import { useSessionStore } from '../../src/store/sessionStore';
import { useUserStore } from '../../src/store/userStore';
import { getFirebaseUid, isFirebaseConfigured } from '../../src/services/firebase';
import { useParticipantNoticeAlert } from '../../src/hooks/useParticipantNoticeAlert';
import { SESSION, getPlayRouteForGameMode } from '../../src/utils/constants';
import { useTranslation } from '../../src/i18n/t';

const plain = (s: string) => s.replace(/[→←✓🚀]/g, '').trim();

export default function LobbyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const initAuth = useSessionStore((s) => s.initAuth);
  const firebaseUid = useSessionStore((s) => s.firebaseUid);
  const leaveSession = useSessionStore((s) => s.leaveSession);
  const toggleLobbyReady = useSessionStore((s) => s.toggleLobbyReady);
  const { session, startSwiping } = useSessionStore();
  useParticipantNoticeAlert();

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

  const handleShare = async () => {
    try {
      await Share.share({ message: t('create.shareMessage', { code: session.code }) });
    } catch {}
  };

  const isHost =
    !isFirebaseConfigured() || (myUid != null && session.hostId === myUid);
  const canStart = session.users.length >= SESSION.MIN_USERS;
  const readySet = new Set(session.lobbyReadyIds ?? []);
  const allReady =
    !session.requireLobbyReady ||
    session.users.every((u) => readySet.has(u.id));
  const imReady = readySet.has(myUid);
  const readyCount = session.users.filter((u) => readySet.has(u.id)).length;

  const formatTimer = (sec: number) => {
    if (sec <= 0) return t('lobby.timerOff');
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s === 0
      ? t('lobby.timerMin', { m })
      : t('lobby.timerMmSs', { m, s: s.toString().padStart(2, '0') });
  };

  const status = !canStart
    ? t('lobby.waitNeedPlayers', { min: SESSION.MIN_USERS })
    : !allReady
      ? `${readyCount}/${session.users.length} · ${t('lobby.btnWaitAll')}`
      : isHost
        ? t('lobby.waitHostCanStart')
        : t('lobby.waitGuest');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <GlassIconButton
          systemImage="xmark"
          accessibilityLabel={plain(t('common.leave'))}
          onPress={handleLeaveLobby}
        />
        <GlassIconButton
          systemImage="square.and.arrow.up"
          accessibilityLabel={t('create.shareCode')}
          onPress={handleShare}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 180 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.codeBlock}>
          <Text style={styles.codeLabel}>{t('lobby.title')}</Text>
          <Text
            style={styles.codeValue}
            selectable
            accessibilityLabel={session.code.split('').join(' ')}
          >
            {session.code}
          </Text>
          <View style={styles.metaRow}>
            <MetaChip label={modeLabel} />
            <MetaChip label={`${session.restaurants.length} ${t('lobby.spots')}`} />
            <MetaChip label={formatTimer(session.timerDuration)} />
          </View>
        </View>

        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupLabel}>{t('lobby.playersSection')}</Text>
            <Text style={styles.groupCount}>{session.users.length}</Text>
          </View>
          <UserList
            users={session.users}
            readyIds={session.requireLobbyReady ? readySet : undefined}
          />
        </View>
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
      >
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {status}
        </Text>
        {session.requireLobbyReady && (
          <GlassButton
            title={plain(imReady ? t('lobby.readyDone') : t('lobby.readyTap'))}
            prominent={!imReady}
            color={colors.accentDark}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleLobbyReady(myUid);
            }}
          />
        )}
        {isHost && (
          <GlassButton
            title={
              !canStart
                ? t('lobby.btnNeedPlayers', { min: SESSION.MIN_USERS })
                : !allReady
                  ? t('lobby.btnWaitAll')
                  : plain(t('lobby.btnStart'))
            }
            onPress={handleStart}
            disabled={!canStart || !allReady}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <View style={styles.metaChip}>
      <Text style={styles.metaChipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.xl,
  },

  codeBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  codeLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  codeValue: {
    ...typography.code,
    fontSize: 44,
    lineHeight: 52,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xs,
  },
  metaChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    ...continuous,
    backgroundColor: colors.surface,
  },
  metaChipText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },

  group: { gap: spacing.sm },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  groupLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  groupCount: {
    ...typography.captionMedium,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  status: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
