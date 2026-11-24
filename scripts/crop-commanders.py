from PIL import Image
import numpy as np
from scipy.ndimage import label
from collections import deque
im=Image.open('/downloads/kingdoms-commanders.png').convert('RGBA');w,h=im.size
for k,f in enumerate(['mars','crystal','grove','tide']):
 c=im.crop((k%2*w//2,k//2*h//2,(k%2+1)*w//2,(k//2+1)*h//2));p=c.load();cw,ch=c.size;q=deque([(x,0) for x in range(cw)]+[(x,ch-1) for x in range(cw)]+[(0,y) for y in range(ch)]+[(cw-1,y) for y in range(ch)]);seen=set()
 while q:
  x,y=q.popleft()
  if not(0<=x<cw and 0<=y<ch)or(x,y)in seen:continue
  seen.add((x,y));r,g,b,a=p[x,y]
  if r<57 and g<100 and b<115 and g>r+7 and b>r+8:
   p[x,y]=(r,g,b,0);q.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
 arr=np.array(c);ls,n=label(arr[:,:,3]>0);sz=np.bincount(ls.ravel());sz[0]=0
 for comp in range(1,n+1):
  if sz[comp]<30:arr[:,:,3][ls==comp]=0
 c=Image.fromarray(arr);c=c.crop(c.getbbox());c.thumbnail((200,220));out=Image.new('RGBA',(224,240));out.alpha_composite(c,((224-c.width)//2,240-c.height));out.save('public/art/map-hero-'+f+'.webp',quality=90)
