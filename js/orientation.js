/* RideOS — orientation.js
   Deteksi orientasi + mode AUTO/CAR/MOTO.
   Tidak memaksa orientasi fisik (tidak mungkin di web). */
(function (global) {
  'use strict';

  var listeners = [];

  function getOrientation() {
    // Prioritas: matchMedia (paling andal di Safari iOS 15)
    if (global.matchMedia) {
      if (global.matchMedia('(orientation: landscape)').matches) return 'landscape';
      if (global.matchMedia('(orientation: portrait)').matches) return 'portrait';
    }
    // Fallback: dimensi
    if (global.innerWidth > global.innerHeight) return 'landscape';
    return 'portrait';
  }

  function effectiveMode(savedMode) {
    if (savedMode === 'car' || savedMode === 'moto') return savedMode;
    // AUTO
    var o = getOrientation();
    return (o === 'landscape') ? 'car' : 'moto';
  }

  function applyMode(savedMode) {
    var mode = effectiveMode(savedMode);
    document.body.setAttribute('data-mode', mode);
    document.body.setAttribute('data-requested-mode', savedMode || 'auto');
    notify({ requested: savedMode || 'auto', effective: mode, orientation: getOrientation() });
    return mode;
  }

  function notify(info) {
    listeners.forEach(function (fn) {
      try { fn(info); } catch (e) { /* ignore */ }
    });
  }

  function on(cb) { listeners.push(cb); }

  // Listen perubahan orientasi
  var mq = global.matchMedia ? global.matchMedia('(orientation: landscape)') : null;
  function handler() {
    var req = document.body.getAttribute('data-requested-mode') || 'auto';
    applyMode(req);
  }
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  }
  global.addEventListener('orientationchange', function () {
    setTimeout(handler, 120);
  });
  global.addEventListener('resize', function () {
    // Debounce sederhana
    if (global.__rideosRot) clearTimeout(global.__rideosRot);
    global.__rideosRot = setTimeout(handler, 150);
  });

  global.RideOrientation = {
    getOrientation: getOrientation,
    effectiveMode: effectiveMode,
    applyMode: applyMode,
    on: on
  };
})(window);
