import { expect, test, type Page, type Route } from "@playwright/test"

const STORAGE_KEY = "mercadolibro_demo_clean_v5"

const testUser = {
  id: "backend-user-1",
  name: "P1 Test User",
  username: "p1test",
  email: "p1-test@example.com",
}

async function mockBackend(
  page: Page,
  options: {
    failGlobalLogout?: boolean
    failSignup?: boolean
    failPasswordUpdate?: boolean
    failLogin?: boolean
  } = {},
) {
  const authRequests: Array<{ path: string; body: Record<string, unknown> }> = []

  await page.route("**/api/**", async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    let body: Record<string, unknown> | undefined
    try {
      body = request.postDataJSON?.() as Record<string, unknown> | undefined
    } catch {
      body = undefined
    }
    const path = `${url.pathname}${url.search}`
    authRequests.push({ path, body: body ?? {} })

    if (url.pathname.endsWith("/api/auth/registro")) {
      if (options.failSignup) {
        await route.fulfill({
          status: 409,
          json: { message: "Ya existe una cuenta registrada con este correo" },
        })
        return
      }
      await route.fulfill({
        json: {
          id: testUser.id,
          token: "playwright-access-token",
          username: String(body?.nombre || testUser.name),
          email: String(body?.email || testUser.email),
          rol: "USUARIO",
          puntos: 100,
        },
      })
      return
    }

    if (url.pathname.endsWith("/api/auth/login")) {
      if (options.failLogin) {
        await route.fulfill({
          status: 500,
          json: { message: "Auth service unavailable" },
        })
        return
      }
      if (body?.contrasenia === "incorrect-password" || body?.contrasenia === "demo") {
        await route.fulfill({
          status: 401,
          json: { message: "Email o contraseña incorrectos" },
        })
        return
      }
      await route.fulfill({
        json: {
          id: testUser.id,
          token: "playwright-access-token",
          username: testUser.name,
          email: String(body?.nombreOEmail || testUser.email),
          rol: "USUARIO",
          puntos: 100,
        },
      })
      return
    }

    if (url.pathname.endsWith("/api/auth/logout")) {
      if (options.failGlobalLogout) {
        await route.fulfill({
          status: 500,
          json: { message: "Global logout failed" },
        })
        return
      }
      await route.fulfill({ status: 204, body: "" })
      return
    }

    if (url.pathname.endsWith("/api/usuario/me/contrasenia")) {
      if (options.failPasswordUpdate) {
        await route.fulfill({
          status: 422,
          json: { message: "Password update rejected by test" },
        })
        return
      }
      await route.fulfill({ status: 204, body: "" })
      return
    }

    if (url.pathname.endsWith("/api/usuario/me")) {
      await route.fulfill({
        json: {
          id: testUser.id,
          nombre: testUser.name,
          email: testUser.email,
          rol: "USUARIO",
          saldoTotal: 100,
          saldoReservado: 0,
          saldoDisponible: 100,
          reputacionPromedio: 5.0,
        },
      })
      return
    }

    if (url.pathname.endsWith("/api/movimientoPuntos/saldo")) {
      await route.fulfill({
        json: { saldoTotal: 100, saldoReservado: 0, saldoDisponible: 100 },
      })
      return
    }

    await route.fulfill({ json: [] })
  })

  return authRequests
}

async function signIn(page: Page) {
  await page.getByLabel("Email o nombre de usuario").fill(testUser.email)
  await page.getByLabel("Contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()
  await expect(page.locator('button[title="Ir a mi perfil y billetera"]')).toBeVisible()
}

test("registro valida los datos y crea la cuenta mediante el backend", async ({ page }) => {
  const authRequests = await mockBackend(page)
  await page.goto("/")
  await page.getByRole("button", { name: "Registrate acá" }).click()

  await page.getByRole("button", { name: "Crear cuenta y recibir 100 pts" }).click()
  await expect(page.getByText("Ingresá tu nombre completo")).toBeVisible()
  expect(authRequests.some((request) => request.path.includes("/api/auth/registro"))).toBe(false)

  await page.getByLabel("Nombre completo").fill(testUser.name)
  await page.getByLabel("Nombre de usuario").fill(testUser.username)
  await page.getByLabel("Email", { exact: true }).fill(testUser.email)
  await page.getByLabel("Contraseña", { exact: true }).fill("valid-test-password")
  await page.getByLabel("Confirmar contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Crear cuenta y recibir 100 pts" }).click()

  await expect(page.getByRole("heading", { name: /Te damos la bienvenida, P1 Test User/i })).toBeVisible()
  const signupRequest = authRequests.find((request) => request.path.includes("/api/auth/registro"))
  expect(signupRequest?.body.email).toBe(testUser.email)
  expect(signupRequest?.body.contrasenia).toBe("valid-test-password")
})

