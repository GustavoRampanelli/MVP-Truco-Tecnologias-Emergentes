/**
 * SoundManager.js - Efeitos Sonoros 8-bit + Músicas de Fundo (BGM)
 * - Efeitos gerados via Web Audio API (zero dependências)
 * - BGM carregada como HTMLAudioElement (assets/music_menu.mp3 e assets/music_partida.mp3)
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;

    // --- BGM ---
    this._bgmMenu    = null; // HTMLAudioElement
    this._bgmMatch   = null; // HTMLAudioElement
    this._bgmCurrent = null; // qual está tocando agora
    this._bgmVolume  = 0.45;
    this._bgmFadeTimer = null;
  }

  // ─────────────────────────────────────────────
  // Web Audio init (lazy, precisa de gesto do user)
  // ─────────────────────────────────────────────
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();

    // Pré-criar os elementos de áudio BGM uma única vez
    if (!this._bgmMenu) {
      this._bgmMenu = this._createBgmElement('assets/music_menu.mp3');
    }
    if (!this._bgmMatch) {
      this._bgmMatch = this._createBgmElement('assets/music_partida.mp3');
    }
  }

  _createBgmElement(src) {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0;
    audio.preload = 'auto';
    return audio;
  }

  // ─────────────────────────────────────────────
  // BGM: controle público
  // ─────────────────────────────────────────────

  /** Toca a música de menu (tela inicial e loja) */
  playMenuMusic() {
    this._switchBgm(this._bgmMenu);
  }

  /** Toca a música de partida */
  playMatchMusic() {
    this._switchBgm(this._bgmMatch);
  }

  /** Para toda BGM imediatamente */
  stopMusic() {
    this._fadeOut(this._bgmCurrent, 600);
    this._bgmCurrent = null;
  }

  _switchBgm(next) {
    this.init();
    if (!next) return;
    if (this._bgmCurrent === next) {
      // Já está tocando a certa — só garante volume
      if (!this.muted) this._fadeIn(next, 800);
      return;
    }
    // Fade out na atual, fade in na nova
    const prev = this._bgmCurrent;
    this._bgmCurrent = next;
    this._fadeOut(prev, 700);
    if (!this.muted) {
      next.currentTime = next.currentTime > 0 ? next.currentTime : 0;
      next.play().catch(() => {});
      this._fadeIn(next, 800);
    }
  }

  _fadeIn(audio, durationMs) {
    if (!audio) return;
    const steps = 20;
    const stepMs = durationMs / steps;
    const target = this._bgmVolume;
    let step = 0;
    clearInterval(this._bgmFadeTimer);
    this._bgmFadeTimer = setInterval(() => {
      step++;
      audio.volume = Math.min(target, (step / steps) * target);
      if (step >= steps) clearInterval(this._bgmFadeTimer);
    }, stepMs);
  }

  _fadeOut(audio, durationMs) {
    if (!audio) return;
    const startVol = audio.volume;
    const steps = 20;
    const stepMs = durationMs / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVol * (1 - step / steps));
      if (step >= steps) {
        clearInterval(timer);
        audio.pause();
        audio.volume = 0;
      }
    }, stepMs);
  }

  // ─────────────────────────────────────────────
  // Mute / Unmute (efeitos + bgm)
  // ─────────────────────────────────────────────
  setMuted(muted) {
    this.muted = muted;
    if (muted) {
      if (this._bgmCurrent) {
        this._bgmCurrent.volume = 0;
        this._bgmCurrent.pause();
      }
    } else {
      this.init();
      if (this._bgmCurrent) {
        this._bgmCurrent.play().catch(() => {});
        this._fadeIn(this._bgmCurrent, 500);
      }
    }
  }

  // ─────────────────────────────────────────────
  // Efeitos Sonoros (Web Audio API)
  // ─────────────────────────────────────────────
  playTone(freq, type = 'square', duration = 0.1, gainVal = 0.15, decay = true) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      if (decay) {
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      }
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playCardSlide() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  playTrucoCall() {
    this.playTone(260, 'sawtooth', 0.15, 0.2);
    setTimeout(() => this.playTone(390, 'sawtooth', 0.18, 0.22), 80);
    setTimeout(() => this.playTone(520, 'sawtooth', 0.35, 0.25), 160);
  }

  playCoin() {
    this.playTone(987, 'sine', 0.08, 0.15);
    setTimeout(() => this.playTone(1318, 'sine', 0.22, 0.15), 70);
  }

  playTrickWon() {
    this.playTone(440, 'triangle', 0.09, 0.15);
    setTimeout(() => this.playTone(660, 'triangle', 0.15, 0.15), 90);
  }

  playTrickLost() {
    this.playTone(280, 'sawtooth', 0.12, 0.12);
    setTimeout(() => this.playTone(220, 'sawtooth', 0.18, 0.12), 100);
  }

  playMatchVictory() {
    const notes = [330, 392, 493, 587, 659];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.2, 0.2), idx * 100);
    });
  }

  playGameOver() {
    const notes = [392, 370, 330, 246];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.28, 0.18), idx * 140);
    });
  }

  playClick() {
    this.playTone(500, 'sine', 0.04, 0.08);
  }

  // Compat: toggleMute legado
  get muted() { return this._muted; }
  set muted(v) { this._muted = v; }
}
