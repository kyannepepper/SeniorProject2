import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
