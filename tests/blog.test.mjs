import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanHTML,normalizeFeed,fetchBlog,getBlog} from '../lib/blog.mjs';
import {renderArticle,renderAbout,renderSitemap} from '../lib/render.mjs';
import {onRequestGet as api} from '../functions/api/blog.js';
import {onRequestGet as article} from '../functions/artikel/[id].js';
import {onRequestGet as sitemap} from '../functions/sitemap.xml.js';
function entry(id,title='Tulisan '+id,content='<p>Catatan yang hangat untuk bertumbuh.</p>') {
 return {id:{$t:'tag:blogger.com,1999:blog-1.post-'+id},title:{$t:title},content:{$t:content},published:{$t:'2026-10-12T07:00:00+07:00'},updated:{$t:'2026-10-12T07:00:00+07:00'},category:[{term:'Growth mindset'}],link:[{rel:'alternate',href:'https://www.catatansantri.com/2026/10/'+id+'.html'}]};
}
const makeFeed=(entries,version='v1',total=entries.length)=>({updated:{$t:version},entry:entries,openSearch$totalResults:{$t:String(total)}});
const response=feed=>new Response(JSON.stringify({feed}),{headers:{'Content-Type':'application/json'}});
function context(snapshot=normalizeFeed(makeFeed([entry('1')]))){return {request:new Request('https://catatan-santri.pages.dev/api/blog'),env:{ASSETS:{fetch:async()=>new Response(JSON.stringify(snapshot))}},params:{id:'2'},pending:[],waitUntil(p){this.pending.push(p)},next:async()=>new Response('Static fallback',{status:404})};}
test('import strips active code, preserves paragraphs, and rejects dangerous URLs',()=>{
 const body=cleanHTML('<p onclick="evil()">Hangat &amp; baik</p><script>alert(1)</script><iframe>bad</iframe><a href="javascript:evil()">a</a><a href="https://example.com/?x=1&amp;y=2" onclick="bad()">aman</a><img src=x onerror=evil()>');
 assert(!/script|iframe|onclick|onerror|javascript:|alert\(/.test(body.html));assert(body.html.includes('Hangat &amp; baik'));assert(body.text.includes('Hangat & baik'));assert(body.html.includes('rel="noopener noreferrer"'));
 const data=normalizeFeed(makeFeed([entry('1'),{...entry('2'),link:[{rel:'alternate',href:'https://attacker.example/'}]}]));assert.equal(data.posts.length,1);assert.equal(data.posts[0].category,'Growth Mindset');
});
test('pagination retains all public posts beyond the first hundred',async()=>{
 let calls=0;const data=await fetchBlog(async url=>{calls++;const start=Number(new URL(url).searchParams.get('start-index'));return response(makeFeed(Array.from({length:start===1?100:5},(_,i)=>entry(String(start+i))),'v1',105));});assert.equal(data.posts.length,105);assert.equal(calls,2);
});
test('a verified empty public blog clears articles instead of restoring the snapshot',async()=>{
 const data=await fetchBlog(async()=>response(makeFeed([],'empty',0)));assert.deepEqual(data.posts,[]);
 const cleared=await getBlog(context(),async()=>response(makeFeed([],'empty',0)),null);assert.equal(cleared.mode,'live');assert.deepEqual(cleared.posts,[]);assert(!renderSitemap(cleared,'https://site.example').includes('/artikel/'));
});
test('live cache, edits, deleted posts, and upstream failures retain a readable fallback',async()=>{
 const ctx=context();let calls=0,stored;const cache={match:async()=>stored?.clone(),put:async(_key,value)=>{stored=value}};
 const fetcher=async()=>{calls++;return response(makeFeed([entry('2','Baru')],'v2'))};
 const live=await getBlog(ctx,fetcher,cache);assert.equal(live.mode,'live');assert.equal(live.posts[0].id,'2');assert.equal(live.posts.find(p=>p.id==='1'),undefined);await Promise.all(ctx.pending);
 await getBlog(ctx,fetcher,cache);assert.equal(calls,1);
 const edited=await getBlog(ctx,async()=>response(makeFeed([entry('2','Judul revisi','<p>Isi direvisi.</p>')],'v3')),null);assert.equal(edited.posts[0].title,'Judul revisi');assert(edited.posts[0].html.includes('Isi direvisi'));
 const fallback=await getBlog(ctx,async()=>{throw Error('offline')},null);assert.equal(fallback.mode,'snapshot');assert.equal(fallback.posts[0].id,'1');
});
test('new article URLs render full text immediately and sitemap matches the live feed',async()=>{
 const originalFetch=globalThis.fetch,originalCaches=globalThis.caches;
 globalThis.fetch=async()=>response(makeFeed([entry('2','Artikel baru','<p>Isi artikel baru yang lengkap.</p>')],'v2'));
 globalThis.caches=undefined;
 try{
  const ctx=context();ctx.request=new Request('https://catatan-santri.pages.dev/artikel/2/');
  const result=await article(ctx);assert.equal(result.status,200);const html=await result.text();assert(html.includes('Isi artikel baru yang lengkap.'));assert(html.includes('https://catatan-santri.pages.dev/artikel/2/'));assert(!html.includes('/https://'));
  ctx.params.id='1';assert.equal((await article(ctx)).status,404);
  const list=await (await sitemap(ctx)).text();assert(list.includes('/artikel/2/'));assert(!list.includes('/artikel/1/'));assert(list.includes('/tentang/'));
  const feed=await api(ctx);assert.equal(feed.status,200);assert.equal((await feed.json()).posts[0].id,'2');
 }finally{globalThis.fetch=originalFetch;globalThis.caches=originalCaches;}
});
test('profile, escaped metadata, and remote image rendering remain safe',()=>{
 const p=normalizeFeed(makeFeed([entry('1','Judul </script><script>evil()</script>')])).posts[0];p.image='https://blogger.googleusercontent.com/image.webp';
 const html=renderArticle(p,[p],'https://site.example');assert(html.includes('src="https://blogger.googleusercontent.com/image.webp"'));assert(!html.includes('Judul </script>'));assert(renderAbout('https://site.example').includes('56512'));assert(renderAbout().includes('Google Maps'));assert(renderSitemap({posts:[p],importedAt:'2026-10-12'},'https://site.example').includes('/artikel/1/'));
});
