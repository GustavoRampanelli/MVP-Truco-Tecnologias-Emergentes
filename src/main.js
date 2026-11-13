/**
 * main.js - Ponto de Entrada da Aplicação Web
 */

import { App } from './ui/App.js';

window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  window.__TRUCO_APP__ = app;
});

