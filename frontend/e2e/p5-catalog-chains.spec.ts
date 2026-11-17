import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type Page,
  type Route,
} from "@playwright/test"
import { generateInitialChains } from "../lib/chain-detector"
import { SEED_BOOKS, SEED_USERS } from "../lib/seed-data"
import type { Book, TradeChain, User } from "../lib/mercado-types"
import { CONDITION_TO_ESTADO } from "../lib/api"

const STORAGE_KEY = "mercadolibro_demo_clean_v5"

const usersByEmail = new Map(SEED_USERS.map((user) => [user.email, user]))

// Las cadenas las detecta y persiste el backend: el mock mantiene su propio estado "servidor"
function chainToBackend(chain: TradeChain) {
  return {
    id: chain.id,
    puntosBonus: 50,
    estado: chain.status,
    participantesEmails: chain.steps.map((step) => step.userId),
    pasos: chain.steps.map((step) => ({
      emailEntrega: step.userId,
      nombreEntrega: step.userName,
      emailRecibe: chain.steps.find((other) => other.receivesBook.id === step.givesBook.id)?.userId || step.userId,
      isbn: step.givesBook.isbn,
      horaPublicacion: step.givesBook.createdAt,
      titulo: step.givesBook.title,
      autor: step.givesBook.author,
      estadoFisico: null,
      valorPuntosSolicitado: step.givesBook.points,
      confirmado: step.confirmed,
    })),
  }
}

const ESTADO_PUBLICACION: Record<string, string> = {
  DISPONIBLE: "DISPONIBLE",
  RESERVADO: "RESERVADA",
  INTERCAMBIADO: "VENDIDA",
  ELIMINADO: "ELIMINADA",
}

function bookToBackend(book: Book) {
  const [isbn, emailPropietario, horaPublicacion] = book.id.split("|")
  return {
    publicacionId: { isbn, emailPropietario, horaPublicacion },
    titulo: book.title,
    autor: book.author,
    portadaUrl: book.coverUrl || "",
    estadoFisico: CONDITION_TO_ESTADO[book.condition] || "BUEN_ESTADO",
    valorPuntosSolicitado: book.points,
    valorReferenciaCalculado: book.referencePrice || null,
    colorSemaforo: "VERDE",
    comentario: book.description || "",
    nombrePropietario: book.ownerName,
    estadoPublicacion: ESTADO_PUBLICACION[book.availability] || "DISPONIBLE",
  }
}

