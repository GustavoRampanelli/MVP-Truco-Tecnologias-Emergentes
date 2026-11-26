/**
 * EnvidoEngine.js - Lógica e Resolução do Envido e Flor no Truco Argentino
 */

export class EnvidoEngine {
  /**
   * Calcula a pontuação de Envido de uma mão de 3 cartas
   * @param {Card[]} cards
   * @param {object} [modifiers] - modificadores roguelike (ex: bônus de ouro, etc.)
   * @returns {{ points: number, suit: string|null, isFlor: boolean, details: string }}
   */
  static calculateHandEnvido(cards, modifiers = {}) {
    if (!cards || cards.length === 0) {
      return { points: 0, suit: null, isFlor: false, details: 'Sem cartas' };
    }

    // B2 FIX: sempre usar card.suit.id real (nunca propriedades modificadas por curingas)
    // Agrupar por naipe real (imutável)
    const suitsMap = {};
    for (const card of cards) {
      const sId = card.suit.id; // .suit é sempre o naipe físico da carta
      if (!suitsMap[sId]) suitsMap[sId] = [];
      suitsMap[sId].push(card);
    }

    let maxPoints = 0;
    let bestSuit = null;
    let isFlor = false;
    let details = '';

    // Verificar se tem 3 cartas do mesmo naipe (FLOR!)
    for (const sId in suitsMap) {
      const group = suitsMap[sId];
      if (group.length === 3) {
        isFlor = true;
        bestSuit = sId;
        const sumFlor = 20 + group[0].getEnvidoValue() + group[1].getEnvidoValue() + group[2].getEnvidoValue();
        maxPoints = sumFlor;
        details = `Flor de ${group[0].suit.name} (${maxPoints})`;
        break;
      }
    }

    // Se não for Flor ou para fins de envido padrão:
    if (!isFlor) {
      for (const sId in suitsMap) {
        const group = suitsMap[sId];
        if (group.length >= 2) {
          // Ordenar valores nominais decrescente
          const sorted = group.map(c => c.getEnvidoValue()).sort((a, b) => b - a);
          const pts = 20 + sorted[0] + sorted[1];
          if (pts > maxPoints) {
            maxPoints = pts;
            bestSuit = sId;
            details = `${group[0].suit.name}: 20 + ${sorted[0]} + ${sorted[1]} = ${pts}`;
          }
        }
      }

      // Se todas as 3 cartas forem de naipes diferentes:
      if (maxPoints === 0) {
        const sorted = cards.map(c => c.getEnvidoValue()).sort((a, b) => b - a);
        maxPoints = sorted[0];
        const bestCard = cards.find(c => c.getEnvidoValue() === maxPoints);
        bestSuit = bestCard ? bestCard.suit.id : null;
        details = `Maior carta avulsa: ${maxPoints}`;
      }
    }

    // Modificadores Roguelike
    if (modifiers.bonusEnvido) {
      maxPoints += modifiers.bonusEnvido;
      details += ` (+${modifiers.bonusEnvido} Curinga)`;
    }

    // Se tiver Curinga "Flor de Buenos Aires" ou bônus de Oros
    if (modifiers.bonusEnvidoOros && bestSuit === 'OROS') {
      maxPoints += modifiers.bonusEnvidoOros;
      details += ` (+${modifiers.bonusEnvidoOros} Ouro de San Telmo)`;
    }

    return {
      points: maxPoints,
      suit: bestSuit,
      isFlor,
      details
    };
  }

  /**
   * Determina o vencedor da disputa de Envido
   * Em caso de empate, vence quem é "Mão" (isPlayerMano)
   */
  static resolveContest(playerPoints, opponentPoints, isPlayerMano) {
    if (playerPoints > opponentPoints) {
      return { winner: 'PLAYER', reason: `Jogador tem ${playerPoints} contra ${opponentPoints}` };
    } else if (opponentPoints > playerPoints) {
      return { winner: 'OPPONENT', reason: `Adversário tem ${opponentPoints} contra ${playerPoints}` };
    } else {
      // Empate: ganha quem é a mão
      const winner = isPlayerMano ? 'PLAYER' : 'OPPONENT';
      return {
        winner,
        reason: `Empate em ${playerPoints} pontos! Venceu o Mano (${winner === 'PLAYER' ? 'Jogador' : 'Adversário'})`
      };
    }
  }
}

