// Web Audio API Sound Synthesizer for 160 ONE SIXTY
// Guaranteed offline-ready, no external mp3 files needed.

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private playedKeys: Set<string> = new Set();

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.audioCtx) {
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play pleasant water depot chime for new order
  public playNewOrderChime(volumePercent: number = 80, notificationKey?: string): void {
    if (notificationKey) {
      if (this.playedKeys.has(notificationKey)) {
        return; // Anti-spam: already played
      }
      this.playedKeys.add(notificationKey);
    }

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const masterGain = ctx.createGain();
      const gainVal = Math.max(0, Math.min(1, (volumePercent / 100) * 0.4));
      masterGain.gain.setValueAtTime(gainVal, ctx.currentTime);
      masterGain.connect(ctx.destination);

      // Play 3-tone pleasant rising chord (F5 -> A5 -> C6) like modern POS chime
      const notes = [698.46, 880.0, 1046.5];
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        // Gentle envelope
        const noteStart = now + idx * 0.12;
        noteGain.gain.setValueAtTime(0, noteStart);
        noteGain.gain.linearRampToValueAtTime(1, noteStart + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.45);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(noteStart);
        osc.stop(noteStart + 0.48);
      });
    } catch (err) {
      console.warn('Audio play failed:', err);
    }
  }

  // Success click / ping sound
  public playSuccessTone(volumePercent: number = 80): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const masterGain = ctx.createGain();
      const gainVal = Math.max(0, Math.min(1, (volumePercent / 100) * 0.3));
      masterGain.gain.setValueAtTime(gainVal, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15); // A5

      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(1, ctx.currentTime);
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.26);
    } catch {
      // Ignore
    }
  }
}

export const soundManager = new SoundManager();
