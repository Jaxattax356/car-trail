/* The Car Trail - boot. */
(function (root) {
  'use strict';
  const CT = root.CT;
  function start() {
    CT.engine.init();
    CT.screens.title();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
