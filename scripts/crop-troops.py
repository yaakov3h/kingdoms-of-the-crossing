from PIL import Image,ImageDraw
from collections import deque
from pathlib import Path
import sys
import numpy as np
from scipy.ndimage import label
for f in sys.argv[1:]:
 im=Image.open('/downloads/kingdoms-'+f+'-troops.png').convert('RGBA');w,h=im.size
 for k in range(8):
  x,y=k%4,k//4
  c=im.crop((round(x*w/4),round(y*h/2),round((x+1)*w/4),round((y+1)*h/2)))
  p=c.load();cw,ch=c.size;q=deque([(a,0) for a in range(cw)]+[(a,ch-1) for a in range(cw)]+[(0,b) for b in range(ch)]+[(cw-1,b) for b in range(ch)]);seen=set()
  while q:
   a,b=q.popleft()
   if not(0<=a<cw and 0<=b<ch) or (a,b) in seen:continue
   seen.add((a,b));r,g,bl,al=p[a,b]
   if r<49 and g<106 and bl<116 and g>=r+8 and bl>=r+9:
    p[a,b]=(r,g,bl,0);q.extend([(a-1,b),(a+1,b),(a,b-1),(a,b+1)])
  arr=np.array(c);labels,n=label(arr[:,:,3]>0)
  sizes=np.bincount(labels.ravel());sizes[0]=0;largest=int(sizes.argmax())
  for component in range(1,n+1):
   if component==largest:continue
   yy,xx=np.where(labels==component)
   if len(xx)<12 or xx.min()<4 or xx.max()>cw-5 or yy.min()<4 or yy.max()>ch-5:arr[:,:,3][labels==component]=0
  c=Image.fromarray(arr)
  box=c.getbbox();c=c.crop(box);c.thumbnail((240,270));out=Image.new('RGBA',(256,288));out.alpha_composite(c,((256-c.width)//2,288-c.height));out.save('public/art/troop-'+f+'-'+str(k)+'.webp',quality=88)
mont=Image.new('RGB',(8*150,len(sys.argv[1:])*180),'#193b43');d=ImageDraw.Draw(mont)
for row,f in enumerate(sys.argv[1:]):
 for k in range(8):
  c=Image.open('public/art/troop-'+f+'-'+str(k)+'.webp');c.thumbnail((145,160));mont.paste(c,(k*150,row*180),c);d.text((k*150,row*180+163),f+' '+str(k),fill='white')
mont.save('/downloads/troop-montage.png')
