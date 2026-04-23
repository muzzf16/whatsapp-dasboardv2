# Plan UI WhatsApp-Like untuk Tab WhatsApp

## Summary
Ubah hanya tab `WhatsApp` menjadi pengalaman chat-first seperti WhatsApp Web: daftar percakapan di kiri, ruang chat aktif di kanan, header kontak/session di atas, area bubble bermotif ringan, dan composer bawah. Branding dibuat “mirip rasa WhatsApp” tanpa meniru logo/nama resmi secara dominan. Data chat berasal dari `messages` dan `outgoingMessages` yang sudah ada, dikelompokkan berdasarkan nomor/JID, jadi tidak perlu endpoint backend baru.

## Key Changes
- Ganti layout `activeTab === 'whatsapp'` di `Dashboard.js` dari form sender + message log menjadi 2-pane messenger:
  - Left pane: search, filter chip, daftar chat hasil grouping message logs, unread badge sederhana, preview pesan terakhir, waktu terakhir.
  - Right pane: selected conversation header, status koneksi/session, action icons visual, message thread gabungan incoming/outgoing, composer bawah.
  - Empty state bila belum ada chat atau belum memilih conversation.
- Tambahkan state UI di `Dashboard.js`:
  - `selectedConversationId`, `conversationSearch`, dan helper memoized untuk `conversations` + `activeThread`.
  - Saat user klik chat, `sendTo` otomatis diisi dari nomor conversation.
  - Tombol “new chat” membuka mode nomor manual sederhana di composer/sidebar agar kemampuan kirim ke nomor baru tetap ada.
- Refactor presentasi pesan:
  - Incoming bubble di kiri warna putih.
  - Outgoing bubble di kanan warna hijau muda.
  - Timestamp kecil di bawah kanan bubble.
  - File/media tampil sebagai attachment bubble, bukan card log.
  - Pesan tetap memakai data existing: incoming `{from/sender, pushName, text, timestamp}` dan outgoing `{to, text, file, timestamp}`.
- Styling:
  - Buat visual penuh viewport di tab WhatsApp tanpa card besar di dalam card.
  - Palette netral WhatsApp-like: putih, abu muda, hijau muted, border halus.
  - Background chat memakai pattern CSS/subtle texture ringan, bukan logo WhatsApp.
  - Avatar pakai initials/warna deterministik dari nama/nomor.
  - Mobile: left pane menjadi daftar chat utama; membuka chat menampilkan thread penuh dengan tombol back.

## Public Interface / Data Flow
- Tidak ada perubahan API backend.
- Tidak ada perubahan schema database.
- `handleSendMessage` tetap dipakai, tetapi composer baru mengirim ke `sendTo` yang berasal dari selected conversation atau input nomor baru.
- `onReply` tidak lagi menjadi action tersembunyi di card log; klik conversation dan composer adalah flow utama.
- `MessageLog` dan `MessageSender` boleh tetap ada untuk fitur lain/compat, tetapi tab WhatsApp memakai komponen baru atau helper lokal baru seperti `WhatsAppChatView`.

## Test Plan
- Jalankan `npm run build` di `client`.
- Verifikasi manual desktop:
  - Tab WhatsApp menampilkan list conversation dari incoming/outgoing logs.
  - Klik conversation membuka thread gabungan dengan bubble kiri/kanan.
  - Kirim pesan dari conversation aktif memakai nomor yang benar.
  - Search memfilter nama/nomor/preview.
  - Koneksi disconnected membuat composer disabled.
- Verifikasi manual mobile width:
  - Daftar chat tidak pecah.
  - Klik chat masuk ke layar thread.
  - Tombol back kembali ke daftar.
  - Composer tetap terlihat dan tidak menutup bubble terakhir.
- Regression check:
  - Dashboard, Tools, Account Manager, Contacts, File Manager, dan User Management tetap memakai layout lama.
  - Socket realtime `new_message` dan `new_outgoing_message` tetap menambah pesan ke conversation aktif.

## Assumptions
- Scope hanya tab `WhatsApp`, sesuai pilihan.
- Daftar chat dibuat dari message logs, bukan contacts.
- Visual mengejar rasa WhatsApp real, tetapi tetap memakai branding netral aplikasi agar tidak terlihat sebagai clone resmi.
- Tidak menambah dependency UI baru; cukup React, Tailwind, dan lucide-react yang sudah ada.
- Jika tidak ada riwayat pesan, UI tetap menyediakan new chat/manual number agar operator bisa mulai percakapan.
