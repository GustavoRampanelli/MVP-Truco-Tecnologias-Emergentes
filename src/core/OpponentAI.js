/**
 * OpponentAI.js - Inteligência Artificial para Truco Argentino
 * Suporta diferentes personalidades de oponentes de boteco (blefador, agressivo, cauteloso)
 */

import { EnvidoEngine } from './EnvidoEngine.js';

export class OpponentAI {
  /**
   * @param {object} personality
   * @param {string} personality.name
   * @param {number} personality.bluffChance - 0.0 a 1.0 (probabilidade de blefar)
   * @param {number} personality.cautiousness - 0.0 a 1.0 (tolerância a correr)
   * @param {number} personality.aggression - 0.0 a 1.0 (apetite por retrucar e cantar envido)
   */
  constructor(personality = {}) {
    this.name = personality.name || 'El Parroquiano';
    this.bluffChance = personality.bluffChance ?? 0.15;
    this.cautiousness = personality.cautiousness ?? 0.3;
    this.aggression = personality.aggression ?? 0.5;
  }

  /**
   * Decide resposta ao Envido cantado pelo jogador
   * @param {Card[]} aiCards
   * @param {string} betType - 'ENVIDO', 'REAL_ENVIDO', 'FALTA_ENVIDO'
   * @returns {'QUIERO' | 'NO_QUIERO' | 'REAL_ENVIDO' | 'FALTA_ENVIDO'}
   */
  respondToEnvido(aiCards, betType) {
    const { points, isFlor } = EnvidoEngine.calculateHandEnvido(aiCards);

    // Se tiver flor, grita FLOR!
    if (isFlor) return 'FLOR';

    // Se tiver 30 ou mais pontos, quer quase com certeza
    if (points >= 30) {
      if (this.aggression > 0.6 && Math.random() < 0.4 && betType === 'ENVIDO') {
        return 'REAL_ENVIDO';
      }
      return 'QUIERO';
    }

    if (points >= 27) {
      return Math.random() < (0.7 + this.aggression * 0.25) ? 'QUIERO' : 'NO_QUIERO';
    }

    if (points >= 24) {
      return Math.random() < (0.35 + this.aggression * 0.2) ? 'QUIERO' : 'NO_QUIERO';
    }

    // Blefe raro
    if (Math.random() < this.bluffChance * 0.5) {
      return 'QUIERO';
    }

    return 'NO_QUIERO';
  }

  /**
   * Decide se deve tomar a iniciativa de cantar Envido na 1ª vaza
   */
  shouldInitiateEnvido(aiCards, trickIndex) {
    if (trickIndex !== 0) return null;
    const { points, isFlor } = EnvidoEngine.calculateHandEnvido(aiCards);

    if (isFlor) return 'FLOR';
    if (points >= 28 && Math.random() < (0.7 + this.aggression * 0.2)) {
      if (points >= 31 && this.aggression > 0.6 && Math.random() < 0.3) {
        return 'REAL_ENVIDO';
      }
      return 'ENVIDO';
    }

    // Blefe no envido
    if (Math.random() < this.bluffChance * 0.4) {
      return 'ENVIDO';
    }

    return null;
  }

  /**
   * Decide resposta a um canto de Truco / Retruco / Vale Quatro
   * @param {Card[]} remainingCards
   * @param {TrucoEngine} engine
   * @param {object} playerModifiers
   */
  respondToTruco(remainingCards, engine, playerModifiers = {}) {
    const bet = engine.betPending;
    if (!bet) return 'QUIERO';

    // Bônus de blefe do jogador (ex: Curinga "Grito Porteño")
    let fearModifier = 0;
    if (playerModifiers.jokerGritoPorteno) {
      fearModifier += 0.30;
    }

    // Avaliar a média de força das cartas restantes
    const powers = remainingCards.map(c => c.getEffectiveTrucoPower({ trickIndex: engine.currentTrick }));
    const maxPower = Math.max(...powers, 0);
    const avgPower = powers.length ? powers.reduce((a, b) => a + b, 0) / powers.length : 0;

    // Se tiver cartas fortíssimas (1 de Espadas=14, 1 de Bastos=13, 7 de Espadas=12, 7 de Oros=11)
    const hasMonster = maxPower >= 11;
    const hasGoodCard = maxPower >= 9; // 3s ou 2s

    // Vantagem de vazas
    const myWins = engine.tricks.filter(t => t.winner === 'OPPONENT').length;
    const playerWins = engine.tricks.filter(t => t.winner === 'PLAYER').length;

    let acceptScore = (avgPower / 14) * 0.6 + (hasMonster ? 0.4 : 0) + (myWins > playerWins ? 0.3 : 0);
    acceptScore -= (this.cautiousness * 0.3 + fearModifier);

    if (bet.type === 'TRUCO') {
      if (hasMonster && this.aggression > 0.5 && Math.random() < 0.4) {
        return 'RETRUCO';
      }
      if (acceptScore >= 0.4 || hasGoodCard || Math.random() < this.bluffChance) {
        return 'QUIERO';
      }
      return 'NO_QUIERO';
    }

    if (bet.type === 'RETRUCO') {
      if (hasMonster && this.aggression > 0.7 && Math.random() < 0.3) {
        return 'VALE_CUATRO';
      }
      return (hasMonster || acceptScore >= 0.65) ? 'QUIERO' : 'NO_QUIERO';
    }

    if (bet.type === 'VALE_CUATRO') {
      return (hasMonster && acceptScore >= 0.75) ? 'QUIERO' : 'NO_QUIERO';
    }

    return 'QUIERO';
  }

