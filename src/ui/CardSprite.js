/**
 * CardSprite.js - Renderizador de Cartas 8-bit com CSS Sprites Pixel-Perfect
 */

export class CardSprite {
  static CARD_WIDTH = 142;
  static CARD_HEIGHT = 190;
  static SPRITE_TOTAL_WIDTH = 1846;
  static SPRITE_TOTAL_HEIGHT = 760;

  // Verso da carta oficial: Coluna 12, Linha 1 (Bandeira Argentina Celeste/Sol)
  static BACK_ROW = 1;
  static BACK_COL = 12;

  /**
   * Cria um elemento DOM de carta baseado na sprite sheet
   * @param {Card|null} card - objeto de Card, ou null se for carta virada para baixo
   * @param {object} options
   * @param {boolean} options.isFaceDown
   * @param {boolean} options.interactive - se pode ser clicada
   * @param {boolean} options.showHints - se exibe dica de força e nome
   * @param {function} options.onClick - callback ao clicar
   * @param {number} options.scale - escala visual (padrão 0.85 ou 1)
   */
  static createCardElement(card, options = {}) {
    const {
      isFaceDown = false,
      interactive = false,
      showHints = false,
      onClick = null,
      scale = 0.82
    } = options;

    const el = document.createElement('div');
    el.className = 'pixel-card';
    if (interactive) el.classList.add('interactive');
    if (isFaceDown) el.classList.add('face-down');
    if (!isFaceDown && card && card.getBaseTrucoPower() >= 11) {
      el.classList.add('is-bravo-card');
    }

    // Dimensões proporcionais
    const w = Math.round(this.CARD_WIDTH * scale);
    const h = Math.round(this.CARD_HEIGHT * scale);
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;

    // Inner sprite viewport
    const inner = document.createElement('div');
    inner.className = 'pixel-card-inner';
    inner.style.width = `${this.CARD_WIDTH}px`;
    inner.style.height = `${this.CARD_HEIGHT}px`;
    inner.style.transform = `scale(${scale})`;
    inner.style.transformOrigin = 'top left';

    // Renderizar Verso da Carta ou Face Normal
    if (isFaceDown) {
      inner.style.backgroundImage = `url('assets/card_back_8bit.png')`;
      inner.style.backgroundPosition = '0px 0px';
      inner.style.backgroundSize = `${this.CARD_WIDTH}px ${this.CARD_HEIGHT}px`;
      inner.style.backgroundRepeat = 'no-repeat';
    } else if (card) {
      const col = card.col;
      const row = card.row;
      const posX = -(col * this.CARD_WIDTH);
      const posY = -(row * this.CARD_HEIGHT);

      inner.style.backgroundImage = `url('assets/8BitDeck_BaralhoEspanhol.png')`;
      inner.style.backgroundPosition = `${posX}px ${posY}px`;
      inner.style.backgroundRepeat = 'no-repeat';
    }

    el.appendChild(inner);

    // Indicador e Tooltip de Força do Truco para jogadores
    if (!isFaceDown && card && showHints) {
      const powerBadge = document.createElement('div');
      powerBadge.className = 'card-power-badge';
      const power = card.getEffectiveTrucoPower();
      powerBadge.textContent = `★ ${power}`;
      powerBadge.title = `${card.getName()} (Força Truco: ${power}, Envido: ${card.getEnvidoValue()})`;
      el.appendChild(powerBadge);

      el.title = `${card.getName()} | Força: ${power} | Envido: ${card.getEnvidoValue()}`;
    }

    if (interactive && onClick) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick(card, el);
      });
    }

    return el;
  }
}

