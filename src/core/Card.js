/**
 * Card.js - Representação das cartas do Baralho Espanhol para Truco Argentino
 * Dimensões da Sprite: 142x190 por célula (13 colunas x 4 linhas)
 */

export const SUITS = {
  BASTOS: { id: 'BASTOS', name: 'Bastos', row: 0, symbol: '🪵' },
  COPAS: { id: 'COPAS', name: 'Copas', row: 1, symbol: '🍷' },
  OROS: { id: 'OROS', name: 'Oros', row: 2, symbol: '🪙' },
  ESPADAS: { id: 'ESPADAS', name: 'Espadas', row: 3, symbol: '⚔️' }
};

export const SUIT_LIST = [SUITS.BASTOS, SUITS.COPAS, SUITS.OROS, SUITS.ESPADAS];

export const VALID_CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export class Card {
  /**
   * @param {number} value - 1 a 12 (exceto 8 e 9)
   * @param {object} suit - objeto de SUITS
   * @param {string} [id] - ID único da carta
   * @param {object} [modifiers] - modificadores roguelike (ex: força extra, bônus moedas)
   */
  constructor(value, suit, id = null, modifiers = {}) {
    if (!VALID_CARD_VALUES.includes(value)) {
      throw new Error(`Carta inválida no Truco Gaudério: valor ${value}. O baralho não possui cartas 8 e 9.`);
    }

    this.value = value;
    this.suit = suit;
    this.id = id || `${value}_${suit.id}_${Math.random().toString(36).substring(2, 7)}`;
    this.modifiers = { ...modifiers };

    // Coordenadas na Sprite Sheet (142 x 190)
    this.col = value - 1; // 1 -> col 0, ..., 12 -> col 11
    this.row = suit.row;
  }

  /**
   * Força básica no Truco Argentino / Gaudério (de 1 a 14)
   */
  getBaseTrucoPower() {
    // 1 de Espadas (Macho / Espadilha)
    if (this.value === 1 && this.suit.id === 'ESPADAS') return 14;
    // 1 de Bastos (Hembra / Bastilha)
    if (this.value === 1 && this.suit.id === 'BASTOS') return 13;
    // 7 de Espadas (Siete Bravo)
    if (this.value === 7 && this.suit.id === 'ESPADAS') return 12;
    // 7 de Oros (Siete Bello)
    if (this.value === 7 && this.suit.id === 'OROS') return 11;

    // Todos os 3
    if (this.value === 3) return 10;
    // Todos os 2
    if (this.value === 2) return 9;
    // 1 de Copas e 1 de Oros (Anchos Falsos)
    if (this.value === 1) return 8;

    // Figuras
    if (this.value === 12) return 7; // Rey
    if (this.value === 11) return 6; // Caballo
    if (this.value === 10) return 5; // Sota / Príncipe

    // Sietes falsos (Copas e Bastos)
    if (this.value === 7) return 4;

    // Cartas baixas
    if (this.value === 6) return 3;
    if (this.value === 5) return 2;
    if (this.value === 4) return 1; // Mais baixa

    return 0;
  }

  /**
   * Força efetiva considerando modificadores de Curingas/Jokers
   * @param {object} [context] - contexto atual da rodada (vaza 1, 2 ou 3)
   */
  getEffectiveTrucoPower(context = {}) {
    let power = this.getBaseTrucoPower();

    // Bônus diretos na carta
    if (this.modifiers.extraPower) {
      power += this.modifiers.extraPower;
    }

    // Se houver modificador específico de vaza (ex: Curinga "La Mano de Dios" dá +5 na 3ª vaza para figuras)
    if (context.trickIndex === 2 && [10, 11, 12].includes(this.value) && context.jokerBonusFiguras3rdTrick) {
      power += context.jokerBonusFiguras3rdTrick;
    }

    // Modificador "Gaucho Astuto": 4s ganham força 5 (superam 5s e empatam com 10s)
    if (this.value === 4 && context.jokerGauchoAstuto) {
      power = 5;
    }

    return power;
  }

  /**
   * Valor nominal para o cálculo do Envido (1..7 = valor nominal, 10..12 = 0)
   */
  getEnvidoValue() {
    if (this.value >= 1 && this.value <= 7) return this.value;
    if (this.value >= 10 && this.value <= 12) return 0;
    return 0;
  }

  /**
   * Nome amigável e folclórico da carta
   */
  getName() {
    if (this.value === 1 && this.suit.id === 'ESPADAS') return 'Ancho de Espadas (Macho)';
    if (this.value === 1 && this.suit.id === 'BASTOS') return 'Ancho de Bastos (Hembra)';
    if (this.value === 7 && this.suit.id === 'ESPADAS') return 'Siete Bravo';
    if (this.value === 7 && this.suit.id === 'OROS') return 'Siete de Oro';
    if (this.value === 1) return `1 de ${this.suit.name} (Falso)`;
    if (this.value === 10) return `Sota de ${this.suit.name}`;
    if (this.value === 11) return `Caballo de ${this.suit.name}`;
    if (this.value === 12) return `Rey de ${this.suit.name}`;
    return `${this.value} de ${this.suit.name}`;
  }

  clone() {
    return new Card(this.value, this.suit, null, { ...this.modifiers });
  }
}

