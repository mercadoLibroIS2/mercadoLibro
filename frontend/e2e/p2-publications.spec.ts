import { expect, test, type Page, type Route } from "@playwright/test"
import { SEED_BOOKS, SEED_USERS } from "../lib/seed-data"
import { CONDITION_TO_ESTADO, type EstadoFisico } from "../lib/api"

const STORAGE_KEY = "mercadolibro_demo_clean_v5"
const testUser = SEED_USERS[0] // Lucía Fernández (lucia@mercadolibro.demo)

async function mockBackend(page: Page, options: { skipInitialAvailableFetch?: boolean } = {}) {
  const database = {
    publications: SEED_BOOKS.map((book) => ({
      isbn: book.isbn,
      email_propietario: book.ownerId,
      hora_publicacion: book.createdAt,
      titulo: book.title,
      autor: book.author,
      portadaUrl: book.coverUrl || "",
      estado_fisico: CONDITION_TO_ESTADO[book.condition] || "BUEN_ESTADO",
      valor_puntos_solicitado: book.points,
      valor_referencia_calculado: book.referencePrice || 50,
      comentario: book.description || "",
      estado_publicacion: "DISPONIBLE",
      color_semaforo: "VERDE",
    })),
  }

  await page.route("**/api/**", async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()

    if (url.pathname.endsWith("/api/auth/login")) {
      await route.fulfill({
        json: {
          id: testUser.id,
          token: "playwright-publications-access-token",
          username: testUser.name,
          email: testUser.email,
          rol: "USUARIO",
          puntos: testUser.availablePoints,
        },
      })
      return
    }

    if (url.pathname.endsWith("/api/usuario/me")) {
      await route.fulfill({
        json: {
          id: testUser.id,
          nombre: testUser.name,
          email: testUser.email,
          rol: "USUARIO",
          saldoTotal: testUser.availablePoints,
          saldoReservado: testUser.reservedPoints,
          saldoDisponible: testUser.availablePoints,
          reputacionPromedio: testUser.rating,
        },
      })
      return
    }

    if (url.pathname.endsWith("/api/auth/logout")) {
      await route.fulfill({ status: 204, body: "" })
      return
    }

    if (url.pathname.endsWith("/api/publicaciones/disponibles") && method === "GET") {
      if (options.skipInitialAvailableFetch) {
        await route.fulfill({ json: [] })
        return
      }
      const available = database.publications
        .filter((pub) => pub.estado_publicacion === "DISPONIBLE")
        .map((pub) => ({
          publicacionId: {
            isbn: pub.isbn,
            emailPropietario: pub.email_propietario,
            horaPublicacion: pub.hora_publicacion,
          },
          titulo: pub.titulo,
          autor: pub.autor,
          portadaUrl: pub.portadaUrl,
          estadoFisico: pub.estado_fisico,
          valorPuntosSolicitado: pub.valor_puntos_solicitado,
          valorReferenciaCalculado: pub.valor_referencia_calculado,
          colorSemaforo: pub.color_semaforo,
          comentario: pub.comentario,
        }))
      await route.fulfill({ json: available })
      return
    }

    if (url.pathname.endsWith("/api/publicaciones/publicar") && method === "POST") {
      const body = request.postDataJSON() as {
        isbn: string
        estadoFisico: EstadoFisico
        valorPuntosSolicitado: number
        comentario?: string
      }
      const nowIso = new Date().toISOString()
      const seedMatch = SEED_BOOKS.find(
        (b) => b.isbn.replace(/[^0-9X]/gi, "") === body.isbn.replace(/[^0-9X]/gi, "")
      )
      const created = {
        isbn: body.isbn,
        email_propietario: testUser.email,
        hora_publicacion: nowIso,
        titulo: seedMatch?.title || `Ejemplar (${body.isbn})`,
        autor: seedMatch?.author || "Autor verificado",
        portadaUrl: seedMatch?.coverUrl || "",
        estado_fisico: body.estadoFisico,
        valor_puntos_solicitado: body.valorPuntosSolicitado,
        valor_referencia_calculado: seedMatch?.referencePrice || 50,
        comentario: body.comentario || "",
        estado_publicacion: "DISPONIBLE",
        color_semaforo: "VERDE",
      }
      database.publications.unshift(created)

      await route.fulfill({
        json: {
          publicacionId: {
            isbn: created.isbn,
            emailPropietario: created.email_propietario,
            horaPublicacion: created.hora_publicacion,
          },
          titulo: created.titulo,
          autor: created.autor,
          portadaUrl: created.portadaUrl,
          estadoFisico: created.estado_fisico,
          valorPuntosSolicitado: created.valor_puntos_solicitado,
          valorReferenciaCalculado: created.valor_referencia_calculado,
          colorSemaforo: created.color_semaforo,
          comentario: created.comentario,
        },
      })
      return
    }

    if (url.pathname.endsWith("/api/publicaciones/editar") && method === "PUT") {
      const isbn = url.searchParams.get("isbn")
      const body = request.postDataJSON() as {
        estadoFisico: EstadoFisico
        valorPuntosSolicitado: number
        comentario?: string
      }
      const found = database.publications.find((pub) => pub.isbn === isbn)
      if (found) {
        found.estado_fisico = body.estadoFisico
        found.valor_puntos_solicitado = body.valorPuntosSolicitado
        found.comentario = body.comentario || ""
      }
      await route.fulfill({ status: 204, body: "" })
      return
    }

    if (url.pathname.endsWith("/api/publicaciones/eliminar") && method === "DELETE") {
      const isbn = url.searchParams.get("isbn")
      const found = database.publications.find((pub) => pub.isbn === isbn)
      if (found) {
        found.estado_publicacion = "ELIMINADA"
      }
      await route.fulfill({ status: 204, body: "" })
      return
    }

    await route.fulfill({ json: [] })
  })

  return database
}

