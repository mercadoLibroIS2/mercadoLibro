// Carga datos de demostración en Supabase usando solo la clave pública (igual que el frontend).
// Es idempotente: si los usuarios, libros, publicaciones o intercambios ya existen, no los duplica.
// Uso: node scripts/seed-demo.mjs   (desde la carpeta frontend)
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://offamwexclwiuirezgwg.supabase.co"
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_bTQGF5sn0_yYX-8SfZa-Gg_eR2ga95T"
const PASSWORD = "Demo2026!"

const USERS = {
  lucia: { email: "lucia@mercadolibro.demo", name: "Lucía Fernández", username: "lucia" },
  tomas: { email: "tomas@mercadolibro.demo", name: "Tomás Rivero", username: "tomas" },
  valentina: { email: "valentina@mercadolibro.demo", name: "Valentina Sosa", username: "valentina" },
  mateo: { email: "mateo@mercadolibro.demo", name: "Mateo Gómez", username: "mateo" },
}

const BOOKS = {
  "9788437604572": ["Rayuela", "Julio Cortázar"],
  "9780156012195": ["El principito", "Antoine de Saint-Exupéry"],
  "9780132350884": ["Clean Code", "Robert C. Martin"],
  "9780307474728": ["Cien años de soledad", "Gabriel García Márquez"],
  "9788499926223": ["Sapiens: De animales a dioses", "Yuval Noah Harari"],
  "9780345539434": ["Cosmos", "Carl Sagan"],
  "9788445000656": ["El Hobbit", "J. R. R. Tolkien"],
  "9788478884452": ["Harry Potter y la piedra filosofal", "J. K. Rowling"],
  "9788420633114": ["El Aleph", "Jorge Luis Borges"],
  "9788499890944": ["1984", "George Orwell"],
  "9780553380163": ["Breve historia del tiempo", "Stephen Hawking"],
  "9788408163381": ["El laberinto de los espíritus", "Carlos Ruiz Zafón"],
  "9788433973382": ["El hombre que confundió a su mujer con un sombrero", "Oliver Sacks"],
  "9788420674179": ["El señor de las moscas", "William Golding"],
}

// [dueño, isbn, estado físico, puntos, comentario, días atrás]
const PUBLICATIONS = [
  ["lucia", "9788437604572", "BUEN_ESTADO", 55, "Edición Cátedra con notas. Tablero de dirección intacto.", 9],
  ["lucia", "9780156012195", "COMO_NUEVO", 30, "Lo leí una sola vez, sin marcas.", 6],
  ["lucia", "9780132350884", "DETERIORADO", 60, "Subrayado en lápiz en los primeros capítulos.", 3],
  ["tomas", "9780307474728", "COMO_NUEVO", 70, "Edición Vintage Español, tapa blanda.", 8],
  ["tomas", "9788499926223", "BUEN_ESTADO", 45, "Editorial Debate. Lomo un poco gastado.", 5],
  ["tomas", "9780345539434", "BUEN_ESTADO", 75, "Edición en inglés con prólogo de Neil deGrasse Tyson.", 4],
  ["tomas", "9788445000656", "ACEPTABLE", 60, "Tapa con algo de desgaste, páginas completas.", 2],
  ["valentina", "9788478884452", "BUEN_ESTADO", 40, "Primera edición de bolsillo de Salamandra.", 10],
  ["valentina", "9788420633114", "NUEVO", 80, "Nuevo, todavía con el film.", 7],
  ["valentina", "9788499890944", "ACEPTABLE", 50, "Debolsillo. Hojas amarillentas.", 4],
  ["valentina", "9780553380163", "BUEN_ESTADO", 75, "Edición ilustrada en inglés.", 1],
  ["mateo", "9788408163381", "NUEVO", 85, "Regalo repetido, sin abrir.", 6],
  ["mateo", "9788433973382", "COMO_NUEVO", 70, "Anagrama, colección Compactos.", 3],
  ["mateo", "9788420674179", "DETERIORADO", 50, "Tiene anotaciones y una mancha de café.", 1],
]

function client() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

