/**
 * Shop.js - Loja do Boteco entre Partidas (Comprar Curingas, Modificar Baralho, Consumíveis)
 */

import { JOKERS_CATALOG } from './Jokers.js';
import { Card, SUIT_LIST } from '../core/Card.js';

export class Shop {
  constructor(runManager) {
    this.runManager = runManager;
    this.stock = {
      jokers: [],
      cards: [],
      purgeCost: 8,
      drinks: []
    };
  }

  /**
   * Reabastece a loja para o novo boteco ou rodada
   */
  restock() {
    const discount = this.runManager.jokerManager.getCombinedModifiers().shopDiscount || 0;
    const applyDiscount = (price) => Math.max(1, Math.round(price * (1 - discount)));

    // Escolher 2 a 3 curingas aleatórios não equipados
    const availableJokers = JOKERS_CATALOG.filter(j => !this.runManager.jokerManager.has(j.id));
    const shuffledJokers = [...availableJokers].sort(() => Math.random() - 0.5);
    this.stock.jokers = shuffledJokers.slice(0, 3).map(j => ({
      ...j,
      finalPrice: applyDiscount(j.price)
    }));

    // Oferecer 2 cartas atraentes para compra (ex: cartas fortes ou cartas de Envido)
    const strongCardPool = [
      { val: 1, suit: SUIT_LIST[3], name: 'Ancho de Espadas Extra', price: 15 }, // Macho
      { val: 1, suit: SUIT_LIST[0], name: 'Ancho de Bastos Extra', price: 13 },  // Hembra
      { val: 7, suit: SUIT_LIST[3], name: 'Siete Bravo Extra', price: 11 },      // 7 Espadas
      { val: 7, suit: SUIT_LIST[2], name: 'Siete de Oro Extra', price: 10 },     // 7 Oros
      { val: 3, suit: SUIT_LIST[1], name: '3 de Copas Forte', price: 7 },
      { val: 2, suit: SUIT_LIST[2], name: '2 de Oros de Sorte', price: 6 }
    ].sort(() => Math.random() - 0.5);

    this.stock.cards = strongCardPool.slice(0, 2).map(c => ({
      card: new Card(c.val, c.suit),
      name: c.name,
      finalPrice: applyDiscount(c.price)
    }));

    // Custo de purgar (remover) uma carta do baralho
    this.stock.purgeCost = applyDiscount(8);

    // Bebidas consumíveis de boteco
    this.stock.drinks = [
      {
        id: 'fernet',
        name: 'Fernet com Cola',
        icon: '🥃',
        description: 'Na próxima partida, receba +$1 moeda por cada vaza ganha.',
        finalPrice: applyDiscount(6)
      },
      {
        id: 'quilmes',
        name: 'Cerveja Gelada',
        icon: '🍺',
        description: 'Recupera 1 vida/ficha da run imediatamente.',
        finalPrice: applyDiscount(12)
      }
    ];
  }

  buyJoker(jokerId) {
    const itemIdx = this.stock.jokers.findIndex(j => j.id === jokerId);
    if (itemIdx === -1) return { success: false, message: 'Curinga não encontrado na loja.' };

    const joker = this.stock.jokers[itemIdx];
    if (this.runManager.coins < joker.finalPrice) {
      return { success: false, message: 'Moedas insuficientes!' };
    }

    if (this.runManager.jokerManager.equipped.length >= this.runManager.jokerManager.maxSlots) {
      return { success: false, message: 'Slots de Curinga cheios (máximo atingido)!' };
    }

    this.runManager.coins -= joker.finalPrice;
    this.runManager.jokerManager.equip(joker);
    this.stock.jokers.splice(itemIdx, 1);

    return { success: true, message: `Equipou ${joker.name}!` };
  }

  sellJoker(jokerId) {
    const joker = this.runManager.jokerManager.unequip(jokerId);
    if (!joker) return { success: false, message: 'Curinga não está equipado.' };

    const sellPrice = Math.max(1, Math.floor(joker.price * 0.5));
    this.runManager.coins += sellPrice;

    return { success: true, message: `Vendeu ${joker.name} por $${sellPrice} moedas.` };
  }

  buyCard(index) {
    const item = this.stock.cards[index];
    if (!item) return { success: false, message: 'Carta não encontrada.' };

    if (this.runManager.coins < item.finalPrice) {
      return { success: false, message: 'Moedas insuficientes!' };
    }

    this.runManager.coins -= item.finalPrice;
    this.runManager.playerDeck.addCard(item.card);
    this.stock.cards.splice(index, 1);

    return { success: true, message: `Adicionou ${item.name} ao seu baralho!` };
  }

  purgeCard(cardId) {
    if (this.runManager.coins < this.stock.purgeCost) {
      return { success: false, message: 'Moedas insuficientes para remover a carta.' };
    }

    if (this.runManager.playerDeck.size() <= 20) {
      return { success: false, message: 'Seu baralho precisa ter pelo menos 20 cartas!' };
    }

    const removed = this.runManager.playerDeck.removeCard(cardId);
    if (!removed) return { success: false, message: 'Carta não encontrada no baralho.' };

    this.runManager.coins -= this.stock.purgeCost;
    return { success: true, message: `Removeu ${removed.getName()} do baralho!` };
  }

  buyDrink(drinkId) {
    const idx = this.stock.drinks.findIndex(d => d.id === drinkId);
    if (idx === -1) return { success: false, message: 'Item não encontrado.' };

    const drink = this.stock.drinks[idx];
    if (this.runManager.coins < drink.finalPrice) {
      return { success: false, message: 'Moedas insuficientes!' };
    }

    this.runManager.coins -= drink.finalPrice;

    if (drinkId === 'quilmes') {
      if (this.runManager.lives < this.runManager.maxLives) {
        this.runManager.lives++;
      }
    } else if (drinkId === 'fernet') {
      this.runManager.activeBuffs.fernet = true;
    }

    this.stock.drinks.splice(idx, 1);
    return { success: true, message: `Comprou e consumiu ${drink.name}!` };
  }
}

