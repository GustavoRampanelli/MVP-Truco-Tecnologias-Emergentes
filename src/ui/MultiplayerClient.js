/**
 * MultiplayerClient.js - Cliente WebSocket para Partidas 1v1 Online
 */

export class MultiplayerClient {
  constructor() {
    this.ws = null;
    this.roomId = null;
    this.playerSide = null;
    this.opponentName = 'Adversário';
    this.handlers = {};
  }

  on(event, fn) {
    this.handlers[event] = fn;
  }

  emit(event, data) {
    if (this.handlers[event]) this.handlers[event](data);
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);

      this.ws.onmessage = (evt) => {
        let msg;
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }
        this.emit(msg.type, msg);
      };

      this.ws.onclose = () => {
        this.emit('disconnected', {});
      };
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.roomId = null;
    this.playerSide = null;
  }

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  createRoom(name) {
    this.send({ type: 'create_room', name });
  }

  joinRoom(roomId, name) {
    this.send({ type: 'join_room', roomId, name });
  }

  playCard(cardId) {
    this.send({ type: 'play_card', cardId });
  }

  proposeTruco(betType) {
    this.send({ type: 'propose_truco', betType });
  }

  respondTruco(action) {
    this.send({ type: 'respond_truco', action });
  }

  proposeEnvido(envidoType) {
    this.send({ type: 'propose_envido', envidoType });
  }

  respondEnvido(action) {
    this.send({ type: 'respond_envido', action });
  }

  fold() {
    this.send({ type: 'fold' });
  }

  rematch() {
    this.send({ type: 'rematch' });
  }
}
