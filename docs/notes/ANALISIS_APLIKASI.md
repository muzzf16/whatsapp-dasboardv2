# Analisis Aplikasi WhatsApp Dashboard v2

Tanggal analisis: 8 April 2026

## 1) Ringkasan arsitektur

Aplikasi ini memakai arsitektur **client-server**:
- **Frontend**: React (CRA), routing SPA, komunikasi ke backend via REST + Socket.IO.
- **Backend**: Express + Socket.IO + SQLite, dengan integrasi WhatsApp (Baileys), scheduler, AI service, dan Google Sheets.

Komponen inti:
- `client/` untuk UI dashboard admin/operator.
- `server/` untuk API, autentikasi user, orchestration WhatsApp session, scheduler, dan persistence data.

## 2) Temuan utama (prioritas tinggi)

### A. Duplikasi global error handler di backend
Di `server/index.js` terdapat pendaftaran `process.on('unhandledRejection', ...)` dan `process.on('uncaughtException', ...)` **dua kali**.

Dampak:
- Log duplikat saat error global terjadi.
- Membuat observability noise dan menyulitkan troubleshooting.

Saran:
- Hapus blok duplikat, sisakan satu handler untuk tiap event.

### B. JWT fallback secret hardcoded (`'secret'`)
Di middleware auth dan controller user, token JWT memakai fallback `process.env.JWT_SECRET || 'secret'`.

Dampak:
- Jika environment variable tidak terpasang, aplikasi tetap jalan dengan secret yang lemah/predictable.
- Risiko keamanan signifikan untuk pemalsuan token.

Saran:
- Wajibkan `JWT_SECRET` di environment, dan **fail fast** saat startup jika tidak ada.
- Rotasi secret untuk deployment existing bila pernah berjalan tanpa secret kuat.

### C. Repo state kurang sehat: `server/node_modules` ter-track
Saat inspeksi git, terlihat banyak file di `server/node_modules/` berubah/terhapus.

Dampak:
- History commit menjadi noisy.
- Konflik merge meningkat.
- Repository membengkak.

Saran:
- Pastikan `node_modules` di-`.gitignore`.
- Hentikan tracking folder dependency pada branch utama.

## 3) Temuan menengah

### D. Logging frontend terlalu verbose di production
`client/src/lib/api.js` menampilkan `console.log` hostname, port, dan API URL setiap load.

Dampak:
- Menambah noise pada console production.
- Bisa membocorkan detail endpoint secara tidak perlu.

Saran:
- Bungkus log dengan guard berbasis environment (`NODE_ENV !== 'production'`) atau hapus log debugging.

### E. CORS global longgar dibanding Socket.IO CORS
Di backend, Socket.IO CORS sudah whitelist domain spesifik, tetapi middleware `app.use(cors())` tidak diberi opsi sehingga cenderung lebih permisif.

Dampak:
- Ketidakkonsistenan kebijakan CORS antar channel komunikasi.

Saran:
- Samakan daftar origin REST API dengan daftar origin Socket.IO.

## 4) Kualitas dokumentasi

`README.md` saat ini tersimpan dengan encoding yang memunculkan karakter tidak normal saat dibaca via terminal POSIX.

Dampak:
- Sulit dibaca di beberapa tooling.

Saran:
- Simpan ulang README dalam UTF-8 tanpa BOM.

## 5) Rekomendasi eksekusi (30-60 menit)

1. Hilangkan duplikasi global error handlers di backend.
2. Enforce `JWT_SECRET` sebagai mandatory env (startup guard).
3. Rapikan logging frontend (hanya non-production).
4. Samakan konfigurasi CORS REST dengan Socket.IO.
5. Rapikan repository hygiene terkait `node_modules` tracking.

## 6) Kesimpulan

Aplikasi sudah memiliki fondasi fitur yang kuat untuk use-case operasional WhatsApp (session management, scheduler, AI, tracking). Namun ada beberapa isu keamanan dan maintainability yang sebaiknya diprioritaskan, terutama: **JWT secret policy**, **duplikasi global error handler**, dan **repo hygiene**.
