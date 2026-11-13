/**
 * App.js - Controlador Principal da Aplicação e Telas
 */

import { RunManager } from '../roguelike/RunManager.js';
import { SoundManager } from '../audio/SoundManager.js';
import { TableRenderer } from './TableRenderer.js';
import { ShopRenderer } from './ShopRenderer.js';
import { Dialogs } from './Dialogs.js';

export class App {
  constructor() {
    this.runManager = new RunManager();
    this.sound = new SoundManager();
    this.tableRenderer = new TableRenderer(this, this.runManager, this.sound);
    this.shopRenderer = new ShopRenderer(this, this.runManager, this.sound);

    this.activeScreen = 'title'; // 'title' | 'table' | 'shop'
  }

  init() {
    this.bindEvents();
    this.showScreen('title-screen');
  }

  bindEvents() {
    // Tela Inicial
    document.getElementById('btn-start-run').onclick = () => {
      this.sound.playClick();
      this.startNewRun();
    };

    document.getElementById('btn-open-rules').onclick = () => {
      this.sound.playClick();
      document.getElementById('rules-modal').classList.remove('hidden');
    };

    document.getElementById('btn-close-rules').onclick = () => {
      document.getElementById('rules-modal').classList.add('hidden');
    };

    // Botões de Ação na Mesa
    document.getElementById('btn-call-truco').onclick = (e) => {
      const betType = e.currentTarget.dataset.betType || 'TRUCO';
      this.tableRenderer.playerProposeTruco(betType);
    };

    document.getElementById('btn-call-envido').onclick = () => {
      this.tableRenderer.playerCallEnvido('ENVIDO');
    };

    document.getElementById('btn-call-flor').onclick = () => {
      this.tableRenderer.playerCallEnvido('FLOR');
    };

    document.getElementById('btn-fold').onclick = () => {
      this.tableRenderer.handlePlayerFold();
    };

    // Alternador de Dicas de Força
    const hintsToggle = document.getElementById('toggle-hints');
    if (hintsToggle) {
      hintsToggle.onchange = (e) => {
        this.tableRenderer.showHints = e.target.checked;
        this.tableRenderer.renderTableCards();
      };
    }

    // Alternador de Áudio
    const muteBtn = document.getElementById('btn-toggle-sound');
    if (muteBtn) {
      muteBtn.onclick = () => this.toggleSound();
    }

    // Botões de Tela Cheia (Title, Mesa e Pausa)
    const titleFullBtn = document.getElementById('btn-title-fullscreen');
    if (titleFullBtn) {
      titleFullBtn.onclick = () => {
        this.sound.playClick();
        this.toggleFullscreen();
      };
    }

    const gameFullBtn = document.getElementById('btn-toggle-fullscreen');
    if (gameFullBtn) {
      gameFullBtn.onclick = () => {
        this.sound.playClick();
        this.toggleFullscreen();
      };
    }

    const pauseFullBtn = document.getElementById('btn-pause-fullscreen');
    if (pauseFullBtn) {
      pauseFullBtn.onclick = () => {
        this.sound.playClick();
        this.toggleFullscreen();
      };
    }

    // Sincronizar estado de fullscreen nativo
    document.addEventListener('fullscreenchange', () => this.updateFullscreenUI());
    document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenUI());

    // Botão de Abrir Menu de Pausa
    const openPauseBtn = document.getElementById('btn-open-pause-menu');
    if (openPauseBtn) {
      openPauseBtn.onclick = () => this.openPauseMenu();
    }

    // Ações do Modal de Pausa
    const resumeBtn = document.getElementById('btn-pause-resume');
    if (resumeBtn) {
      resumeBtn.onclick = () => this.closePauseMenu();
    }

    const pauseSoundBtn = document.getElementById('btn-pause-sound');
    if (pauseSoundBtn) {
      pauseSoundBtn.onclick = () => this.toggleSound();
    }

