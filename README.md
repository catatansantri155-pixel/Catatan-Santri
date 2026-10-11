# Catatan Santri

Website editorial Catatan Santri dengan suasana visual Mercury: hero panorama, navigasi transparan, perpaduan gelap dan putih hangat, tombol membulat, ilustrasi, serta animasi halus.

## Deploy ke Cloudflare Pages

Pilih **Workers & Pages → Create application → Pages → Connect to Git**, lalu pilih repository ini.

| Pengaturan | Nilai |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `node scripts/build.mjs` |
| Build output directory | `dist` |
| Root directory | Kosong / root repository |
| Environment variable wajib | Tidak ada |

Tidak perlu `npm install`, API key, Bun, atau lockfile. Node bawaan Cloudflare menjalankan script build tanpa dependency. Jika pengaturan Cloudflare lama masih berisi perintah Bun/NPM, ganti dengan pengaturan di atas.

Build menghasilkan halaman artikel, metadata SEO, `robots.txt`, dan sitemap dengan origin dari `CF_PAGES_URL` yang disediakan Cloudflare. Untuk custom domain, tambahkan environment variable opsional `SITE_URL` berisi origin domain final, misalnya `https://domain-anda.com`, lalu deploy ulang. Hubungkan domain lewat menu **Custom domains** setelah deployment pertama berhasil.

Panduan resmi: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/

## Isi dan fitur

- 26 posting dan gambar sampul dari feed publik https://www.catatansantri.com/ pada 11 Oktober 2026.
- Logo PNG transparan asli yang diberikan pemilik; dipakai pada header, footer, favicon, dan halaman 404.
- Pencarian judul/isi, kategori, pengurutan, muat lebih banyak, dan simpan artikel di browser.
- Ruang baca dengan ukuran teks, progress membaca, dan berbagi lewat salin tautan, WhatsApp, serta Telegram.
- Setiap posting punya halaman HTML langsung di `/artikel/<id>/`, agar dapat dibuka tanpa JavaScript dan dibagikan.
- Facebook, Instagram, WhatsApp, YouTube, Threads, Pinterest, dan Telegram sesuai tautan publik blog.
- Halaman 404, metadata Open Graph, structured data, sitemap, robots, header keamanan, dan cache aset.
- Tampilan responsif, menu mobile, navigasi keyboard, dan pengurangan animasi sesuai pengaturan perangkat.
- Hero mengikuti scroll dengan zoom ke buku sebelum menuju bagian berikutnya; kategori bergerak perlahan dari kanan ke kiri dan berhenti saat hover/fokus.

Konten saat ini berupa snapshot blog. Arsip Telegram tidak berhasil diakses saat impor; Telegram ditautkan ke channel asli, bukan diklaim sebagai sumber posting yang diimpor. Tidak ada sinkronisasi otomatis. Artikel etalase buku menuju blog asli untuk fitur belanjanya.

## Memperbarui artikel

```bash
python3 scripts/import-blog.py
node scripts/build.mjs
node scripts/check.mjs
```

Python menggunakan standard library saja. Commit perubahan data, aset, dan halaman hasil build ke GitHub; Cloudflare akan deploy ulang dari branch `main`.

## Memeriksa website

```bash
node --check dist/app.js
node --check dist/motion.js
node scripts/build.mjs
node scripts/check.mjs
```

Untuk preview lokal, setelah build:

```bash
python3 -m http.server 8000 --directory dist
```

Buka http://localhost:8000. File deploy adalah seluruh folder `dist/`, bukan hanya `index.html`.

## Struktur

```text
dist/                  HTML, CSS, JavaScript, data, dan aset untuk deployment
dist/artikel/          Halaman artikel hasil build
scripts/build.mjs      Generate halaman statis dan metadata deployment
scripts/check.mjs      Validasi aset, data, tautan, dan halaman
scripts/import-blog.py Refresh snapshot feed Blogger
wrangler.jsonc         Konfigurasi Cloudflare Pages
```

Website tidak mengumpulkan email atau menjalankan analitik/iklan. Bookmark disimpan di browser pengunjung. Tautan eksternal mengikuti kebijakan layanan tujuan.
