/**
 * Opponents.js - Definição dos Botecos, Adversários e Chefes de Run
 */

export const BARS_CONFIG = [
  {
    id: 'bar_san_telmo',
    name: 'La Esquina de San Telmo',
    subtitle: 'Um boteco de esquina aconchegante com fumaça e cheiro de café passado.',
    bgTheme: 'san_telmo',
    opponents: [
      {
        id: 'pepe_novato',
        name: 'Pepe "El Novato"',
        role: 'Iniciante do Bairro',
        avatar: '🧢',
        dialogue: '¡Hola che! Aprendí a jugar truco semana pasada, no te burles...',
        pointsToWin: 8,
        rewardCoins: 12,
        personality: {
          bluffChance: 0.08,
          cautiousness: 0.5,
          aggression: 0.3
        }
      },
      {
        id: 'carlos_mozo',
        name: 'Don Carlos "El Mozo"',
        role: 'O Garçom Velhaco',
        avatar: '🤵',
        dialogue: 'Entre servir um bife e outro, eu limpo suas moedas na mesa!',
        pointsToWin: 10,
        rewardCoins: 16,
        personality: {
          bluffChance: 0.18,
          cautiousness: 0.3,
          aggression: 0.5
        }
      },
      {
        id: 'osvaldo_tahur',
        name: 'Osvaldo "El Tahúr"',
        role: 'Chefe de San Telmo',
        isBoss: true,
        avatar: '🎩',
        portrait: 'assets/opponent_gaucho_portrait.png',
        dialogue: 'Aqui ninguém me ganha de grito! ¡Mostráme qué tenés!',
        pointsToWin: 12,
        rewardCoins: 25,
        personality: {
          bluffChance: 0.28,
          cautiousness: 0.2,
          aggression: 0.75
        }
      }
    ]
  },
  {
    id: 'bar_abasto',
    name: 'El Bodegón del Abasto',
    subtitle: 'Boteco movimentado sob as luzes de neon e os acordes de Gardel.',
    bgTheme: 'abasto',
    opponents: [
      {
        id: 'mateo_guapo',
        name: 'Mateo "El Guapo"',
        role: 'Valentão Portenho',
        avatar: '🕶️',
        dialogue: 'Se vier com truco frouxo, te mando de volta pra casa.',
        pointsToWin: 12,
        rewardCoins: 20,
        personality: {
          bluffChance: 0.25,
          cautiousness: 0.25,
          aggression: 0.7
        }
      },
      {
        id: 'dona_juana',
        name: 'Doña Juana "La Bruja"',
        role: 'Mestre do Envido',
        avatar: '👵',
        dialogue: 'As cartas falam comigo, querido. Não ouse blefar comigo!',
        pointsToWin: 12,
        rewardCoins: 22,
        personality: {
          bluffChance: 0.15,
          cautiousness: 0.35,
          aggression: 0.65
        }
      },
      {
        id: 'gaucho_fierro',
        name: 'El Gaucho Fierro',
        role: 'Chefe do Abasto',
        isBoss: true,
        avatar: '🐎',
        portrait: 'assets/opponent_gaucho_portrait.png',
        dialogue: 'No pampa aprendi a nunca baixar a cabeça pro Truco!',
        pointsToWin: 15,
        rewardCoins: 35,
        personality: {
          bluffChance: 0.30,
          cautiousness: 0.15,
          aggression: 0.85
        }
      }
    ]
  },
  {
    id: 'bar_patron',
    name: 'La Cueva del Patrón',
    subtitle: 'O clube fechado dos maiores truqueiros da Argentina. O grande teste!',
    bgTheme: 'patron',
    opponents: [
      {
        id: 'don_silvio_patron',
        name: 'Don Silvio "El Patrón"',
        role: 'O Dono do Boteco & Grande Campeão',
        isBoss: true,
        isFinalBoss: true,
        avatar: '👑',
        portrait: 'assets/opponent_gaucho_portrait.png',
        dialogue: 'Bem-vindo à minha mesa. Ninguém nunca saiu daqui com meu título!',
        pointsToWin: 15,
        rewardCoins: 50,
        personality: {
          bluffChance: 0.35,
          cautiousness: 0.15,
          aggression: 0.9
        }
      }
    ]
  }
];

