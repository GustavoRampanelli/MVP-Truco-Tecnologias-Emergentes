/**
 * RunManager.js - Orquestrador Geral da Run Roguelike
 */

import { Deck } from '../core/Deck.js';
import { JokerManager } from './Jokers.js';
import { BARS_CONFIG } from './Opponents.js';
import { Shop } from './Shop.js';

export class RunManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.coins = 15; // Moedas iniciais
    this.lives = 3;  // Vidas na run
    this.maxLives = 3;

    this.playerDeck = new Deck(); // Inicia com 40 cartas espanholas padrão
    this.jokerManager = new JokerManager(5); // Até 5 curingas equipados
    this.shop = new Shop(this);

    this.currentBarIndex = 0;
    this.currentOpponentIndex = 0;

    this.activeBuffs = {
      fernet: false
    };

    this.stats = {
      matchesWon: 0,
      handsWon: 0,
      trucosCalled: 0,
      coinsEarned: 15,
      bluffsSucceeded: 0
    };

    this.runState = 'IN_MATCH'; // 'IN_MATCH' | 'VICTORY_REWARDS' | 'SHOP' | 'GAME_OVER' | 'RUN_WON'
  }

  getCurrentBar() {
    return BARS_CONFIG[this.currentBarIndex] || BARS_CONFIG[0];
  }

  getCurrentOpponent() {
    const bar = this.getCurrentBar();
    return bar.opponents[this.currentOpponentIndex] || bar.opponents[0];
  }

  addCoins(amount, source = '') {
    this.coins += amount;
    this.stats.coinsEarned += amount;
  }

  /**
   * Chamado quando o jogador vence uma partida no boteco
   */
  handleMatchVictory() {
    this.stats.matchesWon++;
    const opp = this.getCurrentOpponent();
    this.addCoins(opp.rewardCoins, `Vitória sobre ${opp.name}`);

    // Limpar buffs de partida única
    this.activeBuffs.fernet = false;

    // Verificar se era o último adversário do jogo
    const bar = this.getCurrentBar();
    const isLastOpponentOfBar = this.currentOpponentIndex >= bar.opponents.length - 1;
    const isLastBar = this.currentBarIndex >= BARS_CONFIG.length - 1;

    if (isLastOpponentOfBar && isLastBar) {
      this.runState = 'RUN_WON';
      return { runWon: true };
    }

    // Reabastecer a loja para visita
    this.shop.restock();
    this.runState = 'SHOP';
    return { runWon: false, rewardCoins: opp.rewardCoins };
  }

  /**
   * Chamado quando o jogador perde a partida
   */
  handleMatchDefeat() {
    this.lives--;
    if (this.lives <= 0) {
      this.runState = 'GAME_OVER';
      return { gameOver: true };
    }
    // Ainda tem vidas: pode tentar novamente ou reabastecer
    this.shop.restock();
    this.runState = 'SHOP';
    return { gameOver: false, livesLeft: this.lives };
  }

  /**
   * Avança para o próximo adversário / boteco ao sair da loja
   */
  advanceToNextMatch() {
    const bar = this.getCurrentBar();
    if (this.currentOpponentIndex < bar.opponents.length - 1) {
      this.currentOpponentIndex++;
    } else {
      this.currentBarIndex++;
      this.currentOpponentIndex = 0;
    }
    this.runState = 'IN_MATCH';
  }
}

