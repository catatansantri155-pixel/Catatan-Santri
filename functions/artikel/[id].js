import {getBlog} from '../../lib/blog.mjs';
import {renderArticle} from '../../lib/render.mjs';
export async function onRequestGet(context) {
  if(!/^\d+$/.test(context.params.id)) return context.next();
  try {
    const data=await getBlog(context);
    const post=data.posts.find(p=>p.id===context.params.id);
    if(!post) return new Response('Catatan tidak ditemukan.',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
    return new Response(renderArticle(post,data.posts,new URL(context.request.url).origin),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'}});
  } catch { return context.next(); }
}
