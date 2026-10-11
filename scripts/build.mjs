import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const data = JSON.parse(fs.readFileSync(path.join(dist, 'posts.json'), 'utf8'));
const socials = JSON.parse(fs.readFileSync(path.join(dist, 'socials.json'), 'utf8'));
const originInput = process.env.SITE_URL || process.env.CF_PAGES_URL || '';
let origin = '';
if (originInput) {
  const parsed = new URL(originInput);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('SITE_URL must be an HTTP(S) URL.');
  origin = parsed.origin;
}
const preview = process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== 'main';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abs = value => origin ? new URL(value, origin).href : value;
const dateText = value => new Date(value + 'T12:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const socialHtml = socials.map(s => `<a class="social-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="Catatan Santri di ${esc(s.name)}"><svg viewBox="0 0 24 24" aria-hidden="true">${s.icon}</svg><span>${esc(s.name)}</span><span>↗</span></a>`).join('');
const jsonLd = value => JSON.stringify(value).replace(/</g, '\\u003c');

let home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
home = home.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(abs('/'))}">`);
home = home.replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(abs('/assets/hero.webp'))}">`);
home = home.replace(/<script type="application\/ld\+json" id="siteSchema">[\s\S]*?<\/script>/g, '');
home = home.replace('</head>', `<script type="application/ld+json" id="siteSchema">${jsonLd({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Catatan Santri', inLanguage: 'id', ...(origin ? { url: abs('/'), image: abs('/assets/hero.webp') } : {}), sameAs: socials.map(s => s.url) })}</script></head>`);
fs.writeFileSync(path.join(dist, 'index.html'), home);

const articleRoot = path.join(dist, 'artikel');
fs.mkdirSync(articleRoot, { recursive: true });
for (const [index, post] of data.posts.entries()) {
  if (!/^\d+$/.test(post.id)) throw new Error('Invalid article identifier');
  const route = `/artikel/${post.id}/`;
  const folder = path.join(articleRoot, post.id);
  fs.mkdirSync(folder, { recursive: true });
  const description = post.excerpt.slice(0, 160);
  const image = abs('/' + post.image);
  const schema = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, datePublished: post.date, inLanguage: 'id', author: { '@type': 'Organization', name: 'Catatan Santri' }, ...(origin ? { url: abs(route), image, mainEntityOfPage: abs(route) } : {}) };
  const prev = data.posts[index - 1];
  const next = data.posts[index + 1];
  const navigation = `<nav class="article-navigation" aria-label="Artikel lainnya">${prev ? `<a href="/artikel/${prev.id}/">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="/artikel/${next.id}/">${esc(next.title)} →</a>` : ''}</nav>`;
  const body = post.category === 'Buku Pilihanmu' ? '<p>Pilihan buku dari Catatan Santri dapat kamu jelajahi di etalase blog kami. Buka halaman asli untuk melihat daftar buku dan tautan produknya.</p>' : post.html;
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#171821"><title>${esc(post.title)} — Catatan Santri</title><link rel="canonical" href="${esc(abs(route))}"><link rel="icon" href="/assets/logo.png" type="image/png"><link rel="stylesheet" href="/style.css"><meta property="og:type" content="article"><meta property="og:locale" content="id_ID"><meta property="og:title" content="${esc(post.title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:image" content="${esc(image)}"><meta property="og:url" content="${esc(abs(route))}"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${jsonLd(schema)}</script></head><body class="standalone-article"><a class="skip" href="#articleBody">Langsung ke artikel</a><header class="header"><a class="brand" href="/"><img src="/assets/logo.png" width="42" height="42" alt="Logo Catatan Santri"><span>CATATAN SANTRI</span></a><a class="pill primary" href="/#catatan">Semua catatan ↗</a></header><main><article class="reader-article"><div class="eyebrow">${esc(post.category)}</div><h1>${esc(post.title)}</h1><div class="reading-meta">Catatan Santri · ${dateText(post.date)} · ${post.minutes} menit baca</div><img class="reader-image" src="/${esc(post.image)}" alt="${esc(post.title)}"><div class="reader-body" id="articleBody">${body}</div><div class="reader-end"><span>✳</span><h3>Terima kasih sudah singgah.</h3><p>Semoga ada sesuatu yang bisa kamu bawa pulang.</p><a class="text-link" href="${esc(post.url)}" target="_blank" rel="noopener noreferrer">Baca di blog asli ↗</a><a class="pill primary" href="https://t.me/Catatansantriii" target="_blank" rel="noopener noreferrer">Gabung Telegram ↗</a></div>${navigation}</article></main><footer class="simple-footer"><div class="social-links" style="justify-content:center;margin-bottom:25px">${socialHtml}</div>© ${new Date().getFullYear()} Catatan Santri. <a href="/">Kembali ke beranda ↑</a></footer></body></html>`;
  fs.writeFileSync(path.join(folder, 'index.html'), html);
}

fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\n${preview ? 'Disallow: /' : 'Allow: /'}\n${origin && !preview ? 'Sitemap: ' + abs('/sitemap.xml') + '\n' : ''}`);
if (origin) {
  const entries = [{ route: '/', date: data.importedAt.slice(0, 10) }, ...data.posts.map(p => ({ route: `/artikel/${p.id}/`, date: p.date }))];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(e => `<url><loc>${esc(abs(e.route))}</loc><lastmod>${e.date}</lastmod></url>`).join('')}</urlset>\n`;
  fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml);
} else if (fs.existsSync(path.join(dist, 'sitemap.xml'))) fs.unlinkSync(path.join(dist, 'sitemap.xml'));
console.log(`Built ${data.posts.length} static article pages, social links, SEO metadata, and robots.txt${origin ? ', plus sitemap.xml for ' + origin : '. Cloudflare supplies CF_PAGES_URL during deployment'}.`);
