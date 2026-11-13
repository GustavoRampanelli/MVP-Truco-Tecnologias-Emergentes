/**
 * TrucoEngine.js - Gerenciador de Rodadas, Vazas, Empates (Pardas) e Apostas do Truco Argentino
 */

export const BET_LEVELS = {
  NONE: { level: 0, name: 'Normal', acceptedPoints: 1, declinedPoints: 0, nextBet: 'TRUCO' },
  TRUCO: { level: 1, name: '¡TRUCO!', acceptedPoints: 2, declinedPoints: 1, nextBet: 'RETRUCO' },
  RETRUCO: { level: 2, name: '¡RETRUCO!', acceptedPoints: 3, declinedPoints: 2, nextBet: 'VALE_CUATRO' },
  VALE_CUATRO: { level: 3, name: '¡VALE CUATRO!', acceptedPoints: 4, declinedPoints: 3, nextBet: null }
};

export class TrucoEngine {
  constructor(isPlayerMano = true, modifiers = {}) {
    this.isPlayerMano = isPlayerMano;
    this.modifiers = modifiers; // Modificadores roguelike

    this.currentTrick = 0; // 0, 1, 2 (1ª, 2ª, 3ª vaza)
    this.tricks = [
      { playerCard: null, opponentCard: null, winner: null },
      { playerCard: null, opponentCard: null, winner: null },
      { playerCard: null, opponentCard: null, winner: null }
    ];

    this.currentBet = BET_LEVELS.NONE;
    this.lastBettor = null; // 'PLAYER' | 'OPPONENT' | null
    this.betPending = null; // { betType: 'TRUCO'|'RETRUCO'|'VALE_CUATRO', from: 'PLAYER'|'OPPONENT' }
    this.handFinished = false;
    this.handWinner = null;
    this.pointsAwarded = 1;
    this.log = [];
  }

  /**
   * Registra jogada da carta na vaza atual
   */
  playCard(side, card) {
    if (this.handFinished) return;

    const trick = this.tricks[this.currentTrick];
    if (side === 'PLAYER') {
      trick.playerCard = card;
    } else {
      trick.opponentCard = card;
    }

    // Se ambos jogaram na vaza atual, resolve a vaza
    if (trick.playerCard && trick.opponentCard) {
      this.resolveCurrentTrick();
    }
  }

  /**
   * Compara as duas cartas e determina o vencedor da vaza ou empate (Parda)
   */
  resolveCurrentTrick() {
    const trick = this.tricks[this.currentTrick];
    const trickContext = { trickIndex: this.currentTrick, ...this.modifiers };

    const pPower = trick.playerCard.getEffectiveTrucoPower(trickContext);
    const oPower = trick.opponentCard.getEffectiveTrucoPower(trickContext);

    if (pPower > oPower) {
      trick.winner = 'PLAYER';
      this.log.push(`Vaza ${this.currentTrick + 1}: Jogador venceu (${trick.playerCard.getName()} vs ${trick.opponentCard.getName()})`);
    } else if (oPower > pPower) {
      trick.winner = 'OPPONENT';
      this.log.push(`Vaza ${this.currentTrick + 1}: Adversário venceu (${trick.opponentCard.getName()} vs ${trick.playerCard.getName()})`);
    } else {
      trick.winner = 'TIE'; // Parda
      this.log.push(`Vaza ${this.currentTrick + 1}: Empate / Parda! (${trick.playerCard.getName()} empata com ${trick.opponentCard.getName()})`);
    }

    // Verifica se a mão já tem um vencedor
    const result = this.checkHandWinner();
    if (result) {
      this.handFinished = true;
      this.handWinner = result.winner;
      this.pointsAwarded = this.currentBet.acceptedPoints;
      this.log.push(`Fim da mão! Vencedor: ${result.winner} (${result.reason})`);
    } else {
      // Avança para a próxima vaza
      this.currentTrick++;
    }
  }

