/**
 * SoundManager.js - Efeitos Sonoros 8-bit Sintetizados Nativamente via Web Audio API
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

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
    } catch (e) {
      // Audio fallback safe
    }
  }

  playCardSlide() {
    // Ruído suave de carta deslizando
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
    // Acorde dramático e impactante de TRUCO!
    this.playTone(260, 'sawtooth', 0.15, 0.2);
    setTimeout(() => this.playTone(390, 'sawtooth', 0.18, 0.22), 80);
    setTimeout(() => this.playTone(520, 'sawtooth', 0.35, 0.25), 160);
  }

  playCoin() {
    // Som clássico de moeda 8-bit
    this.playTone(987, 'sine', 0.08, 0.15);
    setTimeout(() => this.playTone(1318, 'sine', 0.22, 0.15), 70);
  }

  playTrickWon() {
    // Triunfo suave de vaza
    this.playTone(440, 'triangle', 0.09, 0.15);
    setTimeout(() => this.playTone(660, 'triangle', 0.15, 0.15), 90);
  }

  playTrickLost() {
    // Vaza perdida
    this.playTone(280, 'sawtooth', 0.12, 0.12);
    setTimeout(() => this.playTone(220, 'sawtooth', 0.18, 0.12), 100);
  }

  playMatchVictory() {
    // Fanfarra de vitória da partida
    const notes = [330, 392, 493, 587, 659];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.2, 0.2), idx * 100);
    });
  }

  playGameOver() {
    // Jingle melancólico de derrota
    const notes = [392, 370, 330, 246];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.28, 0.18), idx * 140);
    });
  }

  playClick() {
    this.playTone(500, 'sine', 0.04, 0.08);
  }
}

