import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const data = JSON.parse(fs.readFileSync(path.join(root, 'posts.json'), 'utf8'));
const socials = JSON.parse(fs.readFileSync(path.join(root, 'socials.json'), 'utf8'));
assert(Array.isArray(data.posts), 'Invalid imported posts');
assert.equal(new Set(data.posts.map(p => p.id)).size, data.posts.length, 'Duplicate post IDs');
assert.equal(socials.length, 7, 'Expected seven social platforms');
assert.equal(new Set(socials.map(s => s.name)).size, 7);
for (const s of socials) assert(new URL(s.url).protocol === 'https:');
for (const p of data.posts) {
  assert(p.title && p.text && p.html && p.category && p.minutes > 0, `Incomplete post: ${p.id}`);
  assert(p.url.startsWith('https://www.catatansantri.com/'), `Unexpected source: ${p.id}`);
  assert(!/<(?:script|iframe|style)\b|onerror=|javascript:/i.test(p.html), `Unsafe imported content: ${p.id}`);
  if(p.image.startsWith('https://')) assert(/^https:\/\/(?:blogger\.googleusercontent\.com|\d+\.bp\.blogspot\.com|lh\d+\.googleusercontent\.com)\//.test(p.image), `Unexpected image: ${p.id}`);
  else assert(fs.existsSync(path.join(root, p.image)), `Missing cover: ${p.id}`);
  assert(fs.existsSync(path.join(root, 'artikel', p.id, 'index.html')), `Missing article page: ${p.id}`);
}
function files(folder) { return fs.readdirSync(folder, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(folder, e.name)) : [path.join(folder, e.name)]); }
const htmlFiles = files(root).filter(p => p.endsWith('.html'));
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, `Duplicate HTML IDs: ${file}`);
  assert(html.includes('lang="id"'), `Missing language: ${file}`);
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const url = match[1];
    if (/^(https?:|mailto:|data:|#)/.test(url) || url === '/') continue;
    const localPath = decodeURIComponent(url.split('#')[0].split('?')[0]);
    if (!localPath) continue;
    const target = url.startsWith('/') ? path.resolve(root, '.' + localPath) : path.resolve(path.dirname(file), localPath);
    assert(target.startsWith(root + path.sep) || target === root, `Asset leaves output: ${url}`);
    assert(fs.existsSync(target), `Missing local destination: ${url} in ${file}`);
  }
}
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
for (const m of js.matchAll(/\$\('#([\w-]+)'\)/g)) assert(home.includes(`id="${m[1]}"`), `Script references missing element ${m[1]}`);
assert(home.includes('56512') && home.includes('VISI KAMI') && home.includes('MISI KAMI'), 'Organization profile missing');
assert(fs.existsSync(path.join(root,'tentang/index.html')), 'About page missing');
assert(home.includes('assets/logo.png'), 'Supplied logo missing');
assert(!home.includes('chatgpt.site'), 'Old hosting metadata remains');
for (const s of socials) assert(home.includes(s.url), `Social destination missing: ${s.name}`);
console.log(`PASS: ${data.posts.length} posts, ${htmlFiles.length} HTML pages, seven social destinations, assets, safe imports, and script element references.`);
