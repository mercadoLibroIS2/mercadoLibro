import { createClient } from "@supabase/supabase-js"

// Claves públicas de Supabase para el cliente
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://offamwexclwiuirezgwg.supabase.co"

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_bTQGF5sn0_yYX-8SfZa-Gg_eR2ga95T"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