async function mockBackend(
  page: Page,
  options: { chains?: TradeChain[]; books?: Book[] } = {},
) {
  const serverChains: TradeChain[] = structuredClone(options.chains || generateInitialChains(SEED_BOOKS, SEED_USERS))
  const serverBooks: Book[] = options.books || SEED_BOOKS
  const followedIsbns = new Set<string>()
  await page.route("**/api/**", async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    let body: Record<string, unknown> | undefined
    try {
      body = request.postDataJSON?.() as Record<string, unknown> | undefined
    } catch {
      body = undefined
    }

    if (url.pathname.endsWith("/api/auth/login")) {
      const user = usersByEmail.get(String(body?.nombreOEmail || ""))
      if (!user) {
        await route.fulfill({
          status: 401,
          json: { message: "Invalid login credentials" },
        })
        return
      }
      await route.fulfill({
        json: {
          id: user.id,
          token: `p5-token-${user.id}`,
          username: user.name,
          email: user.email,
          rol: "USUARIO",
          puntos: user.availablePoints,
        },
      })
      return
    }

    if (url.pathname.endsWith("/api/usuario/me")) {
      const accessToken = request.headers().authorization?.replace(/^Bearer\s+/i, "")
      const userId = accessToken?.replace(/^p5-token-/, "")
      const user = SEED_USERS.find((candidate) => candidate.id === userId) || SEED_USERS[0]
      await route.fulfill({
        json: {
          id: user.id,
          nombre: user.name,
          email: user.email,
          rol: "USUARIO",
          saldoTotal: user.availablePoints,
          saldoReservado: user.reservedPoints,
          saldoDisponible: user.availablePoints,
          reputacionPromedio: user.rating,
        },
      })
      return
    }

    if (url.pathname.endsWith("/api/auth/logout")) {
      await route.fulfill({ status: 200, json: { message: "Logout exitoso" } })
      return
    }

    if (url.pathname.endsWith("/api/libro/google-books/isbn/9789500421461")) {
      await route.fulfill({
        json: {
          googleBooksId: "p5-google-book",
          isbn: "9789500421461",
          titulo: "Ficciones",
          autor: "Jorge Luis Borges",
          descripcion: "Una colección de relatos.",
          portadaUrl: "https://example.test/ficciones.jpg",
          editorial: "Emecé",
          anioPublicacion: "1944",
          categorias: ["Ficción"],
          paginas: 176,
          ratingExterno: 4.5,
        },
      })
      return
    }

    if (url.pathname.endsWith("/api/libro/google-books/isbn/9780000000000")) {
      await route.fulfill({ status: 404, body: "" })
      return
    }

    if (url.pathname.endsWith("/api/libro/google-books/isbn/9781111111111")) {
      await route.fulfill({ status: 503, json: { message: "Proveedor no disponible" } })
      return
    }

    // Tracker: el backend guarda los libros seguidos por ISBN
    const follow = url.pathname.match(/\/api\/usuario\/[^/]+\/libros-seguidos(?:\/([^/]+))?$/)
    if (follow) {
      const method = request.method()
      if (method === "POST" && follow[1]) followedIsbns.add(decodeURIComponent(follow[1]))
      if (method === "DELETE" && follow[1]) followedIsbns.delete(decodeURIComponent(follow[1]))
      if (method === "GET") {
        await route.fulfill({
          json: [...followedIsbns].map((isbn) => {
            const seed = serverBooks.find((book) => book.isbn === isbn)
            return { isbn, titulo: seed?.title || isbn, autores: seed?.author || "", categorias: [] }
          }),
        })
        return
      }
      await route.fulfill({ status: 204, body: "" })
      return
    }

    // Búsqueda por título (Google Books / Open Library en el backend)
    if (url.pathname.endsWith("/api/libro/google-books/buscar")) {
      const q = (url.searchParams.get("query") || "").toLowerCase()
      await route.fulfill({
        json: serverBooks
          .filter((book) => book.title.toLowerCase().includes(q))
          .map((book) => ({
            googleBooksId: "", isbn: book.isbn, titulo: book.title, autor: book.author, descripcion: "",
            portadaUrl: "", editorial: "", anioPublicacion: "", categorias: [], paginas: null, ratingExterno: null,
          })),
      })
      return
    }

    // Referencia que calcula el backend para sugerir puntos al publicar
    if (/\/api\/libro\/[^/]+\/referencia$/.test(url.pathname)) {
      await route.fulfill({ json: { valorReferencia: 72, categoria: null } })
      return
    }

    // Con sesión, el catálogo sale del backend: disponibles para todos y propias (con estado) para el dueño
    if (url.pathname.endsWith("/api/publicaciones/disponibles")) {
      await route.fulfill({
        json: serverBooks.filter((book) => book.availability === "DISPONIBLE").map(bookToBackend),
      })
      return
    }
    if (url.pathname.endsWith("/api/publicaciones/mis-publicaciones")) {
      const accessToken = request.headers().authorization?.replace(/^Bearer\s+/i, "")
      const userId = accessToken?.replace(/^p5-token-/, "") || ""
      await route.fulfill({
        json: serverBooks.filter((book) => book.ownerId === userId).map(bookToBackend),
      })
      return
    }

    if (url.pathname.includes("/api/cadenaIntercambio")) {
      const accessToken = request.headers().authorization?.replace(/^Bearer\s+/i, "")
      const userId = accessToken?.replace(/^p5-token-/, "") || ""
      const action = url.pathname.match(/cadenaIntercambio\/([^/]+)\/(aceptar|rechazar)$/)
      if (action) {
        const chain = serverChains.find((candidate) => candidate.id === decodeURIComponent(action[1]))!
        if (action[2] === "rechazar") {
          chain.status = "CANCELADA"
        } else {
          chain.steps = chain.steps.map((step) => (step.userId === userId ? { ...step, confirmed: true } : step))
          chain.status = chain.steps.every((step) => step.confirmed) ? "COMPLETADA" : "EN_CURSO"
        }
        await route.fulfill({ json: chainToBackend(chain) })
        return
      }
      await route.fulfill({
        json: serverChains
          .filter((chain) => chain.steps.some((step) => step.userId === userId))
          .map(chainToBackend),
      })
      return
    }

    await route.fulfill({ json: [] })
  })
}

