import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '../i18n/t';
import { useSessionStore } from '../store/sessionStore';

/**
 * Shows a one-shot alert when the Firestore session loses players (someone left).
 * If the room is empty or the host is gone, the alert's button leaves the session
 * and goes home — there is no game to go back to.
 */
export function useParticipantNoticeAlert() {
  const router = useRouter();
  const participantNotice = useSessionStore((s) => s.participantNotice);
  const clearParticipantNotice = useSessionStore((s) => s.clearParticipantNotice);
  const leaveSession = useSessionStore((s) => s.leaveSession);
  const sessionUsersLen = useSessionStore((s) => s.session?.users.length ?? 0);
  const hostGone = useSessionStore(
    (s) => !!s.session && !s.session.users.some((u) => u.id === s.session!.hostId),
  );

  useEffect(() => {
    if (!participantNotice) return;
    const mustLeave = sessionUsersLen === 0 || hostGone;
    const leave = () => {
      clearParticipantNotice();
      leaveSession();
      router.replace('/');
    };
    Alert.alert(
      t('alerts.sessionUpdate'),
      participantNotice,
      [
        mustLeave
          ? { text: t('common.leave'), style: 'destructive', onPress: leave }
          : { text: t('common.ok'), onPress: clearParticipantNotice },
      ],
      // Dismissing a "host left" alert any other way still leaves.
      { cancelable: !mustLeave, onDismiss: mustLeave ? leave : undefined },
    );
  }, [
    participantNotice,
    clearParticipantNotice,
    leaveSession,
    sessionUsersLen,
    hostGone,
    router,
  ]);
}
