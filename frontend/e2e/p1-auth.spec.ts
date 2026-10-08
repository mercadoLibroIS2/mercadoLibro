import { expect, test, type Page, type Route } from "@playwright/test"

const testUser = {
  id: "supabase-user-1",
  aud: "authenticated",
  role: "authenticated",
  email: "p1-test@example.com",
  email_confirmed_at: "2026-01-01T00:00:00.000Z",
  phone: "",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { name: "P1 Test User", username: "p1test" },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
}

const testSession = {
  access_token: "playwright-access-token",
  refresh_token: "playwright-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: testUser,
}

async function mockSupabase(
  page: Page,
  options: {
    failGlobalLogout?: boolean
    failLocalLogout?: boolean
    failSignup?: boolean
    failPasswordUpdate?: boolean
    failLogin?: boolean
  } = {},
) {
  const authRequests: Array<{ path: string; body: Record<string, unknown> }> = []

  await page.route("**/auth/v1/**", async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const body = request.postDataJSON?.() as Record<string, unknown> | undefined
    const path = `${url.pathname}${url.search}`
    authRequests.push({ path, body: body ?? {} })

    if (url.pathname.endsWith("/auth/v1/signup")) {
      if (options.failSignup) {
        await route.fulfill({
          status: 422,
          json: { code: "user_already_exists", msg: "User already registered" },
        })
        return
      }
      await route.fulfill({ json: { ...testUser, email: body?.email } })
      return
    }

    if (url.pathname.endsWith("/auth/v1/token")) {
      if (options.failLogin) {
        await route.fulfill({ status: 500, json: { msg: "Auth service unavailable" } })
      } else if (body?.password === "incorrect-password" || body?.password === "demo") {
        await route.fulfill({
          status: 400,
          json: { code: "invalid_credentials", msg: "Invalid login credentials" },
        })
      } else {
        await route.fulfill({ json: { ...testSession, user: { ...testUser, email: body?.email } } })
      }
      return
    }

    if (url.pathname.endsWith("/auth/v1/logout")) {
      if (url.searchParams.get("scope") === "global" && options.failGlobalLogout) {
        await route.fulfill({ status: 500, json: { message: "Global logout failed" } })
        return
      }
      if (url.searchParams.get("scope") === "local" && options.failLocalLogout) {
        await route.fulfill({ status: 500, json: { message: "Local logout failed" } })
        return
      }
      await route.fulfill({ status: 204, body: "" })
      return
    }

    if (url.pathname.endsWith("/auth/v1/user")) {
      if (options.failPasswordUpdate && body?.password) {
        await route.fulfill({ status: 422, json: { msg: "Password update rejected by test" } })
        return
      }
      await route.fulfill({ json: { ...testUser, user_metadata: { ...testUser.user_metadata } } })
      return
    }

    await route.fulfill({ status: 404, json: { message: "Unexpected mocked Auth request" } })
  })

  await page.route("**/rest/v1/**", async (route) => {
    await route.fulfill({ json: [] })
  })

  return authRequests
}

async function signIn(page: Page) {
  await page.getByLabel("Email", { exact: true }).fill(testUser.email)
  await page.getByLabel("Contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()
  await expect(page.getByRole("button", { name: /P1 Test User/i })).toBeVisible()
}

test("registro valida los datos y crea la cuenta mediante Supabase", async ({ page }) => {
  const authRequests = await mockSupabase(page)
  await page.goto("/")
  await page.getByRole("button", { name: "Registrate acá" }).click()

  await page.getByRole("button", { name: "Crear cuenta y recibir 100 pts" }).click()
  await expect(page.getByText("Ingresá tu nombre completo")).toBeVisible()
  expect(authRequests.some((request) => request.path.includes("/auth/v1/signup"))).toBe(false)

  await page.getByLabel("Nombre completo").fill("P1 Test User")
  await page.getByLabel("Nombre de usuario").fill("p1test")
  await page.getByLabel("Email", { exact: true }).fill(testUser.email)
  await page.getByLabel("Contraseña", { exact: true }).fill("valid-test-password")
  await page.getByLabel("Confirmar contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Crear cuenta y recibir 100 pts" }).click()

  await expect(page.getByText(/Enviamos un correo de confirmación/)).toBeVisible()
  const signupRequest = authRequests.find((request) => request.path.includes("/auth/v1/signup"))
  expect(signupRequest?.body.email).toBe(testUser.email)
  expect(signupRequest?.body.password).toBe("valid-test-password")
})

