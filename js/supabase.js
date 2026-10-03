import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL =
  "https://szuvpbdwixezecxnykjn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_NgBzisUuNn6Gdz9PE1XgWg_EYlC5zta";

export const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true
      }
    }
  );