test("registro bloquea email inválido, contraseña corta y confirmación distinta", async ({ page }) => {
  const authRequests = await mockBackend(page)
  await page.goto("/")
  await page.getByRole("button", { name: "Registrate acá" }).click()

  await page.getByLabel("Nombre completo").fill(testUser.name)
  await page.getByLabel("Nombre de usuario").fill(testUser.username)
  await page.getByLabel("Email", { exact: true }).fill("invalid-email")
  await page.getByLabel("Contraseña", { exact: true }).fill("short")
  await page.getByLabel("Confirmar contraseña").fill("different")
  await page.getByRole("button", { name: "Crear cuenta y recibir 100 pts" }).click()

  await expect(page.getByText("El email no tiene un formato válido")).toBeVisible()
  await expect(page.getByText("Mínimo 8 caracteres")).toBeVisible()
  await expect(page.getByText("Las contraseñas no coinciden")).toBeVisible()
  expect(authRequests.some((request) => request.path.includes("/api/auth/registro"))).toBe(false)
})

test("registro informa cuando el backend rechaza un email ya registrado", async ({ page }) => {
  const authRequests = await mockBackend(page, { failSignup: true })
  await page.goto("/")
  await page.getByRole("button", { name: "Registrate acá" }).click()
  await page.getByLabel("Nombre completo").fill(testUser.name)
  await page.getByLabel("Nombre de usuario").fill(testUser.username)
  await page.getByLabel("Email", { exact: true }).fill(testUser.email)
  await page.getByLabel("Contraseña", { exact: true }).fill("valid-test-password")
  await page.getByLabel("Confirmar contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Crear cuenta y recibir 100 pts" }).click()

  await expect(page.getByText("Ya existe una cuenta registrada con este correo")).toBeVisible()
  expect(authRequests.filter((request) => request.path.includes("/api/auth/registro"))).toHaveLength(1)
})

test("login autentica por el backend y un rechazo no crea sesión local", async ({ page }) => {
  const authRequests = await mockBackend(page)
  await page.goto("/")
  await page.getByLabel("Email o nombre de usuario").fill(testUser.email)
  await page.getByLabel("Contraseña").fill("incorrect-password")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()
  await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible()
  await expect(page.locator('button[title="Ir a mi perfil y billetera"]')).toHaveCount(0)

  await page.getByLabel("Email o nombre de usuario").fill("franco@mercadolibro.com")
  await page.getByLabel("Contraseña").fill("demo")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()
  await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible()
  await expect(page.locator('button[title="Ir a mi perfil y billetera"]')).toHaveCount(0)

  await page.getByLabel("Email o nombre de usuario").fill(testUser.email)
  await page.getByLabel("Contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()
  await expect(page.locator('button[title="Ir a mi perfil y billetera"]')).toBeVisible()
  expect(authRequests.filter((request) => request.path.includes("/api/auth/login"))).toHaveLength(3)
  expect(authRequests.some((request) => request.body.contrasenia === "demo")).toBe(true)
})

test("login valida identificador y contraseña localmente sin llamar al backend", async ({ page }) => {
  const authRequests = await mockBackend(page)
  await page.goto("/")
  await page.getByLabel("Email o nombre de usuario").fill(testUser.email)
  await page.getByLabel("Contraseña").fill("short")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()

  await expect(page.getByText("La contraseña debe tener al menos 8 caracteres")).toBeVisible()
  expect(authRequests.some((request) => request.path.includes("/api/auth/login"))).toBe(false)
})

test("login informa un error del backend y no crea una sesión local", async ({ page }) => {
  const authRequests = await mockBackend(page, { failLogin: true })
  await page.goto("/")
  await page.getByLabel("Email o nombre de usuario").fill(testUser.email)
  await page.getByLabel("Contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()

  await expect(page.getByText("Auth service unavailable")).toBeVisible()
  await expect(page.locator('button[title="Ir a mi perfil y billetera"]')).toHaveCount(0)
  expect(authRequests.some((request) => request.path.includes("/api/auth/login"))).toBe(true)
})

test("el usuario autenticado puede ver su perfil propio", async ({ page }) => {
  await mockBackend(page)
  await page.goto("/")
  await signIn(page)
  await page.locator('button[title="Ir a mi perfil y billetera"]').click()

  await expect(page.getByText("Tu Cuenta")).toBeVisible()
  await expect(page.getByRole("heading", { name: "P1 Test User" })).toBeVisible()
  await expect(page.getByText("@P1 Test User")).toBeVisible()
})

test("un usuario guardado localmente no queda autenticado sin sesión activa", async ({ page }) => {
  await page.addInitScript((storageKey) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        currentUser: {
          id: "stale-user",
          name: "Usuario antiguo",
          email: "stale@example.com",
          username: "stale",
        },
        users: [],
        books: [],
      }),
    )
  }, STORAGE_KEY)
  await mockBackend(page)
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "Iniciar Sesión" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toHaveCount(0)
  await expect(page.getByText("Usuario antiguo")).toHaveCount(0)
})

