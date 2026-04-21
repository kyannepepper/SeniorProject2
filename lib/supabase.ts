import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

// Valid placeholders so `createClient` does not throw during `expo export` when env is unset
// (e.g. Vercel build without EXPO_PUBLIC_*). Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in the dashboard for a working app.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || "anon-placeholder";

const memory: Record<string, string> = {};
const storage = {
  getItem: async (key: string) => memory[key] ?? null,
  setItem: async (key: string, value: string) => {
    memory[key] = value;
  },
  removeItem: async (key: string) => {
    delete memory[key];
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
