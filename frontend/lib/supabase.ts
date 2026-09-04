import { createClient } from "@supabase/supabase-js"

// Claves públicas de Supabase para el cliente
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://yqwkiugnpgeigntkwipi.supabase.co"

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxd2tpdWducGdlaWdudGt3aXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDUzMTksImV4cCI6MjEwMzU4MTMxOX0.wcihBXBImGmn47VMvMfZsV4nRmMDvuVl1rMF_PNy1q0"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
