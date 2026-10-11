"""Refresh the public Catatan Santri article snapshot. Python 3, standard library only."""
import concurrent.futures, datetime, html, json, pathlib, re, urllib.request
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]
FEED = 'https://www.catatansantri.com/feeds/posts/default?alt=json&max-results=150'

class Clean(HTMLParser):
    allowed = {'p','br','h2','h3','h4','blockquote','ul','ol','li','strong','em','b','i','a'}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out=[]; self.text=[]; self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in {'script','style','iframe','noscript'}: self.skip+=1; return
        if self.skip: return
        if tag in self.allowed:
            if tag=='a':
                href=dict(attrs).get('href','')
                if href.startswith('https://'): self.out.append('<a href="'+html.escape(href,quote=True)+'" target="_blank" rel="noopener noreferrer">')
            else: self.out.append('<'+tag+'>')
        if tag in {'p','br','div','h2','h3','h4','li'}: self.text.append(' ')
    def handle_endtag(self,tag):
        if tag in {'script','style','iframe','noscript'}:
            self.skip=max(0,self.skip-1); return
        if self.skip: return
        if tag in self.allowed and tag!='br': self.out.append('</'+tag+'>')
        if tag in {'p','div','h2','h3','h4','li'}: self.text.append(' ')
    def handle_data(self,data):
        if not self.skip: self.out.append(html.escape(data)); self.text.append(data)

def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'CatatanSantriSite/1.0','Accept':'image/webp,*/*'}),timeout=35).read()

def main():
    import sys
    raw=pathlib.Path(sys.argv[1]).read_bytes() if len(sys.argv)>1 else fetch(FEED)
    feed=json.loads(raw)['feed']; posts=[]
    assets=ROOT/'dist/assets'; assets.mkdir(parents=True,exist_ok=True)
    for e in feed.get('entry',[]):
        parser=Clean(); parser.feed(e.get('content',{}).get('$t',''))
        text=re.sub(r'\s+',' ',''.join(parser.text)).strip()
        ident=e['id']['$t'].split('post-')[-1]
        image=e.get('media$thumbnail',{}).get('url','')
        image=re.sub(r'=(?:s|w|h)\d[\w-]*$','=w1000-rw',image)
        image=re.sub(r'/s72[^/]*/','/w1000-rw/',image)
        posts.append({'id':ident,'title':e['title']['$t'].strip(),'category':e.get('category',[{'term':'Catatan'}])[0]['term'].replace('Growth mindset','Growth Mindset'),'date':e['published']['$t'][:10], 'url':next(x['href'] for x in e['link'] if x['rel']=='alternate'),'image':image,'html':''.join(parser.out),'excerpt':text[:210].rsplit(' ',1)[0]+'…','minutes':max(1,round(len(text.split())/200)), 'text':text})
    def download(p):
        try:
            data=fetch(p['image'])
            extension='webp' if data[8:12]==b'WEBP' else 'png' if data.startswith(b'\x89PNG') else 'jpg'
            target=assets/('post-'+p['id']+'.'+extension)
            target.write_bytes(data)
            for old in assets.glob('post-'+p['id']+'.*'):
                if old!=target: old.unlink()
            p['image']='assets/'+target.name
            return True
        except Exception as exc:
            print('Image unavailable:',p['title'],str(exc)); return False
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results=list(pool.map(download,posts))
    data={'source':'https://www.catatansantri.com/','importedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'posts':posts}
    (ROOT/'dist/posts.json').write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
    print(json.dumps({'articles':len(posts),'localImages':sum(results),'categories':sorted(set(p['category'] for p in posts))}))
if __name__=='__main__': main()
