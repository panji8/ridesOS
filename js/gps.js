/* RideOS — gps.js
   Geolocation wrapper dengan watchPosition, filter drift, dan status jujur.
   Kompatibel Safari iOS 15. */
(function (global) {
  'use strict';

  var state = {
    status: 'standby', // standby | requesting | active | denied | unavailable | error | timeout
    watchId: null,
    last: null,        // {lat, lon, speedKmh, accuracy, ts}
    lastAccepted: null,// titik terakhir yang diterima untuk filter drift
    error: null
  };

  var listeners = [];

  function emit(ev) {
    listeners.forEach(function (fn) {
      try { fn(ev); } catch (e) { /* ignore */ }
    });
  }

  function setStatus(s) {
    state.status = s;
    emit({ type: 'status', status: s, error: state.error });
  }

  function on(cb) { listeners.push(cb); }

  function supported() {
    return !!global.navigator && !!global.navigator.geolocation;
  }

  // Haversine, meter
  function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad;
    var dLon = (lon2 - lon1) * toRad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Filter drift: tolak titik dengan akurasi buruk + lompatan tidak realistis.
  function accept(prev, next) {
    if (!prev) return true;
    // Akurasi lebih besar dari 100 m -> curiga, tapi tetap tampilkan.
    // Tolak lompatan > 200 m dalam < 3 detik (kecepatan > 240 km/jam).
    var dt = Math.max(0.001, (next.ts - prev.ts) / 1000);
    var dist = haversine(prev.lat, prev.lon, next.lat, next.lon);
    var kmh = (dist / dt) * 3.6;
    if (kmh > 240 && dist > 200) return false;
    return true;
  }

  function handlePosition(pos) {
    var c = pos.coords;
    var speedMs = (typeof c.speed === 'number' && isFinite(c.speed)) ? c.speed : null;
    var speedKmh = (speedMs !== null && speedMs >= 0) ? speedMs * 3.6 : 0;
    if (speedKmh < 0) speedKmh = 0;

    var next = {
      lat: c.latitude,
      lon: c.longitude,
      speedKmh: Math.round(speedKmh * 10) / 10,
      accuracy: c.accuracy,
      ts: pos.timestamp || Date.now()
    };

    if (!accept(state.lastAccepted, next)) {
      // Tetap update status tetapi jangan update nilai kecepatan/jarak.
      state.last = next; // simpan sebagai referensi tapi tandai ditolak
      emit({ type: 'rejected', point: next });
      return;
    }

    var prev = state.lastAccepted;
    state.lastAccepted = next;
    state.last = next;

    var moved = 0;
    if (prev) moved = haversine(prev.lat, prev.lon, next.lat, next.lon);

    if (state.status !== 'active') setStatus('active');

    emit({
      type: 'position',
      point: next,
      movedMeters: moved,
      prev: prev
    });
  }

  function handleError(err) {
    state.error = err && err.message ? err.message : 'unknown';
    if (!err) { setStatus('error'); return; }
    if (err.code === 1) setStatus('denied');
    else if (err.code === 2) setStatus('unavailable');
    else if (err.code === 3) setStatus('timeout');
    else setStatus('error');
  }

  function start() {
    if (!supported()) {
      state.error = 'Geolocation API tidak tersedia.';
      setStatus('unavailable');
      return;
    }
    if (state.watchId !== null) return; // sudah jalan

    setStatus('requesting');
    try {
      state.watchId = global.navigator.geolocation.watchPosition(
        handlePosition,
        handleError,
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
      );
    } catch (e) {
      state.error = String(e);
      setStatus('error');
    }
  }

  function stop() {
    if (state.watchId !== null && supported()) {
      try { global.navigator.geolocation.clearWatch(state.watchId); } catch (e) {}
    }
    state.watchId = null;
    setStatus('standby');
  }

  function getState() { return state; }

  global.RideGPS = {
    supported: supported,
    start: start,
    stop: stop,
    on: on,
    getState: getState,
    haversine: haversine
  };
})(window);
