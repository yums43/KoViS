# KoVIS — Sistem Pengurusan Pelawat

Aplikasi web KoVIS untuk Kolej Komuniti Bentong. Antara muka Bahasa Melayu, pangkalan data Cloudflare D1 dan aliran permohonan lawatan untuk pelawat, pengawal dan pentadbir.

## Teknologi

- Next.js/Vinext + React + TypeScript
- Cloudflare Workers dan D1 (SQLite)
- Drizzle ORM; skema di `db/schema.ts`, migrasi SQL di `drizzle/`
- Identiti akaun melalui penyedia ChatGPT Sites. Akaun yang mendaftar awam sentiasa diberi peranan pelawat.

GitHub Pages hanya menyediakan fail statik dan tidak boleh menjalankan endpoint, pangkalan data atau sesi KoVIS. Gunakan GitHub sebagai repositori sumber dan Workers/D1 sebagai backend. Tiada integrasi berbayar diperlukan untuk demo; hosting produksi bergantung pada akaun/kuota penyedia Cloudflare dan identiti yang dipilih.

## Jalankan setempat

Keperluan: Node.js 22.13+, pnpm 11+, dan akaun Sites yang boleh menyediakan D1 serta login ChatGPT.

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Untuk preview pembangunan dalam persekitaran Sites:

```sh
sites-preview start .
```

Konfigurasi binding D1 ialah `DB` melalui `.openai/hosting.json` dan `wrangler.json` yang dijana semasa build. Jangan letakkan token atau kata laluan dalam fail frontend. `.env.example` menunjukkan bentuk konfigurasi tanpa sebarang rahsia.

## Pemasangan database

Fail migrasi awal: `drizzle/0000_nervous_roxanne_simpson.sql`. Dalam persekitaran Workers, jalankan migrasi D1 dengan Wrangler menggunakan binding `DB`. Simpan database produksi berasingan daripada database `--local` untuk preview.

## Pentadbir pertama

Buka laman menggunakan akaun pemilik Sites. Pada skrin awal, pilih **Sediakan sistem** dan sahkan identiti anda. Semasa persediaan ini, akses laman mesti kekal peribadi kepada pemilik sahaja; endpoint bootstrap menggunakan sempadan akses peribadi itu dan hanya berfungsi sekali. Jangan buka akses awam sebelum pentadbir pertama berjaya disediakan. Selepas itu, pentadbir boleh mencipta akaun pengawal. Pendaftaran awam tidak boleh menetapkan peranan petugas.

Untuk demo tanpa login, halaman utama memaparkan data rekaan baca sahaja. Pentadbir boleh memuatkan seed demo ke ruang demo; dataset `demo` disimpan berasingan daripada `live`.

## Aliran

1. Pelawat login/daftar, kemas kini profil dan hantar permohonan; nombor rujukan dijana server.
2. Pengawal menyemak permohonan dan meluluskan atau menolak dengan sebab.
3. Pelawat membuat Check-In selepas diluluskan dan Check-Out selepas urusan.
4. Pengawal boleh merekod tindakan bantuan dengan sebab wajib; setiap perubahan ditulis ke sejarah status dan audit.
5. Dashboard dikemas kini melalui polling 15 saat; laporan boleh ditapis, dieksport CSV atau dicetak.

Semua timestamp disimpan dalam UTC dan dipaparkan menggunakan Asia/Kuala_Lumpur. QR pintu hanya membuka laman. Kelulusan dan rekod kehadiran memerlukan tindakan berasingan.

## GitHub dan penerbitan

Simpan keseluruhan repositori ini ke GitHub. Untuk penerbitan fungsi penuh, gunakan target yang menyokong Workers/D1 dan pembekal identiti yang sama. GitHub Pages tidak sesuai untuk backend KoVIS. Pastikan secrets kekal dalam tetapan hosting dan database produksi tidak dimasukkan ke Git.

## Had semasa

- Login memerlukan identiti ChatGPT Sites pada versi ini; tiada login e-mel/kata laluan kendiri.
- Kelulusan petugas menggunakan jadual lawatan dan waktu operasi; lawatan aktif tidak ditutup automatik.
- Polisi retention disimpan sebagai tetapan; tiada pemadaman automatik rekod.

## Verifikasi

`pnpm test` menjalankan handler API sebenar dengan migrasi SQLite dan identiti platform yang dimock. Ujian meliputi semua peralihan lawatan, akses pemilikan, pendaftaran peranan tetap, sekatan pengawal, tindakan bantuan, kadar permintaan, persaingan Check-In, tamat tempoh, dataset demo, audit, penapisan CSV dan rekod selepas restart. Login ChatGPT sebenar perlu disahkan melalui laman yang diterbitkan.
