/* RideOS — settings.js
   Halaman pengaturan: mode, tema, satuan, ekspor, reset. */
(function (global) {
  'use strict';

  var S = global.RideStorage;

  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    S.set('theme', theme);
  }

  function applyMode(mode) {
    S.set('mode', mode);
    global.RideOrientation.applyMode(mode);
    renderModeButtons(mode);
    var hint = document.getElementById('modeHint');
    if (hint) {
      if (mode === 'auto') hint.textContent = 'Mode AUTO mengikuti orientasi layar.';
      else if (mode === 'car') hint.textContent = 'Mode CAR: layout horizontal.';
      else hint.textContent = 'Mode MOTO: layout vertikal, tombol besar.';
    }
  }

  function renderModeButtons(mode) {
    var segs = document.querySelectorAll('.seg[data-mode]');
    for (var i = 0; i < segs.length; i++) {
      var on = segs[i].getAttribute('data-mode') === mode;
      segs[i].classList.toggle('seg--on', on);
      segs[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
  }

  function renderThemeButtons(theme) {
    var segs = document.querySelectorAll('.seg[data-theme]');
    for (var i = 0; i < segs.length; i++) {
      var on = segs[i].getAttribute('data-theme') === theme;
      segs[i].classList.toggle('seg--on', on);
      segs[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
  }

  function renderStorageInfo() {
    var el = document.getElementById('setStorage');
    if (!el) return;
    if (!S.lsOk) { el.textContent = 'tidak tersedia'; return; }
    var bytes = S.estimateBytes();
    el.textContent = bytes < 1024 ? (bytes + ' B') : (Math.round(bytes / 102.4) / 10 + ' KB');
  }

  function renderSWInfo() {
    var el = document.getElementById('setSw');
    if (!el) return;
    if (!('serviceWorker' in navigator)) { el.textContent = 'tidak didukung'; return; }
    navigator.serviceWorker.getRegistration().then(function (reg) {
      el.textContent = reg ? 'aktif' : 'tidak aktif';
    }).catch(function () { el.textContent = 'error'; });
  }

  function renderStandalone() {
    var el = document.getElementById('setStandalone');
    if (!el) return;
    var standalone = (navigator.standalone === true) ||
      (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches);
    el.textContent = standalone ? 'ya' : 'tidak (buka dari Home Screen)';
  }

  function exportJSON() {
    var data = {
      exportedAt: new Date().toISOString(),
      app: 'RideOS',
      version: 'v0.1',
      settings: {
        mode: S.get('mode', 'auto'),
        theme: S.get('theme', 'night'),
        unit: S.get('unit', 'kmh')
      },
      history: S.getHistory(),
      activeTrip: S.get('trip.active', null)
    };
    downloadFile('rideos-export-' + stamp() + '.json', JSON.stringify(data, null, 2), 'application/json');
  }

  function exportCSV() {
    var h = S.getHistory();
    var rows = [['ts_iso','label','start_iso','distance_km','duration_ms','duration','avg_kmh','max_kmh']];
    h.forEach(function (e) {
      rows.push([
        new Date(e.ts).toISOString(),
        '"' + String(e.label || '').replace(/"/g, '""') + '"',
        e.startTs ? new Date(e.startTs).toISOString() : '',
        e.distanceKm,
        e.durationMs,
        e.durationStr,
        e.avgKmh,
        e.maxKmh
      ]);
    });
    var csv = rows.map(function (r) { return r.join(','); }).join('\n');
    downloadFile('rideos-history-' + stamp() + '.csv', csv, 'text/csv');
  }

  function downloadFile(name, content, mime) {
    try {
      var blob = new Blob([content], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 500);
    } catch (e) {
      global.RideApp.toast('Ekspor gagal: ' + e.message);
    }
  }

  function stamp() {
    var d = new Date();
    function p(n){ return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
      '-' + p(d.getHours()) + p(d.getMinutes());
  }

  function init() {
    // Mode
    var modeSegs = document.querySelectorAll('.seg[data-mode]');
    for (var i = 0; i < modeSegs.length; i++) {
      (function (b) {
        b.addEventListener('click', function () {
          applyMode(b.getAttribute('data-mode'));
        });
      })(modeSegs[i]);
    }

    // Tema
    var themeSegs = document.querySelectorAll('.seg[data-theme]');
    for (var j = 0; j < themeSegs.length; j++) {
      (function (b) {
        b.addEventListener('click', function () {
          var t = b.getAttribute('data-theme');
          applyTheme(t);
          renderThemeButtons(t);
        });
      })(themeSegs[j]);
    }

    // Satuan (hanya kmh di v0.1)
    var unitSegs = document.querySelectorAll('.seg[data-unit]');
    for (var k = 0; k < unitSegs.length; k++) {
      (function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) return;
          var u = b.getAttribute('data-unit');
          S.set('unit', u);
          // v0.1: hanya kmh, tombol mph disabled.
        });
      })(unitSegs[k]);
    }

    // Ekspor & reset
    var ex = document.getElementById('btnExportAll');
    var exj = document.getElementById('btnExportJson');
    var exc = document.getElementById('btnExportCsv');
    var rs = document.getElementById('btnResetAll');
    var clr = document.getElementById('btnClearHistory');

    if (ex) ex.addEventListener('click', exportJSON);
    if (exj) exj.addEventListener('click', exportJSON);
    if (exc) exc.addEventListener('click', exportCSV);

    if (rs) rs.addEventListener('click', function () {
      global.RideApp.confirm(
        'Reset semua data?',
        'Semua pengaturan, riwayat trip, dan sesi aktif akan dihapus. Tindakan ini tidak dapat dibatalkan.',
        function () {
          S.clearAll();
          global.RideTrip.reset();
          global.RideApp.toast('Semua data dihapus.');
          setTimeout(function () { location.reload(); }, 600);
        }
      );
    });

    if (clr) clr.addEventListener('click', function () {
      global.RideApp.confirm(
        'Hapus riwayat trip?',
        'Sesi aktif tidak akan terhapus. Riwayat tersimpan akan dihapus permanen.',
        function () {
          S.clearHistory();
          renderHistory();
          global.RideApp.toast('Riwayat dihapus.');
        }
      );
    });

    // Info
    var v = document.getElementById('setVersion');
    if (v) v.textContent = 'v0.1';
    renderStorageInfo();
    renderSWInfo();
    renderStandalone();

    // Terapkan preferensi tersimpan
    applyTheme(S.get('theme', 'night'));
    renderThemeButtons(S.get('theme', 'night'));
    renderModeButtons(S.get('mode', 'auto'));

    // Riwayat
    renderHistory();
  }

  function renderHistory() {
    var ul = document.getElementById('tripHistory');
    if (!ul) return;
    var h = S.getHistory();
    if (!h.length) {
      ul.innerHTML = '<li><span>Belum ada riwayat.</span></li>';
      return;
    }
    // Tampilkan terbaru di atas.
    var html = '';
    for (var i = h.length - 1; i >= 0; i--) {
      var e = h[i];
      var d = new Date(e.ts);
      html += '<li><span>' + escapeHtml(e.label || 'Trip') + '</span>' +
        '<b>' + e.distanceKm.toFixed(2) + ' km · ' + e.durationStr + '</b></li>';
    }
    ul.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  global.RideSettings = {
    init: init,
    applyTheme: applyTheme,
    applyMode: applyMode,
    exportJSON: exportJSON,
    exportCSV: exportCSV,
    renderHistory: renderHistory
  };
})(window);
