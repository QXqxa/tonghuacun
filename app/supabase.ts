import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;
export const PUBLIC_ALBUM = '公共相册';
export type GuestbookMessage = { id: number; nickname: string; content: string; createdAt: string; updatedAt?: string; likes: number; liked: boolean };

const hexEncode = (value: string) => Array.from(new TextEncoder().encode(value), byte => byte.toString(16).padStart(2, '0')).join('');
const hexDecode = (value: string) => {
  const bytes = value.match(/^(?:[a-f0-9]{2})+$/i)?.[0].match(/.{2}/g)?.map(part => parseInt(part, 16));
  return bytes ? new TextDecoder().decode(new Uint8Array(bytes)) : '';
};

function storedPhoto(db: SupabaseClient, filename: string, folder = '', album = PUBLIC_ALBUM) {
  const path = folder ? `${folder}/${filename}` : filename;
  const raw = filename.replace(/^\d+-[a-f0-9]+-/, '').replace(/\.[^.]+$/, '');
  return {
    src: db.storage.from('photos').getPublicUrl(path).data.publicUrl,
    name: hexDecode(raw) || '童话村照片', note: album, album, path,
  };
}

function supabase() {
  if (client !== undefined) return client;
  const { supabaseUrl = '', supabaseAnonKey = '' } = window.TONGHUACUN_CONFIG ?? {};
  client = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true } })
    : null;
  return client;
}

