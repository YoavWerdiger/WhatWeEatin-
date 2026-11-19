import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '../i18n/t';
import { useSessionStore } from '../store/sessionStore';

/**
 * Shows a one-shot alert when the Firestore session loses players (someone left).
 * If the room is empty, sends the user home after OK.
 */
export function useParticipantNoticeAlert() {
  const router = useRouter();
  const participantNotice = useSessionStore((s) => s.participantNotice);
  const clearParticipantNotice = useSessionStore((s) => s.clearParticipantNotice);
  const leaveSession = useSessionStore((s) => s.leaveSession);
  const sessionUsersLen = useSessionStore((s) => s.session?.users.length ?? 0);

  useEffect(() => {
    if (!participantNotice) return;
    const roomEmpty = sessionUsersLen === 0;
    Alert.alert(t('alerts.sessionUpdate'), participantNotice, [
      {
        text: t('common.ok'),
        onPress: () => {
          clearParticipantNotice();
          if (roomEmpty) {
            leaveSession();
            router.replace('/');
          }
        },
      },
    ]);
  }, [
    participantNotice,
    clearParticipantNotice,
    leaveSession,
    sessionUsersLen,
    router,
  ]);
}
