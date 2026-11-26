/**
 * TableRenderer.js - Controlador e Renderizador da Mesa de Partida de Truco
 */

import { Card, SUITS } from '../core/Card.js';
import { TrucoEngine, BET_LEVELS } from '../core/TrucoEngine.js';
import { EnvidoEngine } from '../core/EnvidoEngine.js';
import { OpponentAI } from '../core/OpponentAI.js';
import { CardSprite } from './CardSprite.js';
import { Dialogs } from './Dialogs.js';

export class TableRenderer {
  constructor(app, runManager, soundManager) {
    this.app = app;
    this.runManager = runManager;
    this.sound = soundManager;

    this.matchState = {
      playerScore: 0,
      opponentScore: 0,
      pointsToWin: 12,
      isPlayerMano: true,
      handCount: 0
    };

    this.currentHand = {
      playerHand: [],
      opponentHand: [],
      trucoEngine: null,
      envidoResolved: false,
      isPlayerTurn: false,
      awaitingBetResponse: false
    };

    this.showHints = true;
    this.ai = null;
    this.isMultiplayer = false;
    this.mpOpponentName = 'Adversário';
  }

  /**
   * Inicia uma nova partida contra o adversário atual do Boteco
   */
  startMatch() {
    this.isMultiplayer = false;
    const opp = this.runManager.getCurrentOpponent();
    this.ai = new OpponentAI(opp.personality);

    this.matchState.playerScore = 0;
    this.matchState.opponentScore = 0;
    this.matchState.pointsToWin = opp.pointsToWin;
    this.matchState.isPlayerMano = true;
    this.matchState.handCount = 0;

    // Disparar hooks de Curingas no início da partida (ex: Bife de Chorizo)
    const msgs = this.runManager.jokerManager.trigger('onMatchStart', null, {
      matchState: this.matchState,
      runManager: this.runManager
    });
    msgs.forEach(m => Dialogs.showToast(m, 'reward'));

    this.renderHeader();
    this.renderJokersBar();
    this.renderScoreboard();
    this.startNewHand();
  }

  /**
   * Distribui nova mão (3 cartas cada)
   */
  startNewHand() {
    this.matchState.handCount++;
    // Alternar quem é o Mano a cada mão
    if (this.matchState.handCount > 1) {
      this.matchState.isPlayerMano = !this.matchState.isPlayerMano;
    }

    const modifiers = this.runManager.jokerManager.getCombinedModifiers();
    this.currentHand.trucoEngine = new TrucoEngine(this.matchState.isPlayerMano, modifiers);
    this.currentHand.envidoResolved = false;
    this.currentHand.awaitingBetResponse = false;

    // Embaralhar e tirar 3 cartas do baralho do jogador
    const shuffledPlayerDeck = this.runManager.playerDeck.getShuffledCopy();
    this.currentHand.playerHand = shuffledPlayerDeck.slice(0, 3);

    // Tirar 3 cartas para o adversário
    const oppDeck = this.runManager.playerDeck.getShuffledCopy();
    this.currentHand.opponentHand = oppDeck.slice(0, 3);

    // Determinar de quem é a primeira jogada ANTES de renderizar as cartas e controles
    this.currentHand.isPlayerTurn = this.matchState.isPlayerMano;

    this.sound.playCardSlide();
    this.renderTableCards();
    this.updateControls();

    Dialogs.showToast(
      `Nova mão distribuída! Mão: <b>${this.matchState.isPlayerMano ? 'Você' : this.ai.name}</b>`,
      'info',
      2000
    );

    // Se a IA for a mão, ela pode cantar Envido ou jogar carta
    if (!this.currentHand.isPlayerTurn) {
      setTimeout(() => this.processAiTurn(), 1000);
    }
  }

  renderHeader() {
    const bar = this.runManager.getCurrentBar();
    const opp = this.runManager.getCurrentOpponent();

    const barEl = document.getElementById('bar-title');
    if (barEl) barEl.textContent = bar.name;

    const oppNameEl = document.getElementById('opponent-name');
    if (oppNameEl) oppNameEl.textContent = opp.name;

    const oppRoleEl = document.getElementById('opponent-role');
    if (oppRoleEl) oppRoleEl.textContent = `${opp.role} ${opp.isBoss ? '🔥 CHEFE' : ''}`;

    const oppAvatarEl = document.getElementById('opponent-avatar');
    if (oppAvatarEl) {
      if (opp.portrait) {
        oppAvatarEl.innerHTML = `<img src="${opp.portrait}" alt="${opp.name}" class="opponent-portrait-img" />`;
      } else {
        oppAvatarEl.textContent = opp.avatar;
      }
    }

    const oppImgEl = document.getElementById('opponent-character-img');
    if (oppImgEl) {
      oppImgEl.src = opp.inSceneImg || 'assets/opponent_in_scene_clean.png';
      oppImgEl.alt = opp.name;
    }

    const coinsEl = document.getElementById('player-coins-val');
    if (coinsEl) coinsEl.textContent = this.runManager.coins;

    const livesEl = document.getElementById('player-lives-val');
    if (livesEl) livesEl.textContent = '❤️'.repeat(this.runManager.lives);
  }

