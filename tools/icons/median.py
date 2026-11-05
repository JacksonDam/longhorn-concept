# python3 tools/icons/median.py <first> <last> <step> <out.png> (run from the repo root): per-pixel median of
# reference frames, a denoised reference for regions that stay still (my Music toolbar: 800 1348 3).
import sys, numpy as np
from PIL import Image
a,b,step,out = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
st = np.stack([np.asarray(Image.open(f'ref/frames/f{n:05d}.png').convert('RGB'),np.uint8) for n in range(a,b+1,step)])
med = np.median(st,axis=0).astype(np.uint8)
mean = st.astype(np.float32).mean(axis=0)
Image.fromarray(med).save(out)
Image.fromarray(np.clip(mean+0.5,0,255).astype(np.uint8)).save(out.replace('.png','_mean.png'))
