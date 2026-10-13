/* RideOS — app.js
   Entry point: router, jam, status bar, koneksi, baterai, tombol trip,
   binding semua modul. */
(function (global) {
  'use strict';

  var S = global.RideStorage;

  // ---------- Router ----------
  var SCREENS = ['home', 'navigation', 'media', 'trip', 'settings'];

  function showScreen(name) {
    if (SCREENS.indexOf(name) < 0) name = 'home';
    SCREENS.forEach(function (s) {
      var el = document.getElementById('screen-' + s);
      if (el) el.hidden = (s !== name);
    });
    document.body.setAttribute('data-screen', name);
    // Update bottom bar
    var btns = document.querySelectorAll('.modebar__btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('is-on', btns[i].getAttribute('data-nav') === name);
    }
    if (location.hash !== '#' + name) {
      // Hindari menambah history berlebih saat init.
      try { history.replaceState(null, '', '#' + name); } catch (e) {}
    }
  }

  function currentScreenFromHash() {
    var h = (location.hash || '').replace('#', '');
    return SCREENS.indexOf(h) >= 0 ? h : 'home';
  }

  function bindNav() {
    var els = document.querySelectorAll('[data-nav]');
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        el.addEventListener('click', function () {
          showScreen(el.getAttribute('data-nav'));
        });
      })(els[i]);
    }
    var backs = document.querySelectorAll('[data-back]');
    for (var j = 0; j < backs.length; j++) {
      (function (b) {
        b.addEventListener('click', function () {
          showScreen('home');
        });
      })(backs[j]);
    }
    global.addEventListener('hashchange', function () {
      showScreen(currentScreenFromHash());
    });
  }

  // ---------- Toast & Confirm ----------
  var toastTimer = null;
  function toast(msg, ms) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, ms || 2200);
  }

  var confirmCb = null;
  function confirmBox(title, body, cb) {
    var m = document.getElementById('modal');
    var t = document.getElementById('modalTitle');
    var b = document.getElementById('modalBody');
    if (!m) { if (global.confirm(title + '\n' + body)) cb(); return; }
    t.textContent = title;
    b.textContent = body;
    confirmCb = cb;
    m.hidden = false;
  }

  function bindModal() {
    var ok = document.getElementById('modalOk');
    var cancel = document.getElementById('modalCancel');
    var m = document.getElementById('modal');
    if (ok) ok.addEventListener('click', function () {
      m.hidden = true;
      var cb = confirmCb; confirmCb = null;
      if (cb) cb();
    });
    if (cancel) cancel.addEventListener('click', function () {
      m.hidden = true; confirmCb = null;
    });
  }

  // ---------- Jam & tanggal ----------
  function tickClock() {
    var d = new Date();
    function p(n){ return n < 10 ? '0' + n : '' + n; }
    var hh = p(d.getHours()), mm = p(d.getMinutes());
    var timeStr = hh + ':' + mm;
    var el1 = document.getElementById('clockTime');
    var el2 = document.getElementById('chipClock');
    if (el1) el1.textContent = timeStr;
    if (el2) el2.textContent = timeStr;

    var elD = document.getElementById('clockDate');
    if (elD) {
      try {
        var opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        elD.textContent = d.toLocaleDateString('id-ID', opts);
      } catch (e) {
        elD.textContent = d.toDateString();
      }
    }
  }

  // ---------- Status koneksi ----------
  function updateNet() {
    var on = (typeof navigator.onLine === 'boolean') ? navigator.onLine : true;
    var chip = document.getElementById('chipNet');
    var lbl = document.getElementById('netLabel');
    if (!chip || !lbl) return;
    lbl.textContent = on ? 'ONLINE' : 'OFFLINE';
    chip.classList.toggle('is-on', on);
    chip.classList.toggle('is-off', !on);
  }

  // ---------- Status baterai ----------
  function initBattery() {
    var chip = document.getElementById('chipBat');
    var lbl = document.getElementById('batLabel');
    if (!chip || !lbl) return;
    if (!navigator.getBattery) {
      // Safari iOS 15 tidak mengekspos getBattery. Biarkan hidden.
      chip.hidden = true;
      return;
    }
    navigator.getBattery().then(function (b) {
      chip.hidden = false;
      function upd() {
        lbl.textContent = Math.round(b.level * 100) + '%';
        chip.classList.toggle('is-warn', b.level <= 0.2 && !b.charging);
      }
      upd();
      b.addEventListener('levelchange', upd);
      b.addEventListener('chargingchange', upd);
    }).catch(function () { chip.hidden = true; });
  }

  // ---------- Status GPS ----------
  function initGps() {
    var chip = document.getElementById('chipGps');
    var lbl = document.getElementById('gpsLabel');
    if (!chip || !lbl) return;

    function render(status) {
      var map = {
        standby: 'STANDBY',
        requesting: 'MEMINTA IZIN',
        active: 'AKTIF',
        denied: 'DITOLAK',
        unavailable: 'TIDAK TERSEDIA',
        timeout: 'TIMEOUT',
        error: 'ERROR'
      };
      lbl.textContent = map[status] || status.toUpperCase();
      chip.classList.toggle('is-on', status === 'active');
      chip.classList.toggle('is-warn', status === 'denied' || status === 'unavailable' || status === 'timeout' || status === 'error');
    }

    global.RideGPS.on(function (ev) {
      if (ev.type === 'status') render(ev.status);
      if (ev.type === 'position') {
        // Update speedometer
        var v = document.getElementById('speedValue');
        var acc = document.getElementById('speedAcc');
        var ring = document.getElementById('speedRing');
        var kmh = ev.point.speedKmh;
        if (v) v.textContent = Math.round(kmh);
        if (acc) acc.textContent = 'Akurasi: ' + Math.round(ev.point.accuracy) + ' m';
        if (ring) {
          var max = 160;
          var pct = Math.max(0, Math.min(1, kmh / max));
          var dash = 553;
          ring.style.strokeDashoffset = String(dash - dash * pct);
        }
        // Sampaikan ke trip
        global.RideTrip.onPosition(ev.point, ev.movedMeters);
      }
    });

    render('standby');
    global.RideGPS.start();
  }

  // ---------- Trip UI ----------
  function initTripUI() {
    var btn = document.getElementById('btnTripToggle');
    var reset = document.getElementById('btnTripReset');
    var save = document.getElementById('btnSaveTrip');

    function render() {
      var s = global.RideTrip.snapshot();
      setText('tripDist', s.distanceKm.toFixed(2));
      setText('tripDur', s.durationStr);
      setText('tripAvg', s.avgKmh.toFixed(1));
      setText('tripMax', s.maxKmh.toFixed(1));

      setText('tripDist2', s.distanceKm.toFixed(2) + ' km');
      setText('tripDur2', s.durationStr);
      setText('tripAvg2', s.avgKmh.toFixed(1) + ' km/h');
      setText('tripMax2', s.maxKmh.toFixed(1) + ' km/h');
      setText('tripPts', String(s.points));

      var st = 'Idle';
      if (s.active && !s.paused) st = 'Berjalan';
      else if (s.active && s.paused) st = 'Pause';
      setText('tripStatus', st);

      if (btn) {
        if (!s.active) btn.textContent = 'Mulai Trip';
        else if (s.paused) btn.textContent = 'Lanjutkan';
        else btn.textContent = 'Pause';
      }
    }

    if (btn) btn.addEventListener('click', function () {
      var s = global.RideTrip.snapshot();
      if (!s.active) global.RideTrip.start();
      else if (s.paused) global.RideTrip.resume();
      else global.RideTrip.pause();
    });

    if (reset) reset.addEventListener('click', function () {
      var s = global.RideTrip.snapshot();
      if (!s.active && s.distanceKm === 0 && s.durationMs === 0) {
        toast('Tidak ada sesi aktif.');
        return;
      }
      confirmBox(
        'Reset trip?',
        'Jarak, durasi, rata-rata, dan maks akan direset ke nol.',
        function () { global.RideTrip.reset(); toast('Trip direset.'); }
      );
    });

    if (save) save.addEventListener('click', function () {
      var entry = global.RideTrip.saveToHistory();
      if (entry) {
        toast('Sesi disimpan.');
        global.RideSettings.renderHistory();
      } else {
        toast('Belum ada data untuk disimpan.');
      }
    });

    global.RideTrip.on(function () { render(); });
    render();
  }

  function setText(id, txt) {
    var el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  // ---------- Inisialisasi ----------
  function init() {
    // Terapkan tema & mode tersimpan lebih dulu agar tidak berkedip.
    var theme = S.get('theme', 'night');
    document.body.setAttribute('data-theme', theme);

    var mode = S.get('mode', 'auto');
    global.RideOrientation.applyMode(mode);

    bindNav();
    bindModal();
    tickClock();
    setInterval(tickClock, 1000);
    updateNet();
    global.addEventListener('online', updateNet);
    global.addEventListener('offline', updateNet);

    initBattery();

    // Pulihkan trip jika ada.
    var restored = global.RideTrip.restore();
    if (restored) toast('Sesi trip dipulihkan.', 2600);

    initGps();
    initTripUI();
    global.RideNavigation.init();
    global.RideMedia.init();
    global.RideSettings.init();

    showScreen(currentScreenFromHash());

    // Service worker
    if ('serviceWorker' in navigator) {
      global.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function (e) {
          // Tidak fatal.
          console.warn('SW gagal:', e);
        });
      });
    }

    // Visibility: beri tahu pengguna jika app masuk background.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        // iOS dapat menangguhkan geolocation di background.
        // Kita tidak menghentikan watchPosition; hanya menandai.
      }
    });
  }

  // Ekspos API kecil untuk modul lain
  global.RideApp = {
    toast: toast,
    confirm: confirmBox,
    showScreen: showScreen
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
