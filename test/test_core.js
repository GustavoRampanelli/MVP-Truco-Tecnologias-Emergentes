/**
 * test_core.js - Suíte de Testes Automatizados para o Motor do Truco Argentino
 */

import { Card, SUITS } from '../src/core/Card.js';
import { Deck } from '../src/core/Deck.js';
import { EnvidoEngine } from '../src/core/EnvidoEngine.js';
import { TrucoEngine, BET_LEVELS } from '../src/core/TrucoEngine.js';
import { JokerManager, JOKERS_CATALOG } from '../src/roguelike/Jokers.js';
import { RunManager } from '../src/roguelike/RunManager.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('\n--- Testando 1. Hierarquia de Cartas do Truco Argentino ---');
// Validação de Baralho Limpo (sem 8 e 9)
let threw8 = false;
try {
  new Card(8, SUITS.ESPADAS);
} catch (e) {
  threw8 = true;
}
assert(threw8, 'Carta 8 é rejeitada e lança erro (Baralho Limpo sem 8)');

let threw9 = false;
try {
  new Card(9, SUITS.OROS);
} catch (e) {
  threw9 = true;
}
assert(threw9, 'Carta 9 é rejeitada e lança erro (Baralho Limpo sem 9)');

const macho = new Card(1, SUITS.ESPADAS);
const hembra = new Card(1, SUITS.BASTOS);
const sieteBravo = new Card(7, SUITS.ESPADAS);
const sieteBello = new Card(7, SUITS.OROS);
const tres = new Card(3, SUITS.COPAS);
const dos = new Card(2, SUITS.OROS);
const anchoFalso = new Card(1, SUITS.COPAS);
const rey = new Card(12, SUITS.ESPADAS);
const caballo = new Card(11, SUITS.BASTOS);
const sota = new Card(10, SUITS.OROS);
const sieteFalso = new Card(7, SUITS.COPAS);
const seis = new Card(6, SUITS.BASTOS);
const cinco = new Card(5, SUITS.ESPADAS);
const quatro = new Card(4, SUITS.COPAS);

assert(macho.getBaseTrucoPower() === 14, '1 de Espadas tem força 14 (Macho)');
assert(hembra.getBaseTrucoPower() === 13, '1 de Bastos tem força 13 (Hembra)');
assert(sieteBravo.getBaseTrucoPower() === 12, '7 de Espadas tem força 12 (Siete Bravo)');
assert(sieteBello.getBaseTrucoPower() === 11, '7 de Oros tem força 11 (Siete de Oro)');
assert(tres.getBaseTrucoPower() === 10, '3 tem força 10');
assert(dos.getBaseTrucoPower() === 9, '2 tem força 9');
assert(anchoFalso.getBaseTrucoPower() === 8, '1 de Copas tem força 8 (Ancho Falso)');
assert(rey.getBaseTrucoPower() === 7, '12 (Rey) tem força 7');
assert(caballo.getBaseTrucoPower() === 6, '11 (Caballo) tem força 6');
assert(sota.getBaseTrucoPower() === 5, '10 (Sota) tem força 5');
assert(sieteFalso.getBaseTrucoPower() === 4, '7 de Copas tem força 4 (Siete Falso)');
assert(seis.getBaseTrucoPower() === 3, '6 tem força 3');
assert(cinco.getBaseTrucoPower() === 2, '5 tem força 2');
assert(quatro.getBaseTrucoPower() === 1, '4 tem força 1 (mais fraca)');

console.log('\n--- Testando 2. Baralho Espanhol (Deck) ---');
const deck = new Deck();
assert(deck.size() === 40, 'Baralho inicial tem exatamente 40 cartas');
const stats = deck.getStats();
assert(stats.bastos === 10 && stats.copas === 10 && stats.oros === 10 && stats.espadas === 10, '10 cartas por naipe');
assert(stats.bravos === 4, 'Contém os 4 bravos (1E, 1B, 7E, 7O)');

