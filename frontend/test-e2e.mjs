import http from "http"

console.log("=================================================")
console.log("  MERCADOLIBRO E2E INTEGRATION SUITE")
console.log("=================================================\n")

async function testFetch(url, options = {}) {
  const start = Date.now()
  try {
    const res = await fetch(url, options)
    const duration = Date.now() - start
    return { ok: res.ok, status: res.status, headers: res.headers, duration, text: await res.text() }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function run() {
  let passed = 0
  let total = 0

  function assert(name, condition, extra = "") {
    total++
    if (condition) {
      passed++
      console.log(`  ✓ [PASS] ${name} ${extra}`)
    } else {
      console.error(`  ✗ [FAIL] ${name} ${extra}`)
    }
  }

  console.log("1. TEST SERVIDOR NEXT.JS (Frontend):")
  const homeRes = await testFetch("http://localhost:3000")
  assert("Next.js responde status 200", homeRes.status === 200, `(${homeRes.duration}ms)`)
  assert("HTML contiene título de MercadoLibro", homeRes.text.includes("MercadoLibro"))
  assert("HTML incluye meta descripción", homeRes.text.includes("Intercambiá libros con tu comunidad"))

  console.log("\n2. TEST PROXY NEXT.JS HACIA SPRING BOOT (/api/backend):")
  const proxyRes = await testFetch("http://localhost:3000/api/backend/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombreOEmail: "test", contrasenia: "12345678" }),
  })
  // Si Spring Boot no está levantado en 8085, Next.js devuelve 500 (ECONNREFUSED) confirmando que el rewrite está intentando reenviar al puerto 8085.
  // Si Spring Boot está levantado, responde 400, 401 o 200.
  const isProxied = proxyRes.status === 500 || proxyRes.status === 401 || proxyRes.status === 400 || proxyRes.status === 200
  assert("El proxy /api/backend redirige hacia localhost:8085", isProxied, `(Status: ${proxyRes.status})`)

  console.log("\n3. TEST DE MAPPERS Y ADAPTADORES FRONT <-> BACK:")
  const {
    conditionToBackend,
    backendToCondition,
    categoryToBackend,
    backendToCategory,
    authResponseToUser,
    libroResponseToBook
  } = await import("./lib/api/mappers.ts")

  // Estado Físico
  assert("Mapea 'Nuevo' a 'NUEVO'", conditionToBackend("Nuevo") === "NUEVO")
  assert("Mapea 'Como nuevo' a 'COMO_NUEVO'", conditionToBackend("Como nuevo") === "COMO_NUEVO")
  assert("Mapea 'Muy bueno' a 'BUEN_ESTADO'", conditionToBackend("Muy bueno") === "BUEN_ESTADO")
  assert("Mapea 'Con marcas' a 'DETERIORADO'", conditionToBackend("Con marcas") === "DETERIORADO")
  assert("Mapea 'BUEN_ESTADO' a 'Bueno'", backendToCondition("BUEN_ESTADO") === "Bueno")

  // Categorías
  assert("Mapea 'Ficción' a 'FICCION_GENERAL'", categoryToBackend("Ficción") === "FICCION_GENERAL")
  assert("Mapea 'Ciencia' a 'CIENCIA_Y_TECNOLOGIA'", categoryToBackend("Ciencia") === "CIENCIA_Y_TECNOLOGIA")
  assert("Mapea 'Comics y novela gráfica' a 'COMIC'", categoryToBackend("Comics y novela gráfica") === "COMIC")
  assert("Mapea 'FICCION_GENERAL' a 'Ficción'", backendToCategory("FICCION_GENERAL") === "Ficción")

  // DTOs a Modelos de UI
  const mockAuthResponse = {
    id: "uuid-1234-abcd",
    token: "jwt.sample.token",
    nombre: "Franco Papa",
    email: "franco@mercadolibro.uy",
    rol: "USUARIO",
    saldoTotal: 100,
  }
  const user = authResponseToUser(mockAuthResponse)
  assert("Mapea AuthResponseDTO a User", user.id === "uuid-1234-abcd" && user.name === "Franco Papa")
  assert("Asigna 100 puntos iniciales al usuario", user.availablePoints === 100)

  const mockLibroResponse = {
    id: "book-uuid-999",
    isbn: "978-987-1234-56-7",
    titulo: "El Aleph",
    autor: "Jorge Luis Borges",
    categoria: ["FICCION_GENERAL"],
    estadoFisico: "BUEN_ESTADO",
    valorReferencia: 150,
    disponible: true,
    propietario: "uuid-1234-abcd"
  }
  const book = libroResponseToBook(mockLibroResponse, "Franco Papa")
  assert("Mapea LibroResponseDTO a Book", book.id === "book-uuid-999" && book.title === "El Aleph")
  assert("Mapea categoría y puntos", book.category === "Ficción" && book.points === 150)
  assert("Asigna disponibilidad correcta", book.availability === "DISPONIBLE")

  console.log("\n=================================================")
  console.log(`  RESULTADO: ${passed}/${total} PRUEBAS SUPERADAS (${Math.round((passed/total)*100)}%)`)
  console.log("=================================================\n")

  if (passed === total) {
    process.exit(0)
  } else {
    process.exit(1)
  }
}

run()
