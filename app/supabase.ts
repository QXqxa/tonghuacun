import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

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
  const { data, error } = await db.storage.from('photos').list('', {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) throw error;
  return data.filter(item => item.id).map(item => {
    const { data: publicData } = db.storage.from('photos').getPublicUrl(item.name);
    const raw = item.name.replace(/^\d+-[a-f0-9]+-/, '').replace(/\.[^.]+$/, '');
    const bytes = raw.match(/^(?:[a-f0-9]{2})+$/i)?.[0].match(/.{2}/g)?.map(value => parseInt(value, 16));
    const title = bytes ? new TextDecoder().decode(new Uint8Array(bytes)) : '童话村照片';
    return { src: publicData.publicUrl, name: title, note: '童话村相册', path: item.name };
  });
}

export async function uploadPhotos(password: string, photos: { file: File; title: string }[]) {
  const db = supabase();
  if (!db) throw new Error('在线相册正在配置，请稍后再试。');
  const email = window.TONGHUACUN_CONFIG?.adminEmail;
  if (!email) throw new Error('管理员账号正在配置，请稍后再试。');
  const { error: signInError } = await db.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error('上传口令不正确');
  const uploaded = [];
  for (const { file, title: requestedTitle } of photos) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const title = requestedTitle.trim().slice(0, 80) || file.name.replace(/\.[^.]+$/, '');
    const safeTitle = Array.from(new TextEncoder().encode(title), value => value.toString(16).padStart(2, '0')).join('');
    const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeTitle}.${ext}`;
    const { error } = await db.storage.from('photos').upload(path, file, {
      cacheControl: '86400', contentType: file.type, upsert: false,
    });
    if (error) throw error;
    const { data } = db.storage.from('photos').getPublicUrl(path);
    uploaded.push({ src: data.publicUrl, name: title, note: '童话村相册', path });
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
