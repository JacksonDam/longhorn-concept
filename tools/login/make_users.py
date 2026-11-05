"""Build the login user pictures (colour, washed hover, blue duotone) from the Vista account
pictures in assets-src. usage: python3 -I make_users.py"""
from PIL import Image
import numpy as np
V='/Users/jackson/workplace/longhorn-concept/assets-src/user-pictures/vista-128/'
OUT='/Users/jackson/workplace/longhorn-wt/login/public/img/login/users/'
stops=np.array([[24.5,82.5,163.7],[42.3,98.4,181.1],[59.3,116.8,198.8],[73.9,129.3,210.5],[87.1,141.6,223.8],[95.8,149.3,232.5],[106.2,158.6,240.1],[119.,170.3,247.2],[133.8,182.4,249.1],[150.6,194.8,250.2],[172.2,209.3,250.5],[193.4,222.6,251.8],[211.2,234.8,253.],[230.7,245.1,252.7],[245.9,252.4,252.3],[253.1,254.5,254.5]])
def duo(a):
  Y=a@[0.299,0.587,0.114]
  lo,hi=np.percentile(Y,2),np.percentile(Y,98)
  k=np.clip((Y-lo)/(hi-lo),0,1)*(len(stops)-1)
  i=np.floor(k).astype(int).clip(0,len(stops)-2); f=(k-i)[...,None]
  return stops[i]*(1-f)+stops[i+1]*f
users={'jenny':'Usertile3','sondra':'User','tommy':'Usertile6','kelly':'Usertile5','angela':'Usertile8'}
for u,f in users.items():
  im=Image.open(V+f+'_(Windows_Vista).png').convert('RGB')
  assert im.size==(128,128), im.size
  if u=='sondra':
    # frame the gerbera like the video's flower: centre left of middle, petals to the right
    im=im.crop((46,19,128,101)).resize((128,128),Image.LANCZOS)
  a=np.asarray(im).astype(np.float32)
  im.save(OUT+u+'.webp',quality=92)
  # the bar shows hovered pictures washed out (measured: saturation ~0.2, floor ~95)
  Y=(a@[0.299,0.587,0.114])[...,None]
  w=(Y+(a-Y)*0.8)*0.62+np.array([90,95,105.])
  a2=np.asarray(im).astype(np.float32)
  Image.fromarray(w.clip(0,255).round().astype(np.uint8)).save(OUT+u+'-hover.webp',quality=92)
  Image.fromarray(duo(a).round().clip(0,255).astype(np.uint8)).save(OUT+u+'-duo.webp',quality=92)
  # png copy for the slab texture (three.js loads webp fine too)
print('ok')