  /**
   * Decide se a IA deve propor Truco no seu turno
   */
  shouldProposeTruco(remainingCards, engine, playerModifiers = {}) {
    if (engine.betPending || engine.handFinished) return null;
    if (engine.lastBettor === 'OPPONENT') return null;

    const currentLevel = engine.currentBet.level;
    const nextBet = engine.currentBet.nextBet;
    if (!nextBet) return null;

    const powers = remainingCards.map(c => c.getEffectiveTrucoPower({ trickIndex: engine.currentTrick }));
    const maxPower = Math.max(...powers, 0);

    const myWins = engine.tricks.filter(t => t.winner === 'OPPONENT').length;

    // Se já venceu a primeira vaza e tem carta razoável
    if (myWins === 1 && maxPower >= 8 && Math.random() < (0.6 + this.aggression * 0.3)) {
      return nextBet;
    }

    // Se tem carta invencível (1 de Espadas)
    if (maxPower >= 13 && Math.random() < (0.7 + this.aggression * 0.2)) {
      return nextBet;
    }

    // Blefe puro
    if (Math.random() < this.bluffChance * 0.35) {
      return nextBet;
    }

    return null;
  }

  /**
   * Escolhe qual carta jogar na vaza atual
   * @param {Card[]} remainingCards
   * @param {Card|null} playerCardOnTable - se o jogador já jogou nesta vaza
   * @param {TrucoEngine} engine
   * @returns {Card}
   */
  chooseCardToPlay(remainingCards, playerCardOnTable, engine) {
    if (remainingCards.length === 1) {
      return remainingCards[0];
    }

    const context = { trickIndex: engine.currentTrick };
    const cardsWithPower = remainingCards.map(card => ({
      card,
      power: card.getEffectiveTrucoPower(context)
    }));

    // Ordenar do menor para o maior poder
    cardsWithPower.sort((a, b) => a.power - b.power);

    // Se o jogador já jogou na mesa
    if (playerCardOnTable) {
      const pPower = playerCardOnTable.getEffectiveTrucoPower(context);

      // Cartas que matam a do jogador
      const winningCards = cardsWithPower.filter(c => c.power > pPower);
      if (winningCards.length > 0) {
        // Joga a menor carta vencedora para economizar poder!
        return winningCards[0].card;
      }

      // Cartas que empatam (Parda)
      const tyingCards = cardsWithPower.filter(c => c.power === pPower);
      if (tyingCards.length > 0) {
        // Empate na primeira vaza é bom se tivermos cartas altas depois
        if (engine.currentTrick === 0 && cardsWithPower[cardsWithPower.length - 1].power >= 10) {
          return tyingCards[0].card;
        }
      }

      // Não tem como matar nem empatar: joga a carta mais fraca para descartar lixo!
      return cardsWithPower[0].card;
    }

    // Se a IA está abrindo a vaza (sem carta do jogador na mesa)
    if (engine.currentTrick === 0) {
      // Na 1ª vaza: se tiver uma carta intermediária (ex: 2 ou 3), joga para puxar carta do oponente
      const midCard = cardsWithPower.find(c => c.power >= 8 && c.power <= 10);
      if (midCard && Math.random() < 0.7) {
        return midCard.card;
      }
      // Ou abre com carta mais fraca se tiver monstro guardado
      return cardsWithPower[0].card;
    }

    if (engine.currentTrick === 1) {
      // Na 2ª vaza: se ganhou a primeira, pode arrematar com a mais forte
      const myTrick0 = engine.tricks[0].winner === 'OPPONENT';
      if (myTrick0) {
        return cardsWithPower[cardsWithPower.length - 1].card;
      }
      return cardsWithPower[0].card;
    }

    // 3ª vaza: joga a melhor que sobrou
    return cardsWithPower[cardsWithPower.length - 1].card;
  }
}

