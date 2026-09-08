import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;
export const PUBLIC_ALBUM = '公共相册';

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
