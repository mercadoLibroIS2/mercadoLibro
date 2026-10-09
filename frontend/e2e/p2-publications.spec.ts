import { expect, test, type Page, type Route } from "@playwright/test"
import { SEED_BOOKS, SEED_USERS } from "../lib/seed-data"

const testUser = {
  id: "user-1",
  aud: "authenticated",
  role: "authenticated",
  email: "franco@mercadolibro.com",
  email_confirmed_at: "2026-01-01T00:00:00.000Z",
  phone: "",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { name: "Franco Papa", username: "francopapa" },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
}

const testSession = {
  access_token: "playwright-publications-access-token",
  refresh_token: "playwright-publications-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: testUser,
}

async function mockSupabase(page: Page, options: { reservedIsbn?: string } = {}) {
  const database = {
    books: SEED_BOOKS.map((book) => ({
      isbn: book.isbn,
      google_books_id: `seed-${book.isbn}`,
      titulo: book.title,
      autores: book.author,
      puntuacion_externa: book.externalRating || 4.5,
      valor_referencia: book.referencePrice || 0,
    })),
    publications: SEED_BOOKS.map((book) => ({
      isbn: book.isbn,
      email_propietario: SEED_USERS.find((user) => user.id === book.ownerId)!.email,
      hora_publicacion: book.createdAt,
      estado_fisico: ({
        Nuevo: "NUEVO",
        "Como nuevo": "COMO_NUEVO",
        "Muy bueno": "BUEN_ESTADO",
        Bueno: "BUEN_ESTADO",
        Aceptable: "ACEPTABLE",
        "Con marcas": "DETERIORADO",
      } as Record<string, string>)[book.condition],
      valor_puntos_solicitado: book.points,
      valor_referencia_calculado: book.referencePrice,
      comentario: book.description,
      estado_publicacion: book.isbn === options.reservedIsbn ? "RESERVADA" : "DISPONIBLE",
      color_semaforo: "SIN_REFERENCIA",
    })),
    users: SEED_USERS.map((user) => ({
      id: user.id,
      email: user.email,
      nombre: user.name,
      nombre_usuario: user.username,
      saldo_total: user.availablePoints,
      saldo_reservado: user.reservedPoints,
      reputacion_promedio: user.rating,
    })),
    categories: SEED_BOOKS.map((book) => ({
      isbn: book.isbn,
      nombre_categoria: book.category,
    })),
  }

  await page.route("**/auth/v1/**", async (route: Route) => {
    const url = new URL(route.request().url())

    if (url.pathname.endsWith("/auth/v1/token")) {
      await route.fulfill({ json: testSession })
      return
    }
    if (url.pathname.endsWith("/auth/v1/user")) {
      await route.fulfill({ json: testUser })
      return
    }
    if (url.pathname.endsWith("/auth/v1/logout")) {
      await route.fulfill({ status: 204, body: "" })
      return
    }

    await route.fulfill({ status: 404, json: { message: "Unexpected mocked Auth request" } })
  })

  await page.route("**/rest/v1/**", async (route) => {
    const url = new URL(route.request().url())
    const table = url.pathname.split("/").pop()
    const method = route.request().method()
    const filters = url.searchParams
    const matches = (row: Record<string, unknown>) =>
      [...filters.entries()].every(([key, filter]) => {
        if (key === "select" || key === "order" || key === "on_conflict") return true
        if (key === "estado_publicacion" && filter.startsWith("neq.")) return row[key] !== filter.slice(4)
        if (filter.startsWith("eq.")) return String(row[key]) === filter.slice(3)
        if (filter.startsWith("in.(")) return filter.slice(4, -1).split(",").includes(String(row[key]))
        return true
      })
    const fulfillRows = (rows: Record<string, unknown>[]) => {
      const expectsObject = route.request().headers().accept?.includes("vnd.pgrst.object")
      return route.fulfill({ json: expectsObject ? rows[0] || {} : rows })
    }

    if (table === "publicacion" && method === "GET") {
      await fulfillRows(database.publications.filter(matches))
    } else if (table === "publicacion" && method === "POST") {
      const row = route.request().postDataJSON() as Record<string, unknown>
      database.publications.unshift(row as typeof database.publications[number])
      await fulfillRows([row])
    } else if (table === "publicacion" && method === "PATCH") {
      const patch = route.request().postDataJSON() as Record<string, unknown>
      const rows = database.publications.filter(matches)
      rows.forEach((row) => Object.assign(row, patch))
      await fulfillRows(rows)
    } else if (table === "libro" && method === "POST") {
      const row = route.request().postDataJSON() as Record<string, unknown>
      database.books.push(row as typeof database.books[number])
      await fulfillRows([row])
    } else if (table === "libro") {
      await fulfillRows(database.books.filter(matches))
    } else if (table === "usuario") {
      await fulfillRows(database.users.filter(matches))
    } else if (table === "libro_categoria") {
      await fulfillRows(database.categories.filter(matches))
    } else {
      await route.fulfill({ json: [] })
    }
  })
  return database
}

