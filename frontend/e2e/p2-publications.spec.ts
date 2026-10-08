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

async function mockSupabase(page: Page) {
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
    await route.fulfill({ json: [] })
  })
}

async function signIn(page: Page) {
  await page.goto("/")
  await page.getByLabel("Email", { exact: true }).fill(testUser.email)
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
  await mockSupabase(page)
  await signIn(page)
  await openPublishForm(page)

  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  await expect(page.getByText("El título del libro es obligatorio")).toBeVisible()
  await expect(page.getByText("El autor es obligatorio")).toBeVisible()
  await expect(page.getByText("Ingresá el valor en puntos")).toBeVisible()

  await page.getByLabel("Título del libro *").fill("   ")
  await page.getByLabel("Autor *").fill("   ")
  await page.getByLabel("Puntos solicitados *").fill("0")
  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  await expect(page.getByText("El título del libro es obligatorio")).toBeVisible()
  await expect(page.getByText("El autor es obligatorio")).toBeVisible()
  await expect(page.getByText("Ingresá un número de puntos válido mayor a 0")).toBeVisible()

  await page.getByLabel("Título del libro *").fill("Libro de prueba mínimo")
  await page.getByLabel("Autor *").fill("Autor de prueba")
  await page.getByLabel("Puntos solicitados *").fill("-1")
  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  await expect(page.getByText("Ingresá un número de puntos válido mayor a 0")).toBeVisible()

  await page.getByLabel("Puntos solicitados *").fill("1.5")
  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  await expect(page.getByText("Ingresá un número de puntos válido mayor a 0")).toBeVisible()
  await expect(bookCard(page, "Libro de prueba mínimo")).toHaveCount(0)

  await page.getByLabel("Puntos solicitados *").fill("1")
  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  await expect(bookCard(page, "Libro de prueba mínimo")).toBeVisible()

  const savedBook = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("mercadolibro_v2_data") || "{}")
    return saved.books.find((book: { title: string }) => book.title === "Libro de prueba mínimo")
  })
  expect(savedBook).toMatchObject({
    title: "Libro de prueba mínimo",
    author: "Autor de prueba",
    points: 1,
    ownerId: testUser.id,
    availability: "DISPONIBLE",
  })
})

test("publicar registra todos los datos opcionales y presenta el libro en el catálogo", async ({ page }) => {
  await mockSupabase(page)
  await signIn(page)
  await openPublishForm(page)

  await page.getByLabel("Título del libro *").fill("   La casa de los libros   ")
  await page.getByLabel("Autor *").fill("   Ana Escritora   ")
  await page.getByLabel("ISBN (opcional)").fill("978-1-23456-789-0")
  await page.getByLabel("Categoría *").selectOption("Historia")
  await page.getByLabel("Estado físico *").selectOption("Como nuevo")
  await page.getByLabel("Edición (opcional)").fill("Edición de prueba 2026")
  await page.getByLabel("Puntos solicitados *").fill("120")
  await page.getByLabel("Descripción y estado (opcional)").fill("Ejemplar cuidado, sin marcas.")
  await page.getByLabel("Foto de portada (URL opcional)").fill("https://example.com/portada.jpg")
  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()

  const publishedBook = bookCard(page, "La casa de los libros")
  await expect(publishedBook).toBeVisible()
  await expect(publishedBook).toContainText("Ana Escritora")
  await expect(publishedBook).toContainText("Como nuevo")
  await expect(publishedBook).toContainText("120 pts")

  await publishedBook.click()
  const detail = page.locator("div.fixed.inset-0")
  await expect(detail.getByRole("heading", { name: "La casa de los libros" })).toBeVisible()
  await expect(detail).toContainText("ISBN: 978-1-23456-789-0")
  await expect(detail).toContainText("Ejemplar cuidado, sin marcas.")

  const savedBook = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("mercadolibro_v2_data") || "{}")
    return saved.books.find((book: { title: string }) => book.title === "La casa de los libros")
  })
  expect(savedBook).toMatchObject({
    title: "La casa de los libros",
    author: "Ana Escritora",
    isbn: "978-1-23456-789-0",
    category: "Historia",
    condition: "Como nuevo",
    edition: "Edición de prueba 2026",
    points: 120,
    description: "Ejemplar cuidado, sin marcas.",
    coverUrl: "https://example.com/portada.jpg",
    ownerId: testUser.id,
  })
})

test("el dueño puede editar una publicación y se conservan los valores existentes como punto de partida", async ({
  page,
}) => {
  await mockSupabase(page)
  await signIn(page)
  await bookCard(page, "Rayuela").click()

  const detail = page.locator("div.fixed.inset-0")
  await detail.getByRole("button", { name: "Modificar Publicación" }).click()
  await expect(page.getByRole("heading", { name: "Modificar Publicación" })).toBeVisible()
  await expect(page.getByLabel("Título del libro *")).toHaveValue("Rayuela")
  await expect(page.getByLabel("Autor *")).toHaveValue("Julio Cortázar")
  await expect(page.getByLabel("Puntos solicitados *")).toHaveValue("50")

  await page.getByLabel("Título del libro *").fill("Rayuela - edición revisada")
  await page.getByLabel("Puntos solicitados *").fill("55")
  await page.getByRole("button", { name: "Guardar cambios" }).click()

  await expect(bookCard(page, "Rayuela - edición revisada")).toBeVisible()
  await expect(bookCard(page, "Rayuela")).toHaveCount(0)
  const savedBook = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("mercadolibro_v2_data") || "{}")
    return saved.books.find((book: { id: string }) => book.id === "book-1")
  })
  expect(savedBook).toMatchObject({ title: "Rayuela - edición revisada", points: 55 })
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
  await mockSupabase(page)
  await signIn(page)
  await bookCard(page, "Cosmos").click()

  const detail = page.locator("div.fixed.inset-0")
  await detail.getByRole("button", { name: "Eliminar", exact: true }).click()
  await expect(detail.getByRole("button", { name: "¿Confirmar?" })).toBeVisible()
  await detail.getByRole("button", { name: "¿Confirmar?" }).click()

  await expect(page.getByText("Publicación eliminada.")).toBeVisible()
  await expect(bookCard(page, "Cosmos")).toHaveCount(0)
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
  await mockSupabase(page)
  await signIn(page)
  await bookCard(page, "Rayuela").click()

  const detail = page.locator("div.fixed.inset-0")
  await detail.getByRole("button", { name: "Eliminar", exact: true }).click()
  await detail.getByRole("button", { name: "¿Confirmar?" }).click()

  await expect(page.getByText("No se puede eliminar un libro con intercambio en curso (RF04).")).toBeVisible()
  await expect(bookCard(page, "Rayuela")).toBeVisible()
})