async function deviceHash() {
  const key = 'tonghuacun-device-id';
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

const likedIds = () => { try { return new Set<number>(JSON.parse(localStorage.getItem('tonghuacun-liked-messages') || '[]')); } catch { return new Set<number>(); } };

export async function listGuestbook() {
  const db = supabase();
  if (!db) return [] as GuestbookMessage[];
  const [{ data: messages, error }, { data: likes, error: likesError }] = await Promise.all([
    db.from('guestbook_messages').select('id,nickname,content,created_at,updated_at').order('created_at', { ascending: false }).limit(100),
    db.from('guestbook_likes').select('message_id').limit(5000),
  ]);
  if (error || likesError) throw error || likesError;
  const counts = new Map<number, number>();
  for (const like of likes ?? []) counts.set(like.message_id, (counts.get(like.message_id) ?? 0) + 1);
  const liked = likedIds();
  return (messages ?? []).map(message => ({ id: message.id, nickname: message.nickname, content: message.content, createdAt: message.created_at, updatedAt: message.updated_at || undefined, likes: counts.get(message.id) ?? 0, liked: liked.has(message.id) }));
}

export async function postGuestbookMessage(nickname: string, content: string) {
  const db = supabase();
  if (!db) throw new Error('留言板正在配置，请稍后再试。');
  const { data, error } = await db.from('guestbook_messages').insert({ nickname: nickname.trim(), content: content.trim(), device_hash: await deviceHash() }).select('id,nickname,content,created_at').single();
  if (error?.code === '23505') throw new Error('这台设备已经留下过留言了。');
  if (error) throw error;
  localStorage.setItem('tonghuacun-message-posted', '1');
  return { id: data.id, nickname: data.nickname, content: data.content, createdAt: data.created_at, likes: 0, liked: false } as GuestbookMessage;
}

export async function likeGuestbookMessage(messageId: number) {
  const db = supabase();
  if (!db) throw new Error('留言板正在配置，请稍后再试。');
  const { error } = await db.from('guestbook_likes').insert({ message_id: messageId, device_hash: await deviceHash() });
  if (error?.code === '23505') throw new Error('你已经给这条留言点过赞了。');
  if (error) throw error;
  const liked = likedIds(); liked.add(messageId);
  localStorage.setItem('tonghuacun-liked-messages', JSON.stringify([...liked]));
}

export async function updateGuestbookMessage(password: string, id: number, nickname: string, content: string) {
  const db = supabase();
  const email = window.TONGHUACUN_CONFIG?.adminEmail;
  if (!db || !email) throw new Error('留言板正在配置，请稍后再试。');
  const { error: signInError } = await db.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error('上传口令不正确');
  const updatedAt = new Date().toISOString();
  const { error } = await db.from('guestbook_messages').update({ nickname: nickname.trim(), content: content.trim(), updated_at: updatedAt }).eq('id', id);
  if (error) throw error;
  return updatedAt;
}

export async function deleteGuestbookMessage(password: string, id: number) {
  const db = supabase();
  const email = window.TONGHUACUN_CONFIG?.adminEmail;
  if (!db || !email) throw new Error('留言板正在配置，请稍后再试。');
  const { error: signInError } = await db.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error('上传口令不正确');
  const { error } = await db.from('guestbook_messages').delete().eq('id', id);
  if (error) throw error;
}

export async function listPhotos() {
  const db = supabase();
  if (!db) return [];
  const { data: root, error } = await db.storage.from('photos').list('', {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) throw error;
  const photos = root.filter(item => item.id).map(item => storedPhoto(db, item.name));
  const folders = root.filter(item => !item.id && item.name.startsWith('album-'));
  const grouped = await Promise.all(folders.map(async folder => {
    const album = hexDecode(folder.name.slice(6)) || '个人相册';
    const { data, error: folderError } = await db.storage.from('photos').list(folder.name, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
    if (folderError) throw folderError;
    return data.filter(item => item.id).map(item => storedPhoto(db, item.name, folder.name, album));
  }));
  return [...photos, ...grouped.flat()];
}

export async function listAlbumCovers() {
  const db = supabase();
  if (!db) return {} as Record<string, string>;
  const { data, error } = await db.storage.from('photos').list('covers', {
    limit: 1000, sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) throw error;
  const covers: Record<string, string> = {};
  for (const item of data.filter(item => item.id)) {
    const encoded = item.name.match(/^cover-([a-f0-9]+)-\d+-/i)?.[1];
    const album = encoded ? hexDecode(encoded) : '';
    if (album && !covers[album]) covers[album] = db.storage.from('photos').getPublicUrl(`covers/${item.name}`).data.publicUrl;
  }
  return covers;
}

export async function saveAlbumCover(password: string, albumName: string, source: File | { src: string }) {
  const db = supabase();
  const email = window.TONGHUACUN_CONFIG?.adminEmail;
  if (!db || !email) throw new Error('在线相册正在配置，请稍后再试。');
  const { error: signInError } = await db.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error('上传口令不正确');
  const file = source instanceof File ? source : await fetch(source.src).then(async response => {
    if (!response.ok) throw new Error('封面照片读取失败，请重试。');
    const blob = await response.blob();
    return new File([blob], 'album-cover', { type: blob.type || 'image/jpeg' });
  });
  if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('请选择 20 MB 以内的 JPG、PNG、WebP 或 GIF。');
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const album = albumName.trim().slice(0, 40) || PUBLIC_ALBUM;
  const path = `covers/cover-${hexEncode(album)}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await db.storage.from('photos').upload(path, file, { cacheControl: '86400', contentType: file.type, upsert: false });
  if (error) throw error;
  return db.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

export async function renameAlbum(password: string, oldName: string, newName: string, photos: { path?: string; src: string }[], coverSrc?: string) {
  const db = supabase();
  const email = window.TONGHUACUN_CONFIG?.adminEmail;
  if (!db || !email) throw new Error('在线相册正在配置，请稍后再试。');
  const { error: signInError } = await db.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error('上传口令不正确');
  const album = newName.trim().slice(0, 40);
  if (!album || album === PUBLIC_ALBUM) throw new Error('请输入新的个人相册名称。');
  const folder = `album-${hexEncode(album)}`;
  const moved: { oldPath: string; path: string; src: string }[] = [];
  for (const photo of photos) {
    if (!photo.path) continue;
    const response = await fetch(photo.src);
    if (!response.ok) throw new Error('相册照片读取失败，请重试。');
    const blob = await response.blob();
    const filename = photo.path.split('/').pop()!;
    const path = `${folder}/${filename}`;
    const { error } = await db.storage.from('photos').upload(path, blob, { cacheControl: '86400', contentType: blob.type || 'image/jpeg', upsert: false });
    if (error) throw error;
    moved.push({ oldPath: photo.path, path, src: db.storage.from('photos').getPublicUrl(path).data.publicUrl });
  }
  if (coverSrc) {
    const response = await fetch(coverSrc);
    if (!response.ok) throw new Error('相册封面读取失败，请重试。');
    const blob = await response.blob();
    const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const path = `covers/cover-${hexEncode(album)}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error } = await db.storage.from('photos').upload(path, blob, { cacheControl: '86400', contentType: blob.type || 'image/jpeg', upsert: false });
    if (error) throw error;
  }
  const { error: removeError } = await db.storage.from('photos').remove(moved.map(photo => photo.oldPath));
  if (removeError) throw removeError;
  return moved;
}

export async function uploadPhotos(password: string, albumName: string, photos: { file: File; title: string }[]) {
  const db = supabase();
  if (!db) throw new Error('在线相册正在配置，请稍后再试。');
  const email = window.TONGHUACUN_CONFIG?.adminEmail;
  if (!email) throw new Error('管理员账号正在配置，请稍后再试。');
  const { error: signInError } = await db.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error('上传口令不正确');
  const uploaded = [];
  const album = albumName.trim().slice(0, 40) || PUBLIC_ALBUM;
  const folder = album === PUBLIC_ALBUM ? '' : `album-${hexEncode(album)}`;
  for (const { file, title: requestedTitle } of photos) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const title = requestedTitle.trim().slice(0, 80) || file.name.replace(/\.[^.]+$/, '');
    const safeTitle = hexEncode(title);
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeTitle}.${ext}`;
    const path = folder ? `${folder}/${filename}` : filename;
    const { error } = await db.storage.from('photos').upload(path, file, {
      cacheControl: '86400', contentType: file.type, upsert: false,
    });
    if (error) throw error;
    const { data } = db.storage.from('photos').getPublicUrl(path);
    uploaded.push({ src: data.publicUrl, name: title, note: album, album, path });
  }
  return uploaded;
}

export async function deletePhoto(password: string, path: string) {
  const db = supabase();
  const email = window.TONGHUACUN_CONFIG?.adminEmail;
  if (!db || !email) throw new Error('在线相册正在配置，请稍后再试。');
  const { error: signInError } = await db.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error('上传口令不正确');
  const { error } = await db.storage.from('photos').remove([path]);
  if (error) throw error;
}
