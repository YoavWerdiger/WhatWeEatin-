import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Share,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Glass } from '../../src/components/ui/Glass';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../../src/theme/colors';
import { typography, fontFamilies } from '../../src/theme/typography';
import { spacing, borderRadius, continuous } from '../../src/theme/spacing';
import { GlassButton } from '../../src/components/native/GlassButton';
import { LobbyPlayers } from '../../src/components/LobbyPlayers';
import { HomeMosaic } from '../../src/components/HomeMosaic';
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
  const [copied, setCopied] = useState(false);

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

  // Everyone waits here anyway — use it to put the first cards' photos in memory.
  const firstPhotos = session?.restaurants.slice(0, 8).map((r) => r.image).filter(Boolean) ?? [];
  useEffect(() => {
    if (firstPhotos.length) void ExpoImage.prefetch(firstPhotos, 'memory-disk');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstPhotos.join('|')]);

  if (!session) {
    return null;
  }

  const playPath = getPlayRouteForGameMode(session.gameMode);

  const modeLabel =
    session.gameMode === 'roulette'
      ? t('lobby.modeRoulette')
      : session.gameMode === 'finger'
        ? t('create.modeFinger')
        : t('lobby.modeSwipe');

  const go = (force: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    startSwiping(force);
    router.replace(playPath);
  };
  // The host can always start; if someone isn't ready yet, confirm first
  const handleStart = () => {
    const ready = new Set(session.lobbyReadyIds ?? []);
    const readyN = session.users.filter((u) => ready.has(u.id)).length;
    if (session.requireLobbyReady && readyN < session.users.length) {
      Alert.alert(
        t('lobby.confirmTitle'),
        t('lobby.confirmBody', { ready: readyN, total: session.users.length }),
        [
          { text: t('lobby.confirmWait'), style: 'cancel' },
          { text: t('lobby.confirmStart'), onPress: () => go(true) },
        ],
      );
      return;
    }
    go(false);
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

  const copyCode = async () => {
    await Clipboard.setStringAsync(session.code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const dishPhotos = session.restaurants.map((r) => r.image).filter(Boolean);

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
    <View style={styles.container}>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={plain(t('common.leave'))}
          onPress={handleLeaveLobby}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="square.and.arrow.up"
          accessibilityLabel={t('create.shareCode')}
          onPress={handleShare}
        />
      </Stack.Toolbar>

      {/* Same language as home: tonight's restaurants drifting under the orange wash */}
      <HomeMosaic photos={dishPhotos} heightRatio={0.5} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.codeBlock}>
          {/* Tap the code to copy it */}
          <Pressable onPress={copyCode} accessibilityRole="button" accessibilityHint={t('lobby.copied')} style={styles.codePress}>
            <Text style={[styles.codeLabel, copied && styles.codeLabelCopied]}>
              {copied ? `${t('lobby.copied')} ✓` : t('lobby.title')}
            </Text>
            <Text style={styles.codeValue} accessibilityLabel={session.code.split('').join(' ')}>
              {session.code}
            </Text>
          </Pressable>
          <View style={styles.metaRow}>
            <MetaChip icon={session.gameMode === 'roulette' ? 'dice' : session.gameMode === 'finger' ? 'finger-print' : 'albums'} label={modeLabel} />
            <MetaChip icon="restaurant" label={`${session.restaurants.length} ${t('lobby.spots')}`} />
            <MetaChip icon={session.timerDuration > 0 ? 'time' : 'infinite'} label={formatTimer(session.timerDuration)} />
          </View>
        </View>

        {/* Who's in (and ready), plus a card to invite one more */}
        <View style={styles.tableArea}>
          <LobbyPlayers
            users={session.users}
            readyIds={session.requireLobbyReady ? readySet : undefined}
            hostId={session.hostId}
            hostLabel={t('lobby.hostLabel')}
            onInvite={handleShare}
            inviteLabel={t('lobby.invite')}
          />
        </View>

      </ScrollView>

      {/* In the layout, not floating — content can never slide under the buttons */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
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
                  ? t('lobby.btnStartAnyway', { ready: readyCount, total: session.users.length })
                  : plain(t('lobby.btnStart'))
            }
            prominent={allReady}
            onPress={handleStart}
            disabled={!canStart}
          />
        )}
      </View>
    </View>
  );
}

function MetaChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <Glass radius={borderRadius.full} interactive tint="rgba(255, 255, 255, 0.6)" style={styles.metaChip}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={styles.metaChipText}>{label}</Text>
    </Glass>
  );
}

const SCREEN_H = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  tableArea: { flex: 1, justifyContent: 'center' },
  codePress: { alignItems: 'center', gap: 4 },
  codeLabelCopied: { color: colors.accentDark },

  codeBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    // The code sits where the mosaic has faded, a third of the way down
    paddingTop: SCREEN_H * 0.2,
  },
  codeLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  // Same voice as the home title: rounded, black, big
  codeValue: {
    fontFamily: fontFamilies.rounded,
    fontSize: 60,
    lineHeight: 64,
    fontWeight: '900',
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
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

  scroll: { flex: 1 },
  bottomBar: {
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
