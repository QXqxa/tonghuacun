import {env} from 'cloudflare:workers';
const bindings=()=>env as unknown as {PHOTOS:R2Bucket;UPLOAD_KEY?:string};
export async function GET(request:Request){
 const bucket=bindings().PHOTOS;if(!bucket)return Response.json({error:'照片存储尚未连接'},{status:503});
 const url=new URL(request.url),key=url.searchParams.get('key');
 if(key){if(!/^photos\/[a-f0-9-]+$/.test(key))return new Response('Not found',{status:404});const o=await bucket.get(key);if(!o)return new Response('Not found',{status:404});return new Response(o.body,{headers:{'Content-Type':o.httpMetadata?.contentType??'application/octet-stream','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}})}
 const listing=await bucket.list({prefix:'photos/',limit:1000,cursor:url.searchParams.get('cursor')??undefined,include:['customMetadata']} as R2ListOptions);
 return Response.json({photos:listing.objects.map(o=>({src:'/api/photos?key='+encodeURIComponent(o.key),name:o.customMetadata?.name??'童话村照片',note:'童话村相册',uploaded:o.uploaded.toISOString()})),cursor:listing.truncated?listing.cursor:null},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 const {PHOTOS,UPLOAD_KEY}=bindings();if(!UPLOAD_KEY||request.headers.get('authorization')!=='Bearer '+UPLOAD_KEY)return Response.json({error:'上传口令不正确'},{status:401});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return new Response('Forbidden',{status:403});
 const chunks:Uint8Array[]=[];let size=0;const reader=request.body?.getReader();if(!reader)return Response.json({error:'请选择照片'},{status:400});
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>20*1024*1024){await reader.cancel();return Response.json({error:'照片不能超过20 MB'},{status:413})}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
 const signature=Array.from(bytes.slice(0,12));let type='';if(signature[0]===255&&signature[1]===216&&signature[2]===255)type='image/jpeg';else if(signature.slice(0,8).join(',')==='137,80,78,71,13,10,26,10')type='image/png';else if(new TextDecoder().decode(bytes.slice(0,6)).match(/^GIF8[79]a$/))type='image/gif';else if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')type='image/webp';
 if(!type)return Response.json({error:'只支持 JPG、PNG、WebP 或 GIF 图片'},{status:415});
 const name=(new URL(request.url).searchParams.get('name')??'童话村照片').trim().slice(0,120)||'童话村照片';const key='photos/'+crypto.randomUUID();
 await PHOTOS.put(key,bytes,{httpMetadata:{contentType:type},customMetadata:{name}});
 return Response.json({src:'/api/photos?key='+encodeURIComponent(key),name,note:'童话村相册'},{status:201});
}
