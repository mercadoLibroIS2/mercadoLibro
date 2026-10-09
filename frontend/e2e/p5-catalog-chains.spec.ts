import { expect, test, type Page, type Route } from "@playwright/test"
import { generateInitialChains } from "../lib/chain-detector"
import { SEED_BOOKS, SEED_USERS } from "../lib/seed-data"
import type { Book, TradeChain, User } from "../lib/mercado-types"

const STORAGE_KEY = "mercadolibro_v2_data"

const usersByEmail = new Map(SEED_USERS.map((user) => [user.email, user]))

function authUser(user: User) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: "2026-01-01T00:00:00.000Z",
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { name: user.name, username: user.username },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  }
}

async function mockSupabase(page: Page) {
  await page.route("**/auth/v1/**", async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const body = request.postDataJSON?.() as Record<string, unknown> | undefined

    if (url.pathname.endsWith("/auth/v1/token")) {
      const user = usersByEmail.get(String(body?.email || ""))
      if (!user) {
        await route.fulfill({
          status: 400,
          json: { code: "invalid_credentials", msg: "Invalid login credentials" },
        })
        return
      }
      const sbUser = authUser(user)
      await route.fulfill({
        json: {
          access_token: `p5-token-${user.id}`,
          refresh_token: `p5-refresh-${user.id}`,
          expires_in: 3600,
          token_type: "bearer",
          user: sbUser,
        },
      })
      return
    }

    if (url.pathname.endsWith("/auth/v1/user")) {
      const accessToken = request.headers().authorization?.replace(/^Bearer\s+/i, "")
      const userId = accessToken?.replace(/^p5-token-/, "")
      const user = SEED_USERS.find((candidate) => candidate.id === userId)
      await route.fulfill({ json: authUser(user || SEED_USERS[0]) })
      return
    }

    if (url.pathname.endsWith("/auth/v1/logout")) {
      await route.fulfill({ status: 204, body: "" })
      return
    }

    await route.fulfill({ status: 404, json: { message: "Unexpected mocked Auth request" } })
  })

  await page.route("**/rest/v1/**", async (route) => {
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
  await mockSupabase(page)
  await loadSeedState(page)
  await signIn(page)
  await openCatalog(page)

  await expect(page.getByText("Mostrando 10 libros")).toBeVisible()
  await expect(page.locator("article")).toHaveCount(10)

  const search = page.getByPlaceholder("Buscar título, autor o género...")
  await search.fill("Rayuela")
  await search.press("Enter")
  await expect(page.getByText("Mostrando 1 libros")).toBeVisible()
  await expect(bookCard(page, "Rayuela")).toBeVisible()

  await search.fill("Jorge Luis Borges")
  await search.press("Enter")
  await expect(page.getByText("Mostrando 2 libros")).toBeVisible()
  await expect(bookCard(page, "Ficciones")).toBeVisible()
  await expect(bookCard(page, "El Aleph")).toBeVisible()

  await search.fill("978-84-376-0457-2")
  await search.press("Enter")
  await expect(page.getByText("Mostrando 1 libros")).toBeVisible()
  await expect(bookCard(page, "Rayuela")).toBeVisible()
})

test("el catálogo filtra por categoría, estado y límite de puntos y puede restablecerse", async ({
  page,
}) => {
  await mockSupabase(page)
  await loadSeedState(page)
  await signIn(page)
  await openCatalog(page)

  await page.getByRole("button", { name: "Ciencia", exact: true }).click()
  await expect(page.getByText("Mostrando 2 libros")).toBeVisible()
  await expect(bookCard(page, "Cosmos")).toBeVisible()
  await expect(bookCard(page, "Una breve historia del tiempo")).toBeVisible()

  await page.getByRole("button", { name: "Limpiar filtros" }).click()
  await page.getByRole("button", { name: "Filtros", exact: true }).click()
  await page.getByRole("button", { name: "Muy bueno", exact: true }).click()
  await expect(page.getByText("Mostrando 4 libros")).toBeVisible()

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
  await expect(page.getByText("Mostrando 2 libros")).toBeVisible()

  await page.getByRole("button", { name: "Limpiar filtros" }).click()
  await expect(page.getByText("Mostrando 10 libros")).toBeVisible()
})

test("búsqueda vacía muestra estado sin coincidencias y permite recuperar el catálogo", async ({
  page,
}) => {
  await mockSupabase(page)
  await loadSeedState(page)
  await signIn(page)
  await openCatalog(page)

  const search = page.getByPlaceholder("Buscar título, autor o género...")
  await search.fill("título inexistente para P5")
  await search.press("Enter")
  await expect(page.getByText("No encontramos libros con esos criterios")).toBeVisible()
  await expect(page.locator("article")).toHaveCount(0)

  await page.getByRole("button", { name: "Restablecer todos los filtros" }).click()
  await expect(page.getByText("Mostrando 10 libros")).toBeVisible()
})