console.log('\n--- Testando 3. Motor de Envido & Flor ---');
// 7 e 6 de Oros + 4 de Espadas
const handEnvido33 = [new Card(7, SUITS.OROS), new Card(6, SUITS.OROS), new Card(4, SUITS.ESPADAS)];
const res33 = EnvidoEngine.calculateHandEnvido(handEnvido33);
assert(res33.points === 33, `7 e 6 de Oros somam 33 pontos de Envido (obteve ${res33.points})`);

// 12 e 11 de Copas + 2 de Copas
const handEnvidoFiguras = [new Card(12, SUITS.COPAS), new Card(11, SUITS.COPAS), new Card(2, SUITS.COPAS)];
const resFiguras = EnvidoEngine.calculateHandEnvido(handEnvidoFiguras);
assert(resFiguras.points === 22, `Figuras valem 0: 20 + 2 + 0 = 22 pontos (obteve ${resFiguras.points})`);

// Flor: 3 cartas de Espadas
const handFlor = [new Card(1, SUITS.ESPADAS), new Card(7, SUITS.ESPADAS), new Card(3, SUITS.ESPADAS)];
const resFlor = EnvidoEngine.calculateHandEnvido(handFlor);
assert(resFlor.isFlor === true, 'Identificou FLOR com 3 cartas do mesmo naipe');
assert(resFlor.points === 31, `Flor: 20 + 1 + 7 + 3 = 31 (obteve ${resFlor.points})`);

// Desempate por Mano
const contest = EnvidoEngine.resolveContest(30, 30, true);
assert(contest.winner === 'PLAYER', 'Empate de Envido vence quem é o Mano (Jogador)');

console.log('\n--- Testando 4. Resolução de Vazas e Pardas (TrucoEngine) ---');
// Partida simples: Jogador ganha 1ª e 2ª
const eng1 = new TrucoEngine(true);
eng1.playCard('PLAYER', macho); // Força 14
eng1.playCard('OPPONENT', quatro); // Força 1
assert(eng1.tricks[0].winner === 'PLAYER', 'Jogador venceu 1ª vaza');
eng1.playCard('PLAYER', tres); // Força 10
eng1.playCard('OPPONENT', dos); // Força 9
assert(eng1.tricks[1].winner === 'PLAYER', 'Jogador venceu 2ª vaza');
assert(eng1.handFinished && eng1.handWinner === 'PLAYER', 'Jogador venceu a mão com 2 vitórias');

// Regra de Parda 1: Empate na 1ª vaza, quem leva a 2ª vence
const engParda1 = new TrucoEngine(true);
engParda1.playCard('PLAYER', tres); // 3 vs 3 (Empate!)
engParda1.playCard('OPPONENT', new Card(3, SUITS.ESPADAS));
assert(engParda1.tricks[0].winner === 'TIE', '1ª vaza empatou (Parda)');
engParda1.playCard('PLAYER', hembra); // 1 de Bastos vence
engParda1.playCard('OPPONENT', rey);
assert(engParda1.tricks[1].winner === 'PLAYER', 'Jogador venceu 2ª vaza');
assert(engParda1.handFinished && engParda1.handWinner === 'PLAYER', 'Parda na 1ª: vitória na 2ª vaza encerrou e venceu a mão');

// Regra de Parda 2: Jogador vence a 1ª, 2ª vaza empata -> Jogador vence imediatamente
const engParda2 = new TrucoEngine(true);
engParda2.playCard('PLAYER', macho);
engParda2.playCard('OPPONENT', quatro);
assert(engParda2.tricks[0].winner === 'PLAYER', 'Jogador venceu 1ª vaza');
engParda2.playCard('PLAYER', dos); // 2 vs 2 (Empate!)
engParda2.playCard('OPPONENT', new Card(2, SUITS.BASTOS));
assert(engParda2.tricks[1].winner === 'TIE', '2ª vaza empatou');
assert(engParda2.handFinished && engParda2.handWinner === 'PLAYER', 'Venceu a 1ª e empatou a 2ª: vence a mão imediatamente!');

