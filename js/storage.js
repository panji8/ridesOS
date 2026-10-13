/* RideOS — storage.js
   Wrapper tipis untuk localStorage + helper trip history.
   Aman untuk Safari iOS 15 (localStorage bisa gagal di Private Browsing). */
(function (global) {
  'use strict';

  var NS = 'rideos.';
  var memory = {}; // fallback in-memory jika localStorage tidak tersedia
  var lsOk = (function () {
    try {
      var k = '__rideos_test__';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  function get(key, fallback) {
    var full = NS + key;
    try {
      var v = lsOk ? global.localStorage.getItem(full) : memory[full];
      if (v === null || v === undefined) return fallback;
      return JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  }

  function set(key, value) {
    var full = NS + key;
    try {
      var s = JSON.stringify(value);
      if (lsOk) global.localStorage.setItem(full, s);
      else memory[full] = s;
      return true;
    } catch (e) {
      // Kuota penuh: coba bersihkan riwayat lama.
      if (String(e).indexOf('Quota') >= 0) {
        try {
          var hist = get('history', []);
          hist = hist.slice(-5);
          set('history', hist);
          if (lsOk) global.localStorage.setItem(full, JSON.stringify(value));
          return true;
        } catch (e2) { /* ignore */ }
      }
      return false;
    }
  }

  function remove(key) {
    var full = NS + key;
    try {
      if (lsOk) global.localStorage.removeItem(full);
      else delete memory[full];
    } catch (e) { /* ignore */ }
  }

  function clearAll() {
    try {
      if (lsOk) {
        var keys = [];
        for (var i = 0; i < global.localStorage.length; i++) {
          var k = global.localStorage.key(i);
          if (k && k.indexOf(NS) === 0) keys.push(k);
        }
        keys.forEach(function (k) { global.localStorage.removeItem(k); });
      }
      memory = {};
    } catch (e) { /* ignore */ }
  }

  function estimateBytes() {
    try {
      if (!lsOk) return 0;
      var total = 0;
      for (var i = 0; i < global.localStorage.length; i++) {
        var k = global.localStorage.key(i);
        if (k && k.indexOf(NS) === 0) {
          total += k.length + (global.localStorage.getItem(k) || '').length;
        }
      }
      return total;
    } catch (e) { return 0; }
  }

  // ---------- Trip history ----------
  function getHistory() {
    var h = get('history', []);
    return Array.isArray(h) ? h : [];
  }

  function pushHistory(entry) {
    var h = getHistory();
    h.push(entry);
    // Batasi 50 entri agar kuota aman.
    if (h.length > 50) h = h.slice(h.length - 50);
    set('history', h);
    return h;
  }

  function clearHistory() {
    set('history', []);
  }

  global.RideStorage = {
    lsOk: lsOk,
    get: get,
    set: set,
    remove: remove,
    clearAll: clearAll,
    estimateBytes: estimateBytes,
    getHistory: getHistory,
    pushHistory: pushHistory,
    clearHistory: clearHistory
  };
})(window);
