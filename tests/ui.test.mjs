import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist',import.meta.url));
const fixture={id:'101',title:'Percuma Nyantri',category:'Muhasabah',categories:['Muhasabah'],date:'2026-10-03',updated:'2026-10-03',text:'Nyantri adalah perjalanan untuk bertumbuh.',html:'<p>Nyantri adalah perjalanan untuk bertumbuh.</p>',excerpt:'Nyantri adalah perjalanan untuk bertumbuh.',image:'assets/hero.webp',url:'https://www.catatansantri.com/2026/10/101.html',minutes:2};
const posts={version:'fixture',posts:[fixture,{...fixture,id:'102',title:'Parenting',category:'Parenting',categories:['Parenting'],date:'2026-10-02'},{...fixture,id:'103',title:'Bertumbuh',category:'Growth Mindset',categories:['Growth Mindset'],date:'2026-10-01'},{...fixture,id:'104',title:'Buku',category:'Buku Pilihanmu',categories:['Buku Pilihanmu'],date:'2026-09-30'}]};
const nodes=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{hidden:false,open:false,style:{},dataset:{},handlers:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(k,fn){this.handlers[k]=fn},focus(){},scrollIntoView(){},showModal(){this.open=true},close(){this.open=false}});return nodes.get(id)}
const storage=new Map();
const location={origin:'https://catatan-santri.pages.dev',hash:'',pathname:'/'};
const ctx=vm.createContext({assert,posts,console,URL,Date,Set,Array,Number,String,JSON,AbortSignal,setInterval:()=>1,clearInterval(){},encodeURIComponent,decodeURIComponent,innerWidth:1024,location,navigator:{clipboard:{writeText:async()=>{}}},setTimeout:()=>0,clearTimeout(){},document:{querySelector:node,querySelectorAll:()=>[],activeElement:{tagName:'BODY',focus(){}},body:{style:{},classList:{add(){}}},addEventListener(){}},window:{addEventListener(){},open(){},scrollY:0},history:{replaceState(_s,_t,url){location.pathname=url}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({ok:true,json:async()=>posts})});
vm.runInContext(fs.readFileSync(root+'/app.js','utf8'),ctx);
await vm.runInContext('init()',ctx);
vm.runInContext(`
assert.equal(state.posts.length,posts.posts.length);
state.query='nyantri';assert(filteredPosts().length>0);assert(filteredPosts().every(p=>(p.title+' '+p.text+' '+p.category).toLocaleLowerCase('id').includes('nyantri')));
state.query='';state.category='Parenting';assert(filteredPosts().every(p=>p.category==='Parenting'));
state.category='Semua';state.sort='oldest';let list=filteredPosts();assert(list[0].date<=list.at(-1).date);
const post=state.posts.find(p=>p.category!=='Buku Pilihanmu');toggleSaved(post.id);assert(saved.has(post.id));state.savedOnly=true;assert.equal(filteredPosts().length,1);
state.savedOnly=false;openPost(post.id);assert($('#reader').open);assert.equal($('#readerImage').src,imagePath(post));assert.equal(location.pathname,articlePath(post));assert($('#shareWhatsapp').href.includes(encodeURIComponent(articlePath(post))));
const second=state.posts.find(p=>p.id!==post.id&&p.category!=='Buku Pilihanmu');openPost(second.id);assert.equal($('#readerImage').src,imagePath(second));assert(card(second).includes('src="'+imagePath(second)+'"'));assert(card(second).includes('href="'+articlePath(second)+'"'));
for(let i=0;i<20;i++)changeFont(1);assert.equal(state.fontSize,24);for(let i=0;i<30;i++)changeFont(-1);assert.equal(state.fontSize,14);
closeReader();assert(!$('#reader').open);assert.equal(location.pathname,'/#catatan');
toggleSaved(post.id);assert(!saved.has(post.id));
`,ctx);
console.log('PASS: search, categories, ordering, bookmarks, reader navigation, absolute image paths, share URLs, and text-size limits.');

vm.runInContext(`
const oldCount=state.posts.length;
const fresh={...state.posts[0],id:'999999999',title:'Catatan terbaru',category:'Tadabbur',categories:['Tadabbur','Adab Baru'],date:'2099-01-01',updated:'2099-01-01',excerpt:'Pengingat terbaru dari blog.'};
const next={version:'newer',mode:'live',posts:[fresh,...state.posts]};
openPost(state.posts.find(p=>p.category!=='Buku Pilihanmu').id);applyBlogData(next);assert.equal(state.posts.length,oldCount);assert(state.pendingData);closeReader();assert.equal(state.posts.length,oldCount+1);assert.equal(state.posts[0].id,fresh.id);assert($('#filters').innerHTML.includes('Tadabbur'));assert($('.theme-belt').innerHTML.includes('Tadabbur'));assert($('#featuredGrid').innerHTML.includes(fresh.id));assert(quotes.some(q=>q.id===fresh.id));assert(state.hasLive);assert($('#filters').innerHTML.includes('Adab Baru'));state.category='Adab Baru';assert.equal(filteredPosts().length,1);state.category='Semua';state.query='Adab Baru';assert.equal(filteredPosts().length,1);state.query='';
applyBlogData({version:'deleted',mode:'live',posts:[fresh]});assert.equal(state.posts.length,1);assert.equal(state.category,'Semua');assert.equal(filteredPosts().length,1);
applyBlogData({version:'empty',mode:'live',posts:[]});assert.equal(state.posts.length,0);assert.equal(filteredPosts().length,0);assert.equal($('#featuredGrid').innerHTML,'');assert.equal(quotes.length,0);assert($('#quoteRead').hidden);assert($('#emptyState').hidden===false);
`,ctx);
console.log('PASS: live refresh, reader deferral, new categories, current featured posts, rotating excerpts, and deleted posts.');
