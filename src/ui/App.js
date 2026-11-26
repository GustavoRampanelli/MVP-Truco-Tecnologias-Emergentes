/**
 * App.js - Controlador Principal da Aplicação e Telas
 */

import { RunManager } from '../roguelike/RunManager.js';
import { SoundManager } from '../audio/SoundManager.js';
import { TableRenderer } from './TableRenderer.js';
import { ShopRenderer } from './ShopRenderer.js';
import { Dialogs } from './Dialogs.js';
import { ParticleManager } from './ParticleManager.js';
import { MultiplayerClient } from './MultiplayerClient.js';

export class App {
  constructor() {
    this.runManager = new RunManager();
    this.sound = new SoundManager();
    this.particles = new ParticleManager('particle-canvas');
    this.mpClient = new MultiplayerClient();
    this.tableRenderer = new TableRenderer(this, this.runManager, this.sound);
    this.shopRenderer = new ShopRenderer(this, this.runManager, this.sound);

    this.activeScreen = 'title'; // 'title' | 'table' | 'shop'
  }

  init() {
    this.bindEvents();
    this.bindMultiplayerEvents();
    this.showScreen('title-screen');

    // Se abriu via link de convite (?sala=XXXX)
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('sala');
    if (inviteCode) {
      const codeInput = document.getElementById('mp-room-code-input');
      if (codeInput) codeInput.value = inviteCode.toUpperCase().slice(0, 4);
      document.getElementById('multiplayer-lobby-modal')?.classList.remove('hidden');
    }
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

    // Tutorial / Introdução ao Truco Gaudério
    const openTutorial = () => {
      this.sound.playClick();
      document.getElementById('tutorial-modal').classList.remove('hidden');
    };
    const closeTutorial = () => {
      this.sound.playClick();
      document.getElementById('tutorial-modal').classList.add('hidden');
    };

    const btnOpenTut = document.getElementById('btn-open-tutorial');
    if (btnOpenTut) btnOpenTut.onclick = openTutorial;

    const btnPauseTut = document.getElementById('btn-pause-tutorial');
    if (btnPauseTut) btnPauseTut.onclick = openTutorial;

    const btnShopTut = document.getElementById('btn-shop-tutorial');
    if (btnShopTut) btnShopTut.onclick = openTutorial;

    const btnCloseTut = document.getElementById('btn-close-tutorial');
    if (btnCloseTut) btnCloseTut.onclick = closeTutorial;

    const btnCloseTutX = document.getElementById('btn-close-tutorial-x');
    if (btnCloseTutX) btnCloseTutX.onclick = closeTutorial;

    // Navegação de Abas do Tutorial
    document.querySelectorAll('.tut-tab-btn').forEach(btn => {
      btn.onclick = () => {
        this.sound.playClick();
        const tabTarget = btn.dataset.tab;
        document.querySelectorAll('.tut-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tut-tab-content').forEach(c => c.classList.add('hidden'));
        btn.classList.add('active');
        const targetEl = document.getElementById(tabTarget);
        if (targetEl) targetEl.classList.remove('hidden');
      };
    });

    // Fechar modais ao clicar fora (Backdrop click)
    const overlayModals = [
      { id: 'pause-modal', onClose: () => this.closePauseMenu() },
      { id: 'rules-modal', onClose: () => document.getElementById('rules-modal').classList.add('hidden') },
      { id: 'tutorial-modal', onClose: () => document.getElementById('tutorial-modal').classList.add('hidden') },
      { id: 'purge-deck-modal', onClose: () => document.getElementById('purge-deck-modal').classList.add('hidden') }
    ];
    overlayModals.forEach(({ id, onClose }) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (e) => {
          if (e.target === el) {
            onClose();
          }
        });
      }
    });

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
        if (this.tableRenderer.isMultiplayer) {
          Dialogs.showToast('Em partidas 1v1 online, peça revanche ao final da partida.', 'info');
          return;
        }
        Dialogs.showToast('Partida reiniciada!', 'info');
        this.tableRenderer.startMatch();
      };
    }

    const quitTitleBtn = document.getElementById('btn-pause-quit-title');
    if (quitTitleBtn) {
      quitTitleBtn.onclick = () => {
        this.closePauseMenu();
        if (this.tableRenderer.isMultiplayer) {
          this.mpClient.disconnect();
          this.tableRenderer.isMultiplayer = false;
        }
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
      // Na demo: só avança o oponente se já tiver completado a partida anterior
      if (this.runManager.runState === 'SHOP_POST_MATCH') {
        this.runManager.advanceToNextMatch();
      }
      this.runManager.runState = 'IN_MATCH';
      this.showScreen('game-screen');
      this.tableRenderer.startMatch();
    };

    // Botões de Vitória/Derrota
    document.getElementById('btn-victory-continue').onclick = () => {
      document.getElementById('match-victory-modal').classList.add('hidden');
      this.runManager.runState = 'SHOP_POST_MATCH';
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

    // Trocar música de fundo de acordo com a tela
    if (screenId === 'game-screen') {
      this.sound.playMatchMusic();
    } else {
      // title-screen, shop-screen, game-over-screen, run-won-screen → música de menu
      this.sound.playMenuMusic();
    }
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
    this.sound.setMuted(this.sound.muted);
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
    this.runManager.runState = 'SHOP_PRE_MATCH';
    this.runManager.shop.restock();
    this.showScreen('shop-screen');
    this.shopRenderer.render();
    Dialogs.showToast('🏪 Bem-vindo à Loja! Compre seus primeiros Curingas antes da 1ª partida.', 'reward', 4500);
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

  bindMultiplayerEvents() {
    const lobbyModal = document.getElementById('multiplayer-lobby-modal');
    const actionsArea = document.getElementById('mp-actions-area');
    const waitingBox = document.getElementById('mp-waiting-box');
    const errorMsg = document.getElementById('mp-error-msg');
    const codeDisplay = document.getElementById('mp-room-code-display');
    const nameInput = document.getElementById('mp-player-name');
    const codeInput = document.getElementById('mp-room-code-input');

    const showMpError = (msg) => {
      if (!errorMsg) return;
      errorMsg.textContent = msg;
      errorMsg.classList.remove('hidden');
    };

    const resetLobbyUI = () => {
      actionsArea?.classList.remove('hidden');
      waitingBox?.classList.add('hidden');
      errorMsg?.classList.add('hidden');
    };

    const closeLobby = () => {
      this.sound.playClick();
      lobbyModal?.classList.add('hidden');
      if (waitingBox && !waitingBox.classList.contains('hidden')) {
        this.mpClient.disconnect();
      }
      resetLobbyUI();
    };

    document.getElementById('btn-open-multiplayer')?.addEventListener('click', () => {
      this.sound.playClick();
      resetLobbyUI();
      lobbyModal?.classList.remove('hidden');
    });

    document.getElementById('btn-close-mp-lobby')?.addEventListener('click', closeLobby);
    document.getElementById('btn-close-mp-x')?.addEventListener('click', closeLobby);

    document.getElementById('btn-mp-create-room')?.addEventListener('click', async () => {
      this.sound.playClick();
      errorMsg?.classList.add('hidden');
      try {
        await this.mpClient.connect();
        this.mpClient.createRoom(nameInput?.value || 'Jogador 1');
      } catch {
        showMpError('Não foi possível conectar ao servidor WebSocket.');
      }
    });

    document.getElementById('btn-mp-join-room')?.addEventListener('click', async () => {
      this.sound.playClick();
      errorMsg?.classList.add('hidden');
      const code = (codeInput?.value || '').trim().toUpperCase();
      if (code.length < 4) {
        showMpError('Digite o código de 4 caracteres da sala.');
        return;
      }
      try {
        await this.mpClient.connect();
        this.mpClient.joinRoom(code, nameInput?.value || 'Jogador 2');
      } catch {
        showMpError('Não foi possível conectar ao servidor WebSocket.');
      }
    });

    document.getElementById('btn-mp-copy-link')?.addEventListener('click', () => {
      this.sound.playClick();
      const code = this.mpClient.roomId;
      if (!code) return;
      const inviteUrl = `${window.location.origin}${window.location.pathname}?sala=${code}`;
      navigator.clipboard?.writeText(inviteUrl).then(() => {
        Dialogs.showToast('🔗 Link de convite copiado!', 'success', 2200);
      }).catch(() => {
        Dialogs.showToast(`Código da sala: <b>${code}</b>`, 'info', 3000);
      });
    });

    // Eventos do servidor WebSocket
    this.mpClient.on('room_created', ({ roomId }) => {
      this.mpClient.roomId = roomId;
      actionsArea?.classList.add('hidden');
      waitingBox?.classList.remove('hidden');
      if (codeDisplay) codeDisplay.textContent = roomId;
    });

    this.mpClient.on('error', ({ message }) => {
      showMpError(message);
    });

    this.mpClient.on('match_started', ({ opponentName, pointsToWin }) => {
      this.mpClient.opponentName = opponentName;
      lobbyModal?.classList.add('hidden');
      document.getElementById('mp-match-end-modal')?.classList.add('hidden');
      resetLobbyUI();
      this.showScreen('game-screen');
      this.tableRenderer.startMultiplayerMatch(opponentName, pointsToWin);
      Dialogs.showToast(`⚔️ Duelo 1v1 iniciado contra <b>${opponentName}</b>!`, 'success', 3000);
    });

    this.mpClient.on('state_sync', ({ state, event }) => {
      this.tableRenderer.applyMultiplayerState(state, event);
    });

    this.mpClient.on('opponent_disconnected', ({ message }) => {
      if (this.tableRenderer.isMultiplayer) {
        Dialogs.showToast(`⚠️ ${message}`, 'warning', 4500);
        this.mpClient.disconnect();
        this.tableRenderer.isMultiplayer = false;
        document.getElementById('mp-match-end-modal')?.classList.add('hidden');
        document.getElementById('bet-response-modal')?.classList.add('hidden');
        document.getElementById('envido-response-modal')?.classList.add('hidden');
        this.showScreen('title-screen');
      }
    });

    document.getElementById('btn-mp-rematch')?.addEventListener('click', () => {
      this.sound.playClick();
      document.getElementById('mp-match-end-modal')?.classList.add('hidden');
      this.mpClient.rematch();
    });

    document.getElementById('btn-mp-exit-menu')?.addEventListener('click', () => {
      this.sound.playClick();
      document.getElementById('mp-match-end-modal')?.classList.add('hidden');
      this.mpClient.disconnect();
      this.tableRenderer.isMultiplayer = false;
      this.showScreen('title-screen');
    });
  }
}

