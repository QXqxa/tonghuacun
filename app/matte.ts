// Only neutral pixels connected to the image edge are keyed out.
// Interior highlights and the character's dark eyes remain intact.
export function backgroundMask(data:Uint8ClampedArray,w:number,h:number){
 const mask=new Uint8Array(w*h),queue=new Int32Array(w*h);let tail=0,head=0;
 const push=(p:number)=>{if(mask[p])return;const i=p*4,r=data[i],g=data[i+1],b=data[i+2];if(Math.min(r,g,b)<125||Math.max(r,g,b)-Math.min(r,g,b)>(p/w>h*.77?35:8))return;mask[p]=1;queue[tail++]=p;};
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
 while(head<tail){const p=queue[head++],x=p%w;if(x)push(p-1);if(x<w-1)push(p+1);if(p>=w)push(p-w);if(p<w*(h-1))push(p+w)}
 return mask;
}
export function transparentSurface(image:HTMLImageElement){
 const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const ctx=c.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,c.width,c.height),d=pixels.data,mask=backgroundMask(d,c.width,c.height);
 for(let p=0;p<mask.length;p++){if(mask[p]){d[p*4+3]=0;continue}const x=p%c.width;const edge=(x>0&&mask[p-1])||(x<c.width-1&&mask[p+1])||(p>=c.width&&mask[p-c.width])||(p<mask.length-c.width&&mask[p+c.width]);if(edge){const i=p*4;const chroma=Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2]);d[i+3]=Math.min(255,Math.max(90,chroma*6));}}
 ctx.putImageData(pixels,0,0);return c;
}


