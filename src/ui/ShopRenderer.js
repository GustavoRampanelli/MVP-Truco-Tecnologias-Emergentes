/**
 * ShopRenderer.js - Interface da Loja do Boteco entre Partidas
 */

import { CardSprite } from './CardSprite.js';
import { Dialogs } from './Dialogs.js';

export class ShopRenderer {
  constructor(app, runManager, soundManager) {
    this.app = app;
    this.runManager = runManager;
    this.sound = soundManager;
  }

  render() {
    const shopContainer = document.getElementById('shop-screen');
    if (!shopContainer) return;

    const coinsEl = document.getElementById('shop-coins-val');
    if (coinsEl) coinsEl.textContent = this.runManager.coins;

    const livesEl = document.getElementById('shop-lives-val');
    if (livesEl) livesEl.textContent = '❤️'.repeat(this.runManager.lives);

    const barEl = document.getElementById('shop-bar-name');
    if (barEl) barEl.textContent = this.runManager.getCurrentBar().name;

    this.renderJokersForSale();
    this.renderEquippedJokers();
    this.renderCardsForSale();
    this.renderDrinks();
    this.renderDeckStats();
  }

  renderJokersForSale() {
    const container = document.getElementById('shop-jokers-list');
    if (!container) return;
    container.innerHTML = '';

    const jokers = this.runManager.shop.stock.jokers;
    if (jokers.length === 0) {
      container.innerHTML = '<div class="shop-empty-msg">Todos os Curingas da rodada foram esgotados.</div>';
      return;
    }

    jokers.forEach(joker => {
      const card = document.createElement('div');
      card.className = `shop-item-card rarity-${joker.rarity.toLowerCase()}`;
      
      const imgHtml = joker.image 
        ? `<div class="joker-art-preview"><img src="${joker.image}" alt="${joker.name}" class="joker-art-img" /></div>` 
        : '';

      card.innerHTML = `
        <div class="shop-item-header">
          <span class="shop-item-icon">${joker.icon}</span>
          <span class="shop-item-rarity">${joker.rarity}</span>
        </div>
        ${imgHtml}
        <div class="shop-item-name">${joker.name}</div>
        <div class="shop-item-desc">${joker.description}</div>
        <button class="pixel-btn btn-buy" ${this.runManager.coins < joker.finalPrice ? 'disabled' : ''}>
          Comprar ($${joker.finalPrice})
        </button>
      `;

      const btn = card.querySelector('.btn-buy');
      btn.onclick = () => {
        const res = this.runManager.shop.buyJoker(joker.id);
        if (res.success) {
          this.sound.playCoin();
          Dialogs.showToast(res.message, 'success');
          this.render();
        } else {
          Dialogs.showToast(res.message, 'warning');
        }
      };

      container.appendChild(card);
    });
  }

  renderEquippedJokers() {
    const container = document.getElementById('shop-equipped-list');
    if (!container) return;
    container.innerHTML = '';

    const equipped = this.runManager.jokerManager.equipped;
    const slotsEl = document.getElementById('equipped-slots-count');
    if (slotsEl) {
      slotsEl.textContent = `${equipped.length} / ${this.runManager.jokerManager.maxSlots}`;
    }

    if (equipped.length === 0) {
      container.innerHTML = '<div class="shop-empty-msg">Nenhum Curinga equipado no momento.</div>';
      return;
    }

    equipped.forEach(joker => {
      const sellPrice = Math.max(1, Math.floor(joker.price * 0.5));
      const card = document.createElement('div');
      card.className = `shop-item-card equipped-joker rarity-${joker.rarity.toLowerCase()}`;
      
      const imgHtml = joker.image 
        ? `<div class="joker-art-preview"><img src="${joker.image}" alt="${joker.name}" class="joker-art-img" /></div>` 
        : '';

      card.innerHTML = `
        <div class="shop-item-header">
          <span class="shop-item-icon">${joker.icon}</span>
          <span class="shop-item-rarity">${joker.rarity}</span>
        </div>
        ${imgHtml}
        <div class="shop-item-name">${joker.name}</div>
        <div class="shop-item-desc">${joker.description}</div>
        <button class="pixel-btn btn-sell">
          Vender (+$${sellPrice})
        </button>
      `;

      const btn = card.querySelector('.btn-sell');
      btn.onclick = () => {
        const res = this.runManager.shop.sellJoker(joker.id);
        if (res.success) {
          this.sound.playCoin();
          Dialogs.showToast(res.message, 'info');
          this.render();
        }
      };

      container.appendChild(card);
    });
  }