async function loadSeedState(
  page: Page,
  options: {
    users?: User[]
    books?: Book[]
    chains?: TradeChain[]
  } = {},
) {
  const users = options.users || SEED_USERS
  const books = options.books || SEED_BOOKS
  const chains = options.chains || generateInitialChains(books, users)
  await page.addInitScript(
    ({ storageKey, state }) => {
      if (sessionStorage.getItem("p5-seed-loaded") !== "true") {
        localStorage.setItem(storageKey, JSON.stringify(state))
        sessionStorage.setItem("p5-seed-loaded", "true")
      }
    },
    {
      storageKey: STORAGE_KEY,
      state: { currentUser: null, users, books, chains },
    },
  )
}

async function signIn(page: Page, user: User = SEED_USERS[0]) {
  await page.goto("/")
  await page.getByLabel("Email o nombre de usuario").fill(user.email)
  await page.getByLabel("Contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()
  await expect(page.locator('button[title="Ir a mi perfil y billetera"]')).toBeVisible()
}

async function openCatalog(page: Page) {
  await page.locator("aside").getByRole("button", { name: "Catálogo", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Libros Disponibles" })).toBeVisible()
}

async function openChains(page: Page) {
  await page
    .locator("aside")
    .getByRole("button", { name: "Cadenas Circulares", exact: true })
    .click()
  await expect(page.getByRole("heading", { name: "Cadenas Multiusuario de Intercambio" })).toBeVisible()
}

async function openPublishForm(page: Page) {
  await page
    .locator("aside")
    .getByRole("button", { name: "Publicar un Libro", exact: true })
    .click()
  await expect(page.getByRole("heading", { name: "Publicar un Libro" })).toBeVisible()
}

function bookCard(page: Page, title: string) {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  })
}

function chainCard(page: Page) {
  return page.locator("div.rounded-3xl.border").filter({
    has: page.getByRole("heading", { name: /Cadena Triangular de Intercambio/ }),
  })
}

async function persistedChains(page: Page) {
  return page.evaluate((storageKey) => {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}")
    return saved.chains as TradeChain[]
  }, STORAGE_KEY)
}

async function logout(page: Page) {
  await page.locator("aside").getByRole("button", { name: "Cerrar sesión" }).click()
  await expect(page.getByRole("heading", { name: "Iniciar Sesión" })).toBeVisible()
}

test("el catálogo muestra publicaciones y permite buscar por título, autor e ISBN", async ({ page }) => {
  await mockBackend(page)
  await loadSeedState(page)
  await signIn(page)
  await openCatalog(page)

  await expect(page.getByText(`Mostrando ${SEED_BOOKS.length} libros`)).toBeVisible()
  await expect(page.locator("article")).toHaveCount(SEED_BOOKS.length)

  const search = page.getByPlaceholder("Buscar título, autor o género...")
  await search.fill("Rayuela")
  await search.press("Enter")
  await expect(page.getByText("Mostrando 1 libros")).toBeVisible()
  await expect(bookCard(page, "Rayuela")).toBeVisible()

  await search.fill("Jorge Luis Borges")
  await search.press("Enter")
  await expect(page.getByText("Mostrando 1 libros")).toBeVisible()
  await expect(bookCard(page, "El Aleph")).toBeVisible()

  await search.fill("9788437604572")
  await search.press("Enter")
  await expect(page.getByText("Mostrando 1 libros")).toBeVisible()
  await expect(bookCard(page, "Rayuela")).toBeVisible()
})