// Regra de Parda 3: 1ª vaza Jogador, 2ª vaza Oponente (1x1), 3ª vaza empata -> Vence quem levou a 1ª
const engParda3 = new TrucoEngine(false);
engParda3.playCard('PLAYER', macho); // Jogador leva a 1ª
engParda3.playCard('OPPONENT', quatro);
assert(engParda3.tricks[0].winner === 'PLAYER', '1ª vaza vencida pelo Jogador');
engParda3.playCard('PLAYER', cinco);
engParda3.playCard('OPPONENT', tres); // Oponente leva a 2ª
assert(engParda3.tricks[1].winner === 'OPPONENT', '2ª vaza vencida pelo Oponente (1x1)');
engParda3.playCard('PLAYER', dos);
engParda3.playCard('OPPONENT', new Card(2, SUITS.ESPADAS)); // Empate na 3ª!
assert(engParda3.tricks[2].winner === 'TIE', '3ª vaza empatou');
assert(engParda3.handFinished && engParda3.handWinner === 'PLAYER', 'Empate na 3ª após 1x1: vencedor da 1ª vaza leva a mão');

// Regra de Parda 4: Tríplice Empate (todas as 3 vazas empatam) -> Vence o Mano
const engPardaTripla = new TrucoEngine(true); // Jogador é o Mano
engPardaTripla.playCard('PLAYER', tres);
engPardaTripla.playCard('OPPONENT', new Card(3, SUITS.OROS));
assert(engPardaTripla.tricks[0].winner === 'TIE', '1ª vaza empatou');
engPardaTripla.playCard('PLAYER', dos);
engPardaTripla.playCard('OPPONENT', new Card(2, SUITS.BASTOS));
assert(engPardaTripla.tricks[1].winner === 'TIE', '2ª vaza empatou');
engPardaTripla.playCard('PLAYER', seis);
engPardaTripla.playCard('OPPONENT', new Card(6, SUITS.COPAS));
assert(engPardaTripla.tricks[2].winner === 'TIE', '3ª vaza empatou');
assert(engPardaTripla.handFinished && engPardaTripla.handWinner === 'PLAYER', 'Tríplice parda: mão concedida ao Mano (Jogador)');

console.log('\n--- Testando 5. Sistema de Apostas de Truco ---');
const engBet = new TrucoEngine(true);
assert(engBet.proposeBet('PLAYER', 'TRUCO') === true, 'Jogador propôs TRUCO');
assert(engBet.betPending.type === 'TRUCO', 'Aposta de TRUCO pendente');
const accepted = engBet.acceptBet('OPPONENT');
assert(accepted.acceptedPoints === 2, 'TRUCO aceito vale 2 pontos');
assert(engBet.proposeBet('OPPONENT', 'RETRUCO') === true, 'Adversário propôs RETRUCO');
const declined = engBet.declineBet('PLAYER');
assert(declined.winner === 'OPPONENT' && declined.pointsWon === 2, 'Recusar RETRUCO concede 2 pontos ao adversário');

console.log('\n--- Testando 6. Curingas (Jokers) & Roguelike ---');
const jm = new JokerManager(5);
const gauchoJoker = JOKERS_CATALOG.find(j => j.id === 'gaucho_astuto');
jm.equip(gauchoJoker);
const modifiers = jm.getCombinedModifiers();
assert(modifiers.jokerGauchoAstuto === true, 'Curinga Gaucho Astuto ativado');

// Testar modificador na carta
const modCard4 = new Card(4, SUITS.ESPADAS);
assert(modCard4.getEffectiveTrucoPower(modifiers) === 5, '4 com Curinga Gaucho Astuto tem força 5 (supera 5s e empata com Sotas)');

const run = new RunManager();
assert(run.coins === 15, 'Run inicia com 15 moedas');
assert(run.lives === 3, 'Run inicia com 3 vidas');
assert(run.playerDeck.size() === 40, 'Baralho inicial pronto');

console.log(`\n========================================`);
console.log(`RESULTADO DOS TESTES: ${passed} PASSOU, ${failed} FALHOU`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);