  renderCardsForSale() {
    const container = document.getElementById('shop-cards-list');
    if (!container) return;
    container.innerHTML = '';

    const cards = this.runManager.shop.stock.cards;
    if (cards.length === 0) {
      container.innerHTML = '<div class="shop-empty-msg">Nenhuma carta disponível no momento.</div>';
      return;
    }

    cards.forEach((item, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'shop-card-wrapper';

      const spriteEl = CardSprite.createCardElement(item.card, {
        scale: 0.75,
        showHints: true
      });

      const buyBtn = document.createElement('button');
      buyBtn.className = 'pixel-btn btn-buy';
      buyBtn.textContent = `Comprar ($${item.finalPrice})`;
      buyBtn.disabled = this.runManager.coins < item.finalPrice;
      buyBtn.onclick = () => {
        const res = this.runManager.shop.buyCard(idx);
        if (res.success) {
          this.sound.playCoin();
          Dialogs.showToast(res.message, 'success');
          this.render();
        } else {
          Dialogs.showToast(res.message, 'warning');
        }
      };

      itemEl.appendChild(spriteEl);
      itemEl.appendChild(buyBtn);
      container.appendChild(itemEl);
    });
  }

  renderDrinks() {
    const container = document.getElementById('shop-drinks-list');
    if (!container) return;
    container.innerHTML = '';

    const drinks = this.runManager.shop.stock.drinks;
    drinks.forEach(drink => {
      const el = document.createElement('div');
      el.className = 'shop-item-card drink-card';
      el.innerHTML = `
        <div class="shop-item-header">
          <span class="shop-item-icon">${drink.icon}</span>
        </div>
        <div class="shop-item-name">${drink.name}</div>
        <div class="shop-item-desc">${drink.description}</div>
        <button class="pixel-btn btn-buy" ${this.runManager.coins < drink.finalPrice ? 'disabled' : ''}>
          Beber ($${drink.finalPrice})
        </button>
      `;

      const btn = el.querySelector('.btn-buy');
      btn.onclick = () => {
        const res = this.runManager.shop.buyDrink(drink.id);
        if (res.success) {
          this.sound.playCoin();
          Dialogs.showToast(res.message, 'success');
          this.render();
        }
      };

      container.appendChild(el);
    });
  }

  renderDeckStats() {
    const statsEl = document.getElementById('deck-summary-text');
    if (!statsEl) return;
    const stats = this.runManager.playerDeck.getStats();
    statsEl.innerHTML = `
      Total: <b>${stats.total}</b> cartas | 
      🪵 Bastos: ${stats.bastos} | 🍷 Copas: ${stats.copas} | 🪙 Oros: ${stats.oros} | ⚔️ Espadas: ${stats.espadas} | 
      ⭐ Cartas Bravas: ${stats.bravos}
    `;

    const purgeBtn = document.getElementById('btn-purge-card');
    if (purgeBtn) {
      purgeBtn.textContent = `Remover Carta Fraca ($${this.runManager.shop.stock.purgeCost})`;
      purgeBtn.disabled = this.runManager.coins < this.runManager.shop.stock.purgeCost || stats.total <= 20;
      purgeBtn.onclick = () => this.openPurgeModal();
    }
  }

  openPurgeModal() {
    const modal = document.getElementById('purge-deck-modal');
    const container = document.getElementById('purge-cards-grid');
    if (!modal || !container) return;

    container.innerHTML = '';
    const cards = [...this.runManager.playerDeck.cards].sort((a, b) => a.getBaseTrucoPower() - b.getBaseTrucoPower());

    cards.forEach(card => {
      const cardEl = CardSprite.createCardElement(card, {
        scale: 0.72,
        showHints: true,
        interactive: true,
        onClick: () => {
          if (confirm(`Deseja remover permanentemente o ${card.getName()} por $${this.runManager.shop.stock.purgeCost}?`)) {
            const res = this.runManager.shop.purgeCard(card.id);
            if (res.success) {
              this.sound.playCoin();
              Dialogs.showToast(res.message, 'info');
              modal.classList.add('hidden');
              this.render();
            }
          }
        }
      });
      container.appendChild(cardEl);
    });

    document.getElementById('btn-close-purge-modal').onclick = () => modal.classList.add('hidden');
    modal.classList.remove('hidden');
  }
}

