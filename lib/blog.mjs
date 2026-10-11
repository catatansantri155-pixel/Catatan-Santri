export const BLOG = 'https://www.catatansantri.com/';
export const CACHE_SECONDS = 600;
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const entities = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',hellip:'…',rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”'};
export function decodeText(value) {
  return String(value).replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (!code.startsWith('#')) return entities[code.toLowerCase()] ?? whole;
    const number = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2),16) : Number(code.slice(1));
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '';
  });
}
export function safeURL(value, image = false) {
  try {
    const url = new URL(decodeText(value));
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    if (image && !(url.hostname === 'blogger.googleusercontent.com' || /^(?:\d+\.bp\.blogspot\.com|lh\d+\.googleusercontent\.com)$/.test(url.hostname))) return '';
    return url.href;
  } catch { return ''; }
}
export function cleanHTML(input) {
  const allowed = new Set(['p','br','h2','h3','h4','blockquote','ul','ol','li','strong','em','b','i','a']);
  const blocked = new Set(['script','style','iframe','noscript','template']);
  const stack = [], skipped = [], out = [], plain = [];
  for (const token of String(input).match(/<[^>]*>|[^<]+|</g) || []) {
    if (token.startsWith('<')) {
      const tag = token.match(/^<\s*(\/?)\s*([a-z0-9]+)/i);
      if (!tag) continue;
      const closing = Boolean(tag[1]), name = tag[2].toLowerCase();
      if (blocked.has(name)) { if (closing) { if (skipped.at(-1) === name) skipped.pop(); } else skipped.push(name); continue; }
      if (skipped.length) continue;
      if (['p','br','div','h2','h3','h4','li'].includes(name)) plain.push(' ');
      if (!allowed.has(name)) continue;
      if (closing) {
        const index = stack.lastIndexOf(name);
        if (index >= 0) while (stack.length > index) out.push('</' + stack.pop() + '>');
      } else if (name === 'br') out.push('<br>');
      else {
        let attributes = '';
        if (name === 'a') {
          const match = token.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
          const href = safeURL(match?.[1] ?? match?.[2] ?? match?.[3] ?? '');
          if (!href) continue;
          attributes = ` href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer"`;
        }
        out.push('<' + name + attributes + '>'); stack.push(name);
      }
    } else if (!skipped.length) {
      const text = decodeText(token); plain.push(text); out.push(escapeHTML(text));
    }
  }
  while (stack.length) out.push('</' + stack.pop() + '>');
  return { html: out.join(''), text: plain.join('').replace(/\s+/g,' ').trim() };
}
export function normalizeFeed(feed, importedAt = new Date().toISOString()) {
  const posts = [];
  for (const entry of feed.entry || []) {
    const id = entry.id?.$t?.match(/post-(\d+)$/)?.[1];
    const url = safeURL(entry.link?.find(l=>l.rel==='alternate')?.href || '');
    if (!id || !url || new URL(url).hostname.replace(/^www\./,'') !== 'catatansantri.com') continue;
    const title = decodeText(entry.title?.$t || '').trim();
    const body = cleanHTML(entry.content?.$t || entry.summary?.$t || '');
    const text = body.text || title;
    const thumbnail = entry.media$thumbnail?.url || (entry.content?.$t || '').match(/<img[^>]+src=["']([^"']+)/i)?.[1] || '';
    const sourceImage = safeURL(thumbnail.replace(/=(?:s|w|h)\d[\w-]*$/,'=w1000-rw').replace(/\/s72[^/]*\//,'/w1000-rw/'), true);
    const categories = (entry.category || []).map(c=>decodeText(c.term).replace(/^growth mindset$/i,'Growth Mindset'));
    posts.push({id,title,category:categories[0] || 'Catatan',categories,date:entry.published?.$t?.slice(0,10) || importedAt.slice(0,10),updated:entry.updated?.$t || entry.published?.$t || importedAt,url,image:sourceImage || 'assets/hero.webp',sourceImage,html:body.html || '<p>'+escapeHTML(title)+'</p>',text,excerpt:text.length>210 ? text.slice(0,210).replace(/\s+\S*$/,'')+'…' : text,minutes:Math.max(1,Math.round(text.split(/\s+/).length/200))});
  }
  if (!posts.length && Number(feed.openSearch$totalResults?.$t) !== 0) throw new Error('Blog feed contains no valid public posts');
  posts.sort((a,b)=>b.date.localeCompare(a.date) || b.updated.localeCompare(a.updated));
  return {source:BLOG,version:feed.updated?.$t || posts.map(p=>p.id+':'+p.updated).join('|'),importedAt,posts};
}
export async function fetchBlog(fetcher = fetch) {
  let start = 1, merged = null;
  for (let page = 0; page < 20; page++) {
    const url = new URL('feeds/posts/default',BLOG);
    url.search = new URLSearchParams({alt:'json','max-results':'100','start-index':String(start)});
    const response = await fetcher(url.href, {headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error('Blog upstream HTTP '+response.status);
    const {feed} = await response.json();
    if (!feed || (feed.entry && !Array.isArray(feed.entry)) || (!feed.entry && Number(feed.openSearch$totalResults?.$t) !== 0)) throw new Error('Invalid blog feed');
    feed.entry ||= [];
    if (!merged) merged = {...feed,entry:[]};
    merged.entry.push(...feed.entry);
    start += feed.entry.length;
    const total = Number(feed.openSearch$totalResults?.$t || merged.entry.length);
    if (start > total) return normalizeFeed(merged);
    if (!feed.entry.length) throw new Error('Incomplete blog pagination');
  }
  throw new Error('Blog pagination exceeded safety limit');
}
export async function readSnapshot(context) {
  const response = await context.env.ASSETS.fetch(new URL('/posts.json',context.request.url));
  if (!response.ok) throw new Error('Snapshot unavailable');
  const data = await response.json();
  if (!Array.isArray(data.posts)) throw new Error('Invalid snapshot');
  return data;
}
export async function getBlog(context, fetcher = fetch, cache = globalThis.caches?.default) {
  const key = new Request(new URL('/api/blog?cache=v3',context.request.url));
  const hit = cache && await cache.match(key);
  if (hit) return hit.json();
  try {
    const data = await fetchBlog(fetcher);
    try {
      const snapshot = await readSnapshot(context);
      for (const p of data.posts) {
        const old = snapshot.posts.find(o=>o.id===p.id);
        if (old?.sourceImage && old.sourceImage===p.sourceImage && !old.image.startsWith('https:')) p.image=old.image;
      }
    } catch { /* Live feed still works without a local image snapshot. */ }
    data.mode = 'live';
    if (cache) context.waitUntil(cache.put(key,new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age='+CACHE_SECONDS}})).catch(()=>{}));
    return data;
  } catch (error) {
    console.warn('Blog refresh unavailable:',error.message);
    return {...await readSnapshot(context),mode:'snapshot'};
  }
}