test("registro bloquea email inválido, contraseña corta y confirmación distinta", async ({ page }) => {
  const authRequests = await mockSupabase(page)
  await page.goto("/")
  await page.getByRole("button", { name: "Registrate acá" }).click()

  await page.getByLabel("Nombre completo").fill("P1 Test User")
  await page.getByLabel("Nombre de usuario").fill("p1test")
  await page.getByLabel("Email", { exact: true }).fill("invalid-email")
  await page.getByLabel("Contraseña", { exact: true }).fill("short")
  await page.getByLabel("Confirmar contraseña").fill("different")
  await page.getByRole("button", { name: "Crear cuenta y recibir 100 pts" }).click()

  await expect(page.getByText("El email no tiene un formato válido")).toBeVisible()
  await expect(page.getByText("Mínimo 6 caracteres")).toBeVisible()
  await expect(page.getByText("Las contraseñas no coinciden")).toBeVisible()
  expect(authRequests.some((request) => request.path.includes("/auth/v1/signup"))).toBe(false)
})

test("registro informa cuando Supabase rechaza un email ya registrado", async ({ page }) => {
  const authRequests = await mockSupabase(page, { failSignup: true })
  await page.goto("/")
  await page.getByRole("button", { name: "Registrate acá" }).click()
  await page.getByLabel("Nombre completo").fill("P1 Test User")
  await page.getByLabel("Nombre de usuario").fill("p1test")
  await page.getByLabel("Email", { exact: true }).fill(testUser.email)
  await page.getByLabel("Contraseña", { exact: true }).fill("valid-test-password")
  await page.getByLabel("Confirmar contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Crear cuenta y recibir 100 pts" }).click()

  await expect(page.getByText("Ya existe una cuenta registrada con este correo")).toBeVisible()
  expect(authRequests.filter((request) => request.path.includes("/auth/v1/signup"))).toHaveLength(1)
})

test("login autentica por Supabase y un rechazo no crea sesión local", async ({ page }) => {
  const authRequests = await mockSupabase(page)
  await page.goto("/")
  await page.getByLabel("Email", { exact: true }).fill(testUser.email)
  await page.getByLabel("Contraseña").fill("incorrect-password")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()
  await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible()
  await expect(page.getByRole("button", { name: /P1 Test User/i })).toHaveCount(0)

  await page.getByLabel("Email", { exact: true }).fill("franco@mercadolibro.com")
  await page.getByLabel("Contraseña").fill("demo")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()
  await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible()
  await expect(page.getByRole("button", { name: /P1 Test User/i })).toHaveCount(0)

  await page.getByLabel("Email", { exact: true }).fill(testUser.email)
  await page.getByLabel("Contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()
  await expect(page.getByRole("button", { name: /P1 Test User/i })).toBeVisible()
  expect(authRequests.filter((request) => request.path.includes("/auth/v1/token"))).toHaveLength(3)
  expect(authRequests.some((request) => request.body.password === "demo")).toBe(true)
})

test("login valida email y contraseña localmente sin llamar a Supabase", async ({ page }) => {
  const authRequests = await mockSupabase(page)
  await page.goto("/")
  await page.getByLabel("Email", { exact: true }).fill("invalid-email")
  await page.getByLabel("Contraseña").fill("valid-password")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()

  await expect(page.getByText("El email no tiene un formato válido")).toBeVisible()
  expect(authRequests.some((request) => request.path.includes("/auth/v1/token"))).toBe(false)
})

test("login informa un error de Supabase y no crea una sesión local", async ({ page }) => {
  const authRequests = await mockSupabase(page, { failLogin: true })
  await page.goto("/")
  await page.getByLabel("Email", { exact: true }).fill(testUser.email)
  await page.getByLabel("Contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()

  await expect(page.getByText("Auth service unavailable")).toBeVisible()
  await expect(page.getByRole("button", { name: /P1 Test User/i })).toHaveCount(0)
  expect(authRequests.some((request) => request.path.includes("/auth/v1/token"))).toBe(true)
})

test("el usuario autenticado puede ver su perfil propio", async ({ page }) => {
  await mockSupabase(page)
  await page.goto("/")
  await signIn(page)
  await page.locator('button[title="Ir a mi perfil y billetera"]').click()

  await expect(page.getByText("Tu Cuenta")).toBeVisible()
  await expect(page.getByRole("heading", { name: "P1 Test User" })).toBeVisible()
  await expect(page.getByText("@p1test")).toBeVisible()
})

test("un usuario guardado localmente no queda autenticado sin sesión de Supabase", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "mercadolibro_v2_data",
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
  })
  await mockSupabase(page)
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "Iniciar Sesión" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toHaveCount(0)
  await expect(page.getByText("Usuario antiguo")).toHaveCount(0)
})