test("el cambio de contraseña se valida y se envía al backend", async ({ page }) => {
  const authRequests = await mockBackend(page)
  await page.goto("/")
  await signIn(page)
  await page.locator('button[title="Ir a mi perfil y billetera"]').click()
  await page.getByRole("button", { name: "Cambiar contraseña" }).click()

  const dialog = page.getByRole("dialog", { name: "Cambiar contraseña" })
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("short")
  await page.getByLabel("Confirmar nueva contraseña").fill("short")
  await page.getByRole("button", { name: "Actualizar contraseña" }).click()
  await expect(dialog.getByRole("alert")).toHaveText("La contraseña debe tener al menos 8 caracteres.")
  expect(authRequests.some((request) => request.path.endsWith("/api/usuario/me/contrasenia"))).toBe(false)

  await page.getByLabel("Nueva contraseña", { exact: true }).fill("new-valid-password")
  await page.getByLabel("Confirmar nueva contraseña").fill("different-password")
  await page.getByRole("button", { name: "Actualizar contraseña" }).click()
  await expect(dialog.getByRole("alert")).toHaveText("Las contraseñas no coinciden.")
  expect(authRequests.some((request) => request.path.endsWith("/api/usuario/me/contrasenia"))).toBe(false)

  await page.getByLabel("Confirmar nueva contraseña").fill("new-valid-password")
  await page.getByRole("button", { name: "Actualizar contraseña" }).click()
  await expect(page.getByText("Contraseña actualizada correctamente.")).toBeVisible()

  const updateRequest = authRequests.find((request) => request.path.endsWith("/api/usuario/me/contrasenia"))
  expect(updateRequest?.body.contraseniaNueva).toBe("new-valid-password")
})

test("el cambio de contraseña muestra errores del backend y mantiene el diálogo abierto", async ({ page }) => {
  const authRequests = await mockBackend(page, { failPasswordUpdate: true })
  await page.goto("/")
  await signIn(page)
  await page.locator('button[title="Ir a mi perfil y billetera"]').click()
  await page.getByRole("button", { name: "Cambiar contraseña" }).click()
  const dialog = page.getByRole("dialog", { name: "Cambiar contraseña" })
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("new-valid-password")
  await page.getByLabel("Confirmar nueva contraseña").fill("new-valid-password")
  await page.getByRole("button", { name: "Actualizar contraseña" }).click()

  await expect(dialog.getByRole("alert")).toHaveText("Password update rejected by test")
  await expect(dialog).toBeVisible()
  expect(authRequests.some((request) => request.path.endsWith("/api/usuario/me/contrasenia"))).toBe(true)
})

test("logout cierra la sesión en el backend y limpia el estado", async ({ page }) => {
  const authRequests = await mockBackend(page)
  await page.goto("/")
  await signIn(page)
  await page.locator("aside").getByRole("button", { name: "Cerrar sesión" }).click()

  await expect(page.getByRole("heading", { name: "Iniciar Sesión" })).toBeVisible()
  expect(authRequests.some((request) => request.path.includes("/api/auth/logout"))).toBe(true)
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))
    .toContain('"currentUser":null')
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("mercadolibro_token")))
    .toBeNull()
})

test("si falla el logout remoto, igual cierra la sesión local y limpia el token", async ({ page }) => {
  const authRequests = await mockBackend(page, { failGlobalLogout: true })
  await page.goto("/")
  await signIn(page)
  await page.locator("aside").getByRole("button", { name: "Cerrar sesión" }).click()

  await expect(page.getByRole("heading", { name: "Iniciar Sesión" })).toBeVisible()
  expect(authRequests.some((request) => request.path.includes("/api/auth/logout"))).toBe(true)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("mercadolibro_token")))
    .toBeNull()
})
