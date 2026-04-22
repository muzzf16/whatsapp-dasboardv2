# Banking Messaging Readiness

Tanggal analisis: 22 April 2026

Dokumen ini merangkum kesiapan aplikasi WhatsApp Dashboard v2 untuk kebutuhan pengiriman pesan dengan standar operasional yang lebih dekat ke lingkungan perbankan. Ini bukan sertifikasi kepatuhan hukum/regulator, tetapi baseline teknis untuk mengurangi risiko akses tidak sah, kebocoran data, kesalahan pengiriman, dan kurangnya audit trail.

## Ringkasan Risiko

Prioritas tertinggi untuk aplikasi messaging perbankan:

1. Semua fitur operasional harus berada di balik autentikasi.
2. Realtime channel tidak boleh membocorkan pesan kepada client tanpa token valid.
3. Data rahasia seperti API key, token, webhook secret, file upload, dan isi pesan mentah tidak boleh terekspos default.
4. Nomor tujuan, session id, URL webhook, jadwal, dan upload harus tervalidasi.
5. Aksi mutasi data harus tercatat dalam audit log.
6. Self-registration publik harus dibatasi agar akun operator dibuat lewat admin.
7. AI/auto-reply harus memiliki guardrail agar tidak meminta atau memproses PIN, OTP, CVV, password, atau kredensial lain.

## Analisis Per Fitur

### Autentikasi dan User Management

Status setelah hardening:
- JWT wajib ada di environment saat startup.
- Token diterima via `Authorization: Bearer` dan `x-auth-token`.
- Login/register diberi rate limit sederhana berbasis IP.
- Register publik hanya untuk bootstrap user pertama, kecuali `ALLOW_PUBLIC_REGISTRATION=true`.
- User pertama otomatis menjadi admin.
- Role operasional kini mendukung `viewer`, `operator`, `supervisor`, dan `admin`.
- Password baru minimal 12 karakter dan wajib mengandung huruf besar, huruf kecil, dan angka.
- Admin tidak bisa menghapus akun sendiri.
- Mutasi user dicatat di `audit_logs`.

Gap lanjutan:
- Belum ada MFA/2FA.
- Belum ada session revocation/token blacklist.
- Belum ada password expiry atau device/session management.

### WhatsApp Session Management

Status setelah hardening:
- Semua endpoint WhatsApp wajib login.
- `connectionId` dibatasi ke pola aman: huruf, angka, underscore, dash, 3-64 karakter.
- Direktori auth session dibuat dari path aman berbasis server, bukan path bebas dari input user.
- Start, disconnect, reinit, send, broadcast, dan update webhook tercatat di audit log.

Gap lanjutan:
- Belum ada approval workflow untuk membuat atau menghapus session.
- Belum ada pemetaan session ke unit kerja/cabang.

### Pengiriman Pesan dan Broadcast

Status setelah hardening:
- Nomor tujuan dinormalisasi ke digit dan divalidasi panjangnya.
- Pesan teks dibatasi maksimal 4096 karakter.
- Delay broadcast dibatasi 1 detik sampai 10 menit.
- Error internal tidak lagi dikirim sebagai `details` ke client.

Gap lanjutan:
- Broadcast kini dapat melewati maker-checker: operator hanya bisa mengajukan, supervisor/admin dapat menyetujui.
- Batas harian kini diterapkan per operator dan per session, dengan limit campaign per request yang bisa diatur lewat environment.
- Belum ada deduplikasi campaign dan suppression list.
- Contact opt-out kini disimpan dan ditegakkan di jalur kirim utama, termasuk send manual, broadcast, dan scheduler.

### Scheduler dan Excel Upload

Status setelah hardening:
- Endpoint scheduler wajib login.
- Jadwal manual wajib memakai waktu valid dan masa depan.
- Upload Excel dibatasi ukuran dan MIME type.
- Nomor dari Excel dinormalisasi sebelum dijadwalkan.
- Response error upload tidak lagi mengirim stack trace.

Gap lanjutan:
- Import Excel dan sync Google Sheets kini dapat melewati maker-checker: operator mengajukan, supervisor/admin menyetujui.
- Belum ada dry-run import dengan daftar baris gagal.
- Belum ada kontrol time window, misalnya hanya mengirim pada jam operasional.

### AI dan Auto-Reply

Status setelah hardening:
- Endpoint AI config dan upload auto-reply wajib login.
- API key tidak dikirim balik ke frontend dalam bentuk asli.
- Konfigurasi AI yang tersimpan tidak tertimpa oleh placeholder `********`.
- Fungsi model AI yang hilang sudah dipulihkan.
- Prompt default melarang permintaan PIN, OTP, CVV, password, kode akses, dan data sensitif penuh.
- Pesan yang mengandung istilah kredensial sensitif dibalas dengan peringatan keamanan, bukan diteruskan ke AI biasa.
- Log tool AI tidak lagi mencetak argumen dan hasil yang berpotensi memuat data nasabah.

Gap lanjutan:
- Belum ada human handoff untuk eskalasi keluhan atau sengketa.
- Belum ada policy engine untuk klasifikasi pesan sensitif.
- Belum ada evaluasi berkala output AI terhadap standar komunikasi bank.

### Webhook

Status setelah hardening:
- Konfigurasi webhook wajib login.
- URL webhook wajib HTTPS, kecuali localhost untuk development.
- Webhook signature HMAC tetap dipertahankan jika secret tersedia.
- Payload WhatsApp mentah tidak dikirim default; aktif hanya bila `WEBHOOK_INCLUDE_ORIGINAL_MESSAGE=true`.
- Request webhook diberi timeout.

