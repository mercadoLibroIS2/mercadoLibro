// Deja la demo como al principio: cada usuario de demo marca sus publicaciones como ELIMINADA,
// cancela sus intercambios abiertos, borra su historial y vuelve su saldo a 100/0. Después hay que correr seed-demo.mjs,
// que crea publicaciones nuevas y vuelve a armar los intercambios iniciales.
// Uso (desde frontend): node scripts/reset-demo.mjs && node scripts/seed-demo.mjs
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://offamwexclwiuirezgwg.supabase.co"
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_bTQGF5sn0_yYX-8SfZa-Gg_eR2ga95T"
const PASSWORD = "Demo2026!"
const USERS = ["lucia", "tomas", "valentina", "mateo"]

for (const user of USERS) {
  const email = `${user}@mercadolibro.demo`
  const c = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const login = await c.auth.signInWithPassword({ email, password: PASSWORD })
  if (login.error) {
    console.error(`${email}: ${login.error.message}`)
    process.exit(1)
  }

  // La base ya no permite cambiar el saldo desde el cliente: el reinicio lo hace una función
  // de Supabase que solo acepta cuentas @mercadolibro.demo (ver supabase/migrations).
  const reset = await c.rpc("reiniciar_usuario_demo")
  if (reset.error) {
    console.error(`${email}: ${reset.error.message}`)
    process.exit(1)
  }
  console.log(`- ${email}: publicaciones eliminadas, historial borrado, saldo 100/0`)
}
