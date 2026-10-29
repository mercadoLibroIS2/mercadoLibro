// Deja la demo como al principio sin necesidad de SQL: cada usuario de demo marca sus
// publicaciones como ELIMINADA y vuelve su saldo a 100/0. Después hay que correr seed-demo.mjs,
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

  const publications = await c
    .from("publicacion")
    .update({ estado_publicacion: "ELIMINADA" })
    .eq("email_propietario", email)
    .neq("estado_publicacion", "ELIMINADA")
    .select("isbn")
  if (publications.error) {
    console.error(`${email}: ${publications.error.message}`)
    process.exit(1)
  }

  const balance = await c.from("usuario").update({ saldo_total: 100, saldo_reservado: 0 }).eq("email", email).select("email")
  if (balance.error) {
    console.error(`${email}: ${balance.error.message}`)
    process.exit(1)
  }
  console.log(`- ${email}: ${publications.data.length} publicaciones eliminadas, saldo 100/0`)
}
