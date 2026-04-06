/** Short completion chime + optional desktop notification when a desk focus session ends naturally. */

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new Ctor();
  }
  return sharedAudioContext;
}

/** Ascending major arpeggio (~1.5s), no external assets. */
export function playFocusSessionCompleteChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    void ctx.resume();

    const now = ctx.currentTime;
    // C5 → E5 → G5 → C6
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    const step = 0.14;
    const noteDur = 0.38;

    for (let i = 0; i < freqs.length; i++) {
      const t0 = now + i * step;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i]!, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.11, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + noteDur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + noteDur + 0.02);
    }
  } catch {
    /* autoplay / AudioContext policy */
  }
}

export function notifyFocusSessionComplete(): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification('Focus session complete', {
      body: 'Your desk focus session has ended.',
      tag: 'schrute-focus-complete',
    });
  } catch {
    /* some environments restrict Notification */
  }
}

/** Call from a user gesture (e.g. starting focus) so the browser may grant permission. */
export function requestFocusNotificationPermissionIfNeeded(): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'default') return;
  void Notification.requestPermission();
}