async function signIn(page: Page) {
  await page.goto("/")
  await page.getByLabel("Email o nombre de usuario").fill(testUser.email)
  await page.getByLabel("Contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()
  await expect(page.locator('button[title="Ir a mi perfil y billetera"]')).toBeVisible()
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
  await mockBackend(page)
  await signIn(page)

  await expect(page.getByText(`Mostrando ${SEED_BOOKS.length} libros`)).toBeVisible()
  await expect(page.locator("article")).toHaveCount(SEED_BOOKS.length)
  await expect(bookCard(page, "Rayuela")).toBeVisible()
  await expect(bookCard(page, "Clean Code")).toBeVisible()

  await page.getByRole("button", { name: "Historia", exact: true }).click()
  await expect(page.getByText("Mostrando 1 libros")).toBeVisible()
  await expect(bookCard(page, "Sapiens: De animales a dioses")).toBeVisible()
  await expect(bookCard(page, "Rayuela")).toHaveCount(0)

  const search = page.getByPlaceholder("Buscar título, autor o género...")
  await search.fill("libro sin coincidencias")
  await search.press("Enter")
  await expect(page.getByText("No encontramos libros con esos criterios")).toBeVisible()
  await page.getByRole("button", { name: "Restablecer todos los filtros" }).click()

  await expect(page.getByText(`Mostrando ${SEED_BOOKS.length} libros`)).toBeVisible()
  await expect(bookCard(page, "Rayuela")).toBeVisible()
})

test("publicar valida campos obligatorios y exige puntos enteros positivos, incluso en los bordes", async ({
  page,
}) => {
  const database = await mockBackend(page)
  await signIn(page)
  await openPublishForm(page)

  await expect(page.getByRole("button", { name: "Buscar", exact: true })).toBeVisible()
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
  expect(database.publications).toHaveLength(SEED_BOOKS.length)

  await page.getByLabel("ISBN del libro *").fill(newIsbn)
  await page.getByLabel("Puntos solicitados *").fill("1")
  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  await expect(page.getByText(/se publicó correctamente en el catálogo/i)).toBeVisible()
  expect(database.publications).toHaveLength(SEED_BOOKS.length + 1)
  expect(database.publications[0]).toMatchObject({
    isbn: newIsbn,
    email_propietario: testUser.email,
    valor_puntos_solicitado: 1,
    estado_publicacion: "DISPONIBLE",
  })
})

test("publicar registra todos los datos opcionales y presenta el libro en el catálogo", async ({ page }) => {
  const database = await mockBackend(page)
  await signIn(page)
  await openPublishForm(page)

  const targetSeed = SEED_BOOKS[1] // Clean Code
  await page.getByLabel("ISBN del libro *").fill(targetSeed.isbn)
  await page.getByLabel("Estado físico *").selectOption("Como nuevo")
  await page.getByLabel("Puntos solicitados *").fill("120")
  await page.getByLabel("Descripción y estado (opcional)").fill("Ejemplar cuidado, sin marcas.")
  await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  await expect(page.getByText(/se publicó correctamente en el catálogo/i)).toBeVisible()

  const publishedBook = bookCard(page, targetSeed.title).first()
  await expect(publishedBook).toBeVisible()
  await expect(publishedBook).toContainText("Como nuevo")
  await expect(publishedBook).toContainText("120 pts")

  await publishedBook.click()
  const detail = page.locator("div.fixed.inset-0")
  await expect(detail.getByRole("heading", { name: targetSeed.title })).toBeVisible()
  await expect(detail).toContainText(`ISBN: ${targetSeed.isbn}`)
  await expect(detail).toContainText("Ejemplar cuidado, sin marcas.")

  expect(database.publications[0]).toMatchObject({
    isbn: targetSeed.isbn,
    email_propietario: testUser.email,
    estado_fisico: "COMO_NUEVO",
    valor_puntos_solicitado: 120,
    comentario: "Ejemplar cuidado, sin marcas.",
  })
})

