/**
 * test_ws.js - Teste End-to-End do Servidor WebSocket 1v1 (RoomManager)
 */

import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { RoomManager } from '../src/server/RoomManager.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('  ✗ FAIL:', msg);
    process.exit(1);
  }
  console.log('  ✓', msg);
}

const server = http.createServer();
const wss = new WebSocketServer({ server });
const rm = new RoomManager();
wss.on('connection', ws => rm.handleConnection(ws));

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const url = `ws://127.0.0.1:${port}`;

console.log('\n--- Testando WebSocket Multiplayer 1v1 ---');

const p1 = new WebSocket(url);
const p2 = new WebSocket(url);

const p1Msgs = [];
const p2Msgs = [];

p1.on('message', d => p1Msgs.push(JSON.parse(d.toString())));
p2.on('message', d => p2Msgs.push(JSON.parse(d.toString())));

await Promise.all([
  new Promise(r => p1.on('open', r)),
  new Promise(r => p2.on('open', r))
]);

// 1. P1 cria sala
p1.send(JSON.stringify({ type: 'create_room', name: 'Gustavo' }));
await new Promise(r => setTimeout(r, 80));
const created = p1Msgs.find(m => m.type === 'room_created');
assert(created && created.roomId && created.roomId.length === 4, `Sala criada com código ${created?.roomId}`);

// 2. P2 entra na sala
p2.send(JSON.stringify({ type: 'join_room', roomId: created.roomId, name: 'Colega' }));
await new Promise(r => setTimeout(r, 120));

const p1Start = p1Msgs.find(m => m.type === 'match_started');
const p2Start = p2Msgs.find(m => m.type === 'match_started');
assert(p1Start && p1Start.opponentName === 'Colega', 'P1 recebeu match_started com nome do P2');
assert(p2Start && p2Start.opponentName === 'Gustavo', 'P2 recebeu match_started com nome do P1');

const p1State1 = p1Msgs.filter(m => m.type === 'state_sync').pop()?.state;
const p2State1 = p2Msgs.filter(m => m.type === 'state_sync').pop()?.state;
assert(p1State1.playerHand.length === 3 && p1State1.opponentCardCount === 3, 'P1 recebeu 3 cartas próprias e contagem oculta do P2');
assert(p2State1.playerHand.length === 3 && p2State1.opponentCardCount === 3, 'P2 recebeu 3 cartas próprias e contagem oculta do P1');
assert(p1State1.isPlayerTurn === true && p2State1.isPlayerTurn === false, 'P1 é o Mano e inicia jogando');

// 3. P1 propõe TRUCO e P2 aceita
p1.send(JSON.stringify({ type: 'propose_truco', betType: 'TRUCO' }));
await new Promise(r => setTimeout(r, 80));
const p2TrucoState = p2Msgs.filter(m => m.type === 'state_sync').pop()?.state;
assert(p2TrucoState.betPending?.type === 'TRUCO' && p2TrucoState.betPending?.from === 'OPPONENT', 'P2 recebeu pedido de TRUCO do oponente');

p2.send(JSON.stringify({ type: 'respond_truco', action: 'QUIERO' }));
await new Promise(r => setTimeout(r, 80));
const p1AfterQuiero = p1Msgs.filter(m => m.type === 'state_sync').pop()?.state;
assert(p1AfterQuiero.currentBetKey === 'TRUCO' && !p1AfterQuiero.betPending, 'P2 aceitou TRUCO (aposta atual: TRUCO)');

// 4. P1 joga uma carta e turno passa para P2
const cardToPlay = p1AfterQuiero.playerHand[0];
p1.send(JSON.stringify({ type: 'play_card', cardId: cardToPlay.id }));
await new Promise(r => setTimeout(r, 80));
const p2AfterPlay = p2Msgs.filter(m => m.type === 'state_sync').pop()?.state;
assert(p2AfterPlay.isPlayerTurn === true && p2AfterPlay.tricks[0].opponentCard?.id === cardToPlay.id, 'Carta do P1 apareceu na mesa do P2 e turno passou para P2');

p1.close();
p2.close();
wss.close();
server.close();
console.log('========================================');
console.log('TESTE WEBSOCKET 1v1: TODOS PASSARAM!');
console.log('========================================\n');
