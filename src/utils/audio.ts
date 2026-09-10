/**
 * Shared AudioContext for the rest-timer beep.
 *
 * iOS only lets an AudioContext start (or resume) inside a user gesture. The
 * timer fires on its own long after the last tap, so a context created at
 * that moment stays suspended and the beep is silent. Instead, the context is
 * created and unlocked when the user completes a set — the tap that starts
 * the timer — and reused when the countdown ends.
 */
let ctx: AudioContext | null = null;
let unlocked = false;

function getContext(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Call from a user gesture (tap/click) so later beeps are allowed. */
export function primeAudio(): void {
  const c = getContext();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  if (unlocked) return;
  unlocked = true;
  try {
    // Older iOS also needs an actual (silent) buffer to play inside the gesture.
    const buffer = c.createBuffer(1, 1, 22050);
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(c.destination);
    source.start(0);
  } catch {
    // Not fatal — resume() alone works on current iOS.
  }
}

export function playBeep(): void {
  const c = getContext();
  if (!c) return;

  const play = () => {
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(c.currentTime + 0.2);
    } catch {
      // Audio not available
    }
  };

  if (c.state === 'suspended') {
    c.resume().then(play).catch(() => {});
  } else {
    play();
  }
}
