import { expect, test, type Page, type Route } from "@playwright/test"
import {
  SEED_BOOKS,
  SEED_NOTIFICATIONS,
  SEED_POINT_MOVEMENTS,
  SEED_REVIEWS,
  SEED_TRACKED,
  SEED_TRADES,
  SEED_USERS,
} from "../lib/seed-data"
import type {
  NotificationItem,
  TradeRequest,
  User,
} from "../lib/mercado-types"

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
      await route.fulfill({
        json: {
          access_token: `p6-token-${user.id}`,
          refresh_token: `p6-refresh-${user.id}`,
          expires_in: 3600,
          token_type: "bearer",
          user: authUser(user),
        },
      })
      return
    }

    if (url.pathname.endsWith("/auth/v1/user")) {
      const token = request.headers().authorization?.replace(/^Bearer\s+/i, "")
      const userId = token?.replace(/^p6-token-/, "")
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

async function loadState(
  page: Page,
  options: {
    notifications?: NotificationItem[]
    trades?: TradeRequest[]
    reviews?: typeof SEED_REVIEWS
  } = {},
) {
  const state = {
    currentUser: null,
    users: SEED_USERS,
    books: SEED_BOOKS,
    trades: options.trades || SEED_TRADES,
    pointMovements: SEED_POINT_MOVEMENTS,
    reviews: options.reviews || SEED_REVIEWS,
    trackedBooks: SEED_TRACKED,
    notifications: options.notifications || SEED_NOTIFICATIONS,
    chains: [],
  }

  await page.addInitScript(
    ({ storageKey, state }) => {
      if (sessionStorage.getItem("p6-seed-loaded") !== "true") {
        localStorage.setItem(storageKey, JSON.stringify(state))
        sessionStorage.setItem("p6-seed-loaded", "true")
      }
    },
    { storageKey: STORAGE_KEY, state },
  )
}

async function signIn(page: Page, user: User = SEED_USERS[0]) {
  await page.goto("/")
  await page.getByLabel("Email o nombre de usuario").fill(user.email)
  await page.getByLabel("Contraseña").fill("valid-test-password")
  await page.getByRole("button", { name: "Ingresar a la plataforma" }).click()
  await expect(page.locator('button[title="Ir a mi perfil y billetera"]')).toBeVisible()
}

async function signOut(page: Page) {
  await page.locator("aside").getByRole("button", { name: "Cerrar sesión" }).click()
  await expect(page.getByRole("heading", { name: "Iniciar Sesión" })).toBeVisible()
}

async function openNotifications(page: Page) {
  await page.locator("aside").getByRole("button", { name: /Notificaciones/ }).click()
  await expect(page.getByRole("heading", { name: "Notificaciones", exact: true })).toBeVisible()
}

async function openTradeHistory(page: Page) {
  await page.locator("aside").getByRole("button", { name: /Mis Intercambios/ }).click()
  await page.getByRole("button", { name: /Historial/ }).click()
}

function notificationCard(page: Page, title: string) {
  return page.locator("div.group").filter({ has: page.getByRole("heading", { name: title, exact: true }) })
}

function completedTrade(): TradeRequest {
  return {
    id: "trade-completed-p6",
    type: "PUNTOS",
    status: "COMPLETADO",
    requestedBookId: "book-1",
    requesterId: "user-1",
    requesterName: "Franco Papa",
    ownerId: "user-2",
    ownerName: "Miguel Bartesaghi",
    points: 50,
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-02T12:00:00.000Z",
  }
}

async function savedState(page: Page) {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey) || "{}"), STORAGE_KEY)
}

test("las notificaciones se aíslan por usuario y el badge cuenta solo avisos no leídos y no archivados", async ({
  page,
}) => {
  const notifications = [
    ...SEED_NOTIFICATIONS,
    {
      id: "notif-p6-other",
      userId: "user-2",
      type: "TRADE_REQUEST" as const,
      title: "Aviso privado de Miguel",
      message: "Este aviso pertenece a otra cuenta.",
      read: false,
      date: "2026-02-01T12:00:00.000Z",
    },
    {
      id: "notif-p6-archived",
      userId: "user-1",
      type: "TRADE_REQUEST" as const,
      title: "Aviso archivado",
      message: "No debe sumarse al contador.",
      read: false,
      archived: true,
      date: "2026-02-01T12:00:00.000Z",
    },
  ]
  await mockSupabase(page)
  await loadState(page, { notifications })
  await signIn(page)

  await expect(page.locator("aside").getByRole("button", { name: /Notificaciones 1/ })).toBeVisible()
  await openNotifications(page)
  await expect(page.getByText("Nueva solicitud de intercambio", { exact: true })).toBeVisible()
  await expect(page.getByText("Aviso privado de Miguel")).toHaveCount(0)
  await expect(page.getByText("Aviso archivado")).toHaveCount(0)
})

