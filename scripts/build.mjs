import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderArticle, renderAbout, renderProfile, renderSitemap } from '../lib/render.mjs';
import { syncBlog } from './sync-blog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
if (process.env.CF_PAGES_URL) await syncBlog({strict:false});
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
home = home.replace(/(<strong id="totalStat">).*?(<\/strong>)/, (_m,a,b)=>a+data.posts.length+b).replace(/(<strong id="categoryStat">).*?(<\/strong>)/, (_m,a,b)=>a+new Set(data.posts.flatMap(p=>p.categories?.length?p.categories:[p.category])).size+b);
home = home.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(abs('/'))}">`);
home = home.replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(abs('/assets/hero.webp'))}">`);
home = home.replace(/<script type="application\/ld\+json" id="siteSchema">[\s\S]*?<\/script>/g, '');
home = home.replace('</head>', `<script type="application/ld+json" id="siteSchema">${jsonLd({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Catatan Santri', inLanguage: 'id', ...(origin ? { url: abs('/'), image: abs('/assets/hero.webp') } : {}), sameAs: socials.map(s => s.url) })}</script></head>`);
home = home.replace(/<div id="profileContent">[\s\S]*?<!-- profile-end -->/, '<div id="profileContent">' + renderProfile() + '</div><!-- profile-end -->');
fs.writeFileSync(path.join(dist, 'index.html'), home);
fs.mkdirSync(path.join(dist,'tentang'),{recursive:true});
fs.writeFileSync(path.join(dist,'tentang/index.html'),renderAbout(origin));

const articleRoot = path.join(dist, 'artikel');
fs.mkdirSync(articleRoot, { recursive: true });
const retainedIds = new Set(data.posts.map(p=>p.id));
for (const id of fs.readdirSync(articleRoot)) if (/^\d+$/.test(id) && !retainedIds.has(id)) fs.rmSync(path.join(articleRoot,id),{recursive:true});
for (const [index, post] of data.posts.entries()) {
  if (!/^\d+$/.test(post.id)) throw new Error('Invalid article identifier');
  const route = `/artikel/${post.id}/`;
  const folder = path.join(articleRoot, post.id);
  fs.mkdirSync(folder, { recursive: true });
  const html = renderArticle(post, data.posts, origin);
  fs.writeFileSync(path.join(folder, 'index.html'), html);
}

fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\n${preview ? 'Disallow: /' : 'Allow: /'}\n${origin && !preview ? 'Sitemap: ' + abs('/sitemap.xml') + '\n' : ''}`);
if (origin) {
  const xml = renderSitemap(data,origin);
  fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml);
} else if (fs.existsSync(path.join(dist, 'sitemap.xml'))) fs.unlinkSync(path.join(dist, 'sitemap.xml'));
console.log(`Built ${data.posts.length} static article pages, social links, SEO metadata, and robots.txt${origin ? ', plus sitemap.xml for ' + origin : '. Cloudflare supplies CF_PAGES_URL during deployment'}.`);
