/**
 * RoomManager.js - Gerenciador de Salas 1v1 Autoritativo no Servidor (Node.js)
 * Reutiliza 100% do motor oficial: Deck, TrucoEngine e EnvidoEngine.
 */

import { Deck } from '../core/Deck.js';
import { TrucoEngine, BET_LEVELS } from '../core/TrucoEngine.js';
import { EnvidoEngine } from '../core/EnvidoEngine.js';

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Room
  }

  generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    do {
      id = '';
      for (let i = 0; i < 4; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.rooms.has(id));
    return id;
  }

  handleConnection(ws) {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      this.handleMessage(ws, msg);
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });
  }

  send(ws, payload) {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(payload));
    }
  }

  handleMessage(ws, msg) {
    switch (msg.type) {
      case 'create_room': {
        this.handleDisconnect(ws);
        const roomId = this.generateRoomId();
        const name = (msg.name || 'Jogador 1').toString().trim().slice(0, 18) || 'Jogador 1';
        const room = {
          id: roomId,
          players: {
            P1: { ws, name },
            P2: null
          },
          match: null
        };
        this.rooms.set(roomId, room);
        ws.roomId = roomId;
        ws.side = 'P1';
        this.send(ws, { type: 'room_created', roomId, playerSide: 'P1' });
        break;
      }

      case 'join_room': {
        const roomId = (msg.roomId || '').toString().trim().toUpperCase();
        const room = this.rooms.get(roomId);
        if (!room) {
          this.send(ws, { type: 'error', message: `Sala "${roomId}" não encontrada.` });
          return;
        }
        if (room.players.P2) {
          this.send(ws, { type: 'error', message: `A sala "${roomId}" já está cheia (1v1).` });
          return;
        }
        this.handleDisconnect(ws);
        const name = (msg.name || 'Jogador 2').toString().trim().slice(0, 18) || 'Jogador 2';
        room.players.P2 = { ws, name };
        ws.roomId = roomId;
        ws.side = 'P2';

        this.send(ws, {
          type: 'room_joined',
          roomId,
          playerSide: 'P2',
          opponentName: room.players.P1.name
        });
        this.send(room.players.P1.ws, {
          type: 'opponent_joined',
          roomId,
          opponentName: name
        });

        this.startMatch(room);
        break;
      }

      case 'play_card': {
        const room = this.rooms.get(ws.roomId);
        if (room && room.match) this.onPlayCard(room, ws.side, msg.cardId);
        break;
      }

      case 'propose_truco': {
        const room = this.rooms.get(ws.roomId);
        if (room && room.match) this.onProposeTruco(room, ws.side, msg.betType);
        break;
      }

      case 'respond_truco': {
        const room = this.rooms.get(ws.roomId);
        if (room && room.match) this.onRespondTruco(room, ws.side, msg.action);
        break;
      }

      case 'propose_envido': {
        const room = this.rooms.get(ws.roomId);
        if (room && room.match) this.onProposeEnvido(room, ws.side, msg.envidoType);
        break;
      }

      case 'respond_envido': {
        const room = this.rooms.get(ws.roomId);
        if (room && room.match) this.onRespondEnvido(room, ws.side, msg.action);
        break;
      }

      case 'fold': {
        const room = this.rooms.get(ws.roomId);
        if (room && room.match) this.onFold(room, ws.side);
        break;
      }

      case 'rematch': {
        const room = this.rooms.get(ws.roomId);
        if (room && room.players.P1 && room.players.P2) {
          this.startMatch(room);
        }
        break;
      }
    }
  }

  handleDisconnect(ws) {
    if (!ws.roomId) return;
    const room = this.rooms.get(ws.roomId);
    if (!room) {
      ws.roomId = null;
      ws.side = null;
      return;
    }

    const otherSide = ws.side === 'P1' ? 'P2' : 'P1';
    const other = room.players[otherSide];
    if (other && other.ws) {
      this.send(other.ws, {
        type: 'opponent_disconnected',
        message: `${room.players[ws.side]?.name || 'O adversário'} desconectou da sala.`
      });
    }

    this.rooms.delete(ws.roomId);
    ws.roomId = null;
    ws.side = null;
  }

  // =====================================================================
  // LÓGICA DA PARTIDA (P1 = PLAYER no motor, P2 = OPPONENT no motor)
  // =====================================================================

  sideToEngine(side) {
    return side === 'P1' ? 'PLAYER' : 'OPPONENT';
  }

  engineToSide(engSide) {
    return engSide === 'PLAYER' ? 'P1' : 'P2';
  }

  startMatch(room) {
    room.match = {
      p1Score: 0,
      p2Score: 0,
      pointsToWin: 12,
      manoSide: 'P1',
      handCount: 0,
      matchFinished: false,
      matchWinner: null,
      hand: null,
      pendingTimer: null
    };

    this.send(room.players.P1.ws, {
      type: 'match_started',
      opponentName: room.players.P2.name,
      pointsToWin: 12
    });
    this.send(room.players.P2.ws, {
      type: 'match_started',
      opponentName: room.players.P1.name,
      pointsToWin: 12
    });

    this.startNewHand(room);
  }

  startNewHand(room) {
    const m = room.match;
    if (!m || m.matchFinished) return;
    clearTimeout(m.pendingTimer);

    m.handCount++;
    if (m.handCount > 1) {
      m.manoSide = m.manoSide === 'P1' ? 'P2' : 'P1';
    }

    const deck = new Deck();
    const shuffled = deck.getShuffledCopy();
    const p1Hand = shuffled.slice(0, 3);
    const p2Hand = shuffled.slice(3, 6);

    const engine = new TrucoEngine(m.manoSide === 'P1', {});

    m.hand = {
      p1Hand,
      p2Hand,
      engine,
      turnSide: m.manoSide,
      envidoResolved: false,
      envidoPending: null, // { type: 'ENVIDO'|'FLOR', from: 'P1'|'P2' }
      awaitingBet: false
    };

    this.broadcastState(room, {
      fx: 'hand_started',
      toast: `Nova mão! Mão: <b>${room.players[m.manoSide].name}</b>`
    });
  }

  onPlayCard(room, side, cardId) {
    const m = room.match;
    const h = m?.hand;
    if (!h || m.matchFinished || h.engine.handFinished) return;
    if (h.awaitingBet || h.envidoPending || h.engine.betPending) return;
    if (h.turnSide !== side) return;

    const handArr = side === 'P1' ? h.p1Hand : h.p2Hand;
    const idx = handArr.findIndex(c => c.id === cardId);
    if (idx === -1) return;

    const [card] = handArr.splice(idx, 1);
    const trickIdxBefore = h.engine.currentTrick;
    h.engine.playCard(this.sideToEngine(side), card);

    const trickAfter = h.engine.tricks[trickIdxBefore];
    const trickCompleted = !!(trickAfter.playerCard && trickAfter.opponentCard);

    if (!trickCompleted) {
      h.turnSide = side === 'P1' ? 'P2' : 'P1';
      this.broadcastState(room, {
        fx: 'card_played',
        playedBy: side,
        trickIdx: trickIdxBefore,
        isBravo: card.getBaseTrucoPower() >= 11
      });
      return;
    }

    // Vaza concluída
    const winnerSide = trickAfter.winner === 'TIE' ? 'TIE' : this.engineToSide(trickAfter.winner);

    if (h.engine.handFinished) {
      this.finishHand(room, {
        fx: 'card_played',
        playedBy: side,
        trickIdx: trickIdxBefore,
        isBravo: card.getBaseTrucoPower() >= 11,
        trickWinner: winnerSide
      });
    } else {
      const leadEng = h.engine.getLeadPlayerForCurrentTrick();
      h.turnSide = this.engineToSide(leadEng);
      this.broadcastState(room, {
        fx: 'trick_resolved',
        playedBy: side,
        trickIdx: trickIdxBefore,
        isBravo: card.getBaseTrucoPower() >= 11,
        trickWinner: winnerSide
      });
    }
  }

  onProposeTruco(room, side, betType) {
    const m = room.match;
    const h = m?.hand;
    if (!h || m.matchFinished || h.engine.handFinished) return;
    if (h.envidoPending || h.engine.betPending) return;
    if (h.turnSide !== side) return;

    const engFrom = this.sideToEngine(side);
    if (!h.engine.proposeBet(engFrom, betType)) return;

    h.awaitingBet = true;
    this.broadcastState(room, {
      fx: 'truco_call',
      from: side,
      betType,
      speech: `¡${BET_LEVELS[betType].name}!`
    });
  }

  onRespondTruco(room, side, action) {
    const m = room.match;
    const h = m?.hand;
    if (!h || !h.engine.betPending) return;
    const betFromSide = this.engineToSide(h.engine.betPending.from);
    if (betFromSide === side) return; // não pode responder a própria aposta

    const engResponder = this.sideToEngine(side);

    if (action === 'QUIERO') {
      const accepted = h.engine.acceptBet(engResponder);
      h.awaitingBet = false;
      this.broadcastState(room, {
        fx: 'truco_accepted',
        from: side,
        speech: `¡QUIERO! (Vale ${accepted.acceptedPoints})`
      });
    } else if (action === 'NO_QUIERO') {
      h.engine.declineBet(engResponder);
      h.awaitingBet = false;
      this.finishHand(room, {
        fx: 'truco_declined',
        from: side,
        speech: '¡NO QUIERO!'
      });
    } else if (action === 'RETRUCO' || action === 'VALE_CUATRO') {
      // Aceita o nível anterior implicitamente e propõe o próximo
      h.engine.acceptBet(engResponder);
      if (h.engine.proposeBet(engResponder, action)) {
        h.awaitingBet = true;
        this.broadcastState(room, {
          fx: 'truco_call',
          from: side,
          betType: action,
          speech: `¡${BET_LEVELS[action].name}!`
        });
      }
    }
  }

  onProposeEnvido(room, side, envidoType = 'ENVIDO') {
    const m = room.match;
    const h = m?.hand;
    if (!h || m.matchFinished || h.engine.handFinished) return;
    if (h.engine.currentTrick !== 0 || h.envidoResolved || h.envidoPending || h.engine.betPending) return;
    if (h.turnSide !== side) return;

    h.envidoPending = { type: envidoType, from: side };
    h.awaitingBet = true;

    this.broadcastState(room, {
      fx: 'envido_call',
      from: side,
      envidoType,
      speech: `¡${envidoType}!`
    });
  }

  onRespondEnvido(room, side, action) {
    const m = room.match;
    const h = m?.hand;
    if (!h || !h.envidoPending) return;
    if (h.envidoPending.from === side) return;

    const p1Env = EnvidoEngine.calculateHandEnvido(h.p1Hand);
    const p2Env = EnvidoEngine.calculateHandEnvido(h.p2Hand);

    if (action === 'FLOR') {
      const myEnv = side === 'P1' ? p1Env : p2Env;
      if (!myEnv.isFlor) return;
      if (side === 'P1') m.p1Score += 3;
      else m.p2Score += 3;

      h.envidoResolved = true;
      h.envidoPending = null;
      h.awaitingBet = false;

      this.checkMatchVictory(room);
      this.broadcastState(room, {
        fx: 'envido_resolved',
        winner: side,
        speech: '¡TENGO FLOR! (+3)',
        points: 3
      });
      return;
    }

    if (action === 'NO_QUIERO') {
      const winner = h.envidoPending.from;
      if (winner === 'P1') m.p1Score += 1;
      else m.p2Score += 1;

      h.envidoResolved = true;
      h.envidoPending = null;
      h.awaitingBet = false;

      this.checkMatchVictory(room);
      this.broadcastState(room, {
        fx: 'envido_resolved',
        winner,
        speech: '¡NO QUIERO!',
        points: 1
      });
      return;
    }

    if (action === 'QUIERO') {
      const stake = h.envidoPending.type === 'FLOR' ? 3 : 2;
      const res = EnvidoEngine.resolveContest(p1Env.points, p2Env.points, m.manoSide === 'P1');
      const winner = this.engineToSide(res.winner);

      if (winner === 'P1') m.p1Score += stake;
      else m.p2Score += stake;

      h.envidoResolved = true;
      h.envidoPending = null;
      h.awaitingBet = false;

      this.checkMatchVictory(room);
      this.broadcastState(room, {
        fx: 'envido_resolved',
        winner,
        p1Points: p1Env.points,
        p2Points: p2Env.points,
        points: stake,
        speech: '¡QUIERO!'
      });
    }
  }

  onFold(room, side) {
    const m = room.match;
    const h = m?.hand;
    if (!h || m.matchFinished || h.engine.handFinished) return;

    h.engine.fold(this.sideToEngine(side));
    h.awaitingBet = false;
    this.finishHand(room, {
      fx: 'fold',
      from: side,
      speech: 'Me voy al mazo...'
    });
  }

  finishHand(room, eventInfo = {}) {
    const m = room.match;
    const h = m.hand;
    const winner = this.engineToSide(h.engine.handWinner);
    const pts = h.engine.pointsAwarded;

    if (winner === 'P1') m.p1Score += pts;
    else m.p2Score += pts;

    this.checkMatchVictory(room);

    this.broadcastState(room, {
      ...eventInfo,
      handWinner: winner,
      handPoints: pts
    });

    if (!m.matchFinished) {
      m.pendingTimer = setTimeout(() => {
        this.startNewHand(room);
      }, 2400);
    }
  }

  checkMatchVictory(room) {
    const m = room.match;
    if (m.p1Score >= m.pointsToWin) {
      m.matchFinished = true;
      m.matchWinner = 'P1';
    } else if (m.p2Score >= m.pointsToWin) {
      m.matchFinished = true;
      m.matchWinner = 'P2';
    }
  }

  serializeCard(card) {
    if (!card) return null;
    return {
      id: card.id,
      value: card.value,
      suitId: card.suit.id,
      name: card.getName(),
      power: card.getBaseTrucoPower(),
      envidoValue: card.getEnvidoValue(),
      col: card.col,
      row: card.row
    };
  }

  buildStateForSide(room, side) {
    const m = room.match;
    const h = m.hand;
    const isP1 = side === 'P1';

    const mapSide = (engSide) => {
      if (!engSide || engSide === 'TIE') return engSide;
      const actualSide = this.engineToSide(engSide);
      return actualSide === side ? 'PLAYER' : 'OPPONENT';
    };

    const mapRawSide = (rawSide) => {
      if (!rawSide) return null;
      return rawSide === side ? 'PLAYER' : 'OPPONENT';
    };

    return {
      playerScore: isP1 ? m.p1Score : m.p2Score,
      opponentScore: isP1 ? m.p2Score : m.p1Score,
      pointsToWin: m.pointsToWin,
      isPlayerMano: m.manoSide === side,
      handCount: m.handCount,
      matchFinished: m.matchFinished,
      matchWinner: mapRawSide(m.matchWinner),
      playerHand: (isP1 ? h.p1Hand : h.p2Hand).map(c => this.serializeCard(c)),
      opponentCardCount: (isP1 ? h.p2Hand : h.p1Hand).length,
      currentTrick: h.engine.currentTrick,
      tricks: h.engine.tricks.map(t => ({
        playerCard: this.serializeCard(isP1 ? t.playerCard : t.opponentCard),
        opponentCard: this.serializeCard(isP1 ? t.opponentCard : t.playerCard),
        winner: mapSide(t.winner)
      })),
      currentBetKey: Object.keys(BET_LEVELS).find(k => BET_LEVELS[k] === h.engine.currentBet) || 'NONE',
      lastBettor: mapSide(h.engine.lastBettor),
      betPending: h.engine.betPending ? {
        type: h.engine.betPending.type,
        from: mapSide(h.engine.betPending.from)
      } : null,
      envidoResolved: h.envidoResolved,
      envidoPending: h.envidoPending ? {
        type: h.envidoPending.type,
        from: mapRawSide(h.envidoPending.from)
      } : null,
      awaitingBetResponse: h.awaitingBet,
      isPlayerTurn: h.turnSide === side,
      handFinished: h.engine.handFinished,
      handWinner: mapSide(h.engine.handWinner),
      pointsAwarded: h.engine.pointsAwarded
    };
  }

  broadcastState(room, event = null) {
    ['P1', 'P2'].forEach(side => {
      const player = room.players[side];
      if (!player || !player.ws) return;

      let mappedEvent = null;
      if (event) {
        mappedEvent = { ...event };
        if (event.from) mappedEvent.from = event.from === side ? 'PLAYER' : 'OPPONENT';
        if (event.playedBy) mappedEvent.playedBy = event.playedBy === side ? 'PLAYER' : 'OPPONENT';
        if (event.winner && event.winner !== 'TIE') mappedEvent.winner = event.winner === side ? 'PLAYER' : 'OPPONENT';
        if (event.trickWinner && event.trickWinner !== 'TIE') mappedEvent.trickWinner = event.trickWinner === side ? 'PLAYER' : 'OPPONENT';
        if (event.handWinner) mappedEvent.handWinner = event.handWinner === side ? 'PLAYER' : 'OPPONENT';
        if (event.p1Points !== undefined) {
          mappedEvent.myEnvidoPoints = side === 'P1' ? event.p1Points : event.p2Points;
          mappedEvent.oppEnvidoPoints = side === 'P1' ? event.p2Points : event.p1Points;
        }
      }

      this.send(player.ws, {
        type: 'state_sync',
        state: this.buildStateForSide(room, side),
        event: mappedEvent
      });
    });
  }
}
