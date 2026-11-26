/**
 * ParticleManager.js - Sistema de Partículas 8-bit/Pixel para Cartas e Eventos do Jogo
 * Usa um <canvas> sobreposto com pointer-events: none e animação a 60fps via requestAnimationFrame.
 */

export class ParticleManager {
  constructor(canvasId = 'particle-canvas') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.ambientParticles = [];
    this.running = false;
    this.lastTime = 0;

    if (this.canvas && this.ctx) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.initAmbient();
      this.start();
    }
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth || window.innerWidth;
      this.canvas.height = parent.clientHeight || window.innerHeight;
    } else {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  initAmbient() {
    this.ambientParticles = [];
    const count = 24;
    for (let i = 0; i < count; i++) {
      this.ambientParticles.push(this._createAmbientMote(true));
    }
  }

  _createAmbientMote(randomY = false) {
    const w = this.canvas ? this.canvas.width : 1280;
    const h = this.canvas ? this.canvas.height : 720;
    return {
      x: Math.random() * w,
      y: randomY ? Math.random() * h : h + 10,
      vx: (Math.random() - 0.5) * 14,
      vy: -(8 + Math.random() * 18),
      size: Math.random() < 0.6 ? 2 : 3,
      alpha: 0.12 + Math.random() * 0.25,
      color: Math.random() < 0.7 ? '#f4d35e' : '#74acdf'
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    const w = this.canvas ? this.canvas.width : 1280;
    const h = this.canvas ? this.canvas.height : 720;

    // Atualizar partículas ambientes (poeira de boteco)
    for (let i = 0; i < this.ambientParticles.length; i++) {
      const m = this.ambientParticles[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.y < -10 || m.x < -10 || m.x > w + 10) {
        this.ambientParticles[i] = this._createAmbientMote(false);
      }
    }

    // Atualizar partículas de efeito
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.spin) p.rotation += p.spin * dt;
    }
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Partículas ambientes
    for (const m of this.ambientParticles) {
      this.ctx.globalAlpha = m.alpha;
      this.ctx.fillStyle = m.color;
      this.ctx.fillRect(Math.round(m.x), Math.round(m.y), m.size, m.size);
    }

    // 2. Partículas de explosão/brilho
    for (const p of this.particles) {
      const progress = p.life / p.maxLife;
      this.ctx.globalAlpha = Math.max(0, Math.min(1, progress * p.alpha));
      this.ctx.fillStyle = p.color;

      const px = Math.round(p.x);
      const py = Math.round(p.y);
      const sz = Math.max(2, Math.round(p.size * (p.shrink ? progress : 1)));

      if (p.shape === 'diamond') {
        this.ctx.save();
        this.ctx.translate(px, py);
        this.ctx.rotate(p.rotation || Math.PI / 4);
        this.ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
        this.ctx.restore();
      } else {
        // Quadrado pixel-art nítido
        this.ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      }
    }

    this.ctx.globalAlpha = 1;
  }

  /**
   * Helper: converte um elemento DOM para coordenadas locais do canvas
   */
  getElementCenter(el) {
    if (!el || !this.canvas) {
      return {
        x: (this.canvas?.width || 1280) / 2,
        y: (this.canvas?.height || 720) / 2
      };
    }
    const canvasRect = this.canvas.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return {
      x: (elRect.left - canvasRect.left) + elRect.width / 2,
      y: (elRect.top - canvasRect.top) + elRect.height / 2
    };
  }

  spawn(opts) {
    if (!this.canvas) return;
    if (this.particles.length > 350) return; // limite de segurança para manter 60fps
    this.particles.push({
      x: opts.x ?? 0,
      y: opts.y ?? 0,
      vx: opts.vx ?? 0,
      vy: opts.vy ?? 0,
      size: opts.size ?? 5,
      color: opts.color ?? '#f4d35e',
      life: opts.life ?? 0.6,
      maxLife: opts.life ?? 0.6,
      gravity: opts.gravity ?? 260,
      drag: opts.drag ?? 0.96,
      alpha: opts.alpha ?? 1,
      shrink: opts.shrink ?? true,
      shape: opts.shape ?? 'square',
      rotation: opts.rotation ?? 0,
      spin: opts.spin ?? 0
    });
  }

  /**
   * Efeito ao jogar uma carta na mesa
   */
  burstCardPlay(elOrCoords, isBravo = false) {
    const pos = elOrCoords instanceof HTMLElement ? this.getElementCenter(elOrCoords) : elOrCoords;
    const colors = isBravo
      ? ['#ffd700', '#74acdf', '#ffffff', '#ffae00']
      : ['#f5e6c8', '#d4a373', '#b08968', '#ffffff'];
    const count = isBravo ? 28 : 14;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = (isBravo ? 110 : 70) + Math.random() * (isBravo ? 160 : 90);
      this.spawn({
        x: pos.x + (Math.random() - 0.5) * 24,
        y: pos.y + (Math.random() - 0.5) * 24,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        size: isBravo ? 5 + Math.random() * 4 : 3 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: isBravo ? 0.65 + Math.random() * 0.3 : 0.38 + Math.random() * 0.2,
        gravity: isBravo ? 180 : 240,
        drag: 0.93,
        shape: isBravo ? 'diamond' : 'square',
        spin: isBravo ? (Math.random() - 0.5) * 8 : 0
      });
    }
  }

  /**
   * Faíscas sutis ao passar o mouse sobre uma carta Bravo na mão
   */
  sparkleCardHover(el, isBravo = false) {
    if (!el || !this.canvas) return;
    const rect = el.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    const x = (rect.left - canvasRect.left) + Math.random() * rect.width;
    const y = (rect.top - canvasRect.top) + Math.random() * rect.height * 0.8;

    const colors = isBravo ? ['#ffd700', '#74acdf', '#ffffff'] : ['#f4d35e', '#ffffff'];
    this.spawn({
      x,
      y,
      vx: (Math.random() - 0.5) * 30,
      vy: -30 - Math.random() * 40,
      size: isBravo ? 5 : 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0.45 + Math.random() * 0.2,
      gravity: -20,
      drag: 0.98,
      shape: 'diamond',
      spin: 4
    });
  }

  /**
   * Explosão dramática para gritos de TRUCO / RETRUCO / VALE CUATRO
   */
  burstTruco(betType = 'TRUCO') {
    if (!this.canvas) return;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height * 0.42;

    const palette = betType === 'VALE_CUATRO'
      ? ['#ff2a2a', '#ff8800', '#ffd700', '#ffffff']
      : betType === 'RETRUCO'
        ? ['#ff6b00', '#ffd700', '#ff3b30', '#ffffff']
        : ['#ffd700', '#f4a261', '#e76f51', '#ffffff'];

    const count = betType === 'VALE_CUATRO' ? 60 : 42;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 130 + Math.random() * 320;
      this.spawn({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: 5 + Math.random() * 6,
        color: palette[Math.floor(Math.random() * palette.length)],
        life: 0.65 + Math.random() * 0.45,
        gravity: 340,
        drag: 0.94,
        shape: Math.random() < 0.5 ? 'diamond' : 'square',
        spin: (Math.random() - 0.5) * 10
      });
    }
  }

  /**
   * Chuva / Explosão de vitória (Vaza, Mão ou Partida)
   */
  burstVictory(intensity = 'trick') {
    if (!this.canvas) return;
    const cx = this.canvas.width / 2;
    const cy = intensity === 'match' ? this.canvas.height * 0.35 : this.canvas.height * 0.5;
    const count = intensity === 'match' ? 85 : intensity === 'hand' ? 45 : 22;
    const colors = ['#ffd700', '#74acdf', '#4ade80', '#ffffff', '#f4d35e'];

    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const speed = 160 + Math.random() * (intensity === 'match' ? 380 : 240);
      this.spawn({
        x: cx + (Math.random() - 0.5) * (intensity === 'match' ? 280 : 100),
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.8 + Math.random() * 0.7,
        gravity: 380,
        drag: 0.97,
        shape: Math.random() < 0.5 ? 'square' : 'diamond',
        spin: (Math.random() - 0.5) * 9
      });
    }
  }

  /**
   * Partículas douradas de moedas/curingas
   */
  burstCoins(elOrCoords = null) {
    const pos = elOrCoords instanceof HTMLElement
      ? this.getElementCenter(elOrCoords)
      : elOrCoords || { x: (this.canvas?.width || 1280) * 0.16, y: (this.canvas?.height || 720) * 0.82 };

    const colors = ['#ffd700', '#f4d35e', '#fff3b0'];
    for (let i = 0; i < 18; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const speed = 80 + Math.random() * 140;
      this.spawn({
        x: pos.x + (Math.random() - 0.5) * 20,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.6 + Math.random() * 0.3,
        gravity: 300,
        drag: 0.96,
        shape: 'square'
      });
    }
  }
}