async function signIn(page: Page) {
  await page.goto("/")
  await page.getByLabel("Email o nombre de usuario").fill(testUser.email)
  await page.getByLabel("Contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()
  await expect(page.getByRole("button", { name: /Franco Papa/i })).toBeVisible()
  await page.locator("aside").getByRole("button", { name: "Catálogo", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Libros Disponibles" })).toBeVisible()
}

function bookCard(page: Page, title: string) {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  })
}

async function openPublishForm(page: Page) {
  await page.getByRole("button", { name: "Publicar un Libro", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Publicar un Libro" })).toBeVisible()
}

test("el catálogo lista todas las publicaciones y permite buscar, filtrar y recuperar resultados vacíos", async ({
  page,
}) => {
  await mockSupabase(page)
  await signIn(page)

  await expect(page.getByText("Mostrando 10 libros")).toBeVisible()
  await expect(page.locator("article")).toHaveCount(10)
  await expect(bookCard(page, "Rayuela")).toBeVisible()
  await expect(bookCard(page, "Ficciones")).toBeVisible()

  await page.getByRole("button", { name: "Ciencia", exact: true }).click()
  await expect(page.getByText("Mostrando 2 libros")).toBeVisible()
  await expect(bookCard(page, "Cosmos")).toBeVisible()
  await expect(bookCard(page, "Rayuela")).toHaveCount(0)

  const search = page.getByPlaceholder("Buscar título, autor o género...")
  await search.fill("libro sin coincidencias")
  await search.press("Enter")
  await expect(page.getByText("No encontramos libros con esos criterios")).toBeVisible()
  await page.getByRole("button", { name: "Restablecer todos los filtros" }).click()

  await expect(page.getByText("Mostrando 10 libros")).toBeVisible()
  await expect(bookCard(page, "Rayuela")).toBeVisible()
})

test("publicar valida campos obligatorios y exige puntos enteros positivos, incluso en los bordes", async ({
  page,
}) => {
  const database = await mockSupabase(page)
  await signIn(page)
  await openPublishForm(page)

  await expect(page.getByText("INTEGRACIÓN GOOGLE BOOKS NO IMPLEMENTADA TODAVÍA")).toBeVisible()
  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  await expect(page.getByText("El ISBN es obligatorio")).toBeVisible()
  await expect(page.getByText("Ingresá el valor en puntos")).toBeVisible()

  const newIsbn = "979-1-23456-789-0"
  await page.getByLabel("ISBN del libro *").fill(newIsbn)
  await page.getByLabel("Puntos solicitados *").fill("0")
  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  await expect(page.getByText("Ingresá un número de puntos válido mayor a 0")).toBeVisible()

  await page.getByLabel("Puntos solicitados *").fill("-1")
  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  await expect(page.getByText("Ingresá un número de puntos válido mayor a 0")).toBeVisible()

  await page.getByLabel("Puntos solicitados *").fill("1.5")
  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  await expect(page.getByText("Ingresá un número de puntos válido mayor a 0")).toBeVisible()
  await expect(database.publications).toHaveLength(SEED_BOOKS.length)

  await page.getByLabel("ISBN del libro *").fill(newIsbn)
  await page.getByLabel("Puntos solicitados *").fill("1")
  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  await expect(page.getByText("se publicó y guardó en Supabase.")).toBeVisible()
  await expect(database.publications).toHaveLength(SEED_BOOKS.length + 1)
  expect(database.publications[0]).toMatchObject({
    isbn: newIsbn,
    email_propietario: testUser.email,
    valor_puntos_solicitado: 1,
    estado_publicacion: "DISPONIBLE",
  })
  expect(database.publications[0]).not.toHaveProperty("titulo")
  expect(database.publications[0]).not.toHaveProperty("autores")
  expect(database.books.at(-1)).toMatchObject({
    isbn: newIsbn,
    google_books_id: null,
    titulo: null,
    autores: null,
  })
})

test("publicar registra todos los datos opcionales y presenta el libro en el catálogo", async ({ page }) => {
  const database = await mockSupabase(page)
  await signIn(page)
  await openPublishForm(page)

  await page.getByLabel("ISBN del libro *").fill(SEED_BOOKS[0].isbn)
  await page.getByLabel("Estado físico *").selectOption("Como nuevo")
  await page.getByLabel("Puntos solicitados *").fill("120")
  await page.getByLabel("Descripción y estado (opcional)").fill("Ejemplar cuidado, sin marcas.")
  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  await expect(page.getByText("se publicó y guardó en Supabase.")).toBeVisible()

  const publishedBook = bookCard(page, "Rayuela").first()
  await expect(publishedBook).toBeVisible()
  await expect(publishedBook).toContainText("Como nuevo")
  await expect(publishedBook).toContainText("120 pts")

  await publishedBook.click()
  const detail = page.locator("div.fixed.inset-0")
  await expect(detail.getByRole("heading", { name: "Rayuela" })).toBeVisible()
  await expect(detail).toContainText(`ISBN: ${SEED_BOOKS[0].isbn}`)
  await expect(detail).toContainText("Ejemplar cuidado, sin marcas.")

  expect(database.publications[0]).toMatchObject({
    isbn: SEED_BOOKS[0].isbn,
    email_propietario: testUser.email,
    estado_fisico: "COMO_NUEVO",
    valor_puntos_solicitado: 120,
    comentario: "Ejemplar cuidado, sin marcas.",
  })
})

test("el dueño puede editar una publicación y se conservan los valores existentes como punto de partida", async ({
  page,
}) => {
  const database = await mockSupabase(page)
  await signIn(page)
  await bookCard(page, "Rayuela").click()

  const detail = page.locator("div.fixed.inset-0")
  await detail.getByRole("button", { name: "Modificar Publicación" }).click()
  await expect(page.getByRole("heading", { name: "Modificar Publicación" })).toBeVisible()
  await expect(page.getByLabel("ISBN del libro *")).toHaveValue(SEED_BOOKS[0].isbn)
  await expect(page.getByLabel("Puntos solicitados *")).toHaveValue("50")

  await page.getByLabel("Puntos solicitados *").fill("55")
  await page.getByRole("button", { name: "Guardar cambios" }).click()

  await expect(bookCard(page, "Rayuela")).toBeVisible()
  expect(database.publications.find((publication) => publication.isbn === SEED_BOOKS[0].isbn))
    .toMatchObject({ valor_puntos_solicitado: 55 })
})

test("solo el dueño ve acciones de edición y eliminación", async ({ page }) => {
  await mockSupabase(page)
  await signIn(page)
  await bookCard(page, "Ficciones").click()

  const detail = page.locator("div.fixed.inset-0")
  await expect(detail.getByRole("button", { name: "Modificar Publicación" })).toHaveCount(0)
  await expect(detail.getByRole("button", { name: "Eliminar", exact: true })).toHaveCount(0)
  await expect(detail.getByRole("button", { name: /Solicitar/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole("button", { name: /Franco Papa/i })).toBeVisible()
  await bookCard(page, "Rayuela").click()
  const ownedDetail = page.locator("div.fixed.inset-0")
  await expect(ownedDetail.getByRole("button", { name: "Modificar Publicación" })).toBeVisible()
  await expect(ownedDetail.getByRole("button", { name: "Eliminar", exact: true })).toBeVisible()
})

test("el dueño confirma la eliminación y la publicación deja de aparecer", async ({ page }) => {
  const database = await mockSupabase(page)
  await signIn(page)
  await bookCard(page, "Cosmos").click()

  const detail = page.locator("div.fixed.inset-0")
  await detail.getByRole("button", { name: "Eliminar", exact: true }).click()
  await expect(detail.getByRole("button", { name: "¿Confirmar?" })).toBeVisible()
  await detail.getByRole("button", { name: "¿Confirmar?" }).click()

  await expect(page.getByText("Publicación eliminada de Supabase.")).toBeVisible()
  await expect(bookCard(page, "Cosmos")).toHaveCount(0)
  expect(database.publications.find((publication) => publication.isbn === SEED_BOOKS[7].isbn))
    .toMatchObject({ estado_publicacion: "ELIMINADA" })
})

test("no permite eliminar una publicación reservada con un intercambio en curso", async ({ page }) => {
  await page.addInitScript(
    ({ users, books }) => {
      localStorage.setItem(
        "mercadolibro_v2_data",
        JSON.stringify({ currentUser: null, users, books }),
      )
    },
    {
      users: SEED_USERS,
      books: SEED_BOOKS.map((book) =>
        book.id === "book-1" ? { ...book, availability: "RESERVADO" } : book,
      ),
    },
  )
  await mockSupabase(page, { reservedIsbn: SEED_BOOKS[0].isbn })
  await signIn(page)
  await bookCard(page, "Rayuela").click()

  const detail = page.locator("div.fixed.inset-0")
  await detail.getByRole("button", { name: "Eliminar", exact: true }).click()
  await detail.getByRole("button", { name: "¿Confirmar?" }).click()

  await expect(page.getByText("No se puede eliminar un libro con intercambio en curso (RF04).")).toBeVisible()
  await expect(bookCard(page, "Rayuela")).toBeVisible()
})