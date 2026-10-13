/* RideOS — trip.js
   Trip computer: jarak, durasi, rata-rata, maks, pause/resume, persist. */
(function (global) {
  'use strict';

  var S = global.RideStorage;

  var state = {
    active: false,     // sedang menghitung?
    paused: false,
    startTs: null,     // waktu mulai (epoch ms)
    pausedAccumMs: 0,  // total waktu pause
    pauseStartedAt: null,
    distanceM: 0,
    maxKmh: 0,
    samples: 0,
    points: 0,
    lastTs: null
  };

  var timer = null;
  var listeners = [];

  function emit(ev) {
    listeners.forEach(function (fn) { try { fn(ev); } catch (e) {} });
  }

  function on(cb) { listeners.push(cb); }

  function elapsedMs() {
    if (!state.startTs) return 0;
    var now = Date.now();
    var total = now - state.startTs;
    var paused = state.pausedAccumMs;
    if (state.paused && state.pauseStartedAt) {
      paused += (now - state.pauseStartedAt);
    }
    return Math.max(0, total - paused);
  }

  function formatDur(ms) {
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var ss = s % 60;
    function p(n){ return n < 10 ? '0' + n : '' + n; }
    return p(h) + ':' + p(m) + ':' + p(ss);
  }

  function persist() {
    var snap = {
      active: state.active,
      paused: state.paused,
      startTs: state.startTs,
      pausedAccumMs: state.pausedAccumMs,
      pauseStartedAt: state.pauseStartedAt,
      distanceM: state.distanceM,
      maxKmh: state.maxKmh,
      samples: state.samples,
      points: state.points,
      lastTs: state.lastTs
    };
    S.set('trip.active', snap);
  }

  function restore() {
    var snap = S.get('trip.active', null);
    if (!snap) return false;
    state.active = !!snap.active;
    state.paused = !!snap.paused;
    state.startTs = snap.startTs || null;
    state.pausedAccumMs = snap.pausedAccumMs || 0;
    state.pauseStartedAt = snap.pauseStartedAt || null;
    state.distanceM = snap.distanceM || 0;
    state.maxKmh = snap.maxKmh || 0;
    state.samples = snap.samples || 0;
    state.points = snap.points || 0;
    state.lastTs = snap.lastTs || null;
    return state.active;
  }

  function start() {
    state.active = true;
    state.paused = false;
    state.startTs = Date.now();
    state.pausedAccumMs = 0;
    state.pauseStartedAt = null;
    state.distanceM = 0;
    state.maxKmh = 0;
    state.samples = 0;
    state.points = 0;
    state.lastTs = null;
    persist();
    emit({ type: 'start', state: state });
    ensureTimer();
  }

  function pause() {
    if (!state.active || state.paused) return;
    state.paused = true;
    state.pauseStartedAt = Date.now();
    persist();
    emit({ type: 'pause', state: state });
  }

  function resume() {
    if (!state.active || !state.paused) return;
    if (state.pauseStartedAt) {
      state.pausedAccumMs += (Date.now() - state.pauseStartedAt);
    }
    state.paused = false;
    state.pauseStartedAt = null;
    persist();
    emit({ type: 'resume', state: state });
  }

  function reset() {
    state.active = false;
    state.paused = false;
    state.startTs = null;
    state.pausedAccumMs = 0;
    state.pauseStartedAt = null;
    state.distanceM = 0;
    state.maxKmh = 0;
    state.samples = 0;
    state.points = 0;
    state.lastTs = null;
    S.remove('trip.active');
    emit({ type: 'reset', state: state });
    stopTimer();
  }

  function onPosition(point, movedMeters) {
    if (!state.active || state.paused) return;
    // Hanya tambahkan jarak jika perpindahan wajar (sudah difilter GPS).
    if (typeof movedMeters === 'number' && movedMeters > 0 && movedMeters < 500) {
      state.distanceM += movedMeters;
    }
    if (typeof point.speedKmh === 'number') {
      if (point.speedKmh > state.maxKmh) state.maxKmh = point.speedKmh;
      state.samples += 1;
    }
    state.points += 1;
    state.lastTs = point.ts || Date.now();
    persist();
    emit({ type: 'update', state: state });
  }

  function ensureTimer() {
    if (timer) return;
    timer = global.setInterval(function () {
      if (state.active && !state.paused) {
        emit({ type: 'tick', state: state });
      }
    }, 1000);
  }
  function stopTimer() {
    if (timer) { global.clearInterval(timer); timer = null; }
  }

  function snapshot() {
    var dur = elapsedMs();
    var avg = (dur > 0) ? (state.distanceM / 1000) / (dur / 3600000) : 0;
    return {
      active: state.active,
      paused: state.paused,
      distanceKm: state.distanceM / 1000,
      durationMs: dur,
      durationStr: formatDur(dur),
      avgKmh: Math.round(avg * 10) / 10,
      maxKmh: Math.round(state.maxKmh * 10) / 10,
      samples: state.samples,
      points: state.points,
      startTs: state.startTs
    };
  }

  function saveToHistory(label) {
    var snap = snapshot();
    if (!snap.startTs || snap.distanceKm <= 0 && snap.durationMs < 5000) {
      return null; // tidak ada yang layak disimpan
    }
    var entry = {
      ts: Date.now(),
      label: label || ('Trip ' + new Date(snap.startTs).toLocaleString('id-ID')),
      startTs: snap.startTs,
      distanceKm: Math.round(snap.distanceKm * 1000) / 1000,
      durationMs: snap.durationMs,
      durationStr: snap.durationStr,
      avgKmh: snap.avgKmh,
      maxKmh: snap.maxKmh
    };
    S.pushHistory(entry);
    return entry;
  }

  global.RideTrip = {
    on: on,
    start: start,
    pause: pause,
    resume: resume,
    reset: reset,
    restore: restore,
    snapshot: snapshot,
    saveToHistory: saveToHistory,
    formatDur: formatDur,
    onPosition: onPosition,
    ensureTimer: ensureTimer
  };
})(window);
