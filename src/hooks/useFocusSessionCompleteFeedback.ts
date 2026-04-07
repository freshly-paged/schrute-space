import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import {
  notifyFocusSessionComplete,
  playFocusSessionCompleteChime,
} from '../lib/focusSessionCompleteFeedback';

/**
 * When the Pomodoro focus timer hits zero (natural end, not "End Session"),
 * play a short chime and show a system notification if permitted.
 */
export function useFocusSessionCompleteFeedback(): void {
  const prevRef = useRef(useGameStore.getState());

  useEffect(() => {
    return useGameStore.subscribe((state) => {
      const prev = prevRef.current;
      const naturalFocusEnd =
        prev.isTimerActive &&
        prev.timerMode === 'focus' &&
        !state.isTimerActive &&
        state.timeLeft === 0;

      if (naturalFocusEnd) {
        playFocusSessionCompleteChime();
        notifyFocusSessionComplete();
      }

      prevRef.current = state;
    });
  }, []);
}
