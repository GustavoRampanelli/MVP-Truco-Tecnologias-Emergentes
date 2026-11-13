/**
 * Jokers.js - Catálogo de Curingas com Habilidades Passivas (Roguelike Deckbuilder)
 * Inclui os Curingas do Balatro x Truco Espanhol (concept_cartas_balatro_truco.png)
 */

export const JOKERS_CATALOG = [
  {
    id: 'joker_argentino',
    name: 'Gaucho Truquero (Joker)',
    icon: '🇦🇷',
    image: 'assets/jokers/joker_argentino.png',
    rarity: 'Raro',
    price: 10,
    description: 'Vencer uma mão com Truco concede +$5 moedas e oponentes correm 25% mais rápido dos seus cantos.',
    hooks: {
      applyModifiers(modifiers) {
        modifiers.jokerGritoPorteno = true;
      },
      onHandWon(context) {
        if (context.trucoEngine.currentBet.level >= 1) {
          context.runManager.addCoins(5, 'Gaucho Truquero');
          return '+$5 moedas do Gaucho Truquero!';
        }
      }
    }
  },
  {
    id: 'joker_banana',
    name: 'Gros Michel (A Banana)',
    icon: '🍌',
    image: 'assets/jokers/joker_banana.png',
    rarity: 'Comum',
    price: 6,
    description: 'Garante +$4 moedas bônus por vitória. 1 em 6 chance de se autodestruir a cada partida.',
    hooks: {
      onMatchStart(context) {
        context.runManager.addCoins(4, 'Gros Michel');
        // 1 em 6 chance de estragar
        if (Math.random() < 0.166) {
          setTimeout(() => {
            context.runManager.jokerManager.unequip('joker_banana');
          }, 100);
          return '🍌 ¡Gros Michel estragou e se autodestruiu!';
        }
        return '+$4 moedas do Gros Michel!';
      }
    }
  },
  {
    id: 'joker_cherries',
    name: 'Cerejas de Boteco',
    icon: '🍒',
    image: 'assets/jokers/joker_cherries.png',
    rarity: 'Incomum',
    price: 7,
    description: 'Seu cálculo de Envido sempre recebe +5 pontos extras de bônus.',
    hooks: {
      applyModifiers(modifiers) {
        modifiers.bonusEnvido = (modifiers.bonusEnvido || 0) + 5;
      }
    }
  },
  {
    id: 'gaucho_astuto',
    name: 'Gaucho Astuto (Jimbo)',
    icon: '🃏',
    image: 'assets/jokers/joker_jimbo_1.png',
    rarity: 'Incomum',
    price: 8,
    description: 'Seus 4s passam a ter Força 5 no Truco (superam os 5s e empatam com as Sotas).',
    hooks: {
      applyModifiers(modifiers) {
        modifiers.jokerGauchoAstuto = true;
      }
    }
  },
  {
    id: 'ouro_de_san_telmo',
    name: 'Ouro de San Telmo (Jimbo Dourado)',
    icon: '✨',
    image: 'assets/jokers/joker_jimbo_2.png',
    rarity: 'Comum',
    price: 7,
    description: 'Ganhe +$2 moedas cada vez que jogar uma carta de Oros na mesa.',
    hooks: {
      onCardPlayed(card, context) {
        if (card.suit.id === 'OROS') {
          context.runManager.addCoins(2, 'Ouro de San Telmo');
          return '+$2 moedas por jogar Oros!';
        }
      }
    }
  },
  {
    id: 'mate_amargo',
    name: 'Mate Amargo',
    icon: '🧉',
    image: null,
    rarity: 'Comum',
    price: 6,
    description: 'Vencer uma mão com Truco aceito concede +$5 moedas extras.',
    hooks: {
      onHandWon(context) {
        if (context.trucoEngine.currentBet.level >= 1) {
          context.runManager.addCoins(5, 'Mate Amargo');
          return '+$5 moedas pelo Mate Amargo!';
        }
      }
    }
  },
  {
    id: 'parda_da_sorte',
    name: 'Parda da Sorte',
    icon: '🤝',
    image: null,
    rarity: 'Comum',
    price: 5,
    description: 'Sempre que uma vaza empatar (Parda), ganhe +$3 moedas de consolo.',
    hooks: {
      onTrickResolved(trick, context) {
        if (trick.winner === 'TIE') {
          context.runManager.addCoins(3, 'Parda da Sorte');
          return '+$3 moedas pela Parda!';
        }
      }
    }
  },
  {
    id: 'la_mano_de_dios',
    name: 'La Mano de Dios',
    icon: '✋',
    image: null,
    rarity: 'Raro',
    price: 11,
    description: 'Na 3ª vaza, qualquer figura (10, 11, 12) sua ganha +5 de força de Truco!',
    hooks: {
      applyModifiers(modifiers) {
        modifiers.jokerBonusFiguras3rdTrick = 5;
      }
    }
  },
  {
    id: 'bife_de_chorizo',
    name: 'Bife de Chorizo',
    icon: '🥩',
    image: null,
    rarity: 'Incomum',
    price: 9,
    description: 'Você já inicia todas as partidas de boteco com +2 pontos de vantagem.',
    hooks: {
      onMatchStart(context) {
        context.matchState.playerScore += 2;
        return 'Iniciou com +2 tentos pelo Bife de Chorizo!';
      }
    }
  },
  {
    id: 'garcom_camarada',
    name: 'Garçom Camarada',
    icon: '🤵',
    image: null,
    rarity: 'Incomum',
    price: 7,
    description: 'Concede 25% de desconto em todas as compras e serviços da Loja.',
    hooks: {
      applyModifiers(modifiers) {
        modifiers.shopDiscount = 0.25;
      }
    }
  }
];

export class JokerManager {
  constructor(maxSlots = 5) {
    this.maxSlots = maxSlots;
    this.equipped = [];
  }

  equip(joker) {
    if (this.equipped.length >= this.maxSlots) return false;
    this.equipped.push(joker);
    return true;
  }

  unequip(jokerId) {
    const idx = this.equipped.findIndex(j => j.id === jokerId);
    if (idx !== -1) {
      return this.equipped.splice(idx, 1)[0];
    }
    return null;
  }

  has(jokerId) {
    return this.equipped.some(j => j.id === jokerId);
  }

  getCombinedModifiers() {
    const modifiers = {};
    for (const joker of this.equipped) {
      if (joker.hooks && joker.hooks.applyModifiers) {
        joker.hooks.applyModifiers(modifiers);
      }
    }
    return modifiers;
  }

  trigger(hookName, arg, context) {
    const messages = [];
    for (const joker of this.equipped) {
      if (joker.hooks && typeof joker.hooks[hookName] === 'function') {
        const msg = joker.hooks[hookName](arg, context);
        if (msg) messages.push(msg);
      }
    }
    return messages;
  }
}
