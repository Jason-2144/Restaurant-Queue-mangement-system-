/**
 * TV Audio Announcement Service
 * Uses Web Audio API for a pleasant chime sound, and Web Speech API
 * (speechSynthesis) to speak announcements: "Token 517, please proceed to Table 64."
 */

class AudioAnnouncementService {
  private enabled: boolean = true;
  private audioCtx: AudioContext | null = null;

  constructor() {
    // AudioContext is initialized lazily after user interaction to obey browser policies
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Plays a pleasant restaurant chime chord (Major Triad)
   */
  public playChime() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.12 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 1.3);
      });
    } catch (e) {
      console.warn('Audio chime could not play:', e);
    }
  }

  /**
   * Speaks the standardized allocation announcement:
   * "Token 517, please proceed to Table 64."
   */
  public speakAllocation(tokenNumber: string, tableNumber: string) {
    if (!this.enabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Play chime first
    this.playChime();

    setTimeout(() => {
      try {
        const text = `Token ${tokenNumber}, please proceed to Table ${tableNumber}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        utterance.volume = 1;

        // Try to pick a natural English voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen'))
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        window.speechSynthesis.cancel(); // cancel any previous speaking
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
      }
    }, 600);
  }
}

export const audioAnnouncementService = new AudioAnnouncementService();
