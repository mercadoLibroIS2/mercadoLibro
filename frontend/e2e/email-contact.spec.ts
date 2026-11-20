import { test, expect, type Page } from "@playwright/test"

const ana = { id: "a9c37569-bc04-4634-a043-251611f5a992", email: "ana@example.test", nombre: "Ana" }
const bruno = { id: "e19d22d7-b366-4574-952b-42b178c4dc97", email: "bruno@example.test", nombre: "Bruno" }
const carla = { id: "a52b85fa-ff11-4e6e-bebc-5817c4c1a001", email: "carla@example.test", nombre: "Carla" }
const members = [ana, bruno, carla]
const hora = "2026-01-01T12:00:00"

async function openSession(page: Page, current = ana) {
  await page.addInitScript(() => localStorage.setItem("mercadolibro_token", "email-contact-test"))
  await page.route("**/api/**", async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname)
    const profile = (u: typeof ana) => ({ ...u, rol: "USUARIO", saldoTotal: 500, saldoReservado: 0, saldoDisponible: 500, reputacionPromedio: 0 })
    let json: unknown = []
    if (path === "/api/usuario/me") json = profile(current)
    else if (path === "/api/notificacion") json = { content: [] }
    else if (path === "/api/movimientoPuntos/saldo") json = { saldoTotal: 500, saldoDisponible: 500, saldoReservado: 0 }
    else if ((path === "/api/intercambios/enviados" && current === ana) || (path === "/api/intercambios/recibidos" && current === bruno)) {
      json = [{ isbnSolicitada: "B", propietarioSolicitada: bruno.email, horaPublicacionSolicitada: hora,
        isbnOfrecida: "A", propietarioOfrecida: ana.email, horaPublicacionOfrecida: hora,
        nombrePropietarioSolicitada: "Bruno", nombrePropietarioOfrecida: "Ana", estado: "ACEPTADO", puntosComprometidos: 0 }]
    } else if ((path === "/api/compras/mis-compras" && current === ana) || (path === "/api/compras/mis-ventas" && current === bruno)) {
      json = [{ isbn: "C", emailVendedor: bruno.email, emailComprador: ana.email,
        nombreVendedor: "Bruno", nombreComprador: "Ana", horaPublicacion: hora, estado: "ENVIADA", puntos: 500 }]
    } else if (path === "/api/cadenaIntercambio") {
      json = [{ id: "email-chain", estado: "EN_CURSO", puntosBonus: 50, participantesEmails: members.map((u) => u.email),
        pasos: members.map((u, i) => ({ emailEntrega: u.email, nombreEntrega: u.nombre,
          emailRecibe: members[(i + 1) % 3].email, isbn: String(i), horaPublicacion: hora,
          titulo: `Libro ${i}`, autor: "Autor", confirmado: true, recibido: false })) }]
    } else if (path.startsWith("/api/usuario/") && !path.endsWith("/libros-seguidos")) {
      const user = members.find((u) => path === `/api/usuario/${u.email}` || path === `/api/usuario/${u.id}`)
      if (user) json = profile(user)
    }
    await route.fulfill({ json })
  })
  await page.goto("/")
  await expect(page.locator("aside").getByRole("button", { name: /^Mis Intercambios/ })).toBeVisible()
}

for (const current of [ana, bruno]) {
  test(`contacto correcto en trueque y puntos para ${current.nombre}`, async ({ page }) => {
    await openSession(page, current)
    await page.locator("aside").getByRole("button", { name: /^Mis Intercambios/ }).click()
    await page.getByRole("button", { name: /En Curso/ }).click()
    const other = current === ana ? bruno : ana
    for (const type of ["Trueque Directo", "Canje por Puntos"]) {
      const card = page.locator("article").filter({ hasText: type })
      await expect(card.getByText(other.email, { exact: true })).toBeVisible()
      const contact = card.getByRole("link", { name: `Contactar por email a ${other.nombre}` })
      await expect(contact).toHaveAttribute("href", `mailto:${other.email}?subject=Coordinar%20intercambio%20en%20MercadoLibro`)
      await expect(card.getByRole("link", { name: `Contactar por email a ${current.nombre}` })).toHaveCount(0)
    }
  })
}

test("cadena permite contactar a los otros lectores y abrir su perfil público", async ({ page }) => {
  await openSession(page)
  await page.locator("aside").getByRole("button", { name: "Cadenas Circulares", exact: true }).click()
  for (const other of [bruno, carla]) {
    await expect(page.getByRole("link", { name: `Contactar por email a ${other.nombre}` })).toHaveAttribute("href", new RegExp(`^mailto:${other.email}\\?`))
  }
  await expect(page.getByRole("link", { name: "Contactar por email a Ana" })).toHaveCount(0)
  await page.getByRole("button", { name: "Ver perfil de Bruno" }).click()
  await expect(page.getByRole("heading", { name: "Bruno", exact: true })).toBeVisible()
  await expect(page.getByText(bruno.email, { exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Contactar por email a Bruno" })).toHaveAttribute("href", /^mailto:bruno@example.test\?/)
})
