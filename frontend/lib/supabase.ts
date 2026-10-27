import { createClient } from "@supabase/supabase-js"

// Claves públicas de Supabase para el cliente
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://offamwexclwiuirezgwg.supabase.co"

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZmFtd2V4Y2x3aXVpcmV6Z3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTMwOTIsImV4cCI6MjEwODY2OTA5Mn0.5PWQsYuFTTZYDAxYd3I-LTW64dwBmSFUHEaAg1eaq4M"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
