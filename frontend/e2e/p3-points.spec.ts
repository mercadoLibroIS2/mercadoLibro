import { randomUUID } from "node:crypto"
import { expect, test, type APIRequestContext } from "@playwright/test"

const INITIAL_POINTS = 500

interface Registration {
  nombre: string
  email: string
  contrasenia: string
}

interface AuthResponse {
  id: string
  token: string
  username: string
  email: string
  rol: string
  puntos: number
}

interface PointsBalance {
  saldoTotal: number
  saldoReservado: number
  saldoDisponible: number
}

interface PointsMovement {
  tipo: string
  monto: number
  origen: string
  fecha: string | number[] | null
}

function newRegistration(): Registration {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 16)

  return {
    nombre: `p3${suffix}`,
    email: `p3-${suffix}@example.test`,
    contrasenia: `P3-${suffix}-Ab!`,
  }
}

async function register(request: APIRequestContext, data = newRegistration()) {
  const response = await request.post("/api/auth/registro", { data })
  expect(response.status()).toBe(201)

  const body = (await response.json()) as AuthResponse
  expect(body.id).toMatch(/^[0-9a-f-]{36}$/i)
  expect(body.token).toBeTruthy()
  expect(body.username).toBe(data.nombre)
  expect(body.email).toBe(data.email)
  expect(body.rol).toBe("USUARIO")
  expect(body.puntos).toBe(INITIAL_POINTS)

  return { data, auth: body }
}

async function getBalance(request: APIRequestContext, token: string) {
  const response = await request.get("/api/movimientoPuntos/saldo", {
    headers: { Authorization: `Bearer ${token}` },
  })

  expect(response.status()).toBe(200)
  return (await response.json()) as PointsBalance
}

async function getMovements(request: APIRequestContext, token: string) {
  const response = await request.get("/api/movimientoPuntos/historial", {
    headers: { Authorization: `Bearer ${token}` },
  })

  expect(response.status()).toBe(200)
  return (await response.json()) as PointsMovement[]
}

test("el registro acredita los puntos iniciales una sola vez y el saldo los refleja", async ({
  request,
}) => {
  const { auth } = await register(request)
  const balance = await getBalance(request, auth.token)

  expect(balance).toEqual({
    saldoTotal: INITIAL_POINTS,
    saldoReservado: 0,
    saldoDisponible: INITIAL_POINTS,
  })
})

test("GET saldo devuelve números no negativos y mantiene la relación entre saldos", async ({
  request,
}) => {
  const { auth } = await register(request)
  const balance = await getBalance(request, auth.token)

  for (const amount of [
    balance.saldoTotal,
    balance.saldoReservado,
    balance.saldoDisponible,
  ]) {
    expect(Number.isInteger(amount)).toBe(true)
    expect(amount).toBeGreaterThanOrEqual(0)
  }
  expect(balance.saldoReservado).toBeLessThanOrEqual(balance.saldoTotal)
  expect(balance.saldoTotal - balance.saldoReservado).toBe(balance.saldoDisponible)
})

test("GET historial incluye exactamente un movimiento inicial positivo con origen y fecha", async ({
  request,
}) => {
  const { auth } = await register(request)
  const movements = await getMovements(request, auth.token)

  expect(movements).toHaveLength(1)
  expect(movements[0]).toMatchObject({
    tipo: "INGRESO",
    monto: INITIAL_POINTS,
    origen: "ALTA_INICIAL",
  })
  expect(movements[0].fecha).not.toBeNull()
})

test("el saldo y el historial rechazan solicitudes sin autenticación", async ({ request }) => {
  for (const path of ["/api/movimientoPuntos/saldo", "/api/movimientoPuntos/historial"]) {
    const response = await request.get(path)
    expect([401, 403]).toContain(response.status())
  }
})

test("un registro duplicado no vuelve a acreditar puntos ni crea movimientos adicionales", async ({
  request,
}) => {
  const { data, auth } = await register(request)
  const duplicateResponse = await request.post("/api/auth/registro", { data })

  expect(duplicateResponse.status()).toBe(409)
  await expect(duplicateResponse.json()).resolves.toMatchObject({
    error: "UsuarioYaExiste",
  })

  await expect(getBalance(request, auth.token)).resolves.toEqual({
    saldoTotal: INITIAL_POINTS,
    saldoReservado: 0,
    saldoDisponible: INITIAL_POINTS,
  })
  await expect(getMovements(request, auth.token)).resolves.toHaveLength(1)
})

test("el registro inválido no crea una cuenta ni otorga puntos", async ({ request }) => {
  const validData = newRegistration()
  const invalidRegistrations: Registration[] = [
    { ...validData, nombre: "ab" },
    { ...validData, email: "email-invalido" },
    { ...validData, contrasenia: "corta" },
    { ...validData, contrasenia: "" },
  ]

  for (const data of invalidRegistrations) {
    const response = await request.post("/api/auth/registro", { data })
    expect(response.status(), JSON.stringify(data)).toBe(400)
  }
})

test("usuarios diferentes consultan saldo e historial con sus propios tokens", async ({ request }) => {
  const first = await register(request)
  const second = await register(request)

  const [firstBalance, secondBalance, firstMovements, secondMovements] = await Promise.all([
    getBalance(request, first.auth.token),
    getBalance(request, second.auth.token),
    getMovements(request, first.auth.token),
    getMovements(request, second.auth.token),
  ])

  expect(first.auth.id).not.toBe(second.auth.id)
  expect(firstBalance.saldoTotal).toBe(INITIAL_POINTS)
  expect(secondBalance.saldoTotal).toBe(INITIAL_POINTS)
  expect(firstBalance.saldoReservado).toBe(0)
  expect(secondBalance.saldoReservado).toBe(0)
  expect(firstMovements).toHaveLength(1)
  expect(secondMovements).toHaveLength(1)
  expect(firstMovements[0].tipo).toBe("INGRESO")
  expect(secondMovements[0].tipo).toBe("INGRESO")
})