  renderJokersBar() {
    const container = document.getElementById('equipped-jokers-list');
    if (!container) return;
    container.innerHTML = '';

    const equipped = this.runManager.jokerManager.equipped;
    if (equipped.length === 0) {
      container.innerHTML = '<span class="no-jokers-text">Nenhum Curinga equipado (visite a Loja do Boteco)</span>';
      return;
    }

    equipped.forEach(joker => {
      const el = document.createElement('div');
      el.className = 'joker-mini-badge';
      el.innerHTML = `<span class="joker-icon">${joker.icon}</span> <span class="joker-name">${joker.name}</span>`;
      el.title = `${joker.name} (${joker.rarity}): ${joker.description}`;
      container.appendChild(el);
    });
  }

  renderScoreboard() {
    const pScoreEl = document.getElementById('player-score-display');
    const oScoreEl = document.getElementById('opponent-score-display');
    const targetEl = document.getElementById('score-target-val');

    if (pScoreEl) pScoreEl.textContent = this.matchState.playerScore;
    if (oScoreEl) oScoreEl.textContent = this.matchState.opponentScore;
    if (targetEl) targetEl.textContent = this.matchState.pointsToWin;

    // Renderizar palitos/tentos visuais (estilo fósforos/marcas de boteco)
    this.renderScoreTally('player-tally', this.matchState.playerScore);
    this.renderScoreTally('opponent-tally', this.matchState.opponentScore);
  }

  renderScoreTally(containerId, score) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    // Agrupar de 5 em 5 tentos
    const groupsOf5 = Math.floor(score / 5);
    const remainder = score % 5;

