# Catatan Santri

Website editorial Catatan Santri: panorama dengan zoom ke buku saat scroll, perpaduan gelap dan putih hangat, kategori bergerak perlahan, serta ruang baca yang mengikuti blog.

## Deploy ke Cloudflare Pages

Hubungkan repository ini melalui Git integration Cloudflare Pages.

| Pengaturan | Nilai |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `node scripts/build.mjs` |
| Build output directory | `dist` |
| Root directory | Kosong / root repository |
| Environment variable wajib | Tidak ada |

Tidak perlu instalasi dependency, API key, database, Bun, atau lockfile. Folder `functions/` harus tetap berada di root repository; Cloudflare akan memasukkannya saat deployment Git. Mengunggah folder `dist/` saja melalui dashboard tidak mengaktifkan Functions. Deploy ulang dari GitHub setelah perubahan ini agar pembaruan langsung aktif.

Untuk domain sendiri, tambahkan environment variable opsional `SITE_URL` berisi origin domain final, lalu hubungkan lewat menu Custom domains. Sitemap dinamis mengikuti domain yang dipakai pengunjung. Preview deployment memakai robots yang melarang pengindeksan.

Panduan resmi: https://developers.cloudflare.com/pages/functions/get-started/

## Pembaruan isi otomatis

- `/api/blog` membaca seluruh feed publik https://www.catatansantri.com/, termasuk pagination; tanpa akun atau API key.
- Data blog disimpan di cache Cloudflare selama 10 menit. Beranda memeriksa saat dibuka, setiap 5 menit selama tab aktif, ketika kembali ke tab, dan setelah koneksi kembali online.
- Biasanya perubahan terlihat dalam sekitar 10–15 menit saat blog tersedia dan website dikunjungi. Ini bukan jadwal cron yang berjalan ketika website tidak dikunjungi.
- Artikel baru, revisi judul/isi/gambar, kategori baru, dan artikel yang dihapus mengikuti feed. Pilihan bacaan memuat tulisan terbaru dan pilihan yang berganti setiap hari; pengingat diambil dari kutipan isi blog saat ini.
- `/artikel/<id>/` menghasilkan halaman langsung dari feed. Artikel baru dapat dibagikan sebelum build berikutnya. `/sitemap.xml` juga mengikuti daftar artikel terbaru.
- Pembaruan ditunda selama ruang baca terbuka agar tidak mengganti teks saat pengunjung sedang membaca.
- Jika blog gagal diakses, website memakai snapshot yang tersimpan. Snapshot diperbarui saat build Cloudflare; halaman statis tetap tersedia sebagai cadangan.

Functions hanya berjalan di API blog, halaman artikel, dan sitemap; halaman/aset lain tetap statis. Permintaan Functions mengikuti kuota akun Cloudflare. Tidak ada sinkronisasi arsip Telegram; channel tetap ditautkan.

## Profil dan alamat

Tentang Kami, Siapa Kami, Visi–Misi, dan alamat ada di beranda serta `/tentang/`. Teks profil dan draf visi–misi disusun dari pengenalan publik di blog. Alamat diberikan langsung oleh pemilik; tombol Google Maps menggunakan pencarian alamat tersebut, bukan koordinat yang diasumsikan.

Edit `lib/site.mjs` untuk mengubah profil/alamat. Profil ini merupakan konten editorial tetap, terpisah dari pembaruan artikel blog.

## Fitur lainnya

Logo asli pemilik, tujuh media sosial dari blog, pencarian, filter kategori, pengurutan, bookmark browser, ukuran teks, progress membaca, berbagi WhatsApp/Telegram, halaman 404, metadata SEO, dan pengurangan animasi sesuai pengaturan perangkat. Artikel etalase buku menuju blog asli untuk fitur belanjanya.

## Memperbarui snapshot manual

```bash
node scripts/sync-blog.mjs
node scripts/build.mjs
node scripts/check.mjs
```

Perintah lama `python3 scripts/import-blog.py` tetap tersedia sebagai wrapper untuk script Node yang sama. Pembaruan langsung di website tidak memerlukan commit manual setiap kali blog berubah.

## Pemeriksaan

```bash
node --check dist/app.js
node --check dist/motion.js
node --test tests/*.test.mjs
node scripts/build.mjs
node scripts/check.mjs
```

Preview statis: `python3 -m http.server 8000 --directory dist`. Untuk pengujian Functions lokal gunakan Wrangler Pages; server Python hanya menampilkan snapshot.

## Struktur

```text
dist/                   Halaman statis, CSS, JS, data cadangan, dan aset
functions/api/blog.js    Endpoint pembaruan isi
functions/artikel/      Halaman artikel langsung
functions/sitemap.xml.js Sitemap dinamis
lib/blog.mjs            Impor, sanitasi, pagination, cache, dan fallback
lib/render.mjs          Renderer halaman yang dipakai build dan Functions
lib/site.mjs            Profil, alamat, visi–misi, dan media sosial
scripts/sync-blog.mjs    Refresh snapshot
scripts/build.mjs        Build Cloudflare dan halaman cadangan
tests/                  Pemeriksaan sinkronisasi, renderer, dan interaksi
```

Website tidak mengumpulkan email atau menjalankan analitik/iklan. Bookmark disimpan di browser pengunjung. Tautan eksternal mengikuti kebijakan layanan tujuan.
