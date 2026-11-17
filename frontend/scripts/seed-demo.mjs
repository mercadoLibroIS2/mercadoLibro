// Carga datos de demostración en el backend Java (la misma API que usa el frontend).
// Es idempotente: si los usuarios o las publicaciones ya existen, no los duplica.
//
// Uso (desde la carpeta frontend):
//   BACKEND_URL=https://mercadolibro.onrender.com node scripts/seed-demo.mjs
//
// Para que admin@mercadolibro.demo sea administrador, el backend tiene que arrancar con
// APP_ADMIN_EMAILS=admin@mercadolibro.demo (se aplica al registrarse o al reiniciar).

const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:8086").replace(/\/$/, "")
const PASSWORD = process.env.DEMO_PASSWORD || "Demo2026!"

const USERS = {
  admin: { email: "admin@mercadolibro.demo", nombre: "Admin" },
  lucia: { email: "lucia@mercadolibro.demo", nombre: "lucia" },
  tomas: { email: "tomas@mercadolibro.demo", nombre: "tomas" },
  valentina: { email: "valentina@mercadolibro.demo", nombre: "valentina" },
  mateo: { email: "mateo@mercadolibro.demo", nombre: "mateo" },
}

// [dueño, isbn, estado físico, puntos, comentario, categoría]
const PUBLICATIONS = [
  ["lucia", "9788437604572", "BUEN_ESTADO", 55, "Edición Cátedra con notas. Tablero de dirección intacto.", "Ficción"],
  ["lucia", "9780156012195", "COMO_NUEVO", 30, "Lo leí una sola vez, sin marcas.", "Infantil"],
  ["lucia", "9780132350884", "DETERIORADO", 60, "Subrayado en lápiz en los primeros capítulos.", "Técnico"],
  ["tomas", "9780307474728", "COMO_NUEVO", 70, "Edición Vintage Español, tapa blanda.", "Ficción"],
  ["tomas", "9788499926223", "BUEN_ESTADO", 45, "Editorial Debate. Lomo un poco gastado.", "Historia"],
  ["tomas", "9780345539434", "BUEN_ESTADO", 75, "Edición en inglés con prólogo de Neil deGrasse Tyson.", "Ciencia"],
  ["valentina", "9788478884452", "BUEN_ESTADO", 40, "Primera edición de bolsillo de Salamandra.", "Infantil"],
  ["valentina", "9788420633114", "NUEVO", 80, "Nuevo, todavía con el film.", "Ficción"],
  ["valentina", "9788499890944", "ACEPTABLE", 50, "Debolsillo. Hojas amarillentas.", "Ficción"],
  ["mateo", "9788408163381", "NUEVO", 85, "Regalo repetido, sin abrir.", "Ficción"],
  ["mateo", "9788433973382", "COMO_NUEVO", 70, "Anagrama, colección Compactos.", "Ciencia"],
]

async function call(path, { token, method = "GET", body } = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}: ${data?.message || text}`)
    err.status = res.status
    throw err
  }
  return data
}

async function sessionFor(key) {
  const u = USERS[key]
  try {
    const auth = await call("/api/auth/login", {
      method: "POST",
      body: { nombreOEmail: u.email, contrasenia: PASSWORD },
    })
    return auth.token
  } catch {
    const auth = await call("/api/auth/registro", {
      method: "POST",
      body: { nombre: u.nombre, email: u.email, contrasenia: PASSWORD },
    })
    console.log(`+ usuario ${u.email}`)
    return auth.token
  }
}

async function main() {
  console.log(`Backend: ${BACKEND_URL} (si está dormido en Render puede tardar ~1 minuto)`)
  await call("/api/test/ping").catch(() => {})

  const tokens = {}
  for (const key of Object.keys(USERS)) tokens[key] = await sessionFor(key)

  for (const [owner, isbn, estadoFisico, puntos, comentario, categoria] of PUBLICATIONS) {
    const mine = await call("/api/publicaciones/mis-publicaciones", { token: tokens[owner] }).catch(() => [])
    if (mine.some((p) => p.publicacionId?.isbn === isbn && p.estadoPublicacion !== "ELIMINADA")) continue
    try {
      await call("/api/publicaciones/publicar", {
        token: tokens[owner],
        method: "POST",
        body: { isbn, estadoFisico, valorPuntosSolicitado: puntos, comentario, categoria },
      })
      console.log(`+ publicación ${isbn} de ${owner}`)
    } catch (err) {
      console.warn(`! no se pudo publicar ${isbn}: ${err.message}`)
    }
  }

  const me = await call("/api/usuario/me", { token: tokens.admin })
  console.log(`\nListo. Contraseña de todas las cuentas: ${PASSWORD}`)
  console.log(`admin@mercadolibro.demo tiene rol ${me.rol}${me.rol === "ADMINISTRADOR" ? "" : " (falta APP_ADMIN_EMAILS en el backend)"}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