    for (let i = 0; i < groupsOf5; i++) {
      const g = document.createElement('span');
      g.className = 'tally-group-5';
      g.textContent = '卌 ';
      el.appendChild(g);
    }
    if (remainder > 0) {
      const r = document.createElement('span');
      r.className = 'tally-remainder';
      r.textContent = '|'.repeat(remainder);
      el.appendChild(r);
    }
  }

  renderTableCards() {
    // U2 — Atualizar indicador de vez
    this._updateTurnIndicator();

    // 1. Mão do Adversário (ícones de cartas como vida abaixo dele, sem texto)
    const oppHandEl = document.getElementById('opponent-hand');
    if (oppHandEl) {
      oppHandEl.innerHTML = '';
      const remainingCards = this.currentHand.opponentHand.length;
      const totalSlots = 3;
      for (let i = 0; i < totalSlots; i++) {
        const pip = document.createElement('div');
        if (i < remainingCards) {
          pip.className = 'opp-card-life-pip active';
          pip.title = `Carta #${i + 1} do oponente`;
        } else {
          pip.className = 'opp-card-life-pip spent';
          pip.title = 'Carta jogada';
        }
        oppHandEl.appendChild(pip);
      }
    }

    // 2. Mão do Jogador (interativa, em 1º plano POV destacado)
    const playerHandEl = document.getElementById('player-hand');
    if (playerHandEl) {
      playerHandEl.innerHTML = '';
      this.currentHand.playerHand.forEach((card, index) => {
        const cardEl = CardSprite.createCardElement(card, {
          isFaceDown: false,
          interactive: this.currentHand.isPlayerTurn && !this.currentHand.awaitingBetResponse,
          showHints: this.showHints,
          scale: 0.98,
          onClick: () => this.handlePlayerPlayCard(card, index)
        });
        // U2: glow nas cartas quando é vez do jogador
        if (this.currentHand.isPlayerTurn && !this.currentHand.awaitingBetResponse) {
          cardEl.classList.add('card-your-turn');
        }
        // Partículas ao passar o mouse nas cartas da mão
        const isBravo = card.getBaseTrucoPower() >= 11;
        let lastHoverSparkle = 0;
        cardEl.addEventListener('mousemove', () => {
          const now = performance.now();
          if (now - lastHoverSparkle > (isBravo ? 90 : 180)) {
            lastHoverSparkle = now;
            this.app.particles?.sparkleCardHover(cardEl, isBravo);
          }
        });
        playerHandEl.appendChild(cardEl);
      });
    }

    // 3. Cartas na Mesa (Vazas 1, 2, 3)
    this.renderTrickCards();
  }

  renderTrickCards() {
    const trickArea = document.getElementById('table-tricks-area');
    if (!trickArea) return;
    trickArea.innerHTML = '';

    const engine = this.currentHand.trucoEngine;
    if (!engine) return;

    engine.tricks.forEach((trick, idx) => {
      const trickSlot = document.createElement('div');
      trickSlot.className = `trick-slot ${idx === engine.currentTrick ? 'current-trick' : ''}`;

      const header = document.createElement('div');
      header.className = 'trick-slot-title';
      let statusText = `Vaza ${idx + 1}`;
      if (trick.winner === 'PLAYER') statusText += ' ✅ (Você)';
      else if (trick.winner === 'OPPONENT') statusText += ' ❌ (Adversário)';
      else if (trick.winner === 'TIE') statusText += ' ⚖️ (Parda)';
      header.textContent = statusText;
      trickSlot.appendChild(header);

      const cardsContainer = document.createElement('div');
      cardsContainer.className = 'trick-cards-flex';

      // Carta do oponente — com animação U1 se recém jogada
      if (trick.opponentCard) {
        const oppCardEl = CardSprite.createCardElement(trick.opponentCard, {
          scale: 0.75,
          showHints: this.showHints
        });
        oppCardEl.classList.add('table-played-card', 'card-fly-in');
        cardsContainer.appendChild(oppCardEl);
      } else {
        const emptyOpp = document.createElement('div');
        emptyOpp.className = 'empty-card-slot';
        emptyOpp.textContent = 'Adversário';
        cardsContainer.appendChild(emptyOpp);
      }

      // Carta do jogador — com animação U1 se recém jogada
      if (trick.playerCard) {
        const pCardEl = CardSprite.createCardElement(trick.playerCard, {
          scale: 0.75,
          showHints: this.showHints
        });
        pCardEl.classList.add('table-played-card', 'card-fly-in');
        cardsContainer.appendChild(pCardEl);
      } else {
        const emptyP = document.createElement('div');
        emptyP.className = 'empty-card-slot';
        emptyP.textContent = 'Você';
        cardsContainer.appendChild(emptyP);
      }

      trickSlot.appendChild(cardsContainer);
      trickArea.appendChild(trickSlot);
    });
  }

  /** U2 — Atualiza o indicador visual de vez (banner "SUA VEZ" / "Aguardando...") */
  _updateTurnIndicator() {
    const el = document.getElementById('turn-indicator');
    if (!el) return;
    const engine = this.currentHand.trucoEngine;
    if (!engine || engine.handFinished) {
      el.className = 'turn-indicator hidden';
      return;
    }
    if (this.currentHand.awaitingBetResponse) {
      el.textContent = '⚡ Responda a aposta!';
      el.className = 'turn-indicator turn-bet';
    } else if (this.currentHand.isPlayerTurn) {
      el.textContent = '🫵 SUA VEZ — jogue uma carta';
      el.className = 'turn-indicator turn-player';
    } else {
      const oppName = this.isMultiplayer ? this.mpOpponentName : (this.ai ? this.ai.name : 'Adversário');
      el.textContent = `⏳ Aguardando ${oppName}...`;
      el.className = 'turn-indicator turn-opponent';
    }
  }

  updateControls() {
    const controls = document.getElementById('player-action-controls');
    if (!controls) return;

    const engine = this.currentHand.trucoEngine;
    if (!engine || engine.handFinished || this.currentHand.awaitingBetResponse) {
      controls.classList.add('disabled-controls');
      return;
    }

    controls.classList.remove('disabled-controls');

    const envidoBtn = document.getElementById('btn-call-envido');
    const trucoBtn = document.getElementById('btn-call-truco');
    const florBtn = document.getElementById('btn-call-flor');

    // Envido: só pode ser cantado na 1ª vaza e se ainda não foi cantado
    if (envidoBtn) {
      const canEnvido = engine.currentTrick === 0 && !this.currentHand.envidoResolved && !engine.betPending;
      envidoBtn.disabled = !canEnvido || !this.currentHand.isPlayerTurn;
    }

    // Flor: se tiver 3 cartas do mesmo naipe
    if (florBtn) {
      const { isFlor } = EnvidoEngine.calculateHandEnvido(this.currentHand.playerHand);
      florBtn.style.display = isFlor && engine.currentTrick === 0 && !this.currentHand.envidoResolved ? 'inline-block' : 'none';
    }

    // Truco: depende do nível atual
    if (trucoBtn) {
      const nextBet = engine.currentBet.nextBet;
      // B3: se HÁ aposta pendente do oponente, mostrar botões de resposta — não desabilitar silenciosamente
      if (engine.betPending && engine.betPending.from === 'OPPONENT') {
        // O modal de resposta já é exibido por triggerAiTrucoProposal; apenas esconde o botão
        trucoBtn.disabled = true;
        trucoBtn.textContent = `Responder ${BET_LEVELS[engine.betPending.type].name}...`;
      } else if (nextBet && engine.lastBettor !== 'PLAYER' && !engine.betPending) {
        trucoBtn.disabled = !this.currentHand.isPlayerTurn;
        trucoBtn.textContent = BET_LEVELS[nextBet].name;
        trucoBtn.dataset.betType = nextBet;
      } else {
        trucoBtn.disabled = true;
        trucoBtn.textContent = '¡TRUCO!';
      }
    }
  }

  /**
   * Jogador clica em uma carta para jogar
   */
  handlePlayerPlayCard(card, index) {
    if (!this.currentHand.isPlayerTurn || this.currentHand.awaitingBetResponse) return;
    const engine = this.currentHand.trucoEngine;
    if (engine.handFinished) return;

    if (this.isMultiplayer) {
      this.sound.playCardSlide();
      this.currentHand.isPlayerTurn = false;
      this.updateControls();
      this.app.mpClient.playCard(card.id);
      return;
    }

    // Remover da mão do jogador
    this.currentHand.playerHand.splice(index, 1);
    this.sound.playCardSlide();

    // Hook de Curinga ao jogar carta (ex: Ouro de San Telmo)
    const msgs = this.runManager.jokerManager.trigger('onCardPlayed', card, {
      runManager: this.runManager,
      trucoEngine: engine
    });
    msgs.forEach(m => {
      Dialogs.showToast(m, 'reward');
      this.sound.playCoin();
      this.app.particles?.burstCoins();
      this.renderHeader();
    });

    // Registrar no motor
    const playedTrickIdx = engine.currentTrick;
    engine.playCard('PLAYER', card);
    this.renderTableCards();

    // Partículas de impacto ao jogar carta na mesa
    const trickSlots = document.querySelectorAll('#table-tricks-area .trick-slot');
    const targetSlot = trickSlots[playedTrickIdx];
    const playedCardEl = targetSlot?.querySelector('.trick-cards-flex > :last-child');
    this.app.particles?.burstCardPlay(playedCardEl || targetSlot, card.getBaseTrucoPower() >= 11);

    // Passar turno para IA ou resolver vaza
    const trick = engine.tricks[engine.currentTrick];
    if (trick && !trick.opponentCard) {
      this.currentHand.isPlayerTurn = false;
      this.updateControls();
      setTimeout(() => this.processAiTurn(), 900);
    } else {
      this.handleTrickOrHandFinished();
    }
  }

  /**
   * Turno da Inteligência Artificial
   * FIX B1: guarda explícita contra race condition — só executa se não for vez do jogador
   */
  processAiTurn() {
    const engine = this.currentHand.trucoEngine;
    if (engine.handFinished || this.currentHand.awaitingBetResponse) return;
    // B1: se por qualquer motivo isPlayerTurn virou true antes do timeout disparar, aborta
    if (this.currentHand.isPlayerTurn) return;

    const currentTrick = engine.tricks[engine.currentTrick];
    const playerCardOnTable = currentTrick ? currentTrick.playerCard : null;

    // 1. A IA decide se vai cantar Envido na 1ª vaza
    if (engine.currentTrick === 0 && !this.currentHand.envidoResolved && !engine.betPending) {
      const envidoCall = this.ai.shouldInitiateEnvido(this.currentHand.opponentHand, engine.currentTrick);
      if (envidoCall) {
        this.triggerAiEnvidoCall(envidoCall);
        return;
      }
    }

    // 2. A IA decide se vai cantar Truco
    const trucoProposal = this.ai.shouldProposeTruco(
      this.currentHand.opponentHand,
      engine,
      this.runManager.jokerManager.getCombinedModifiers()
    );

    if (trucoProposal) {
      this.triggerAiTrucoProposal(trucoProposal);
      return;
    }

    // 3. IA escolhe e joga a carta
    const chosenCard = this.ai.chooseCardToPlay(this.currentHand.opponentHand, playerCardOnTable, engine);
    const cardIdx = this.currentHand.opponentHand.findIndex(c => c.id === chosenCard.id);
    if (cardIdx !== -1) {
      this.currentHand.opponentHand.splice(cardIdx, 1);
    }

    const playedTrickIdx = engine.currentTrick;
    this.sound.playCardSlide();
    engine.playCard('OPPONENT', chosenCard);
    this.renderTableCards();

    // Partículas de impacto quando o adversário joga carta
    const trickSlots = document.querySelectorAll('#table-tricks-area .trick-slot');
    const targetSlot = trickSlots[playedTrickIdx];
    const playedOppEl = targetSlot?.querySelector('.trick-cards-flex > :first-child');
    this.app.particles?.burstCardPlay(playedOppEl || targetSlot, chosenCard.getBaseTrucoPower() >= 11);

    // Verificar se vaza foi concluída
    if (currentTrick && currentTrick.playerCard && currentTrick.opponentCard) {
      this.handleTrickOrHandFinished();
    } else {
      // Jogador deve jogar em seguida
      this.currentHand.isPlayerTurn = true;
      this.updateControls();
      this.renderTableCards();
    }
  }

  handleTrickOrHandFinished() {
    const engine = this.currentHand.trucoEngine;
    const currentTrickIndex = engine.currentTrick;
    const resolvedTrick = engine.tricks[engine.handFinished ? currentTrickIndex : currentTrickIndex - 1];

    if (resolvedTrick) {
      // Sons e feedbacks da vaza
      if (resolvedTrick.winner === 'PLAYER') {
        this.sound.playTrickWon();
        this.app.particles?.burstVictory('trick');
        Dialogs.showToast(`Você levou a vaza!`, 'success', 1500);
      } else if (resolvedTrick.winner === 'OPPONENT') {
        this.sound.playTrickLost();
        Dialogs.showToast(`${this.ai.name} levou a vaza.`, 'warning', 1500);
      } else {
        Dialogs.showToast(`<b>Parda!</b> Vaza empatada.`, 'info', 1800);
      }

      // Hooks de Curinga (ex: Parda da Sorte)
      const msgs = this.runManager.jokerManager.trigger('onTrickResolved', resolvedTrick, {
        runManager: this.runManager
      });
      msgs.forEach(m => {
        Dialogs.showToast(m, 'reward');
        this.sound.playCoin();
        this.app.particles?.burstCoins();
        this.renderHeader();
      });
    }

    this.renderTrickCards();

    // Se a mão foi concluída
    if (engine.handFinished) {
      this.resolveHandEnd();
    } else {
      // Determinar quem joga primeiro na próxima vaza
      const lead = engine.getLeadPlayerForCurrentTrick();
      this.currentHand.isPlayerTurn = lead === 'PLAYER';
      this.updateControls();
      this.renderTableCards();

      if (!this.currentHand.isPlayerTurn) {
        setTimeout(() => this.processAiTurn(), 1000);
      }
    }
  }

  resolveHandEnd() {
    const engine = this.currentHand.trucoEngine;
    const winner = engine.handWinner;
    const points = engine.pointsAwarded;

    if (winner === 'PLAYER') {
      this.matchState.playerScore += points;
      this.runManager.stats.handsWon++;
      this.sound.playTrickWon();
      this.app.particles?.burstVictory('hand');
      Dialogs.showToast(`<b>¡MÃO GANHA!</b> Você somou +${points} tento(s)!`, 'success', 3000);

      // Hooks de Curinga de vitória de mão (ex: Mate Amargo, Tango Dramático)
      const msgs = this.runManager.jokerManager.trigger('onHandWon', null, {
        runManager: this.runManager,
        trucoEngine: engine,
        matchState: this.matchState
      });
      msgs.forEach(m => Dialogs.showToast(m, 'reward'));
    } else {
      this.matchState.opponentScore += points;
      this.sound.playTrickLost();
      Dialogs.showToast(`${this.ai.name} ganhou a mão (+${points} tento(s)).`, 'warning', 3000);
    }

    this.renderScoreboard();
    this.renderHeader();

    // Checar fim da partida
    if (this.matchState.playerScore >= this.matchState.pointsToWin) {
      setTimeout(() => this.handleMatchWin(), 1200);
    } else if (this.matchState.opponentScore >= this.matchState.pointsToWin) {
      setTimeout(() => this.handleMatchLoss(), 1200);
    } else {
      // Próxima mão após breve pausa
      setTimeout(() => this.startNewHand(), 2200);
    }
  }

  // --- TRUCO INTERACTIONS ---
  playerProposeTruco(betType) {
    if (this.isMultiplayer) {
      this.sound.playTrucoCall();
      this.app.mpClient.proposeTruco(betType);
      return;
    }

    const engine = this.currentHand.trucoEngine;
    if (!engine.proposeBet('PLAYER', betType)) return;

    this.sound.playTrucoCall();
    this.app.particles?.burstTruco(betType);
    Dialogs.triggerScreenShake();
    this.runManager.stats.trucosCalled++;

    this.currentHand.awaitingBetResponse = true;
    this.updateControls();

    // IA avalia
    setTimeout(() => {
      const response = this.ai.respondToTruco(
        this.currentHand.opponentHand,
        engine,
        this.runManager.jokerManager.getCombinedModifiers()
      );

      if (response === 'QUIERO') {
        engine.acceptBet('OPPONENT');
        Dialogs.showOpponentSpeech(`¡QUIERO! Vale ${engine.currentBet.acceptedPoints}!`);
        this.currentHand.awaitingBetResponse = false;
        this.updateControls();
      } else if (response === 'NO_QUIERO') {
        engine.declineBet('OPPONENT');
        Dialogs.showOpponentSpeech('¡NO QUIERO! Son tuyos che...');
        this.runManager.stats.bluffsSucceeded++;
        this.currentHand.awaitingBetResponse = false;
        this.resolveHandEnd();
      } else {
        // IA Retrucou ou pediu Vale 4!
        engine.proposeBet('OPPONENT', response);
        this.sound.playTrucoCall();
        Dialogs.triggerScreenShake();
        Dialogs.showOpponentSpeech(`¡${response === 'RETRUCO' ? 'RETRUCO' : 'VALE CUATRO'}!`);
        this.showBetResponseModal('OPPONENT', response);
      }
    }, 1200);
  }

  triggerAiTrucoProposal(betType) {
    const engine = this.currentHand.trucoEngine;
    engine.proposeBet('OPPONENT', betType);
    this.sound.playTrucoCall();
    this.app.particles?.burstTruco(betType);
    Dialogs.triggerScreenShake();
    Dialogs.showOpponentSpeech(`¡${BET_LEVELS[betType].name}!`);

    this.showBetResponseModal('OPPONENT', betType);
  }

  showBetResponseModal(challenger, betType) {
    this.currentHand.awaitingBetResponse = true;
    const modal = document.getElementById('bet-response-modal');
    const title = document.getElementById('bet-modal-title');
    const quieroBtn = document.getElementById('btn-modal-quiero');
    const noQuieroBtn = document.getElementById('btn-modal-noquiero');
    const raiseBtn = document.getElementById('btn-modal-raise');

    if (!modal) return;
    const oppName = this.isMultiplayer ? this.mpOpponentName : this.ai.name;
    title.textContent = `${oppName} gritou ${BET_LEVELS[betType].name}! O que você faz?`;

    // Botão de aumentar (Retruco / Vale Cuatro)
    const nextBet = BET_LEVELS[betType].nextBet;
    if (nextBet) {
      raiseBtn.style.display = 'inline-block';
      raiseBtn.textContent = BET_LEVELS[nextBet].name;
      raiseBtn.onclick = () => {
        modal.classList.add('hidden');
        if (this.isMultiplayer) {
          this.sound.playTrucoCall();
          this.app.mpClient.respondTruco(nextBet);
          return;
        }
        this.playerProposeTruco(nextBet);
      };
    } else {
      raiseBtn.style.display = 'none';
    }

    quieroBtn.onclick = () => {
      modal.classList.add('hidden');
      if (this.isMultiplayer) {
        this.sound.playClick();
        this.app.mpClient.respondTruco('QUIERO');
        return;
      }
      this.currentHand.trucoEngine.acceptBet('PLAYER');
      Dialogs.showToast(`Você aceitou: <b>¡QUIERO!</b>`, 'info');
      this.currentHand.awaitingBetResponse = false;
      this.updateControls();
      if (!this.currentHand.isPlayerTurn) {
        setTimeout(() => this.processAiTurn(), 800);
      }
    };

    noQuieroBtn.onclick = () => {
      modal.classList.add('hidden');
      if (this.isMultiplayer) {
        this.sound.playClick();
        this.app.mpClient.respondTruco('NO_QUIERO');
        return;
      }
      this.currentHand.trucoEngine.declineBet('PLAYER');
      this.currentHand.awaitingBetResponse = false;
      this.resolveHandEnd();
    };

    modal.classList.remove('hidden');
  }

  // --- ENVIDO INTERACTIONS ---
  playerCallEnvido(type = 'ENVIDO') {
    if (this.isMultiplayer) {
      this.sound.playClick();
      Dialogs.showToast(`Você cantou <b>${type}</b>!`, 'info');
      this.app.mpClient.proposeEnvido(type);
      return;
    }

    this.sound.playClick();
    Dialogs.showToast(`Você cantou <b>${type}</b>!`, 'info');
    this.currentHand.awaitingBetResponse = true;
    this.updateControls();

    setTimeout(() => {
      const response = this.ai.respondToEnvido(this.currentHand.opponentHand, type);
      if (response === 'QUIERO') {
        Dialogs.showOpponentSpeech('¡QUIERO!');
        this.resolveEnvidoShowdown(2);
      } else if (response === 'NO_QUIERO') {
        Dialogs.showOpponentSpeech('¡NO QUIERO!');
        this.matchState.playerScore += 1;
        Dialogs.showToast(`Adversário correu do Envido (+1 tento).`, 'success');
        this.renderScoreboard();
        this.currentHand.envidoResolved = true;
        this.currentHand.awaitingBetResponse = false;
        this.updateControls();
      } else if (response === 'FLOR') {
        Dialogs.showOpponentSpeech('¡CUIDADO CHE, TENGO FLOR!');
        this.sound.playTrickWon();
        this.matchState.opponentScore += 3;
        Dialogs.showToast(`${this.ai.name} cantou FLOR (+3 tentos)!`, 'warning');
        this.renderScoreboard();
        this.currentHand.envidoResolved = true;
        this.currentHand.awaitingBetResponse = false;
        this.updateControls();
      }
    }, 1000);
  }

  triggerAiEnvidoCall(type) {
    Dialogs.showOpponentSpeech(`¡${type}!`);
    const modal = document.getElementById('envido-response-modal');
    if (!modal) return;

    this.currentHand.awaitingBetResponse = true;
    document.getElementById('envido-modal-title').textContent = `${this.ai.name} cantou ${type}!`;

    document.getElementById('btn-envido-quiero').onclick = () => {
      modal.classList.add('hidden');
      this.resolveEnvidoShowdown(type === 'REAL_ENVIDO' ? 3 : 2);
    };

    document.getElementById('btn-envido-noquiero').onclick = () => {
      modal.classList.add('hidden');
      this.matchState.opponentScore += 1;
      Dialogs.showToast(`Você recusou o Envido (${this.ai.name} ganha +1 ponto).`, 'info');
      this.renderScoreboard();
      this.currentHand.envidoResolved = true;
      this.currentHand.awaitingBetResponse = false;
      this.updateControls();
    };

    modal.classList.remove('hidden');
  }

  resolveEnvidoShowdown(stakePoints) {
    const mod = this.runManager.jokerManager.getCombinedModifiers();
    const pEnvido = EnvidoEngine.calculateHandEnvido(this.currentHand.playerHand, mod);
    const oEnvido = EnvidoEngine.calculateHandEnvido(this.currentHand.opponentHand);

    const result = EnvidoEngine.resolveContest(pEnvido.points, oEnvido.points, this.matchState.isPlayerMano);

    if (result.winner === 'PLAYER') {
      this.matchState.playerScore += stakePoints;
      this.sound.playTrickWon();
      Dialogs.showToast(`<b>Envido ganho!</b> Você tem ${pEnvido.points} (${pEnvido.details}) contra ${oEnvido.points} do adversário (+${stakePoints} tentos).`, 'success', 3500);
    } else {
      this.matchState.opponentScore += stakePoints;
      this.sound.playTrickLost();
      Dialogs.showToast(`${this.ai.name} venceu o Envido com ${oEnvido.points} contra seus ${pEnvido.points} (+${stakePoints} tentos).`, 'warning', 3500);
    }

    this.renderScoreboard();
    this.currentHand.envidoResolved = true;
    this.currentHand.awaitingBetResponse = false;
    this.updateControls();
  }

  handlePlayerFold() {
    this.sound.playClick();
    if (this.isMultiplayer) {
      this.app.mpClient.fold();
      return;
    }
    this.currentHand.trucoEngine.fold('PLAYER');
    this.resolveHandEnd();
  }

  // --- MATCH ENDING ---
  handleMatchWin() {
    this.sound.playMatchVictory();
    this.app.particles?.burstVictory('match');
    const res = this.runManager.handleMatchVictory();

    if (res.runWon) {
      this.app.showRunWonScreen();
    } else {
      this.app.showVictoryModal(res.rewardCoins);
    }
  }

  handleMatchLoss() {
    this.sound.playGameOver();
    const res = this.runManager.handleMatchDefeat();

    if (res.gameOver) {
      this.app.showGameOverScreen();
    } else {
      this.app.showDefeatModal(res.livesLeft);
    }
  }

  // =====================================================================
  // MULTIPLAYER 1v1 ONLINE (CLIENT SYNC)
  // =====================================================================

  startMultiplayerMatch(opponentName, pointsToWin = 12) {
    this.isMultiplayer = true;
    this.mpOpponentName = opponentName || 'Adversário';
    this.ai = null;

    this.matchState.playerScore = 0;
    this.matchState.opponentScore = 0;
    this.matchState.pointsToWin = pointsToWin;
    this.matchState.isPlayerMano = true;
    this.matchState.handCount = 0;

    const barEl = document.getElementById('bar-title');
    if (barEl) barEl.textContent = '⚔️ Duelo 1v1 Online';

    const oppNameEl = document.getElementById('opponent-name');
    if (oppNameEl) oppNameEl.textContent = this.mpOpponentName;

    const oppRoleEl = document.getElementById('opponent-role');
    if (oppRoleEl) oppRoleEl.textContent = 'Jogador Online';

    const oppImgEl = document.getElementById('opponent-character-img');
    if (oppImgEl) {
      oppImgEl.src = 'assets/opponent_in_scene_clean.png';
      oppImgEl.alt = this.mpOpponentName;
    }

    const coinsEl = document.getElementById('player-coins-val');
    if (coinsEl) coinsEl.textContent = '—';

    const livesEl = document.getElementById('player-lives-val');
    if (livesEl) livesEl.textContent = '1v1';

    const jokersEl = document.getElementById('equipped-jokers-list');
    if (jokersEl) {
      jokersEl.innerHTML = '<span class="no-jokers-text">Modo Clássico 1v1 (Sem Curingas)</span>';
    }

    this.renderScoreboard();
  }

  hydrateCard(c) {
    if (!c) return null;
    return new Card(c.value, SUITS[c.suitId]);
  }

  applyMultiplayerState(state, event = null) {
    this.matchState.playerScore = state.playerScore;
    this.matchState.opponentScore = state.opponentScore;
    this.matchState.pointsToWin = state.pointsToWin;
    this.matchState.isPlayerMano = state.isPlayerMano;
    this.matchState.handCount = state.handCount;

    const engine = new TrucoEngine(state.isPlayerMano, {});
    engine.currentTrick = state.currentTrick;
    engine.tricks = state.tricks.map(t => ({
      playerCard: this.hydrateCard(t.playerCard),
      opponentCard: this.hydrateCard(t.opponentCard),
      winner: t.winner
    }));
    engine.currentBet = BET_LEVELS[state.currentBetKey] || BET_LEVELS.NONE;
    engine.lastBettor = state.lastBettor;
    engine.betPending = state.betPending;
    engine.handFinished = state.handFinished;
    engine.handWinner = state.handWinner;
    engine.pointsAwarded = state.pointsAwarded;

    this.currentHand = {
      playerHand: state.playerHand.map(c => this.hydrateCard(c)),
      opponentHand: new Array(state.opponentCardCount).fill(null),
      trucoEngine: engine,
      envidoResolved: state.envidoResolved,
      isPlayerTurn: state.isPlayerTurn,
      awaitingBetResponse: state.awaitingBetResponse
    };

    this.renderScoreboard();
    this.renderTableCards();
    this.updateControls();

    // Feedbacks & Partículas
    if (event) {
      if (event.fx === 'hand_started') {
        this.sound.playCardSlide();
        document.getElementById('bet-response-modal')?.classList.add('hidden');
        document.getElementById('envido-response-modal')?.classList.add('hidden');
        if (event.toast) Dialogs.showToast(event.toast, 'info', 2000);
      } else if (event.fx === 'card_played' || event.fx === 'trick_resolved') {
        this.sound.playCardSlide();
        const trickSlots = document.querySelectorAll('#table-tricks-area .trick-slot');
        const targetSlot = trickSlots[event.trickIdx];
        const selector = event.playedBy === 'PLAYER' ? '.trick-cards-flex > :last-child' : '.trick-cards-flex > :first-child';
        const playedEl = targetSlot?.querySelector(selector);
        this.app.particles?.burstCardPlay(playedEl || targetSlot, !!event.isBravo);

        if (event.trickWinner === 'PLAYER') {
          this.sound.playTrickWon();
          this.app.particles?.burstVictory('trick');
          Dialogs.showToast('Você levou a vaza!', 'success', 1400);
        } else if (event.trickWinner === 'OPPONENT') {
          this.sound.playTrickLost();
          Dialogs.showToast(`${this.mpOpponentName} levou a vaza.`, 'warning', 1400);
        } else if (event.trickWinner === 'TIE') {
          Dialogs.showToast('<b>Parda!</b> Vaza empatada.', 'info', 1500);
        }
      } else if (event.fx === 'truco_call') {
        this.sound.playTrucoCall();
        this.app.particles?.burstTruco(event.betType);
        Dialogs.triggerScreenShake();
        if (event.from === 'OPPONENT' && event.speech) {
          Dialogs.showOpponentSpeech(event.speech);
        }
      } else if (event.fx === 'truco_accepted') {
        this.sound.playClick();
        if (event.from === 'OPPONENT') {
          Dialogs.showOpponentSpeech(event.speech || '¡QUIERO!');
        }
        Dialogs.showToast(`Truco aceito!`, 'info', 1600);
      } else if (event.fx === 'truco_declined' || event.fx === 'fold') {
        if (event.from === 'OPPONENT' && event.speech) {
          Dialogs.showOpponentSpeech(event.speech);
        }
      } else if (event.fx === 'envido_call') {
        this.sound.playClick();
        if (event.from === 'OPPONENT') {
          Dialogs.showOpponentSpeech(event.speech || `¡${event.envidoType}!`);
        }
      } else if (event.fx === 'envido_resolved') {
        if (event.winner === 'PLAYER') {
          this.sound.playTrickWon();
          this.app.particles?.burstVictory('trick');
          const detail = event.myEnvidoPoints !== undefined
            ? ` (${event.myEnvidoPoints} vs ${event.oppEnvidoPoints})`
            : '';
          Dialogs.showToast(`<b>Envido ganho!</b>${detail} (+${event.points} tento(s))`, 'success', 2800);
        } else {
          this.sound.playTrickLost();
          const detail = event.myEnvidoPoints !== undefined
            ? ` (${event.oppEnvidoPoints} vs ${event.myEnvidoPoints})`
            : '';
          Dialogs.showToast(`${this.mpOpponentName} venceu o Envido${detail} (+${event.points} tento(s)).`, 'warning', 2800);
        }
      }

      if (event.handWinner) {
        if (event.handWinner === 'PLAYER') {
          this.sound.playTrickWon();
          this.app.particles?.burstVictory('hand');
          Dialogs.showToast(`<b>¡MÃO GANHA!</b> Você somou +${event.handPoints} tento(s)!`, 'success', 2600);
        } else {
          this.sound.playTrickLost();
          Dialogs.showToast(`${this.mpOpponentName} ganhou a mão (+${event.handPoints} tento(s)).`, 'warning', 2600);
        }
      }
    }

    // Modais de resposta pendentes
    if (state.betPending && state.betPending.from === 'OPPONENT') {
      this.showBetResponseModal('OPPONENT', state.betPending.type);
    } else {
      document.getElementById('bet-response-modal')?.classList.add('hidden');
    }

    if (state.envidoPending && state.envidoPending.from === 'OPPONENT') {
      this.showMpEnvidoModal(state.envidoPending.type);
    } else {
      document.getElementById('envido-response-modal')?.classList.add('hidden');
    }

    // Fim de partida
    if (state.matchFinished) {
      const endModal = document.getElementById('mp-match-end-modal');
      const endTitle = document.getElementById('mp-end-title');
      const endSub = document.getElementById('mp-end-subtitle');
      const won = state.matchWinner === 'PLAYER';

      if (won) {
        this.sound.playMatchVictory();
        this.app.particles?.burstVictory('match');
        if (endTitle) endTitle.textContent = '🏆 VOCÊ VENCEU!';
      } else {
        this.sound.playGameOver();
        if (endTitle) endTitle.textContent = '💀 DERROTA!';
      }

      if (endSub) {
        endSub.textContent = `Placar Final: Você ${state.playerScore} x ${state.opponentScore} ${this.mpOpponentName}`;
      }
      endModal?.classList.remove('hidden');
    }
  }

  showMpEnvidoModal(envidoType) {
    const modal = document.getElementById('envido-response-modal');
    if (!modal) return;
    document.getElementById('envido-modal-title').textContent = `${this.mpOpponentName} cantou ${envidoType}!`;

    document.getElementById('btn-envido-quiero').onclick = () => {
      modal.classList.add('hidden');
      this.sound.playClick();
      this.app.mpClient.respondEnvido('QUIERO');
    };

    document.getElementById('btn-envido-noquiero').onclick = () => {
      modal.classList.add('hidden');
      this.sound.playClick();
      this.app.mpClient.respondEnvido('NO_QUIERO');
    };

    modal.classList.remove('hidden');
  }
}

