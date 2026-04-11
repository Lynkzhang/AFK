/**
 * M32: SoundManager — Programmatic audio via Web Audio API
 * All sounds generated with OscillatorNode + GainNode, no external audio files.
 */

type OscType = OscillatorType;

class SoundManager {
  private ctx: AudioContext | null = null;
  private _isMuted = false;
  private _masterVolume = 0.5;
  private _bgmVolume = 0.4;
  private _isBGMPlaying = false;
  private bgmTimer: ReturnType<typeof setTimeout> | null = null;
  private bgmGain: GainNode | null = null;

  /* ---- public getters ---- */
  get isMuted(): boolean { return this._isMuted; }
  get masterVolume(): number { return this._masterVolume; }
  get isBGMPlaying(): boolean { return this._isBGMPlaying; }

  /* ---- context management ---- */
  private ensureContext(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => { /* ignore */ });
    }
    return this.ctx;
  }

  /* ---- volume / mute controls ---- */
  setMasterVolume(v: number): void {
    this._masterVolume = Math.max(0, Math.min(1, v));
    if (this.bgmGain) {
      this.bgmGain.gain.value = this._bgmVolume * this._masterVolume * (this._isMuted ? 0 : 1);
    }
  }

  toggleMute(): boolean {
    this._isMuted = !this._isMuted;
    if (this.bgmGain) {
      this.bgmGain.gain.value = this._isMuted ? 0 : this._bgmVolume * this._masterVolume;
    }
    return this._isMuted;
  }

  /* ---- BGM ---- */
  private readonly bgmMelody: Array<{ freq: number; dur: number }> = [
    { freq: 262, dur: 0.2 }, // C4
    { freq: 330, dur: 0.2 }, // E4
    { freq: 392, dur: 0.2 }, // G4
    { freq: 523, dur: 0.2 }, // C5
    { freq: 392, dur: 0.2 }, // G4
    { freq: 330, dur: 0.2 }, // E4
    { freq: 262, dur: 0.2 }, // C4
    { freq: 196, dur: 0.2 }, // G3
    { freq: 294, dur: 0.2 }, // D4
    { freq: 349, dur: 0.2 }, // F4
    { freq: 440, dur: 0.2 }, // A4
    { freq: 349, dur: 0.2 }, // F4
    { freq: 294, dur: 0.2 }, // D4
    { freq: 262, dur: 0.2 }, // C4
    { freq: 196, dur: 0.2 }, // G3
    { freq: 247, dur: 0.2 }, // B3
  ];

  startBGM(): void {
    if (this._isBGMPlaying) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this._isBGMPlaying = true;
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = this._isMuted ? 0 : this._bgmVolume * this._masterVolume;
    this.bgmGain.connect(ctx.destination);
    this.playBGMNote(0);
  }

  stopBGM(): void {
    this._isBGMPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmGain) {
      this.bgmGain.disconnect();
      this.bgmGain = null;
    }
  }

  toggleBGM(): boolean {
    if (this._isBGMPlaying) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this._isBGMPlaying;
  }

  private playBGMNote(index: number): void {
    if (!this._isBGMPlaying || !this.bgmGain) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const note = this.bgmMelody[index % this.bgmMelody.length]!;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = note.freq;

    const noteGain = ctx.createGain();
    noteGain.gain.value = 0.15;
    noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.dur * 0.9);

    osc.connect(noteGain).connect(this.bgmGain);
    osc.start();
    osc.stop(ctx.currentTime + note.dur);

    this.bgmTimer = setTimeout(() => {
      this.playBGMNote((index + 1) % this.bgmMelody.length);
    }, note.dur * 1000);
  }

  /* ---- primitive tone helpers ---- */
  private playTone(freq: number, duration: number, type: OscType = 'sine', volume = 0.3): void {
    const ctx = this.ensureContext();
    if (!ctx || this._isMuted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume * this._masterVolume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  private playFreqSweep(startFreq: number, endFreq: number, duration: number, type: OscType = 'sine', volume = 0.3): void {
    const ctx = this.ensureContext();
    if (!ctx || this._isMuted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration);
    gain.gain.value = volume * this._masterVolume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  private scheduleNotes(notes: Array<{ freq: number; delay: number; dur: number; type?: OscType; vol?: number }>): void {
    const ctx = this.ensureContext();
    if (!ctx || this._isMuted) return;
    const now = ctx.currentTime;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type ?? 'sine';
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime((n.vol ?? 0.3) * this._masterVolume, now + n.delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.delay + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.delay);
      osc.stop(now + n.delay + n.dur);
    }
  }

  /* ---- UI sounds ---- */
  playUIClick(): void {
    this.playTone(1000, 0.05, 'square', 0.15);
  }

  playPanelOpen(): void {
    this.playFreqSweep(400, 800, 0.15, 'sine', 0.2);
  }

  playPanelClose(): void {
    this.playFreqSweep(800, 400, 0.15, 'sine', 0.2);
  }

  /* ---- game event sounds ---- */
  playSplit(): void {
    this.scheduleNotes([
      { freq: 523, delay: 0, dur: 0.1 },      // C5
      { freq: 659, delay: 0.1, dur: 0.1 },    // E5
      { freq: 784, delay: 0.2, dur: 0.1 },    // G5
    ]);
  }

  playMutation(): void {
    this.scheduleNotes([
      { freq: 330, delay: 0, dur: 0.2, type: 'triangle' },
      { freq: 415, delay: 0, dur: 0.2, type: 'triangle' },
    ]);
  }

  playCull(): void {
    this.playFreqSweep(200, 100, 0.2, 'sine', 0.25);
  }

  playSell(): void {
    this.scheduleNotes([
      { freq: 1200, delay: 0, dur: 0.07, type: 'square', vol: 0.15 },
      { freq: 1600, delay: 0.07, dur: 0.08, type: 'square', vol: 0.15 },
    ]);
  }

  playArchive(): void {
    this.scheduleNotes([
      { freq: 500, delay: 0, dur: 0.12 },
      { freq: 350, delay: 0.12, dur: 0.08 },
      { freq: 600, delay: 0.2, dur: 0.1 },
    ]);
  }

  /* ---- battle sounds ---- */
  playAttack(): void {
    this.playTone(180, 0.1, 'sawtooth', 0.2);
  }

  playDefense(): void {
    this.playTone(500, 0.08, 'triangle', 0.2);
  }

  playHeal(): void {
    this.scheduleNotes([
      { freq: 440, delay: 0, dur: 0.15 },
      { freq: 554, delay: 0.1, dur: 0.15 },
      { freq: 659, delay: 0.2, dur: 0.1 },
    ]);
  }

  playVictory(): void {
    this.scheduleNotes([
      { freq: 523, delay: 0, dur: 0.12 },     // C5
      { freq: 587, delay: 0.12, dur: 0.12 },  // D5
      { freq: 659, delay: 0.24, dur: 0.12 },  // E5
      { freq: 784, delay: 0.36, dur: 0.15 },  // G5
    ]);
  }

  playDefeat(): void {
    this.scheduleNotes([
      { freq: 392, delay: 0, dur: 0.13 },     // G4
      { freq: 330, delay: 0.13, dur: 0.13 },  // E4
      { freq: 262, delay: 0.26, dur: 0.15 },  // C4
    ]);
  }

  /* ---- achievement / reward sounds ---- */
  playAchievement(): void {
    this.scheduleNotes([
      { freq: 523, delay: 0, dur: 0.1 },
      { freq: 659, delay: 0.1, dur: 0.1 },
      { freq: 1047, delay: 0.25, dur: 0.15 },
    ]);
  }

  playRewardClaim(): void {
    this.scheduleNotes([
      { freq: 800, delay: 0, dur: 0.06, type: 'square', vol: 0.15 },
      { freq: 1000, delay: 0.06, dur: 0.06, type: 'square', vol: 0.15 },
      { freq: 1200, delay: 0.12, dur: 0.08, type: 'square', vol: 0.15 },
    ]);
  }
}

export const soundManager = new SoundManager();
