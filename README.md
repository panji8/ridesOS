# RideOS v0.1

DIY vehicle dashboard untuk iPhone 7 (iOS 15, Safari). Offline-first, tanpa backend,
tanpa API key, tanpa CDN.

## Fitur v0.1
- Home screen futuristik dengan jam, tanggal, status jaringan, status GPS, baterai (jika didukung).
- Speedometer GPS (km/h) dengan indikator akurasi.
- Trip computer: jarak, durasi, rata-rata, maks, titik GPS.
- Tombol Mulai / Pause / Lanjutkan / Reset trip (dengan konfirmasi).
- Mode AUTO / CAR / MOTO (disimpan di localStorage).
- Tema Malam / Siang.
- Navigation Center (status GPS + buka Google Maps).
- Media Center (buka layanan musik; kontrol in-page terbatas).
- System Settings (ekspor JSON/CSV, reset data, info penyimpanan).
- Manifest + Service Worker untuk offline-first.

## Struktur
Lihat struktur folder di root. Semua modul JS dimuat via `<script>` biasa (tanpa ES modules)
agar kompatibel Safari iOS 15.

## Menjalankan di komputer
1. Letakkan folder `rideos/` di direktori mana pun.
2. Jalankan server statis dari dalam folder:
   - Python 3: `python3 -m http.server 8080`
   - Node: `npx serve -l 8080`
   - PHP: `php -S localhost:8080`
3. Buka `http://localhost:8080` di browser desktop.
4. Untuk menguji GPS, gunakan `https://localhost` atau HTTPS hosting.
   `file://` tidak akan memberi geolocation.

## Unggah ke GitHub Pages
1. Buat repo publik, mis. `rideos`.
2. Salin isi folder `rideos/` ke root repo.
3. Push ke branch `main`.
4. Repo → Settings → Pages → Source: `Deploy from a branch` → `main` / `/(root)`.
5. Tunggu 1–2 menit. URL: `https://<user>.github.io/rideos/`.
6. Pastikan HTTPS (GitHub Pages sudah HTTPS).

## Memasang di iPhone 7
1. Buka URL GitHub Pages di **Safari**.
2. Tunggu hingga halaman selesai dimuat (agar service worker meng-cache).
3. Ketuk ikon **Bagikan** → **Tambahkan ke Layar Utama**.
4. Beri nama `RideOS` → **Tambah**.
5. Buka dari ikon Home Screen agar tampil fullscreen (standalone).
6. Saat pertama kali membuka, izinkan **Lokasi** ketika diminta.

## Menguji GPS
- Wajib HTTPS (GitHub Pages sudah HTTPS) atau `localhost`.
- Jika muncul status `DENIED`: iOS → Settings → Safari → Location → Allow.
- Jika `UNAVAILABLE` / `TIMEOUT`: pindah ke area terbuka, tunggu 10–30 detik.
- Kecepatan yang ditampilkan adalah kecepatan GPS. Di dalam ruangan, nilainya bisa 0.
- **Keterbatasan iOS**: saat app di background atau layar terkunci, Safari dapat
  menangguhkan `watchPosition`. Jalankan app di foreground untuk perekaman yang andal.

## Menguji mode AUTO / CAR / MOTO
- Buka Settings → Mode Dashboard.
- Pilih `AUTO`: putar perangkat; mode efektif berubah mengikuti orientasi.
- Pilih `CAR`: layout horizontal dipaksa.
- Pilih `MOTO`: layout vertikal dengan tombol besar.
- Preferensi tersimpan di localStorage.

## Menguji fungsi offline
1. Buka app sekali saat online agar service worker meng-cache aset.
2. Aktifkan Airplane Mode.
3. Tutup dan buka kembali app dari Home Screen.
4. Home screen harus tetap muncul; status jaringan berubah ke `OFFLINE`.
5. Google Maps / layanan musik tetap butuh internet.

## Keterbatasan yang belum bisa diatasi di iOS 15
- Web app **tidak bisa memaksa orientasi** perangkat.
- Web app **tidak bisa mengontrol** aplikasi musik lain (Spotify, Apple Music) via web API.
- Web app **tidak bisa mengubah brightness** atau mematikan layar.
- Geolocation di **background** dapat ditangguhkan iOS.
- `getBattery` tidak diekspos Safari iOS 15, jadi chip baterai biasanya tersembunyi.
- localStorage bisa dibersihkan iOS setelah 7 hari tidak dipakai (untuk PWA yang jarang dibuka).
- Tidak ada akses ke odometer / CAN bus kendaraan.

## Checklist pengujian
- [ ] Home screen tampil dengan jam berjalan.
- [ ] Chip jaringan berubah ONLINE/OFFLINE.
- [ ] Izin lokasi muncul saat pertama buka; status GPS berubah.
- [ ] Speedometer menampilkan angka saat bergerak (uji di luar ruangan).
- [ ] Mulai Trip → jarak & durasi bertambah.
- [ ] Pause → durasi berhenti; Lanjutkan → durasi lanjut tanpa dobel.
- [ ] Reset → konfirmasi muncul, data kembali nol.
- [ ] Simpan Sesi → muncul di riwayat.
- [ ] Ekspor JSON & CSV menghasilkan file.
- [ ] Mode AUTO / CAR / MOTO mengubah layout.
- [ ] Tema Malam / Siang berubah.
- [ ] Airplane Mode: home screen tetap terbuka.
- [ ] Add to Home Screen: ikon muncul; buka fullscreen.
- [ ] Tidak ada error di Console Safari (via Mac → Develop → iPhone).

## Lisensi
MIT (atau sesuai pilihan Anda).