    const pauseHintsBtn = document.getElementById('btn-pause-hints');
    if (pauseHintsBtn) {
      pauseHintsBtn.onclick = () => {
        this.sound.playClick();
        this.tableRenderer.showHints = !this.tableRenderer.showHints;
        this.updateHintsUI();
        this.tableRenderer.renderTableCards();
      };
    }

    const pauseRulesBtn = document.getElementById('btn-pause-rules');
    if (pauseRulesBtn) {
      pauseRulesBtn.onclick = () => {
        this.sound.playClick();
        document.getElementById('rules-modal').classList.remove('hidden');
      };
    }

    const restartMatchBtn = document.getElementById('btn-pause-restart-match');
    if (restartMatchBtn) {
      restartMatchBtn.onclick = () => {
        this.closePauseMenu();
        Dialogs.showToast('Partida reiniciada!', 'info');
        this.tableRenderer.startMatch();
      };
    }

    const quitTitleBtn = document.getElementById('btn-pause-quit-title');
    if (quitTitleBtn) {
      quitTitleBtn.onclick = () => {
        this.closePauseMenu();
        this.showScreen('title-screen');
      };
    }

    // Atalho de teclado: Tecla ESC para abrir/fechar pausa
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const rulesModal = document.getElementById('rules-modal');
        if (rulesModal && !rulesModal.classList.contains('hidden')) {
          rulesModal.classList.add('hidden');
          return;
        }

