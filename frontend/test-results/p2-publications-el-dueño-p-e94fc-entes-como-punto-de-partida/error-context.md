# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: p2-publications.spec.ts >> el dueño puede editar una publicación y se conservan los valores existentes como punto de partida
- Location: e2e/p2-publications.spec.ts:258:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Email o nombre de usuario')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Whitelabel Error Page" [level=1] [ref=e2]
  - paragraph [ref=e3]: This application has no explicit mapping for /error, so you are seeing this as a fallback.
  - generic [ref=e4]: Thu Oct 08 23:52:15 GMT-03:00 2026
  - generic [ref=e5]: There was an unexpected error (type=Forbidden, status=403).
  - generic [ref=e6]: Forbidden
```

# Test source

```ts
  33  |       valor_referencia: book.referencePrice || 0,
  34  |     })),
  35  |     publications: SEED_BOOKS.map((book) => ({
  36  |       isbn: book.isbn,
  37  |       email_propietario: SEED_USERS.find((user) => user.id === book.ownerId)!.email,
  38  |       hora_publicacion: book.createdAt,
  39  |       estado_fisico: ({
  40  |         Nuevo: "NUEVO",
  41  |         "Como nuevo": "COMO_NUEVO",
  42  |         "Muy bueno": "BUEN_ESTADO",
  43  |         Bueno: "BUEN_ESTADO",
  44  |         Aceptable: "ACEPTABLE",
  45  |         "Con marcas": "DETERIORADO",
  46  |       } as Record<string, string>)[book.condition],
  47  |       valor_puntos_solicitado: book.points,
  48  |       valor_referencia_calculado: book.referencePrice,
  49  |       comentario: book.description,
  50  |       estado_publicacion: book.isbn === options.reservedIsbn ? "RESERVADA" : "DISPONIBLE",
  51  |       color_semaforo: "SIN_REFERENCIA",
  52  |     })),
  53  |     users: SEED_USERS.map((user) => ({
  54  |       id: user.id,
  55  |       email: user.email,
  56  |       nombre: user.name,
  57  |       nombre_usuario: user.username,
  58  |       reputacion_promedio: user.rating,
  59  |     })),
  60  |     categories: SEED_BOOKS.map((book) => ({
  61  |       isbn: book.isbn,
  62  |       nombre_categoria: book.category,
  63  |     })),
  64  |   }
  65  | 
  66  |   await page.route("**/auth/v1/**", async (route: Route) => {
  67  |     const url = new URL(route.request().url())
  68  | 
  69  |     if (url.pathname.endsWith("/auth/v1/token")) {
  70  |       await route.fulfill({ json: testSession })
  71  |       return
  72  |     }
  73  |     if (url.pathname.endsWith("/auth/v1/user")) {
  74  |       await route.fulfill({ json: testUser })
  75  |       return
  76  |     }
  77  |     if (url.pathname.endsWith("/auth/v1/logout")) {
  78  |       await route.fulfill({ status: 204, body: "" })
  79  |       return
  80  |     }
  81  | 
  82  |     await route.fulfill({ status: 404, json: { message: "Unexpected mocked Auth request" } })
  83  |   })
  84  | 
  85  |   await page.route("**/rest/v1/**", async (route) => {
  86  |     const url = new URL(route.request().url())
  87  |     const table = url.pathname.split("/").pop()
  88  |     const method = route.request().method()
  89  |     const filters = url.searchParams
  90  |     const matches = (row: Record<string, unknown>) =>
  91  |       [...filters.entries()].every(([key, filter]) => {
  92  |         if (key === "select" || key === "order" || key === "on_conflict") return true
  93  |         if (key === "estado_publicacion" && filter.startsWith("neq.")) return row[key] !== filter.slice(4)
  94  |         if (filter.startsWith("eq.")) return String(row[key]) === filter.slice(3)
  95  |         if (filter.startsWith("in.(")) return filter.slice(4, -1).split(",").includes(String(row[key]))
  96  |         return true
  97  |       })
  98  |     const fulfillRows = (rows: Record<string, unknown>[]) => {
  99  |       const expectsObject = route.request().headers().accept?.includes("vnd.pgrst.object")
  100 |       return route.fulfill({ json: expectsObject ? rows[0] || {} : rows })
  101 |     }
  102 | 
  103 |     if (table === "publicacion" && method === "GET") {
  104 |       await fulfillRows(database.publications.filter(matches))
  105 |     } else if (table === "publicacion" && method === "POST") {
  106 |       const row = route.request().postDataJSON() as Record<string, unknown>
  107 |       database.publications.unshift(row as typeof database.publications[number])
  108 |       await fulfillRows([row])
  109 |     } else if (table === "publicacion" && method === "PATCH") {
  110 |       const patch = route.request().postDataJSON() as Record<string, unknown>
  111 |       const rows = database.publications.filter(matches)
  112 |       rows.forEach((row) => Object.assign(row, patch))
  113 |       await fulfillRows(rows)
  114 |     } else if (table === "libro" && method === "POST") {
  115 |       const row = route.request().postDataJSON() as Record<string, unknown>
  116 |       database.books.push(row as typeof database.books[number])
  117 |       await fulfillRows([row])
  118 |     } else if (table === "libro") {
  119 |       await fulfillRows(database.books.filter(matches))
  120 |     } else if (table === "usuario") {
  121 |       await fulfillRows(database.users.filter(matches))
  122 |     } else if (table === "libro_categoria") {
  123 |       await fulfillRows(database.categories.filter(matches))
  124 |     } else {
  125 |       await route.fulfill({ json: [] })
  126 |     }
  127 |   })
  128 |   return database
  129 | }
  130 | 
  131 | async function signIn(page: Page) {
  132 |   await page.goto("/")
> 133 |   await page.getByLabel("Email o nombre de usuario").fill(testUser.email)
      |                                                      ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  134 |   await page.getByLabel("Contraseña").fill("valid-test-password")
  135 |   await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()
  136 |   await expect(page.getByRole("button", { name: /Franco Papa/i })).toBeVisible()
  137 |   await page.locator("aside").getByRole("button", { name: "Catálogo", exact: true }).click()
  138 |   await expect(page.getByRole("heading", { name: "Libros Disponibles" })).toBeVisible()
  139 | }
  140 | 
  141 | function bookCard(page: Page, title: string) {
  142 |   return page.locator("article").filter({
  143 |     has: page.getByRole("heading", { name: title, exact: true }),
  144 |   })
  145 | }
  146 | 
  147 | async function openPublishForm(page: Page) {
  148 |   await page.getByRole("button", { name: "Publicar un Libro", exact: true }).click()
  149 |   await expect(page.getByRole("heading", { name: "Publicar un Libro" })).toBeVisible()
  150 | }
  151 | 
  152 | test("el catálogo lista todas las publicaciones y permite buscar, filtrar y recuperar resultados vacíos", async ({
  153 |   page,
  154 | }) => {
  155 |   await mockSupabase(page)
  156 |   await signIn(page)
  157 | 
  158 |   await expect(page.getByText("Mostrando 10 libros")).toBeVisible()
  159 |   await expect(page.locator("article")).toHaveCount(10)
  160 |   await expect(bookCard(page, "Rayuela")).toBeVisible()
  161 |   await expect(bookCard(page, "Ficciones")).toBeVisible()
  162 | 
  163 |   await page.getByRole("button", { name: "Ciencia", exact: true }).click()
  164 |   await expect(page.getByText("Mostrando 2 libros")).toBeVisible()
  165 |   await expect(bookCard(page, "Cosmos")).toBeVisible()
  166 |   await expect(bookCard(page, "Rayuela")).toHaveCount(0)
  167 | 
  168 |   const search = page.getByPlaceholder("Buscar título, autor o género...")
  169 |   await search.fill("libro sin coincidencias")
  170 |   await search.press("Enter")
  171 |   await expect(page.getByText("No encontramos libros con esos criterios")).toBeVisible()
  172 |   await page.getByRole("button", { name: "Restablecer todos los filtros" }).click()
  173 | 
  174 |   await expect(page.getByText("Mostrando 10 libros")).toBeVisible()
  175 |   await expect(bookCard(page, "Rayuela")).toBeVisible()
  176 | })
  177 | 
  178 | test("publicar valida campos obligatorios y exige puntos enteros positivos, incluso en los bordes", async ({
  179 |   page,
  180 | }) => {
  181 |   const database = await mockSupabase(page)
  182 |   await signIn(page)
  183 |   await openPublishForm(page)
  184 | 
  185 |   await expect(page.getByText("INTEGRACIÓN GOOGLE BOOKS NO IMPLEMENTADA TODAVÍA")).toBeVisible()
  186 |   await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  187 |   await expect(page.getByText("El ISBN es obligatorio")).toBeVisible()
  188 |   await expect(page.getByText("Ingresá el valor en puntos")).toBeVisible()
  189 | 
  190 |   const newIsbn = "979-1-23456-789-0"
  191 |   await page.getByLabel("ISBN del libro *").fill(newIsbn)
  192 |   await page.getByLabel("Puntos solicitados *").fill("0")
  193 |   await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  194 |   await expect(page.getByText("Ingresá un número de puntos válido mayor a 0")).toBeVisible()
  195 | 
  196 |   await page.getByLabel("Puntos solicitados *").fill("-1")
  197 |   await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  198 |   await expect(page.getByText("Ingresá un número de puntos válido mayor a 0")).toBeVisible()
  199 | 
  200 |   await page.getByLabel("Puntos solicitados *").fill("1.5")
  201 |   await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  202 |   await expect(page.getByText("Ingresá un número de puntos válido mayor a 0")).toBeVisible()
  203 |   await expect(database.publications).toHaveLength(SEED_BOOKS.length)
  204 | 
  205 |   await page.getByLabel("ISBN del libro *").fill(newIsbn)
  206 |   await page.getByLabel("Puntos solicitados *").fill("1")
  207 |   await page.getByRole("button", { name: "Publicar Libro", exact: true }).click()
  208 |   await expect(page.getByText("se publicó y guardó en Supabase.")).toBeVisible()
  209 |   await expect(database.publications).toHaveLength(SEED_BOOKS.length + 1)
  210 |   expect(database.publications[0]).toMatchObject({
  211 |     isbn: newIsbn,
  212 |     email_propietario: testUser.email,
  213 |     valor_puntos_solicitado: 1,
  214 |     estado_publicacion: "DISPONIBLE",
  215 |   })
  216 |   expect(database.publications[0]).not.toHaveProperty("titulo")
  217 |   expect(database.publications[0]).not.toHaveProperty("autores")
  218 |   expect(database.books.at(-1)).toMatchObject({
  219 |     isbn: newIsbn,
  220 |     google_books_id: null,
  221 |     titulo: null,
  222 |     autores: null,
  223 |   })
  224 | })
  225 | 
  226 | test("publicar registra todos los datos opcionales y presenta el libro en el catálogo", async ({ page }) => {
  227 |   const database = await mockSupabase(page)
  228 |   await signIn(page)
  229 |   await openPublishForm(page)
  230 | 
  231 |   await page.getByLabel("ISBN del libro *").fill(SEED_BOOKS[0].isbn)
  232 |   await page.getByLabel("Estado físico *").selectOption("Como nuevo")
  233 |   await page.getByLabel("Puntos solicitados *").fill("120")
```