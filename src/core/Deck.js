/**
 * Deck.js - Gerenciador do Baralho Espanhol (Deckbuilder Roguelike)
 */

import { Card, SUIT_LIST } from './Card.js';

export class Deck {
  constructor(cards = []) {
    this.cards = cards.length > 0 ? cards : Deck.createStandard40Deck();
  }

  /**
   * Cria o baralho tradicional espanhol de 40 cartas (sem 8 e 9)
   */
  static createStandard40Deck() {
    const cards = [];
    const values = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
    for (const suit of SUIT_LIST) {
      for (const val of values) {
        cards.push(new Card(val, suit));
      }
    }
    return cards;
  }

  /**
   * Retorna uma cópia embaralhada (Fisher-Yates)
   */
  getShuffledCopy() {
    const copy = this.cards.map(c => c.clone());
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Adiciona uma carta ao baralho permanente
   */
  addCard(card) {
    this.cards.push(card);
  }

  /**
   * Remove uma carta por ID
   */
  removeCard(cardId) {
    const index = this.cards.findIndex(c => c.id === cardId);
    if (index !== -1) {
      return this.cards.splice(index, 1)[0];
    }
    return null;
  }

  /**
   * Quantidade de cartas no baralho
   */
  size() {
    return this.cards.length;
  }

  /**
   * Estatísticas do baralho (número de Anchos, Sietes, etc.)
   */
  getStats() {
    return {
      total: this.cards.length,
      bastos: this.cards.filter(c => c.suit.id === 'BASTOS').length,
      copas: this.cards.filter(c => c.suit.id === 'COPAS').length,
      oros: this.cards.filter(c => c.suit.id === 'OROS').length,
      espadas: this.cards.filter(c => c.suit.id === 'ESPADAS').length,
      bravos: this.cards.filter(c => (c.value === 1 && ['ESPADAS', 'BASTOS'].includes(c.suit.id)) || (c.value === 7 && ['ESPADAS', 'OROS'].includes(c.suit.id))).length
    };
  }
}