test("el cambio de contraseña se valida y se envía a Supabase", async ({ page }) => {
  const authRequests = await mockSupabase(page)
  await page.goto("/")
  await signIn(page)
  await page.locator('button[title="Ir a mi perfil y billetera"]').click()
  await page.getByRole("button", { name: "Cambiar contraseña" }).click()

  await page.getByLabel("Nueva contraseña").fill("short")
  await page.getByLabel("Confirmar nueva contraseña").fill("short")
  await page.getByRole("button", { name: "Actualizar contraseña" }).click()
  await expect(page.getByRole("alert")).toHaveText("La contraseña debe tener al menos 6 caracteres.")
  expect(authRequests.some((request) => request.path.endsWith("/auth/v1/user"))).toBe(false)

  await page.getByLabel("Nueva contraseña").fill("new-valid-password")
  await page.getByLabel("Confirmar nueva contraseña").fill("different-password")
  await page.getByRole("button", { name: "Actualizar contraseña" }).click()
  await expect(page.getByRole("alert")).toHaveText("Las contraseñas no coinciden.")
  expect(authRequests.some((request) => request.path.endsWith("/auth/v1/user"))).toBe(false)

  await page.getByLabel("Confirmar nueva contraseña").fill("new-valid-password")
  await page.getByRole("button", { name: "Actualizar contraseña" }).click()
  await expect(page.getByText("Contraseña actualizada correctamente.")).toBeVisible()

  const updateRequest = authRequests.find((request) => request.path.endsWith("/auth/v1/user"))
  expect(updateRequest?.body.password).toBe("new-valid-password")
})

test("el cambio de contraseña muestra errores de Supabase y mantiene el diálogo abierto", async ({ page }) => {
  const authRequests = await mockSupabase(page, { failPasswordUpdate: true })
  await page.goto("/")
  await signIn(page)
  await page.locator('button[title="Ir a mi perfil y billetera"]').click()
  await page.getByRole("button", { name: "Cambiar contraseña" }).click()
  await page.getByLabel("Nueva contraseña").fill("new-valid-password")
  await page.getByLabel("Confirmar nueva contraseña").fill("new-valid-password")
  await page.getByRole("button", { name: "Actualizar contraseña" }).click()

  await expect(page.getByRole("alert")).toHaveText("Password update rejected by test")
  await expect(page.getByRole("dialog", { name: "Cambiar contraseña" })).toBeVisible()
  expect(authRequests.some((request) => request.path.endsWith("/auth/v1/user"))).toBe(true)
})

test("logout cierra la sesión global en Supabase y limpia el estado", async ({ page }) => {
  const authRequests = await mockSupabase(page)
  await page.goto("/")
  await signIn(page)
  await page.getByRole("button", { name: "Cerrar sesión" }).click()

  await expect(page.getByRole("heading", { name: "Iniciar Sesión" })).toBeVisible()
  expect(authRequests.some((request) => request.path.includes("/auth/v1/logout?scope=global"))).toBe(true)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("mercadolibro_v2_data")))
    .toContain('"currentUser":null')
  await expect
    .poll(() => page.evaluate(() => Object.keys(localStorage).some((key) => key.includes("auth-token"))))
    .toBe(false)
})

test("si falla el logout global, cierra la sesión local e informa el alcance", async ({ page }) => {
  const authRequests = await mockSupabase(page, { failGlobalLogout: true })
  await page.goto("/")
  await signIn(page)
  await page.getByRole("button", { name: "Cerrar sesión" }).click()

  await expect(page.getByRole("heading", { name: "Iniciar Sesión" })).toBeVisible()
  await expect(page.getByText(/no se pudo confirmar el cierre en otros dispositivos/)).toBeVisible()
  expect(authRequests.some((request) => request.path.includes("/auth/v1/logout?scope=global"))).toBe(true)
  await expect
    .poll(() => page.evaluate(() => Object.keys(localStorage).some((key) => key.includes("auth-token"))))
    .toBe(false)
})

test("si Supabase no puede cerrar ni siquiera la sesión local, mantiene la sesión e informa el error", async ({ page }) => {
  const authRequests = await mockSupabase(page, {
    failGlobalLogout: true,
    failLocalLogout: true,
  })
  await page.goto("/")
  await signIn(page)
  await page.getByRole("button", { name: "Cerrar sesión" }).click()

  await expect(page.getByText(/No se pudo cerrar la sesión/)).toBeVisible()
  await expect(page.getByRole("button", { name: /P1 Test User/i })).toBeVisible()
  expect(authRequests.some((request) => request.path.includes("/auth/v1/logout?scope=global"))).toBe(true)
})
