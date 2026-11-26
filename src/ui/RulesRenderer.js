/**
 * RulesRenderer.js - Renderizador Lúdico da Tela de Regras & Hierarquia
 * Usa os sprites reais das cartas (CardSprite) para ilustrar a ordem de força, Envido e Flor.
 */

import { Card, SUITS } from '../core/Card.js';
import { CardSprite } from './CardSprite.js';

export class RulesRenderer {
  static render(particleManager = null) {
    const container = document.getElementById('rules-visual-body');
    if (!container || container.dataset.rendered === 'true') return;
    container.dataset.rendered = 'true';

    container.innerHTML = '';

    // 1. OS 4 BRAVOS (PODIUM)
    const bravosSection = document.createElement('div');
    bravosSection.className = 'rules-section';
    bravosSection.innerHTML = `
      <h4 class="rules-section-title">👑 1. Os 4 Bravos — As Cartas Mais Fortes</h4>
      <p class="rules-hint">Nenhuma carta comum vence estas quatro. A ordem entre elas é fixa!</p>
    `;

    const bravosGrid = document.createElement('div');
    bravosGrid.className = 'rules-bravos-grid';

    const bravos = [
      { rank: '1º', label: 'Espadilha (Macho)', card: new Card(1, SUITS.ESPADAS), power: 14, desc: 'Invencível!' },
      { rank: '2º', label: 'Bastilha (Hembra)', card: new Card(1, SUITS.BASTOS), power: 13, desc: 'Só perde p/ 1♠' },
      { rank: '3º', label: 'Sete Bravo', card: new Card(7, SUITS.ESPADAS), power: 12, desc: 'Rei dos 7' },
      { rank: '4º', label: 'Sete Bello', card: new Card(7, SUITS.OROS), power: 11, desc: 'Ouro puro' }
    ];

    bravos.forEach(item => {
      const tile = document.createElement('div');
      tile.className = 'rules-bravo-tile';

      const badge = document.createElement('div');
      badge.className = 'rules-rank-pill gold';
      badge.textContent = `${item.rank} • ★ ${item.power}`;

      const cardEl = CardSprite.createCardElement(item.card, {
        scale: 0.56,
        showHints: false
      });

      if (particleManager) {
        cardEl.addEventListener('mouseenter', () => particleManager.sparkleCardHover(cardEl, true));
      }

      const name = document.createElement('div');
      name.className = 'rules-tile-name';
      name.textContent = item.label;

      const sub = document.createElement('div');
      sub.className = 'rules-tile-sub';
      sub.textContent = item.desc;

      tile.appendChild(badge);
      tile.appendChild(cardEl);
      tile.appendChild(name);
      tile.appendChild(sub);
      bravosGrid.appendChild(tile);
    });

    bravosSection.appendChild(bravosGrid);
    container.appendChild(bravosSection);

    // 2. ESCADA COMPLETA DE CARTAS COMUNS
    const ladderSection = document.createElement('div');
    ladderSection.className = 'rules-section';
    ladderSection.innerHTML = `
      <h4 class="rules-section-title">🪜 2. Escada de Força (Cartas Comuns)</h4>
      <p class="rules-hint">Cartas de mesmo nível <b>empatam (Parda)</b>, independente do naipe. Lembre-se: <b>não existem 8 nem 9</b>!</p>
    `;

    const ladderGrid = document.createElement('div');
    ladderGrid.className = 'rules-ladder-grid';

    const ladderItems = [
      { rank: '5º', title: 'Todos os 3', power: 10, cards: [new Card(3, SUITS.COPAS)] },
      { rank: '6º', title: 'Todos os 2', power: 9, cards: [new Card(2, SUITS.OROS)] },
      { rank: '7º', title: 'Ases Falsos', power: 8, cards: [new Card(1, SUITS.COPAS), new Card(1, SUITS.OROS)] },
      { rank: '8º', title: 'Reis (12)', power: 7, cards: [new Card(12, SUITS.ESPADAS)] },
      { rank: '9º', title: 'Cavalos (11)', power: 6, cards: [new Card(11, SUITS.BASTOS)] },
      { rank: '10º', title: 'Sotas (10)', power: 5, cards: [new Card(10, SUITS.OROS)] },
      { rank: '11º', title: '7s Comuns', power: 4, cards: [new Card(7, SUITS.COPAS), new Card(7, SUITS.BASTOS)] },
      { rank: '12º', title: 'Todos os 6', power: 3, cards: [new Card(6, SUITS.BASTOS)] },
      { rank: '13º', title: 'Todos os 5', power: 2, cards: [new Card(5, SUITS.ESPADAS)] },
      { rank: '14º', title: 'Todos os 4', power: 1, cards: [new Card(4, SUITS.COPAS)] }
    ];

    ladderItems.forEach(item => {
      const tile = document.createElement('div');
      tile.className = 'rules-ladder-tile';

      const top = document.createElement('div');
      top.className = 'rules-rank-pill';
      top.textContent = `${item.rank} • ★ ${item.power}`;

      const cardsWrap = document.createElement('div');
      cardsWrap.className = 'rules-mini-cards-row';
      item.cards.forEach(c => {
        const el = CardSprite.createCardElement(c, { scale: 0.42, showHints: false });
        cardsWrap.appendChild(el);
      });

      const title = document.createElement('div');
      title.className = 'rules-tile-name';
      title.textContent = item.title;

      tile.appendChild(top);
      tile.appendChild(cardsWrap);
      tile.appendChild(title);
      ladderGrid.appendChild(tile);
    });

    ladderSection.appendChild(ladderGrid);
    container.appendChild(ladderSection);

    // 3. EXEMPLOS VISUAIS DE ENVIDO E FLOR
    const envidoSection = document.createElement('div');
    envidoSection.className = 'rules-section';
    envidoSection.innerHTML = `
      <h4 class="rules-section-title">🎶 3. Envido & Flor (Na 1ª Vaza)</h4>
    `;

    const examplesRow = document.createElement('div');
    examplesRow.className = 'rules-examples-row';

    // Exemplo Envido 33
    const envidoBox = document.createElement('div');
    envidoBox.className = 'rules-example-box';
    const envidoCards = document.createElement('div');
    envidoCards.className = 'rules-mini-cards-row';
    [new Card(7, SUITS.OROS), new Card(6, SUITS.OROS), new Card(4, SUITS.ESPADAS)].forEach((c, idx) => {
      const el = CardSprite.createCardElement(c, { scale: 0.4, showHints: false });
      if (idx === 2) el.style.opacity = '0.45';
      envidoCards.appendChild(el);
    });
    envidoBox.innerHTML = `<div class="rules-ex-title">✨ Envido = 33 pontos!</div>`;
    envidoBox.appendChild(envidoCards);
    envidoBox.innerHTML += `<div class="rules-ex-desc">2 cartas do mesmo naipe: <b>20 + 7 + 6 = 33</b>.<br><small>Figuras (10, 11, 12) valem 0 no Envido.</small></div>`;
    // Note: re-append envidoCards because innerHTML += resets child nodes
    const envidoDesc = document.createElement('div');
    envidoDesc.className = 'rules-ex-desc';
    envidoDesc.innerHTML = `2 cartas do mesmo naipe: <b>20 + 7 + 6 = 33</b>.<br><small>Figuras (10, 11, 12) valem 0 no Envido.</small>`;
    envidoBox.innerHTML = `<div class="rules-ex-title">✨ Envido = 33 pontos!</div>`;
    envidoBox.appendChild(envidoCards);
    envidoBox.appendChild(envidoDesc);

    // Exemplo Flor
    const florBox = document.createElement('div');
    florBox.className = 'rules-example-box flor';
    const florCards = document.createElement('div');
    florCards.className = 'rules-mini-cards-row';
    [new Card(1, SUITS.ESPADAS), new Card(7, SUITS.ESPADAS), new Card(3, SUITS.ESPADAS)].forEach(c => {
      florCards.appendChild(CardSprite.createCardElement(c, { scale: 0.4, showHints: false }));
    });
    const florDesc = document.createElement('div');
    florDesc.className = 'rules-ex-desc';
    florDesc.innerHTML = `3 cartas do mesmo naipe = <b>¡FLOR! (+3 tentos)</b><br><small>Vale 20 + soma das 3 cartas!</small>`;
    florBox.innerHTML = `<div class="rules-ex-title">🌺 ¡FLOR! (3 do mesmo naipe)</div>`;
    florBox.appendChild(florCards);
    florBox.appendChild(florDesc);

    examplesRow.appendChild(envidoBox);
    examplesRow.appendChild(florBox);
    envidoSection.appendChild(examplesRow);
    container.appendChild(envidoSection);

    // 4. VAZAS, PARDAS & GRITOS
    const extraSection = document.createElement('div');
    extraSection.className = 'rules-section';
    extraSection.innerHTML = `
      <h4 class="rules-section-title">⚖️ 4. Vazas, Pardas & Apostas</h4>
      <div class="rules-cards-info-grid">
        <div class="rules-info-card">
          <b>🎯 Melhor de 3 Vazas</b>
          <p>Quem vencer <b>2 vazas</b> leva a mão. O "Mano" começa jogando e alterna a cada mão.</p>
        </div>
        <div class="rules-info-card">
          <b>⚖️ Regras de Parda (Empate)</b>
          <p>• Empate na 1ª: decide na 2ª.<br>• Empate na 2ª: quem ganhou a 1ª vence!<br>• 1x1 e empate na 3ª: quem ganhou a 1ª leva!</p>
        </div>
        <div class="rules-info-card">
          <b>🔥 Gritos de Truco</b>
          <p><b>¡TRUCO!</b> (2 tentos) → <b>¡RETRUCO!</b> (3 tentos) → <b>¡VALE CUATRO!</b> (4 tentos).</p>
        </div>
        <div class="rules-info-card">
          <b>🃏 Modo Roguelike</b>
          <p>Na campanha solo, compre <b>Curingas</b> na Loja do Boteco para ganhar poderes especiais!</p>
        </div>
      </div>
    `;
    container.appendChild(extraSection);
  }
}
