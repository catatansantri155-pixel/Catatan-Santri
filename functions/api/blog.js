import {getBlog} from '../../lib/blog.mjs';
export async function onRequestGet(context) {
  try {
    const data=await getBlog(context);
    return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  } catch {
    return new Response(JSON.stringify({error:'Catatan sementara belum tersedia.'}),{status:503,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  }
}
