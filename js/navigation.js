/* RideOS — navigation.js
   Navigation Center: status GPS + buka Google Maps.
   Modul peta offline (Tahap 2) disiapkan sebagai stub yang jujur. */
(function (global) {
  'use strict';

  function bindGpsStatus() {
    var st = document.getElementById('navGpsStatus');
    var acc = document.getElementById('navGpsAcc');
    var lat = document.getElementById('navGpsLat');
    var lon = document.getElementById('navGpsLon');
    var spd = document.getElementById('navGpsSpd');
    if (!st) return;

    global.RideGPS.on(function (ev) {
      if (ev.type === 'status') {
        st.textContent = ev.status.toUpperCase();
      } else if (ev.type === 'position') {
        var p = ev.point;
        acc.textContent = Math.round(p.accuracy) + ' m';
        lat.textContent = p.lat.toFixed(5);
        lon.textContent = p.lon.toFixed(5);
        spd.textContent = p.speedKmh.toFixed(1) + ' km/h';
      }
    });

    // Sinkron awal
    var s = global.RideGPS.getState();
    st.textContent = s.status.toUpperCase();
    if (s.last) {
      acc.textContent = Math.round(s.last.accuracy) + ' m';
      lat.textContent = s.last.lat.toFixed(5);
      lon.textContent = s.last.lon.toFixed(5);
      spd.textContent = s.last.speedKmh.toFixed(1) + ' km/h';
    }
  }

  function openGmaps() {
    // Google Maps universal URL — akan membuka app jika terinstal, atau web.
    var url = 'https://www.google.com/maps';
    window.open(url, '_blank');
  }

  function openGmapsDir(dest) {
    if (!dest || !dest.trim()) {
      global.RideApp.toast('Isi tujuan terlebih dahulu.');
      return;
    }
    var q = encodeURIComponent(dest.trim());
    var url = 'https://www.google.com/maps/dir/?api=1&destination=' + q;
    window.open(url, '_blank');
  }

  function init() {
    bindGpsStatus();
    var b1 = document.getElementById('btnOpenGmaps');
    var b2 = document.getElementById('btnOpenGmapsDir');
    var inp = document.getElementById('destInput');
    if (b1) b1.addEventListener('click', openGmaps);
    if (b2) b2.addEventListener('click', function () {
      openGmapsDir(inp ? inp.value : '');
    });
  }

  // Stub peta offline — sengaja kosong dan jujur.
  var offlineMap = {
    ready: false,
    init: function () { /* Tahap 2 */ },
    addTiles: function () { throw new Error('Peta offline belum tersedia.'); }
  };

  global.RideNavigation = {
    init: init,
    openGmaps: openGmaps,
    openGmapsDir: openGmapsDir,
    offlineMap: offlineMap
  };
})(window);