function check(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`)
  return result.data
}

async function sessionFor(key) {
  const user = USERS[key]
  const c = client()
  let res = await c.auth.signInWithPassword({ email: user.email, password: PASSWORD })
  if (res.error) {
    res = await c.auth.signUp({
      email: user.email,
      password: PASSWORD,
      options: { data: { name: user.name, username: user.username } },
    })
    check(res, `registro de ${user.email}`)
    console.log(`+ usuario ${user.email}`)
  }
  return c
}

function localTimestamp(daysAgo, index) {
  const date = new Date(Date.now() - daysAgo * 86_400_000 - index * 3_600_000)
  return date.toISOString().replace("Z", "")
}

async function main() {
  const clients = {}
  for (const key of Object.keys(USERS)) clients[key] = await sessionFor(key)

  const existingBooks = new Set(
    check(await clients.lucia.from("libro").select("isbn").in("isbn", Object.keys(BOOKS)), "lectura de libros").map((b) => b.isbn),
  )
  for (const [isbn, [titulo, autores]] of Object.entries(BOOKS)) {
    if (existingBooks.has(isbn)) continue
    check(await clients.lucia.from("libro").insert({ isbn, titulo, autores }), `libro ${isbn}`)
    console.log(`+ libro ${titulo}`)
  }

  const publications = {}
  for (const [index, [owner, isbn, estado, puntos, comentario, daysAgo]] of PUBLICATIONS.entries()) {
    const c = clients[owner]
    const email = USERS[owner].email
    const found = check(
      await c.from("publicacion").select("*").eq("isbn", isbn).eq("email_propietario", email).neq("estado_publicacion", "ELIMINADA"),
      `lectura de publicación ${isbn}`,
    )
    if (found.length > 0) {
      publications[isbn] = found[0]
      continue
    }
    const created = check(
      await c
        .from("publicacion")
        .insert({
          isbn,
          email_propietario: email,
          hora_publicacion: localTimestamp(daysAgo, index),
          estado_fisico: estado,
          valor_puntos_solicitado: puntos,
          comentario,
          estado_publicacion: "DISPONIBLE",
        })
        .select("*")
        .single(),
      `publicación ${isbn}`,
    )
    publications[isbn] = created
    console.log(`+ publicación ${BOOKS[isbn][0]} (${owner})`)
  }

  const existingTrades = check(await clients.lucia.from("solicitud_intercambio").select("*"), "lectura de solicitudes")
  const hasTradeFor = (isbn) => existingTrades.some((t) => t.isbn_solicitada === isbn)

  async function request(requester, isbn, tipo, offeredIsbn) {
    const requested = publications[isbn]
    const offered = offeredIsbn ? publications[offeredIsbn] : null
    const id = crypto.randomUUID()
    check(
      await clients[requester].rpc("crear_solicitud_intercambio", {
        p_solicitud: {
          id,
          tipo,
          estado: "PENDIENTE",
          isbn_solicitada: requested.isbn,
          email_propietario_solicitada: requested.email_propietario,
          hora_publicacion_solicitada: requested.hora_publicacion,
          isbn_ofrecida: offered?.isbn ?? null,
          email_propietario_ofrecida: offered?.email_propietario ?? null,
          hora_publicacion_ofrecida: offered?.hora_publicacion ?? null,
          email_solicitante: USERS[requester].email,
          email_propietario: requested.email_propietario,
          puntos: tipo === "PUNTOS" ? requested.valor_puntos_solicitado : 0,
        },
      }),
      `solicitud ${isbn}`,
    )
    return id
  }

  async function act(user, id, accion) {
    check(await clients[user].rpc("gestionar_solicitud_intercambio", { p_solicitud_id: id, p_accion: accion }), accion)
  }

  // Historial: Lucía compró Harry Potter a Valentina por puntos (completado).
  if (!hasTradeFor("9788478884452")) {
    const id = await request("lucia", "9788478884452", "PUNTOS")
    await act("valentina", id, "ACEPTAR")
    await act("lucia", id, "CONFIRMAR")
    console.log("+ intercambio completado: Lucía compró Harry Potter a Valentina")
  }

  // Pendiente recibido por Lucía: Mateo pide Clean Code por puntos.
  if (!hasTradeFor("9780132350884")) {
    await request("mateo", "9780132350884", "PUNTOS")
    console.log("+ solicitud pendiente: Mateo pide Clean Code a Lucía")
  }

  // Pendiente recibido por Lucía: Tomás ofrece El Hobbit a cambio de El principito (trueque directo).
  if (!hasTradeFor("9780156012195")) {
    await request("tomas", "9780156012195", "DIRECTO", "9788445000656")
    console.log("+ propuesta directa pendiente: Tomás ofrece El Hobbit por El principito")
  }

  const balances = check(
    await clients.lucia.from("usuario").select("email,saldo_total,saldo_reservado").like("email", "%@mercadolibro.demo"),
    "saldos",
  )
  console.table(balances)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
