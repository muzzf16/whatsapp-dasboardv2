---
name: "Tools Menu Refactor"
about: "Refactor UX menu Tools agar konsisten di semua tab"
title: "[Tools] Refactor UX menu di semua tab"
labels: ["frontend", "ui-ux", "enhancement"]
assignees: []
---

## Ringkasan
UI/UX pada area **Tools** (Broadcast, Schedule, Webhook, AI Config) perlu diseragamkan agar konsisten, mudah dipahami user, dan mudah dipelihara oleh developer baru.

## Problem Statement
- Navigasi sub-tab Tools belum sepenuhnya terstandar.
- Informasi konteks tab aktif belum selalu jelas bagi user.
- Dokumentasi in-code untuk junior masih minim di layout/tools flow.

## Scope
- Dashboard tab `tools`
- Struktur metadata tab tools
- Komentar kode pada area layout/sidebar/dashboard tools flow

## Acceptance Criteria
- [ ] Semua sub-tab Tools menggunakan konfigurasi metadata yang sama (`id`, `label`, `icon`, `description`)
- [ ] Tab navigation responsif dan tetap usable di mobile
- [ ] Ada deskripsi tab aktif untuk membantu user
- [ ] Komentar kode tambahan tersedia di area kritikal
- [ ] Build frontend sukses tanpa error blocking

## QA Checklist
- [ ] Uji manual perpindahan semua tools tab
- [ ] Uji mobile viewport (drawer + tools tab nav)
- [ ] Uji status aktif tab, icon, dan deskripsi tab
