import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fetchBlog,normalizeFeed} from '../lib/blog.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function syncBlog({input,strict=true}={}) {
  const target=path.join(root,'dist/posts.json');
  try {
    const previous=JSON.parse(fs.readFileSync(target,'utf8'));
    const data=input ? normalizeFeed(JSON.parse(fs.readFileSync(input,'utf8')).feed) : await fetchBlog();
    for(const post of data.posts) {
      const old=previous.posts.find(p=>p.id===post.id);
      if(old && (!old.sourceImage || old.sourceImage===post.sourceImage) && !old.image.startsWith('https:') && fs.existsSync(path.join(root,'dist',old.image))) post.image=old.image;
    }
    if(previous.version===data.version) data.importedAt=previous.importedAt;
    fs.writeFileSync(target,JSON.stringify(data));
    console.log('Blog snapshot refreshed:',data.posts.length,'public posts.');
    return data;
  } catch(error) {
    if(strict) throw error;
    console.warn('Using the retained blog snapshot:',error.message);
    return JSON.parse(fs.readFileSync(target,'utf8'));
  }
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await syncBlog({input:process.argv[2]});
