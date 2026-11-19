import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';

export function useTimer() {
  const { isTimerRunning, timeRemaining, tickTimer } = useSessionStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (isTimerRunning) {
      intervalRef.current = setInterval(() => {
        tickTimer();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTimerRunning, tickTimer]);

  return { isTimerRunning, timeRemaining };
}
