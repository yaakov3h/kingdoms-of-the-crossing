"""Package a self-contained HTML from the separate portable Vite build."""
from pathlib import Path
import base64,json,re
root=Path(__file__).resolve().parent.parent
folder=root/'dist-portable'
js=next((folder/'assets').glob('*.js')).read_text()
css='\n'.join(p.read_text()for p in(folder/'assets').glob('*.css'))
assets={p.stem:'data:image/webp;base64,'+base64.b64encode(p.read_bytes()).decode()for p in(root/'public/art').glob('*.webp')}
html='<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>ממלכות המעבר - סולו</title><style>'+css+'</style><body><div id="app"></div><script>window.__KINGDOM_ART__='+json.dumps(assets,separators=(',',':'))+';</script><script type="module">'+re.sub(r'</script',r'<\\/script',js,flags=re.I)+'</script></body></html>'
out=root/'kingdoms-solo-offline.html';out.write_text(html);print(f'{out}: {out.stat().st_size} bytes, {len(assets)} embedded images')
