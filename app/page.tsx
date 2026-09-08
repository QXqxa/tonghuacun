'use client';
import { useEffect, useRef, useState } from 'react';
import { frameTarget, easeFrame } from './scrub';
import {Logo,Music,PhotoViewer} from './media';
import { flushSync } from 'react-dom';
import { ArrowUpRight, ArrowDown, ArrowLeft, ArrowRight, Plus, MoveHorizontal, Menu, X, Upload, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { deletePhoto, listPhotos, PUBLIC_ALBUM, uploadPhotos } from './supabase';

type Photo = { src: string; name: string; note: string; file?: File; path?: string; album?: string };
const asset=(path:string)=>new URL(path,document.baseURI).href;
const samples: Photo[] = [{src:asset('village-group.png'),name:'童话村 · 冒险家大合影',note:PUBLIC_ALBUM,album:PUBLIC_ALBUM}];
const ALL_ALBUMS='全部照片';
const sponsors = [ ['梦之终结','1550W'],['飞琼','1000W'],['快乐剑客 007','500W'],['圣诞丶 1230','500W'],['Yyttoo','500W'],['擂辣椒皮蛋','500W'],['纠结丶','500W'],['过不去丶','500W'],['廿年之前','500W'],['闪亮晨星','500W'],['喜洋洋睡不醒','500W'],['汤二蛋','500W'],['神奇小豆来啦','500W'],['希喵','500W'],['疯狂牛市','500W'],['波吉','88.8RMB'],['茶尔思','88.88RMB'],['炫彩任又欠','88.88RMB'],['FS 丶劫','88.88RMB'],['月落弯','88.88RMB'] ];
const events=[['08.13','童话村建村','我们的故事，从这一天开始。'],['08.20','第一次进村大会','自由市场58线1洞'],['08.26','第二次进村大会','自由市场58线17洞']];
const greeting='好久不见，冒险家。\n把一起冒险的日子，留在这里。';
export default function Home(){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [framesReady,setFramesReady]=useState(false);
 const [typed,setTyped]=useState('');
 const [menu,setMenu]=useState(false);
 const [upload,setUpload]=useState(false);
 const [photos,setPhotos]=useState<Photo[]>(samples);
 const [activeAlbum,setActiveAlbum]=useState(ALL_ALBUMS);const [albumName,setAlbumName]=useState(PUBLIC_ALBUM);
 const [active,setActive]=useState<number|null>(null);
 const [deleteTarget,setDeleteTarget]=useState<Photo|null>(null);const [deleteKey,setDeleteKey]=useState('');const [deleting,setDeleting]=useState(false);const [deleteError,setDeleteError]=useState('');
 const [pending,setPending]=useState<Photo[]>([]);
 const [error,setError]=useState('');
 const [uploadKey,setUploadKey]=useState('');const [saving,setSaving]=useState(false);const [albumError,setAlbumError]=useState('');
 const urls=useRef<string[]>([]);
 useEffect(()=>{let interval:ReturnType<typeof setInterval>; const timer=setTimeout(()=>{let n=0;interval=setInterval(()=>{n++;setTyped(greeting.slice(0,n));if(n>=greeting.length)clearInterval(interval)},65)},650);return()=>{clearTimeout(timer);clearInterval(interval)}},[]);
 useEffect(()=>{document.documentElement.classList.add('reveal-ready');const nodes=[...document.querySelectorAll<HTMLElement>('#album,#events,#sponsors')];nodes.forEach(node=>node.classList.add('reveal-section'));const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -8%'});nodes.forEach(node=>observer.observe(node));return()=>observer.disconnect()},[]);
 useEffect(()=>()=>urls.current.forEach(URL.revokeObjectURL),[]);
 useEffect(()=>{let stopped=false;listPhotos().then(all=>{if(!stopped)setPhotos(all)}).catch(()=>{if(!stopped)setAlbumError('相册暂时未能加载，请刷新重试。')});return()=>{stopped=true}},[]);
 useEffect(()=>{
  const el=canvas.current;const ctx=el?.getContext('2d');if(!el||!ctx)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');const touch=matchMedia('(pointer: coarse)');
  let stopped=false,raf=0,target=40,current=40,last=-1,lastTime=0,visible=true;
  const surfaces:HTMLCanvasElement[]=[];
  const load=async(i:number)=>{const img=new Image();img.src=asset(`frames/${String(i).padStart(3,'0')}.webp`);await img.decode();if(stopped)return;const surface=document.createElement('canvas');surface.width=800;surface.height=450;surface.getContext('2d')!.drawImage(img,0,0,800,450);surfaces[i]=surface};
  const draw=(i:number)=>{if(!surfaces[i])return;ctx.clearRect(0,0,800,450);ctx.drawImage(surfaces[i],0,0);last=i};
  const render=(time:number)=>{if(stopped)return;const dt=lastTime?Math.min(time-lastTime,50):16;lastTime=time;
   if(visible&&!document.hidden){if(touch.matches&&!reduced.matches)target=40+40*Math.sin(time/3200);
   current=reduced.matches?40:easeFrame(current,target,dt);const index=Math.round(current);if(index!==last)draw(index)}raf=requestAnimationFrame(render);
  };
  const move=(e:MouseEvent)=>{if(!touch.matches&&!reduced.matches)target=frameTarget(e.clientX,innerWidth)};
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting});observer.observe(el);
  (async()=>{await load(40);if(stopped)return;draw(40);setFramesReady(true);
   const todo=Array.from({length:81},(_,i)=>i).filter(i=>i!==40);let next=0;
   await Promise.all(Array.from({length:4},async()=>{while(next<todo.length&&!stopped){await load(todo[next++]);await new Promise(r=>setTimeout(r,0))}}));
   if(stopped)return;raf=requestAnimationFrame(render);window.addEventListener('mousemove',move);
  })().catch(()=>{});
  return()=>{stopped=true;cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('mousemove',move)};
 },[]);
 useEffect(()=>{
 const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
 if(!context)return;const lifecycle=new AbortController();
 try{Promise.resolve(context.registerTool({name:'open_album_photo',description:'Open an existing photo in the album lightbox. Index starts at 1.',inputSchema:{type:'object',properties:{index:{type:'integer',minimum:1}},required:['index'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:(input:unknown)=>{const i=(input as {index?:unknown})?.index;if(typeof i!=='number'||!Number.isInteger(i)||i<1||i>photos.length)throw new Error('Photo index out of range');flushSync(()=>setActive(i-1));return{opened:i,title:photos[i-1].name}}},{signal:lifecycle.signal})).catch(()=>{})}catch{}return()=>lifecycle.abort();
 },[photos]);
 const choose=(files:FileList|null)=>{if(!files||saving)return;const accepted=Array.from(files).filter(f=>['image/jpeg','image/png','image/webp','image/gif'].includes(f.type)&&f.size<=20*1024*1024);setError(accepted.length<files.length?'部分文件未加入：请选择 20 MB 以内的 JPG、PNG、WebP 或 GIF。':'');setPending(p=>[...p,...accepted.map(f=>{const src=URL.createObjectURL(f);urls.current.push(src);return{src,name:f.name.replace(/\.[^.]+$/,''),note:'待上传',file:f}})])};
 const savePhotos=async()=>{setSaving(true);setError('');try{const targetAlbum=albumName.trim()||PUBLIC_ALBUM;const items=pending.flatMap(p=>p.file?[{file:p.file,title:p.name}]:[]);const added=await uploadPhotos(uploadKey,targetAlbum,items);setPhotos(p=>[...added.reverse(),...p]);setActiveAlbum(targetAlbum);setPending([]);setUploadKey('');setUpload(false);setTimeout(()=>document.getElementById('album')?.scrollIntoView({behavior:'smooth'}),150)}catch(e){setError(e instanceof Error?e.message:'网络异常，请重试')}finally{setSaving(false)}};
 const confirmDelete=async()=>{if(!deleteTarget?.path)return;setDeleting(true);setDeleteError('');try{await deletePhoto(deleteKey,deleteTarget.path);setPhotos(p=>p.filter(item=>item.path!==deleteTarget.path));setDeleteTarget(null);setDeleteKey('')}catch(e){setDeleteError(e instanceof Error?e.message:'删除失败，请重试')}finally{setDeleting(false)}};
 const albumNames=[PUBLIC_ALBUM,...Array.from(new Set(photos.map(photo=>photo.album).filter((name):name is string=>Boolean(name)&&name!==PUBLIC_ALBUM)))];
 const visiblePhotos=activeAlbum===ALL_ALBUMS?photos:photos.filter(photo=>(photo.album??PUBLIC_ALBUM)===activeAlbum);
 return <main>
 <header className="nav"><a className="brand" href="#home" aria-label="冒险岛怀旧服童话村首页"><Logo/>童话村</a><span className="nav-sub">冒险岛怀旧服</span><nav className="desktop-nav"><a href="#album">相册</a><a href="#events">大事记</a><a href="#sponsors">贡献榜</a><button onClick={()=>setUpload(true)}>上传照片 <Plus size={17}/></button></nav><Music/><button className="mobile-menu" aria-label={menu?'关闭菜单':'打开菜单'} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></header>
 {menu&&<nav className="mobile-overlay"><a href="#album" onClick={()=>setMenu(false)}>我们的相册 ↗</a><a href="#events" onClick={()=>setMenu(false)}>童话村大事记 ↗</a><a href="#sponsors" onClick={()=>setMenu(false)}>家族贡献榜 ↗</a><button onClick={()=>{setMenu(false);setUpload(true)}}>上传照片 ＋</button></nav>}
 <section id="home" className="hero">
 <div className="hero-media"><canvas ref={canvas} width={800} height={450} className={framesReady?'frame-canvas ready':'frame-canvas'} aria-label="随鼠标位置左右转头的蘑菇" role="img"/></div>
 <div className="hero-copy"><div className="eyebrow"><span/> 冒险岛怀旧服 · 我们的相聚之地</div><h1><Logo/>童话村<span className="title-dot">.</span></h1><p className="intro">{typed}<span className={typed.length<greeting.length?'cursor':'cursor finished'}/></p><div className="hero-actions"><a className="pill primary" href="#album">翻开我们的回忆 <ArrowUpRight size={18}/></a><button className="pill" onClick={()=>setUpload(true)}>留下一张照片 <Plus size={17}/></button></div></div>
 <div className="hero-bottom"><a href="#album" className="scroll-link"><ArrowDown size={17}/> 往下，都是回忆</a><span className="mouse-hint"><MoveHorizontal size={20}/> 左右移动鼠标，和蘑菇打个招呼</span><span className="page-index">01 — 04</span></div>
 </section>
 <section id="album" className="album"><div className="album-heading"><div><div className="eyebrow">OUR MEMORIES / 相册</div><h2>一起走过的冒险<span>（{String(photos.length).padStart(2,'0')}）</span></h2></div><button className="pill" onClick={()=>setUpload(true)}>上传照片 <Plus size={18}/></button></div><p className="album-note">有你在的地方，就是童话村。</p>{albumError&&<p role="status" className="error">{albumError}</p>}<div className="album-category-heading"><strong>个人相册专区</strong><span>选择已有相册，或在上传时创建并命名新相册</span></div><div className="album-tabs" role="group" aria-label="相册分类"><button className={activeAlbum===ALL_ALBUMS?'active':''} onClick={()=>setActiveAlbum(ALL_ALBUMS)}>{ALL_ALBUMS}<span>{photos.length}</span></button>{albumNames.map(name=><button key={name} className={activeAlbum===name?'active':''} onClick={()=>setActiveAlbum(name)}>{name}<span>{photos.filter(photo=>(photo.album??PUBLIC_ALBUM)===name).length}</span></button>)}</div><div className={visiblePhotos.length===1?"photo-grid single-photo":"photo-grid"}>{visiblePhotos.map((p,i)=><button className="photo-card" key={p.src} onClick={()=>setActive(photos.indexOf(p))}><div className="photo-image"><img src={p.src} alt={p.name} loading="lazy"/><span className="photo-open"><ArrowUpRight size={22}/></span></div><div className="photo-caption"><div><h3>{p.name}</h3><p>{p.album??PUBLIC_ALBUM}</p></div><span>{String(i+1).padStart(2,'0')}</span></div></button>)}</div>{visiblePhotos.length===0&&<div className="album-empty">这个相册还没有照片。</div>}</section>
 <section id="events" className="events section"><div className="eyebrow">OUR STORY / 大事记</div><h2>童话村大事记<span className="section-dot">.</span></h2><div className="timeline"><div className="year">2026<span>故事的开始</span></div><div className="event-list">{events.map(([date,title,location])=><article className="event" key={date}><time dateTime={'2026-'+date.replace('.','-')}>{date}</time><div><h3>{title}</h3><p>{location}</p></div></article>)}</div></div></section>
 <section id="sponsors" className="sponsors section"><div className="eyebrow">WITH THANKS / 感谢每一份支持</div><h2>家族贡献榜<span className="section-dot">.</span></h2><p className="section-description">童话村赞助商名单 · 后续赞助将持续记录于此</p><div className="sponsor-groups">{[['游戏币赞助',sponsors.slice(0,15)],['人民币赞助',sponsors.slice(15)]].map(([label,list])=><div className="sponsor-group" key={label as string}><h3>{label as string}<span>{label==='游戏币赞助'?'W = 万游戏币':'RMB = 人民币'}</span></h3><div className="sponsor-list">{(list as string[][]).map(([name,amount])=><div className="sponsor-row" key={name}><span>{name}</span><strong>{amount}</strong></div>)}</div></div>)}</div></section>
 <footer><a className="brand" href="#home"><Logo/>童话村</a><span>冒险的故事，未完待续。</span><a href="#home">回到顶部 ↑</a></footer>
 <Dialog open={upload} onOpenChange={setUpload}><DialogContent className="upload-dialog"><DialogTitle className="dialog-title">留下一张回忆</DialogTitle><DialogDescription>选择已有相册，或直接输入新名字创建个人相册。</DialogDescription><label className="upload-key-label">上传口令<input type="password" autoComplete="current-password" value={uploadKey} onChange={e=>setUploadKey(e.target.value)} placeholder="仅你本人知道" disabled={saving}/></label><label className="upload-key-label">相册名称<input list="album-name-options" maxLength={40} value={albumName} onChange={e=>setAlbumName(e.target.value)} placeholder="例如：小明的相册" disabled={saving}/><datalist id="album-name-options">{albumNames.map(name=><option value={name} key={name}/>)}</datalist></label><label className="drop-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();choose(e.dataTransfer.files)}}><Upload size={30}/><strong>点击选择，或拖入照片</strong><span>JPG / PNG / WebP / GIF · 每张不超过 20 MB</span><input type="file" disabled={saving} multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{choose(e.target.files);e.target.value=''}}/></label>{error&&<p role="alert" className="error">{error}</p>}{pending.length>0&&<div className="pending-grid">{pending.map((p,i)=><div key={p.src}><img src={p.src} alt={p.name}/><button aria-label={'移除 '+p.name} disabled={saving} onClick={()=>setPending(s=>s.filter((_,j)=>i!==j))}><X size={14}/></button><input aria-label={`第${i+1}张照片名称`} maxLength={80} value={p.name} disabled={saving} placeholder="照片名称" onChange={e=>setPending(s=>s.map((item,j)=>j===i?{...item,name:e.target.value}:item))}/></div>)}</div>}<button className="pill primary add-button" disabled={saving||!pending.length||!uploadKey||!albumName.trim()} onClick={savePhotos}>{saving?'正在上传…':`上传并保存${pending.length?`（${pending.length}）`:''}`}<ArrowUpRight size={18}/></button></DialogContent></Dialog>
 <Dialog open={active!==null} onOpenChange={o=>{if(!o)setActive(null)}}><DialogContent className="lightbox">{active!==null&&<><DialogTitle>{photos[active].name}</DialogTitle><PhotoViewer key={photos[active].src} src={photos[active].src} name={photos[active].name}/><div className="lightbox-bottom"><DialogDescription>{photos[active].note} · {active+1} / {photos.length}</DialogDescription><div>{photos[active].path&&<button className="delete-photo" aria-label="删除照片" title="删除照片" onClick={()=>{setDeleteTarget(photos[active]);setActive(null)}}><Trash2 size={18}/></button>}<button aria-label="上一张" onClick={()=>setActive((active+photos.length-1)%photos.length)}><ArrowLeft/></button><button aria-label="下一张" onClick={()=>setActive((active+1)%photos.length)}><ArrowRight/></button></div></div></>}</DialogContent></Dialog>
 <Dialog open={deleteTarget!==null} onOpenChange={o=>{if(!o&&!deleting){setDeleteTarget(null);setDeleteKey('');setDeleteError('')}}}><DialogContent className="delete-dialog"><DialogTitle className="dialog-title">删除这张照片？</DialogTitle><DialogDescription>“{deleteTarget?.name}”将从公开相册中永久删除。请输入管理员上传口令确认。</DialogDescription><label className="upload-key-label">上传口令<input type="password" autoComplete="current-password" value={deleteKey} onChange={e=>setDeleteKey(e.target.value)} disabled={deleting}/></label>{deleteError&&<p role="alert" className="error">{deleteError}</p>}<button className="delete-confirm" disabled={!deleteKey||deleting} onClick={confirmDelete}>{deleting?'正在删除…':'确认删除'}</button></DialogContent></Dialog>
 </main>
}
