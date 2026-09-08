export {};
declare global {
  interface Window {
    TONGHUACUN_CONFIG?: { supabaseUrl?: string; supabaseAnonKey?: string; adminEmail?: string };
  }
}
