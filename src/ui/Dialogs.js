/**
 * Dialogs.js - Gerenciador de Balões de Fala, Notificações e Modais Retrô
 */

export class Dialogs {
  /**
   * Mostra um balão de fala do adversário na mesa com efeito retrô
   */
  static showOpponentSpeech(text, duration = 2200) {
    const bubble = document.getElementById('opponent-speech-bubble');
    if (!bubble) return;

    bubble.textContent = text;
    bubble.classList.remove('hidden');
    bubble.classList.add('visible', 'pulse-anim');

    clearTimeout(bubble._timeout);
    bubble._timeout = setTimeout(() => {
      bubble.classList.remove('visible', 'pulse-anim');
      bubble.classList.add('hidden');
    }, duration);
  }

  /**
   * Notificação flutuante de eventos (ex: "¡Mão ganha!", "+$5 Moedas")
   */
  static showToast(message, type = 'info', duration = 2500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `pixel-toast toast-${type} slide-in`;
    toast.innerHTML = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  /**
   * Tremor dramático de tela (Screen Shake) para cantos de TRUCO
   */
  static triggerScreenShake() {
    const table = document.getElementById('game-table');
    if (!table) return;

    table.classList.add('screen-shake');
    setTimeout(() => table.classList.remove('screen-shake'), 450);
  }
}