test("el catálogo filtra por categoría, estado y límite de puntos y puede restablecerse", async ({
  page,
}) => {
  await mockBackend(page)
  await loadSeedState(page)
  await signIn(page)
  await openCatalog(page)

  await page.getByRole("button", { name: "Ficción", exact: true }).click()
  await expect(page.getByText("Mostrando 4 libros")).toBeVisible()
  await expect(bookCard(page, "Rayuela")).toBeVisible()
  await expect(bookCard(page, "El Aleph")).toBeVisible()

  await page.getByRole("button", { name: "Limpiar filtros" }).click()
  await page.getByRole("button", { name: "Filtros", exact: true }).click()
  await page.getByRole("button", { name: "Como nuevo", exact: true }).click()
  await expect(page.getByText("Mostrando 2 libros")).toBeVisible()

  const maxPoints = page.locator('input[type="range"]')
  await maxPoints.evaluate((element: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set
    setter?.call(element, "50")
    element.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await expect(page.getByText("Hasta 50 pts")).toBeVisible()
  await expect(page.getByText("Mostrando 1 libros")).toBeVisible()
  await expect(bookCard(page, "El principito")).toBeVisible()

  await page.getByRole("button", { name: "Limpiar filtros" }).click()
  await expect(page.getByText(`Mostrando ${SEED_BOOKS.length} libros`)).toBeVisible()
})

test("búsqueda vacía muestra estado sin coincidencias y permite recuperar el catálogo", async ({
  page,
}) => {
  await mockBackend(page)
  await loadSeedState(page)
  await signIn(page)
  await openCatalog(page)

  const search = page.getByPlaceholder("Buscar título, autor o género...")
  await search.fill("título inexistente para P5")
  await search.press("Enter")
  await expect(page.getByText("No encontramos libros con esos criterios")).toBeVisible()
  await expect(page.locator("article")).toHaveCount(0)

  await page.getByRole("button", { name: "Restablecer todos los filtros" }).click()
  await expect(page.getByText(`Mostrando ${SEED_BOOKS.length} libros`)).toBeVisible()
})

test("la ficha del catálogo presenta metadatos y disponibilidad del ejemplar", async ({ page }) => {
  const books = SEED_BOOKS.map((book) =>
    book.isbn === "9788420633114" ? { ...book, availability: "RESERVADO" as const } : book,
  )
  await mockBackend(page, { books })
  await loadSeedState(page, { books })
  await signIn(page)
  await openCatalog(page)

  await bookCard(page, "Rayuela").click()
  const details = page.locator("div.fixed.inset-0")
  await expect(details.getByRole("heading", { name: "Rayuela" })).toBeVisible()
  await expect(details).toContainText("Julio Cortázar")
  await expect(details).toContainText("ISBN: 9788437604572")
  await expect(details).toContainText("Cátedra")
  await expect(details).toContainText("Edición Cátedra con notas. Tablero de dirección intacto.")
  await page.getByRole("button").filter({ has: page.locator("svg.lucide-x") }).click()

  // Un libro reservado por otro usuario no figura en /disponibles, así que no se ofrece
  await expect(bookCard(page, "El Aleph")).toHaveCount(0)
})

test("Google Books completa los metadatos y sugiere puntos en una publicación", async ({ page }) => {
  await mockBackend(page)
  await loadSeedState(page)
  await signIn(page)
  await openPublishForm(page)

  await page.getByLabel("ISBN del libro *").fill("978-950-04-2146-1")
  await page.getByRole("button", { name: "Buscar", exact: true }).click()

  await expect(page.getByText("Libro verificado en Google Books")).toBeVisible()
  await expect(page.getByText("Ficciones")).toBeVisible()
  await expect(page.getByText("Jorge Luis Borges")).toBeVisible()
  await expect(page.getByLabel("Puntos solicitados *")).not.toHaveValue("")
  await expect(page.getByText("Emecé · 1944 · 176 págs.")).toBeVisible()
})

test("Google Books valida el ISBN antes de consultar y muestra un ISBN sin resultados", async ({
  page,
}) => {
  await mockBackend(page)
  await loadSeedState(page)
  await signIn(page)
  await openPublishForm(page)

  const isbn = page.getByLabel("ISBN del libro *")
  await isbn.fill("123")
  await page.getByRole("button", { name: "Buscar", exact: true }).click()
  await expect(page.getByRole("alert").filter({ hasText: "Google Books requiere" })).toContainText(
    "Google Books requiere un ISBN de 10 o 13 dígitos",
  )

  await isbn.fill("978-000-000-0000")
  await page.getByRole("button", { name: "Buscar", exact: true }).click()
  await expect(page.getByRole("alert").filter({ hasText: "No se encontró ningún libro" })).toBeVisible()
})

test("Google Books expone errores del proveedor sin ocultarlos", async ({ page }) => {
  await mockBackend(page)
  await loadSeedState(page)
  await signIn(page)
  await openPublishForm(page)

  await page.getByLabel("ISBN del libro *").fill("978-111-111-1111")
  await page.getByRole("button", { name: "Buscar", exact: true }).click()
  await expect(page.getByRole("alert").filter({ hasText: "Proveedor no disponible" })).toBeVisible()
})

test("el autocompletado comienza con dos caracteres y solo abre coincidencias disponibles", async ({
  page,
}) => {
  const books = SEED_BOOKS.map((book) =>
    book.isbn === "9788437604572" ? { ...book, availability: "RESERVADO" as const } : book,
  )
  await mockBackend(page, { books })
  await loadSeedState(page, { books })
  await signIn(page)
  await openCatalog(page)

  const search = page.getByPlaceholder("Buscar título, autor o género...")
  await search.fill("R")
  await expect(page.getByText("Sugerencias en el catálogo")).toHaveCount(0)

  await search.fill("Ray")
  await expect(page.getByText("Sugerencias en el catálogo")).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: /Rayuela/ }).filter({ hasText: "Julio Cortázar" }),
  ).toHaveCount(0)

  await search.fill("Ale")
  await expect(page.getByText("Sugerencias en el catálogo")).toBeVisible()
  const suggestion = page.getByRole("button", { name: /El Aleph/ }).filter({
    hasText: "Jorge Luis Borges",
  })
  await expect(suggestion).toBeVisible()
  await suggestion.click()
  await expect(page.locator("div.fixed.inset-0").getByRole("heading", { name: "El Aleph" })).toBeVisible()
})