test("el dueño puede editar una publicación y se conservan los valores existentes como punto de partida", async ({
  page,
}) => {
  const database = await mockBackend(page)
  await signIn(page)
  await bookCard(page, "Clean Code").click()

  const detail = page.locator("div.fixed.inset-0")
  await detail.getByRole("button", { name: "Modificar Publicación" }).click()
  await expect(page.getByRole("heading", { name: "Modificar Publicación" })).toBeVisible()
  await expect(page.getByLabel("ISBN del libro *")).toHaveValue(SEED_BOOKS[1].isbn)
  await expect(page.getByLabel("Puntos solicitados *")).toHaveValue("60")

  await page.getByLabel("Puntos solicitados *").fill("65")
  await page.getByRole("button", { name: "Guardar cambios" }).click()

  await expect(bookCard(page, "Clean Code")).toBeVisible()
  expect(database.publications.find((publication) => publication.isbn === SEED_BOOKS[1].isbn))
    .toMatchObject({ valor_puntos_solicitado: 65 })
})

test("solo el dueño ve acciones de edición y eliminación", async ({ page }) => {
  await mockBackend(page)
  await signIn(page)
  await bookCard(page, "Rayuela").click()

  const detail = page.locator("div.fixed.inset-0")
  await expect(detail.getByRole("button", { name: "Modificar Publicación" })).toHaveCount(0)
  await expect(detail.getByRole("button", { name: "Eliminar", exact: true })).toHaveCount(0)
  await expect(detail.getByRole("button", { name: /Solicitar/ })).toBeVisible()
  await page.getByRole("button").filter({ has: page.locator("svg.lucide-x") }).click()

  await bookCard(page, "Clean Code").click()
  const ownedDetail = page.locator("div.fixed.inset-0")
  await expect(ownedDetail.getByRole("button", { name: "Modificar Publicación" })).toBeVisible()
  await expect(ownedDetail.getByRole("button", { name: "Eliminar", exact: true })).toBeVisible()
})

test("el dueño confirma la eliminación y la publicación deja de aparecer", async ({ page }) => {
  const database = await mockBackend(page)
  await signIn(page)
  await bookCard(page, "El principito").click()

  const detail = page.locator("div.fixed.inset-0")
  await detail.getByRole("button", { name: "Eliminar", exact: true }).click()
  await expect(detail.getByRole("button", { name: "¿Confirmar?" })).toBeVisible()
  await detail.getByRole("button", { name: "¿Confirmar?" }).click()

  await expect(page.getByText("Publicación eliminada correctamente.")).toBeVisible()
  await expect(bookCard(page, "El principito")).toHaveCount(0)
  expect(database.publications.find((publication) => publication.isbn === SEED_BOOKS[2].isbn))
    .toMatchObject({ estado_publicacion: "ELIMINADA" })
})

test("no permite eliminar una publicación reservada con un intercambio en curso", async ({ page }) => {
  await page.addInitScript(
    ({ storageKey, users, books }) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ currentUser: null, users, books }),
      )
    },
    {
      storageKey: STORAGE_KEY,
      users: SEED_USERS,
      books: SEED_BOOKS.map((book) =>
        book.isbn === SEED_BOOKS[1].isbn ? { ...book, availability: "RESERVADO" } : book,
      ),
    },
  )
  await mockBackend(page, { skipInitialAvailableFetch: true })
  await signIn(page)
  await bookCard(page, "Clean Code").click()

  const detail = page.locator("div.fixed.inset-0")
  await detail.getByRole("button", { name: "Eliminar", exact: true }).click()
  await detail.getByRole("button", { name: "¿Confirmar?" }).click()

  await expect(page.getByText("No se puede eliminar un libro con intercambio en curso (RF04).")).toBeVisible()
  await expect(bookCard(page, "Clean Code")).toBeVisible()
})
