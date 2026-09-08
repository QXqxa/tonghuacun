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
    return { src: publicData.publicUrl, name: decodeURIComponent(raw.replace(/_/g, '%')), note: '童话村相册' };
  });
}

export async function uploadPhotos(email: string, password: string, files: File[]) {
  const db = supabase();
  if (!db) throw new Error('在线相册正在配置，请稍后再试。');
  const { data: sessionData } = await db.auth.getSession();
  if (!sessionData.session) {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw new Error('管理员邮箱或密码不正确');
  }
  const uploaded = [];
  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const title = file.name.replace(/\.[^.]+$/, '');
    const safeTitle = encodeURIComponent(title).replace(/%/g, '_');
    const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeTitle}.${ext}`;
    const { error } = await db.storage.from('photos').upload(path, file, {
      cacheControl: '86400', contentType: file.type, upsert: false,
    });
    if (error) throw error;
    const { data } = db.storage.from('photos').getPublicUrl(path);
    uploaded.push({ src: data.publicUrl, name: title, note: '童话村相册' });
  }
  return uploaded;
}