test("la ficha del catálogo presenta metadatos y disponibilidad del ejemplar", async ({ page }) => {
  const books = SEED_BOOKS.map((book) =>
    book.id === "book-2" ? { ...book, availability: "RESERVADO" as const } : book,
  )
  await mockSupabase(page)
  await loadSeedState(page, { books })
  await signIn(page)
  await openCatalog(page)

  await bookCard(page, "Rayuela").click()
  const details = page.locator("div.fixed.inset-0")
  await expect(details.getByRole("heading", { name: "Rayuela" })).toBeVisible()
  await expect(details).toContainText("Julio Cortázar")
  await expect(details).toContainText("ISBN: 978-84-376-0457-2")
  await expect(details).toContainText("Edición Cátedra Conmemorativa 2021")
  await expect(details).toContainText("Novela cumbre de la literatura")
  await page.getByRole("button").filter({ has: page.locator("svg.lucide-x") }).click()

  await bookCard(page, "Ficciones").click()
  const reservedDetails = page.locator("div.fixed.inset-0")
  await expect(reservedDetails).toContainText("Publicación reservada o intercambiada.")
  await expect(reservedDetails.getByRole("button", { name: /Solicitar/ })).toHaveCount(0)
})

test("el autocompletado comienza con dos caracteres y solo abre coincidencias disponibles", async ({
  page,
}) => {
  const books = SEED_BOOKS.map((book) =>
    book.id === "book-1" ? { ...book, availability: "RESERVADO" as const } : book,
  )
  await mockSupabase(page)
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

  await search.fill("Fic")
  await expect(page.getByText("Sugerencias en el catálogo")).toBeVisible()
  const suggestion = page.getByRole("button", { name: /Ficciones/ }).filter({
    hasText: "Jorge Luis Borges",
  })
  await expect(suggestion).toBeVisible()
  await suggestion.click()
  await expect(page.locator("div.fixed.inset-0").getByRole("heading", { name: "Ficciones" })).toBeVisible()
})

test("la cadena propuesta forma un ciclo cerrado con participantes distintos y muestra confirmaciones", async ({
  page,
}) => {
  await mockSupabase(page)
  await loadSeedState(page)
  await signIn(page)
  await openChains(page)

  const card = chainCard(page)
  await expect(card).toBeVisible()
  await expect(card).toContainText("3 participantes coordinados")
  await expect(card.getByText(/Franco Papa \(Vos\)/)).toBeVisible()
  await expect(card.getByText("Miguel Bartesaghi")).toBeVisible()
  await expect(card.getByText("Camila García")).toBeVisible()
  await expect(card.getByText("Rayuela")).toHaveCount(2)
  await expect(card.getByText("Ficciones")).toHaveCount(2)
  await expect(card.getByText("Sapiens: De animales a dioses")).toHaveCount(2)
  await expect(card.getByRole("button", { name: "Aceptar mi parte del circuito" })).toBeVisible()

  const [chain] = await persistedChains(page)
  expect(chain.steps).toHaveLength(3)
  expect(new Set(chain.steps.map((step) => step.userId)).size).toBe(3)
  for (let index = 0; index < chain.steps.length; index += 1) {
    const nextStep = chain.steps[(index + 1) % chain.steps.length]
    expect(chain.steps[index].receivesBook.id).toBe(nextStep.givesBook.id)
  }
})

test("la aceptación de cada participante mueve la cadena de propuesta a en curso y a completada", async ({
  page,
}) => {
  const chains = generateInitialChains(SEED_BOOKS, SEED_USERS).map((chain) => ({
    ...chain,
    steps: chain.steps.map((step) => ({ ...step, confirmed: false })),
  }))
  await mockSupabase(page)
  await loadSeedState(page, { chains })

  for (let index = 0; index < 3; index += 1) {
    const participant = SEED_USERS[index]
    await signIn(page, participant)
    await openChains(page)

    const card = chainCard(page)
    await expect(card).toBeVisible()
    await card.getByRole("button", { name: "Aceptar mi parte del circuito" }).click()

    const [updatedChain] = await persistedChains(page)
    expect(updatedChain.steps[index].confirmed).toBe(true)
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
  await mockSupabase(page)
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
  await mockSupabase(page)
  await loadSeedState(page)
  await signIn(page, SEED_USERS[3])
  await openChains(page)
  await expect(page.getByText("No hay cadenas activas en este momento")).toBeVisible()
  await expect(page.getByRole("heading", { name: /Cadena Triangular de Intercambio/ })).toHaveCount(0)
})

test("no detecta ni muestra una cadena si falta un libro disponible para cerrar el ciclo", async ({
  page,
}) => {
  const noCycleBooks = SEED_BOOKS.map((book) =>
    book.ownerId === "user-3" ? { ...book, availability: "INTERCAMBIADO" as const } : book,
  )
  const noCycleChains = generateInitialChains(noCycleBooks, SEED_USERS)
  expect(noCycleChains).toHaveLength(0)

  await mockSupabase(page)
  await loadSeedState(page, { books: noCycleBooks, chains: noCycleChains })
  await signIn(page)
  await openChains(page)
  await expect(page.getByText("No hay cadenas activas en este momento")).toBeVisible()
  await expect(page.getByRole("heading", { name: /Cadena Triangular de Intercambio/ })).toHaveCount(0)
})
