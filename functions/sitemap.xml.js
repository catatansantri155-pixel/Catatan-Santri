import {getBlog} from '../lib/blog.mjs';
import {renderSitemap} from '../lib/render.mjs';
export async function onRequestGet(context) {
  try {
    const data=await getBlog(context);
    return new Response(renderSitemap(data,new URL(context.request.url).origin),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});
  } catch { return context.next(); }
}