test("el tracker sigue un libro por ISBN, muestra si está disponible y permite dejar de seguirlo", async ({
  page,
}) => {
  await mockBackend(page)
  await loadSeedState(page)
  await signIn(page)

  await page.locator("aside").getByRole("button", { name: "Tracker de Libros", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Tracker de Libros" })).toBeVisible()
  await page.getByRole("button", { name: "Seguir nuevo libro" }).click()

  // Buscar por título y elegir la edición (el seguimiento queda por ISBN)
  await page.getByLabel("ISBN o título").fill("Rayuela")
  await page.getByRole("button", { name: "Buscar", exact: true }).click()
  await page.getByRole("button", { name: /Rayuela/ }).filter({ hasText: "ISBN" }).first().click()
  await page.getByRole("button", { name: "Seguir este libro" }).click()

  const tracked = page.locator("article").filter({ hasText: "Rayuela" })
  await expect(tracked).toBeVisible()
  await expect(tracked).toContainText("ISBN")
  await expect(tracked).toContainText("Disponible ahora (1)")

  await tracked.getByRole("button", { name: "Dejar de seguir Rayuela" }).click()
  await expect(page.getByText("No tenés libros en seguimiento actualmente")).toBeVisible()
})

test("la cadena propuesta forma un ciclo cerrado con participantes distintos y muestra confirmaciones", async ({
  page,
}) => {
  await mockBackend(page)
  await loadSeedState(page)
  await signIn(page)
  await openChains(page)

  const card = chainCard(page)
  await expect(card).toBeVisible()
  await expect(card).toContainText("3 participantes coordinados")
  await expect(card.getByText(/Lucía Fernández \(Vos\)/)).toBeVisible()
  await expect(card.getByText("Mateo Gómez")).toBeVisible()
  await expect(card.getByText("Tomás Rivero")).toBeVisible()
  await expect(card.getByText("Clean Code")).toHaveCount(2)
  await expect(card.getByText("Rayuela")).toHaveCount(2)
  await expect(card.getByText("Sapiens: De animales a dioses")).toHaveCount(2)
  await expect(card.getByRole("button", { name: "Aceptar mi parte del circuito" })).toBeVisible()

  const [chain] = await persistedChains(page)
  expect(chain.steps).toHaveLength(3)
  expect(new Set(chain.steps.map((step) => step.userId)).size).toBe(3)
  for (let index = 0; index < chain.steps.length; index += 1) {
    const nextStep = chain.steps[(index + 1) % chain.steps.length]
    expect(chain.steps[index].givesBook.id).toBe(nextStep.receivesBook.id)
  }
})

test("la aceptación de cada participante mueve la cadena de propuesta a en curso y a completada", async ({
  page,
}) => {
  const chains = generateInitialChains(SEED_BOOKS, SEED_USERS).map((chain) => ({
    ...chain,
    steps: chain.steps.map((step) => ({ ...step, confirmed: false })),
  }))
  await mockBackend(page, { chains })
  await loadSeedState(page, { chains })

  // Orden de los pasos en generateInitialChains: Lucía (0), Mateo (2), Tomás (1)
  const orderedParticipants = [SEED_USERS[0], SEED_USERS[2], SEED_USERS[1]]

  for (let index = 0; index < orderedParticipants.length; index += 1) {
    const participant = orderedParticipants[index]
    await signIn(page, participant)
    await openChains(page)

    const card = chainCard(page)
    await expect(card).toBeVisible()
    await card.getByRole("button", { name: "Aceptar mi parte del circuito" }).click()

    // La confirmación pasa por la API: esperar a que el estado se actualice
    await expect.poll(async () => (await persistedChains(page))[0].steps[index].confirmed).toBe(true)
    const [updatedChain] = await persistedChains(page)
    if (index === 2) {
      expect(updatedChain.steps.map((step) => step.confirmed)).toEqual([true, true, true])
    }
    expect(updatedChain.status).toBe(index === 2 ? "COMPLETADA" : "EN_CURSO")
    if (index < 2) {
      await expect(card.getByText("Ya confirmaste tu participación. Esperando al resto de los integrantes.")).toBeVisible()
      await expect(card.getByRole("button", { name: "Aceptar mi parte del circuito" })).toHaveCount(0)
    } else {
      await expect(card.getByText("Cadena Completada")).toBeVisible()
      await expect(card.getByRole("button", { name: "Aceptar mi parte del circuito" })).toHaveCount(0)
    }

    if (index < 2) await logout(page)
  }
})

test("rechazar una cadena la cancela de forma persistente y bloquea acciones posteriores", async ({
  page,
}) => {
  await mockBackend(page)
  await loadSeedState(page)
  await signIn(page)
  await openChains(page)

  const card = chainCard(page)
  await card.getByRole("button", { name: "Rechazar" }).click()

  await expect(card.getByText("Cadena Cancelada")).toBeVisible()
  await expect(card.getByRole("button", { name: "Rechazar" })).toHaveCount(0)
  await expect(card.getByRole("button", { name: "Aceptar mi parte del circuito" })).toHaveCount(0)
  await expect.poll(async () => (await persistedChains(page))[0].status).toBe("CANCELADA")

  await page.reload()
  await openChains(page)
  await expect(chainCard(page).getByText("Cadena Cancelada")).toBeVisible()
})

test("las cadenas se muestran solo a sus participantes y se maneja la ausencia de ciclos", async ({
  page,
}) => {
  await mockBackend(page)
  await loadSeedState(page)
  await signIn(page, SEED_USERS[3]) // Valentina Sosa (no participa en la cadena de 3)
  await openChains(page)
  await expect(page.getByText("No hay cadenas activas en este momento")).toBeVisible()
  await expect(page.getByRole("heading", { name: /Cadena Triangular de Intercambio/ })).toHaveCount(0)
})

test("no detecta ni muestra una cadena si falta un libro disponible para cerrar el ciclo", async ({
  page,
}) => {
  const noCycleBooks = SEED_BOOKS.map((book) =>
    book.ownerId === "mateo@mercadolibro.demo" ? { ...book, availability: "INTERCAMBIADO" as const } : book,
  )
  const noCycleChains = generateInitialChains(noCycleBooks, SEED_USERS)
  expect(noCycleChains).toHaveLength(0)

  await mockBackend(page, { books: noCycleBooks, chains: noCycleChains })
  await loadSeedState(page, { books: noCycleBooks, chains: noCycleChains })
  await signIn(page)
  await openChains(page)
  await expect(page.getByText("No hay cadenas activas en este momento")).toBeVisible()
  await expect(page.getByRole("heading", { name: /Cadena Triangular de Intercambio/ })).toHaveCount(0)
})

async function createBackendContext(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL: process.env.P5_API_URL,
  })
}