        const pauseModal = document.getElementById('pause-modal');
        if (this.activeScreen === 'game-screen' || this.activeScreen === 'shop-screen') {
          if (pauseModal && !pauseModal.classList.contains('hidden')) {
            this.closePauseMenu();
          } else {
            this.openPauseMenu();
          }
        }
      }
    });

    // Botão de Avançar na Loja
    document.getElementById('btn-leave-shop').onclick = () => {
      this.sound.playClick();
      this.runManager.advanceToNextMatch();
      this.showScreen('game-screen');
      this.tableRenderer.startMatch();
    };

    // Botões de Vitória/Derrota
    document.getElementById('btn-victory-continue').onclick = () => {
      document.getElementById('match-victory-modal').classList.add('hidden');
      this.showScreen('shop-screen');
      this.shopRenderer.render();
    };

    document.getElementById('btn-defeat-retry').onclick = () => {
      document.getElementById('match-defeat-modal').classList.add('hidden');
      this.showScreen('game-screen');
      this.tableRenderer.startMatch();
    };

    // Game Over / Run Won
    document.getElementById('btn-gameover-restart').onclick = () => {
      document.getElementById('game-over-screen').classList.add('hidden');
      this.startNewRun();
    };

    document.getElementById('btn-runwon-restart').onclick = () => {
      document.getElementById('run-won-screen').classList.add('hidden');
      this.startNewRun();
    };
  }

  showScreen(screenId) {
    this.activeScreen = screenId;
    const screens = ['title-screen', 'game-screen', 'shop-screen', 'game-over-screen', 'run-won-screen'];
    screens.forEach(s => {
      const el = document.getElementById(s);
      if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');

    this.updateFullscreenUI();
    this.updateSoundUI();
  }

  toggleFullscreen() {
    const container = document.getElementById('app-container');
    if (!document.fullscreenElement) {
      if (container && container.requestFullscreen) {
        container.requestFullscreen().catch(() => {
          document.documentElement.requestFullscreen().catch(err => {
            console.warn('Erro ao ativar fullscreen:', err);
          });
        });
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn('Erro ao sair do fullscreen:', err));
      }
    }
  }

  updateFullscreenUI() {
    const isFull = !!document.fullscreenElement;
    const container = document.getElementById('app-container');
    if (container) {
      if (isFull) {
        container.classList.add('is-fullscreen');
      } else {
        container.classList.remove('is-fullscreen');
      }
    }

    const titleBtn = document.getElementById('btn-title-fullscreen');
    if (titleBtn) {
      titleBtn.textContent = isFull ? '🗗 Sair da Tela Cheia' : '⛶ Alternar Tela Cheia';
    }

    const gameBtn = document.getElementById('btn-toggle-fullscreen');
    if (gameBtn) {
      gameBtn.textContent = isFull ? '🗗 Janela' : '⛶ Tela Cheia';
    }

    const pauseBtn = document.getElementById('btn-pause-fullscreen');
    if (pauseBtn) {
      pauseBtn.textContent = isFull ? '🗗 Sair da Tela Cheia' : '⛶ Alternar Tela Cheia';
    }
  }

  toggleSound() {
    this.sound.muted = !this.sound.muted;
    this.updateSoundUI();
  }

  updateSoundUI() {
    const muteBtn = document.getElementById('btn-toggle-sound');
    if (muteBtn) {
      muteBtn.textContent = this.sound.muted ? '🔇 Mudo' : '🔊 Som';
    }

    const pauseSoundBtn = document.getElementById('btn-pause-sound');
    if (pauseSoundBtn) {
      pauseSoundBtn.textContent = this.sound.muted ? '🔇 Som Desativado' : '🔊 Som Ativado';
    }
  }

  openPauseMenu() {
    const modal = document.getElementById('pause-modal');
    if (modal) {
      this.sound.playClick();
      modal.classList.remove('hidden');
      this.updateSoundUI();
      this.updateFullscreenUI();
      this.updateHintsUI();
    }
  }

  updateHintsUI() {
    const pauseHintsBtn = document.getElementById('btn-pause-hints');
    if (pauseHintsBtn) {
      pauseHintsBtn.textContent = this.tableRenderer.showHints
        ? '★ Dicas de Força: ATIVADAS'
        : '☆ Dicas de Força: DESATIVADAS';
    }
  }

  closePauseMenu() {
    const modal = document.getElementById('pause-modal');
    if (modal) {
      this.sound.playClick();
      modal.classList.add('hidden');
    }
  }

  startNewRun() {
    this.runManager.reset();
    this.showScreen('game-screen');
    this.tableRenderer.startMatch();
  }

  showVictoryModal(rewardCoins) {
    const modal = document.getElementById('match-victory-modal');
    document.getElementById('victory-coins-earned').textContent = `+$${rewardCoins} Moedas do Boteco!`;
    modal.classList.remove('hidden');
  }

  showDefeatModal(livesLeft) {
    const modal = document.getElementById('match-defeat-modal');
    document.getElementById('defeat-lives-left').textContent = `Vidas restantes: ${'❤️'.repeat(livesLeft)}`;
    modal.classList.remove('hidden');
  }

  showGameOverScreen() {
    const screen = document.getElementById('game-over-screen');
    const statsEl = document.getElementById('gameover-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <p>Partidas vencidas: <b>${this.runManager.stats.matchesWon}</b></p>
        <p>Mãos vencidas: <b>${this.runManager.stats.handsWon}</b></p>
        <p>Gritos de Truco: <b>${this.runManager.stats.trucosCalled}</b></p>
        <p>Blefes bem-sucedidos: <b>${this.runManager.stats.bluffsSucceeded}</b></p>
        <p>Total de moedas ganhas: <b>$${this.runManager.stats.coinsEarned}</b></p>
      `;
    }
    this.showScreen('game-over-screen');
  }

  showRunWonScreen() {
    const screen = document.getElementById('run-won-screen');
    const statsEl = document.getElementById('runwon-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <p>🏆 <b>Você derrotou Don Silvio e conquistou todos os botecos portenhos!</b></p>
        <p>Partidas invictas: <b>${this.runManager.stats.matchesWon}</b></p>
        <p>Moedas acumuladas: <b>$${this.runManager.coins}</b></p>
        <p>Curingas equipados: <b>${this.runManager.jokerManager.equipped.map(j => j.name).join(', ') || 'Nenhum'}</b></p>
      `;
    }
    this.showScreen('run-won-screen');
  }
}