Gap lanjutan:
- Perubahan webhook kini dapat melewati maker-checker: operator mengajukan, supervisor/admin menyetujui.
- Belum ada rotasi secret dan riwayat secret.
- Belum ada retry queue persisten untuk webhook gagal.
- Belum ada allowlist domain webhook.

### File Manager dan Upload

Status setelah hardening:
- File manager wajib login.
- Static `/uploads` tidak lagi publik tanpa autentikasi.
- Download file melalui route terlindungi.
- Filename disanitasi dan diberi UUID.
- Upload dibatasi ke tipe umum yang lebih aman; SVG/HTML/JS tidak diterima.

Gap lanjutan:
- Belum ada antivirus/malware scanning.
- Belum ada enkripsi file at rest.
- Payload approval dan log operasional kini memiliki retensi otomatis dasar, tetapi upload bisnis utama belum memiliki lifecycle policy terpisah.

### Realtime Socket

Status setelah hardening:
- Socket.IO wajib menerima JWT valid pada handshake.
- Frontend mengirim token melalui `auth`.
- Event realtime hanya dibuka setelah user terautentikasi.

Gap lanjutan:
- Belum ada room-level authorization per session/cabang.
- Belum ada reconnect policy berbasis refresh token.

### Audit Trail

Status setelah hardening:
- Tabel `audit_logs` ditambahkan.
- Request mutasi POST/PUT/PATCH/DELETE pada fitur utama dicatat.
- Metadata audit meredaksi key sensitif seperti password, token, secret, apiKey, authorization, dan base64.
- Approval queue untuk aksi sensitif disimpan di tabel `approval_requests`.

Gap lanjutan:
- Audit log kini memiliki retensi otomatis dasar, tetapi belum immutable.
- Belum ada export audit untuk tim compliance.
- Belum ada alerting untuk aksi berisiko tinggi.

### Limit dan Retensi Data

Status setelah hardening:
- Outgoing message kini menyimpan metadata pengirim operasional (`initiated_by_user_id`) dan sumber pengiriman (`manual`, `broadcast`, `approval`, `scheduler`).
- Endpoint pengiriman menyediakan status kuota harian per user dan per session untuk ditampilkan di UI operator.
- Broadcast dibatasi jumlah penerima per request agar campaign terlalu besar tidak bisa lolos dari endpoint utama.
- Scheduler kini membawa identitas pembuat jadwal; saat limit harian habis, pesan one-time akan dijadwal ulang ke hari berikutnya.
- Retensi dasar otomatis dijalankan saat startup dan setiap 24 jam untuk `messages`, `audit_logs`, approval yang sudah direview, file payload approval, dan log operasional.

Gap lanjutan:
- Retensi belum dibedakan per jenis data nasabah, unit kerja, atau kebutuhan investigasi.
- Belum ada legal hold / exception policy untuk audit atau bukti sengketa.
- Belum ada arsip jangka panjang ke storage terpisah sebelum purge.

### Dependency Security

Status setelah hardening:
- `npm audit fix` non-breaking sudah dijalankan untuk backend.
- `@whiskeysockets/baileys` diturunkan dari release candidate `7.0.0-rc.9` ke versi stabil `6.7.21` karena rc.9 gagal load saat runtime.
- Dependency `code` dihapus karena tidak dipakai dan membawa vulnerability transitive.

Risiko tersisa dari `npm audit --omit=dev`:
- `sqlite3` masih membawa vulnerability transitive melalui `node-gyp`/`tar`; fix yang tersedia membutuhkan breaking change ke `sqlite3@6`.
- `xlsx` masih memiliki advisory high dan tidak tersedia fix resmi di paket yang sama.

Rekomendasi:
- Evaluasi migrasi dari `xlsx` ke parser spreadsheet yang masih aktif dipelihara atau isolasi proses parsing upload.
- Uji kompatibilitas `sqlite3@6` di branch terpisah sebelum upgrade.

## Environment Flag Penting

- `JWT_SECRET`: wajib, gunakan secret kuat.
- `JWT_EXPIRES_IN`: default `8h`.
- `ALLOW_PUBLIC_REGISTRATION`: default tertutup setelah user pertama.
- `CORS_ORIGINS`: daftar origin frontend dipisah koma.
- `DEBUG_INCOMING_MESSAGES`: default mati. Jika `true`, hanya metadata minimal yang ditulis.
- `WEBHOOK_INCLUDE_ORIGINAL_MESSAGE`: default mati agar payload mentah WhatsApp tidak bocor.
- `ROLE_DAILY_SEND_LIMIT_VIEWER|OPERATOR|SUPERVISOR|ADMIN`: batas kirim harian per role.
- `SESSION_DAILY_SEND_LIMIT`: batas kirim harian per session WhatsApp.
- `CAMPAIGN_RECIPIENT_LIMIT`: batas jumlah penerima per request broadcast/batch.
- `MESSAGE_RETENTION_DAYS`, `AUDIT_LOG_RETENTION_DAYS`, `APPROVAL_RETENTION_DAYS`, `OPERATIONAL_LOG_RETENTION_DAYS`: retensi dasar data operasional.

## Rekomendasi Tahap Berikutnya

1. Enkripsi database dan file upload at rest.
2. Tambahkan MFA untuk admin dan operator.
3. Jadikan audit log append-only dan kirim ke sistem logging terpusat.
4. Tambahkan maker-checker untuk lifecycle session WhatsApp dan template approval yang lebih granular.
5. Tambahkan policy exception seperti legal hold, e-discovery export, dan retention override.
6. Tambahkan deduplikasi campaign, quiet hours, dan suppression list lanjutan.