test("abrir una notificación la marca como leída y actualiza el badge", async ({ page }) => {
  await mockSupabase(page)
  await loadState(page)
  await signIn(page)
  await openNotifications(page)

  await notificationCard(page, "Nueva solicitud de intercambio").click()

  const saved = await savedState(page)
  expect(saved.notifications.find((notification: NotificationItem) => notification.id === "notif-1").read).toBe(true)
  await expect(page.locator("aside").getByRole("button", { name: /^Notificaciones$/ })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Mis Intercambios" })).toBeVisible()
})

test("marcar todas como leídas solo afecta los avisos del usuario actual", async ({ page }) => {
  const notifications = [
    ...SEED_NOTIFICATIONS,
    {
      id: "notif-p6-unread",
      userId: "user-1",
      type: "POINTS_RECEIVED" as const,
      title: "Puntos acreditados",
      message: "Recibiste puntos.",
      read: false,
      date: "2026-02-01T12:00:00.000Z",
    },
    {
      id: "notif-p6-other",
      userId: "user-2",
      type: "TRADE_REQUEST" as const,
      title: "Aviso de Miguel",
      message: "No debe modificarse.",
      read: false,
      date: "2026-02-01T12:00:00.000Z",
    },
  ]
  await mockSupabase(page)
  await loadState(page, { notifications })
  await signIn(page)
  await openNotifications(page)
  await page.getByRole("button", { name: "Marcar leídas" }).click()

  const saved = await savedState(page)
  expect(saved.notifications.filter((notification: NotificationItem) => notification.userId === "user-1").every(
    (notification: NotificationItem) => notification.read,
  )).toBe(true)
  expect(saved.notifications.find((notification: NotificationItem) => notification.id === "notif-p6-other").read).toBe(false)
  await expect(page.getByRole("button", { name: "Marcar leídas" })).toHaveCount(0)
})

test("archivar oculta la notificación, persiste el cambio y la quita del contador", async ({ page }) => {
  await mockSupabase(page)
  await loadState(page)
  await signIn(page)
  await openNotifications(page)

  await notificationCard(page, "Nueva solicitud de intercambio").getByTitle("Archivar").click()

  const saved = await savedState(page)
  expect(saved.notifications.find((notification: NotificationItem) => notification.id === "notif-1").archived).toBe(true)
  await expect(page.getByText("Nueva solicitud de intercambio", { exact: true })).toHaveCount(0)
  await expect(page.getByText("¡Libro de tu tracker disponible!", { exact: true })).toBeVisible()
  await expect(page.locator("aside").getByRole("button", { name: /^Notificaciones$/ })).toBeVisible()
})

test("un usuario sin avisos ve el estado vacío sin filtrar avisos de otras cuentas", async ({ page }) => {
  await mockSupabase(page)
  await loadState(page, {
    notifications: [{
      id: "notif-p6-franco",
      userId: "user-1",
      type: "TRADE_REQUEST",
      title: "Solo para Franco",
      message: "Aviso de prueba.",
      read: false,
      date: "2026-02-01T12:00:00.000Z",
    }],
  })
  await signIn(page, SEED_USERS[1])
  await openNotifications(page)

  await expect(page.getByText("No tenés notificaciones pendientes")).toBeVisible()
  await expect(page.getByText("Solo para Franco")).toHaveCount(0)
})

test("aceptar una solicitud genera una notificación para quien la envió, visible al iniciar sesión", async ({
  page,
}) => {
  await mockSupabase(page)
  await loadState(page)
  await signIn(page)
  await page.locator("aside").getByRole("button", { name: /Mis Intercambios/ }).click()
  await page.getByRole("button", { name: "Aceptar Solicitud" }).click()

  const saved = await savedState(page)
  expect(saved.notifications[0]).toMatchObject({
    userId: "user-2",
    type: "TRADE_ACCEPTED",
    read: false,
  })

  await signOut(page)
  await signIn(page, SEED_USERS[1])
  await openNotifications(page)
  await expect(page.getByText("¡Intercambio aceptado!", { exact: true })).toBeVisible()
  await expect(page.getByText("Franco Papa aceptó tu solicitud de intercambio.")).toBeVisible()
})

test("publicar una reseña actualiza reputación, historial y recompensa una sola vez", async ({ page }) => {
  const trades = [completedTrade()]
  await mockSupabase(page)
  await loadState(page, { trades })
  await signIn(page)
  await openTradeHistory(page)

  await page.getByRole("button", { name: "Calificar (+5 pts)" }).click()
  const modal = page.locator("div.fixed.inset-0").filter({ has: page.getByRole("heading", { name: "Calificar a Miguel Bartesaghi" }) })
  await expect(modal).toBeVisible()
  await modal.locator('form button[type="button"]').nth(2).click()
  await expect(modal.getByText("Bueno (3/5)")).toBeVisible()
  await modal.getByPlaceholder("¿Cómo estuvo el estado del libro, la puntualidad y el trato?...").fill("  Buena coordinación y libro cuidado.  ")
  await modal.getByRole("button", { name: "Publicar Calificación" }).click()

  const saved = await savedState(page)
  const review = saved.reviews.find((item: { tradeId: string }) => item.tradeId === "trade-completed-p6")
  expect(review).toMatchObject({
    fromUserId: "user-1",
    toUserId: "user-2",
    rating: 3,
    comment: "Buena coordinación y libro cuidado.",
    bookTitle: "Rayuela",
  })
  expect(saved.users.find((user: User) => user.id === "user-2")).toMatchObject({
    rating: 4,
    totalReviews: 13,
  })
  expect(saved.users.find((user: User) => user.id === "user-1").availablePoints).toBe(105)
  expect(saved.pointMovements.filter((movement: { tradeId?: string; type: string }) =>
    movement.tradeId === "trade-completed-p6" && movement.type === "RECOMPENSA_RESEÑA",
  )).toHaveLength(1)
  expect(saved.trades.find((trade: TradeRequest) => trade.id === "trade-completed-p6").reviewedByRequester).toBe(true)

  await expect(page.getByText("Calificado")).toBeVisible()
  await expect(page.getByRole("button", { name: "Calificar (+5 pts)" })).toHaveCount(0)
})

test("se puede publicar la calificación mínima y los comentarios vacíos o solo espacios no se aceptan", async ({
  page,
}) => {
  await mockSupabase(page)
  await loadState(page, { trades: [completedTrade()] })
  await signIn(page)
  await openTradeHistory(page)
  await page.getByRole("button", { name: "Calificar (+5 pts)" }).click()

  const modal = page.locator("div.fixed.inset-0").filter({ has: page.getByRole("heading", { name: "Calificar a Miguel Bartesaghi" }) })
  await modal.locator('form button[type="button"]').first().click()
  await expect(modal.getByText("Malo (1/5)")).toBeVisible()
  await modal.getByPlaceholder("¿Cómo estuvo el estado del libro, la puntualidad y el trato?...").fill("   ")
  await modal.getByRole("button", { name: "Publicar Calificación" }).click()
  await expect(modal.getByText("Por favor escribí un breve comentario sobre la experiencia.")).toBeVisible()
  expect((await savedState(page)).reviews.some((review: { tradeId: string }) => review.tradeId === "trade-completed-p6")).toBe(false)

  await modal.getByPlaceholder("¿Cómo estuvo el estado del libro, la puntualidad y el trato?...").fill("Experiencia aceptable.")
  await modal.getByRole("button", { name: "Publicar Calificación" }).click()
  const saved = await savedState(page)
  expect(saved.reviews.find((review: { tradeId: string }) => review.tradeId === "trade-completed-p6").rating).toBe(1)
})

test("omitir la reseña conserva el intercambio sin marcarlo calificado ni otorgar puntos", async ({ page }) => {
  await mockSupabase(page)
  await loadState(page, { trades: [completedTrade()] })
  await signIn(page)
  await openTradeHistory(page)
  await page.getByRole("button", { name: "Calificar (+5 pts)" }).click()
  await page.getByRole("button", { name: "Omitir" }).click()

  const saved = await savedState(page)
  expect(saved.reviews.some((review: { tradeId: string }) => review.tradeId === "trade-completed-p6")).toBe(false)
  expect(saved.trades[0].reviewedByRequester).toBeFalsy()
  expect(saved.users.find((user: User) => user.id === "user-1").availablePoints).toBe(100)
})

test("el perfil público muestra reputación y reseñas recibidas de forma consistente", async ({ page }) => {
  await mockSupabase(page)
  await loadState(page, { trades: [completedTrade()] })
  await signIn(page)
  await openTradeHistory(page)
  await page.getByRole("button", { name: "Calificar (+5 pts)" }).click()
  const modal = page.locator("div.fixed.inset-0").filter({ has: page.getByRole("heading", { name: "Calificar a Miguel Bartesaghi" }) })
  await modal.getByPlaceholder("¿Cómo estuvo el estado del libro, la puntualidad y el trato?...").fill("Muy buena experiencia.")
  await modal.getByRole("button", { name: "Publicar Calificación" }).click()

  await page.getByText("Dueño: Miguel Bartesaghi").click()
  await expect(page.getByRole("heading", { name: "Miguel Bartesaghi" })).toBeVisible()
  await expect(page.getByText("5.0 (13)")).toBeVisible()
  await page.getByRole("button", { name: "Reseñas (2)" }).click()
  await expect(page.getByText("Muy buena experiencia.")).toBeVisible()
  await expect(page.getByText("Rayuela", { exact: false })).toBeVisible()
})

test("un intercambio incompleto o cancelado no permite dejar una reseña", async ({ page }) => {
  const incomplete = { ...completedTrade(), id: "trade-incomplete-p6", status: "CANCELADO" as const }
  await mockSupabase(page)
  await loadState(page, { trades: [incomplete] })
  await signIn(page)
  await openTradeHistory(page)

  await expect(page.getByRole("button", { name: "Calificar (+5 pts)" })).toHaveCount(0)
  await expect(page.getByText("Intercambio cancelado. Puntos y libros liberados.")).toBeVisible()
})
