/* RideOS — media.js
   Media Center: buka layanan musik + kontrol audio in-page.
   Tidak mengklaim bisa mengontrol aplikasi musik lain. */
(function (global) {
  'use strict';

  var LINKS = {
    music:   'https://music.apple.com',
    spotify: 'https://open.spotify.com',
    youtube: 'https://music.youtube.com',
    radio:   'https://www.radio-browser.info'
  };

  function openMedia(kind) {
    var url = LINKS[kind];
    if (!url) return;
    window.open(url, '_blank');
  }

  function init() {
    var btns = document.querySelectorAll('[data-media]');
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.addEventListener('click', function () {
          openMedia(b.getAttribute('data-media'));
        });
      })(btns[i]);
    }

    var audio = document.getElementById('audioEl');
    var play = document.getElementById('btnMediaPlay');
    var pause = document.getElementById('btnMediaPause');
    var stop = document.getElementById('btnMediaStop');

    if (play) play.addEventListener('click', function () {
      // Tidak ada sumber audio default. Beri tahu pengguna.
      global.RideApp.toast('Tidak ada audio di halaman. Buka layanan musik di atas.');
    });
    if (pause) pause.addEventListener('click', function () {
      if (audio && !audio.paused) audio.pause();
    });
    if (stop) stop.addEventListener('click', function () {
      if (audio) { audio.pause(); try { audio.currentTime = 0; } catch (e) {} }
    });

    // Media Session API (opsional, terbatas di iOS 15)
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: 'RideOS',
          artist: 'Vehicle Dashboard',
          album: 'RideOS'
        });
      } catch (e) { /* ignore */ }
    }
  }

  global.RideMedia = { init: init, openMedia: openMedia };
})(window);