  /**
   * Regras Oficiais de Resolução de Pardas e Vencedor do Truco Argentino
   */
  checkHandWinner() {
    const t0 = this.tricks[0].winner;
    const t1 = this.tricks[1].winner;
    const t2 = this.tricks[2].winner;

    // Caso 1: Alguém já ganhou 2 vazas
    const playerWins = this.tricks.filter(t => t.winner === 'PLAYER').length;
    const oppWins = this.tricks.filter(t => t.winner === 'OPPONENT').length;

    if (playerWins === 2) return { winner: 'PLAYER', reason: 'Venceu 2 vazas' };
    if (oppWins === 2) return { winner: 'OPPONENT', reason: 'Venceu 2 vazas' };

    // Casos de Empate (Parda) na 1ª Vaza
    if (t0 === 'TIE') {
      // Se a 2ª vaza foi jogada:
      if (t1 === 'PLAYER') return { winner: 'PLAYER', reason: 'Primeira empatou, venceu a segunda vaza' };
      if (t1 === 'OPPONENT') return { winner: 'OPPONENT', reason: 'Primeira empatou, venceu a segunda vaza' };
      if (t1 === 'TIE') {
        // Se empatou a 1ª e a 2ª: decide na 3ª
        if (t2 === 'PLAYER') return { winner: 'PLAYER', reason: '1ª e 2ª empatadas, venceu a 3ª vaza' };
        if (t2 === 'OPPONENT') return { winner: 'OPPONENT', reason: '1ª e 2ª empatadas, venceu a 3ª vaza' };
        if (t2 === 'TIE') {
          // As 3 empataram: vence o Mano
          const manoWinner = this.isPlayerMano ? 'PLAYER' : 'OPPONENT';
          return { winner: manoWinner, reason: 'Todas as vazas empatadas, venceu o Mano' };
        }
      }
      return null; // Aguardando próximas vazas
    }

    // Caso onde 1ª vaza teve vencedor e 2ª vaza EMPATOU
    if (t0 !== null && t0 !== 'TIE' && t1 === 'TIE') {
      // Quem ganhou a 1ª vaza vence imediatamente!
      return { winner: t0, reason: `Venceu a 1ª vaza e a 2ª empatou` };
    }

    // Caso onde 1ª foi de A, 2ª de B (1x1), e a 3ª vaza EMPATOU
    if (t0 !== null && t1 !== null && t0 !== t1 && t2 === 'TIE') {
      // Desempate: quem ganhou a primeira vaza leva a mão!
      return { winner: t0, reason: `Empate na 3ª vaza, desempatou pela 1ª vaza` };
    }

    // Se completou a 3ª vaza e alguém venceu
    if (t2 === 'PLAYER') return { winner: 'PLAYER', reason: 'Venceu a 3ª vaza' };
    if (t2 === 'OPPONENT') return { winner: 'OPPONENT', reason: 'Venceu a 3ª vaza' };

    return null; // Mão continua
  }

  /**
   * Quem deve iniciar a jogada da vaza atual
   */
  getLeadPlayerForCurrentTrick() {
    if (this.currentTrick === 0) {
      return this.isPlayerMano ? 'PLAYER' : 'OPPONENT';
    }
    const prevWinner = this.tricks[this.currentTrick - 1].winner;
    if (prevWinner === 'PLAYER') return 'PLAYER';
    if (prevWinner === 'OPPONENT') return 'OPPONENT';
    // Se a vaza anterior empatou, quem abriu a vaza anterior abre a próxima
    return this.isPlayerMano ? 'PLAYER' : 'OPPONENT';
  }

  /**
   * Proposta de aposta (Truco, Retruco ou Vale Quatro)
   */
  proposeBet(from, betTypeKey) {
    const betConfig = BET_LEVELS[betTypeKey];
    if (!betConfig) return false;

    // Não pode apostar se já tem aposta pendente
    if (this.betPending) return false;

    // Não pode retrucar a própria aposta consecutiva
    if (this.lastBettor === from) return false;

    this.betPending = {
      type: betTypeKey,
      config: betConfig,
      from
    };
    this.log.push(`${from === 'PLAYER' ? 'Jogador' : 'Adversário'} gritou ${betConfig.name}!`);
    return true;
  }

  /**
   * Resposta à aposta pendente: "QUIERO"
   */
  acceptBet(responder) {
    if (!this.betPending) return null;
    const bet = this.betPending;
    this.currentBet = bet.config;
    this.lastBettor = bet.from;
    this.betPending = null;
    this.log.push(`${responder === 'PLAYER' ? 'Jogador' : 'Adversário'} aceitou: ¡QUIERO! (Vale ${this.currentBet.acceptedPoints} tentos)`);
    return this.currentBet;
  }

  /**
   * Resposta à aposta pendente: "NO QUIERO" (Recusar / Correr)
   */
  declineBet(responder) {
    if (!this.betPending) return null;
    const bet = this.betPending;
    // Quem cantou ganha os pontos da aposta recusada
    const winner = bet.from;
    const pointsWon = bet.config.declinedPoints;

    this.handFinished = true;
    this.handWinner = winner;
    this.pointsAwarded = pointsWon;
    this.betPending = null;

    this.log.push(`${responder === 'PLAYER' ? 'Jogador' : 'Adversário'} correu: ¡NO QUIERO! (${winner} ganha ${pointsWon} ponto(s))`);
    return { winner, pointsWon };
  }

  /**
   * Irse al mazo (Desistir da mão sem aposta pendente)
   */
  fold(surrenderer) {
    if (this.handFinished) return;
    const winner = surrenderer === 'PLAYER' ? 'OPPONENT' : 'PLAYER';
    const pointsWon = this.currentBet.acceptedPoints;

    this.handFinished = true;
    this.handWinner = winner;
    this.pointsAwarded = pointsWon;
    this.log.push(`${surrenderer === 'PLAYER' ? 'Jogador' : 'Adversário'} se fue al mazo. (${winner} ganha ${pointsWon} ponto(s))`);
    return { winner, pointsWon };
  }
}