async function registerBackendUser(api: APIRequestContext, suffix: string) {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const data = {
    nombre: `P5 ${suffix} ${uniqueId}`,
    email: `p5-${suffix.toLowerCase()}-${uniqueId}@example.test`,
    contrasenia: `P5-${suffix}-Ab!`,
  }
  const response = await api.post("/api/auth/registro", { data })
  expect(response.status()).toBe(201)
  return {
    ...data,
    token: ((await response.json()) as { token: string }).token,
  }
}

test.describe("contratos REST de cadenas", () => {
  test("crea una cadena y la completa con la aceptación de sus participantes", async () => {
    test.skip(!process.env.P5_API_URL, "Definí P5_API_URL para ejecutar la capa REST.")
    const api = await createBackendContext()
    try {
      const first = await registerBackendUser(api, "Uno")
      const second = await registerBackendUser(api, "Dos")
      const create = await api.post("/api/cadenaIntercambio", {
        headers: { Authorization: `Bearer ${first.token}` },
        data: { participantesEmails: [first.email, second.email], puntosBonus: 75 },
      })
      expect(create.status()).toBe(201)
      const chain = (await create.json()) as {
        id: string
        puntosBonus: number
        estado: string
        participantesEmails: string[]
      }
      expect(chain).toMatchObject({
        puntosBonus: 75,
        estado: "PROPUESTA",
        participantesEmails: expect.arrayContaining([first.email, second.email]),
      })

      const firstAcceptance = await api.patch(
        `/api/cadenaIntercambio/${chain.id}/aceptar`,
        { headers: { Authorization: `Bearer ${first.token}` } },
      )
      expect(firstAcceptance.status()).toBe(200)
      await expect(firstAcceptance.json()).resolves.toMatchObject({ estado: "EN_CURSO" })

      const secondAcceptance = await api.patch(
        `/api/cadenaIntercambio/${chain.id}/aceptar`,
        { headers: { Authorization: `Bearer ${second.token}` } },
      )
      expect(secondAcceptance.status()).toBe(200)
      await expect(secondAcceptance.json()).resolves.toMatchObject({ estado: "COMPLETADA" })
    } finally {
      await api.dispose()
    }
  })

  test("rechaza una cadena, la cancela y la expone en el listado autenticado", async () => {
    test.skip(!process.env.P5_API_URL, "Definí P5_API_URL para ejecutar la capa REST.")
    const api = await createBackendContext()
    try {
      const user = await registerBackendUser(api, "Rechazo")
      const create = await api.post("/api/cadenaIntercambio", {
        headers: { Authorization: `Bearer ${user.token}` },
        data: { participantesEmails: [user.email], puntosBonus: 50 },
      })
      expect(create.status()).toBe(201)
      const chain = (await create.json()) as { id: string }

      const rejection = await api.patch(
        `/api/cadenaIntercambio/${chain.id}/rechazar`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      )
      expect(rejection.status()).toBe(200)
      await expect(rejection.json()).resolves.toMatchObject({ estado: "CANCELADA" })

      const list = await api.get("/api/cadenaIntercambio", {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      expect(list.status()).toBe(200)
      await expect(list.json()).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: chain.id, estado: "CANCELADA" })]),
      )
    } finally {
      await api.dispose()
    }
  })
})
