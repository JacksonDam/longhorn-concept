"""Build public/img/login/flag.svg (pastel-recoloured XP flag) and wordmark.svg (white words)
from the derived Microsoft Windows stacked logo in assets-src. usage: python3 -I make_logo.py"""
import re, numpy as np, sys
src=open('/Users/jackson/workplace/longhorn-concept/assets-src/windows-logo/derived/microsoft-windows-stacked-no-xp-white.svg').read()
# flag colour matrix fitted on f00001 (4x3: [r, g, b, 1] -> rgb), see docs/login-spec.md
W=np.array([[0.2905, 0.09394, 0.12707], [0.11794, 0.43021, 0.0393], [0.00129, 0.05965, 0.58387], [168.40695, 144.4415, 106.501]])
keep={'#000000','#ffffff'}
def remap(m):
    h=m.group(0)
    if h.lower() in keep: return h
    c=np.array([int(h[1:3],16),int(h[3:5],16),int(h[5:7],16),1.0])
    o=np.clip(c@W,0,255).round().astype(int)
    return '#%02x%02x%02x'%tuple(o)
s=re.sub(r'<!--.*?-->','',src,flags=re.S)
s=re.sub(r'\s(inkscape|sodipodi):[a-zA-Z-]+="[^"]*"','',s)
s=re.sub(r'<sodipodi:namedview.*?/>','',s,flags=re.S)
s=re.sub(r'<metadata.*?</metadata>','',s,flags=re.S)
refs=set(re.findall(r'#([A-Za-z_][\w.-]*)',s))
s=re.sub(r'\sid="([^"]*)"',lambda m: m.group(0) if m.group(1) in refs else '',s)
s=re.sub(r'\n\s*\n+','\n',s)
TXT='style="clip-rule:evenodd;fill:#ffffff;fill-rule:evenodd;stroke:none;stroke-width:0.97681"'
paths=re.findall(r'<path\s+d="([^"]*)"\s+'+re.escape(TXT)+r'\s*/>',s)
assert len(paths)==2, len(paths)
flag=re.sub(r'<path\s+d="[^"]*"\s+'+re.escape(TXT)+r'\s*/>','',s)
flag=re.sub(r'#[0-9A-Fa-f]{6}',remap,flag)
open('/Users/jackson/workplace/longhorn-wt/login/public/img/login/flag.svg','w').write(flag)
sw=[float(a) for a in (sys.argv[1:3] if len(sys.argv)>2 else (0,0))]
def word(sws, out):
    body=''.join('<path d="%s" fill="#fff" fill-rule="evenodd"%s/>'%(d,(' stroke="#fff" stroke-width="%g" stroke-linejoin="round"'%w if w else '')) for d,w in zip(paths,sws))
    open(out,'w').write('<svg xmlns="http://www.w3.org/2000/svg" width="535" height="356.207" viewBox="0 0 535 356.207"><g transform="translate(-136.63587,40.996958)">%s</g></svg>'%body)
word(sw,'/Users/jackson/workplace/longhorn-wt/login/public/img/login/wordmark.svg')
print(len(flag))
