# [Issue] Refactor UX Menu Tools pada semua tab agar konsisten

## Ringkasan
UI/UX pada area **Tools** (Broadcast, Schedule, Webhook, AI Config) perlu diseragamkan agar konsisten, mudah dipahami user, dan mudah dipelihara oleh developer baru.

## Latar belakang
Saat ini setiap tab tools memiliki gaya dan alur yang berbeda-beda sehingga:
- pengguna perlu adaptasi ulang saat pindah tab,
- maintainability rendah karena logic/visual tidak tersentralisasi,
- onboarding junior programmer lebih lambat.

## Problem Statement
1. Navigasi sub-tab Tools belum sepenuhnya terstandar.
2. Informasi konteks tab aktif belum selalu jelas bagi user.
3. Dokumentasi in-code untuk junior masih minim di bagian layout/tools flow.

## Dampak
- UX tidak konsisten antar fitur.
- Potensi bug meningkat saat penambahan tab baru.
- Waktu pengembangan bertambah untuk perubahan kecil.

## Scope
- Dashboard tab `tools`.
- Struktur metadata tab tools.
- Komentar kode pada area layout/sidebar/dashboard tools flow.

## Out of Scope
- Perubahan logic backend API.
- Perombakan total desain komponen internal di tiap tab tools.

## Acceptance Criteria
- [ ] Semua sub-tab Tools menggunakan konfigurasi metadata yang sama (id, label, icon, description).
- [ ] Tab navigation responsif dan tetap usable di mobile (horizontal scroll / wrap yang jelas).
- [ ] Ada deskripsi tab aktif yang membantu user memahami fungsi tab.
- [ ] Komentar kode tambahan tersedia di area kritikal untuk membantu junior programmer.
- [ ] Build frontend sukses tanpa error blocking.

## Task Breakdown
1. Centralize tools tab metadata.
2. Refactor tab header + active state.
3. Tambahkan helper comments di `Layout`, `MainSidebar`, dan `Dashboard`.
4. Jalankan build dan dokumentasikan warning yang masih existing.

## Risiko
- Perubahan style dapat memengaruhi spacing komponen lama.
- Potensi regresi minor pada breakpoint mobile.

## Catatan QA
- Uji manual perpindahan semua tools tab.
- Uji mobile viewport (drawer + tools tab nav).
- Uji status aktif tab, icon, dan deskripsi tab.
