# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: p3-points.spec.ts >> un registro duplicado no vuelve a acreditar puntos ni crea movimientos adicionales
- Location: e2e/p3-points.spec.ts:130:5

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8086
Call log:
  - → POST http://127.0.0.1:8086/api/auth/registro
    - user-agent: Playwright/1.63.0 (arm64; macOS 27.0) node/24.5
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - content-type: application/json
    - content-length: 114

```

# Test source

```ts
  1   | import { randomUUID } from "node:crypto"
  2   | import { expect, test, type APIRequestContext } from "@playwright/test"
  3   | 
  4   | const INITIAL_POINTS = 500
  5   | 
  6   | interface Registration {
  7   |   nombre: string
  8   |   email: string
  9   |   contrasenia: string
  10  | }
  11  | 
  12  | interface AuthResponse {
  13  |   id: string
  14  |   token: string
  15  |   username: string
  16  |   email: string
  17  |   rol: string
  18  |   puntos: number
  19  | }
  20  | 
  21  | interface PointsBalance {
  22  |   saldoTotal: number
  23  |   saldoReservado: number
  24  |   saldoDisponible: number
  25  | }
  26  | 
  27  | interface PointsMovement {
  28  |   tipo: string
  29  |   monto: number
  30  |   origen: string
  31  |   fecha: string | number[] | null
  32  | }
  33  | 
  34  | function newRegistration(): Registration {
  35  |   const suffix = randomUUID().replaceAll("-", "").slice(0, 16)
  36  | 
  37  |   return {
  38  |     nombre: `p3${suffix}`,
  39  |     email: `p3-${suffix}@example.test`,
  40  |     contrasenia: `P3-${suffix}-Ab!`,
  41  |   }
  42  | }
  43  | 
  44  | async function register(request: APIRequestContext, data = newRegistration()) {
> 45  |   const response = await request.post("/api/auth/registro", { data })
      |                                  ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8086
  46  |   expect(response.status()).toBe(201)
  47  | 
  48  |   const body = (await response.json()) as AuthResponse
  49  |   expect(body.id).toMatch(/^[0-9a-f-]{36}$/i)
  50  |   expect(body.token).toBeTruthy()
  51  |   expect(body.username).toBe(data.nombre)
  52  |   expect(body.email).toBe(data.email)
  53  |   expect(body.rol).toBe("USUARIO")
  54  |   expect(body.puntos).toBe(INITIAL_POINTS)
  55  | 
  56  |   return { data, auth: body }
  57  | }
  58  | 
  59  | async function getBalance(request: APIRequestContext, token: string) {
  60  |   const response = await request.get("/api/movimientoPuntos/saldo", {
  61  |     headers: { Authorization: `Bearer ${token}` },
  62  |   })
  63  | 
  64  |   expect(response.status()).toBe(200)
  65  |   return (await response.json()) as PointsBalance
  66  | }
  67  | 
  68  | async function getMovements(request: APIRequestContext, token: string) {
  69  |   const response = await request.get("/api/movimientoPuntos/historial", {
  70  |     headers: { Authorization: `Bearer ${token}` },
  71  |   })
  72  | 
  73  |   expect(response.status()).toBe(200)
  74  |   return (await response.json()) as PointsMovement[]
  75  | }
  76  | 
  77  | test("el registro acredita los puntos iniciales una sola vez y el saldo los refleja", async ({
  78  |   request,
  79  | }) => {
  80  |   const { auth } = await register(request)
  81  |   const balance = await getBalance(request, auth.token)
  82  | 
  83  |   expect(balance).toEqual({
  84  |     saldoTotal: INITIAL_POINTS,
  85  |     saldoReservado: 0,
  86  |     saldoDisponible: INITIAL_POINTS,
  87  |   })
  88  | })
  89  | 
  90  | test("GET saldo devuelve números no negativos y mantiene la relación entre saldos", async ({
  91  |   request,
  92  | }) => {
  93  |   const { auth } = await register(request)
  94  |   const balance = await getBalance(request, auth.token)
  95  | 
  96  |   for (const amount of [
  97  |     balance.saldoTotal,
  98  |     balance.saldoReservado,
  99  |     balance.saldoDisponible,
  100 |   ]) {
  101 |     expect(Number.isInteger(amount)).toBe(true)
  102 |     expect(amount).toBeGreaterThanOrEqual(0)
  103 |   }
  104 |   expect(balance.saldoReservado).toBeLessThanOrEqual(balance.saldoTotal)
  105 |   expect(balance.saldoTotal - balance.saldoReservado).toBe(balance.saldoDisponible)
  106 | })
  107 | 
  108 | test("GET historial incluye exactamente un movimiento inicial positivo con origen y fecha", async ({
  109 |   request,
  110 | }) => {
  111 |   const { auth } = await register(request)
  112 |   const movements = await getMovements(request, auth.token)
  113 | 
  114 |   expect(movements).toHaveLength(1)
  115 |   expect(movements[0]).toMatchObject({
  116 |     tipo: "INGRESO",
  117 |     monto: INITIAL_POINTS,
  118 |     origen: "ALTA_INICIAL",
  119 |   })
  120 |   expect(movements[0].fecha).not.toBeNull()
  121 | })
  122 | 
  123 | test("el saldo y el historial rechazan solicitudes sin autenticación", async ({ request }) => {
  124 |   for (const path of ["/api/movimientoPuntos/saldo", "/api/movimientoPuntos/historial"]) {
  125 |     const response = await request.get(path)
  126 |     expect([401, 403]).toContain(response.status())
  127 |   }
  128 | })
  129 | 
  130 | test("un registro duplicado no vuelve a acreditar puntos ni crea movimientos adicionales", async ({
  131 |   request,
  132 | }) => {
  133 |   const { data, auth } = await register(request)
  134 |   const duplicateResponse = await request.post("/api/auth/registro", { data })
  135 | 
  136 |   expect(duplicateResponse.status()).toBe(409)
  137 |   await expect(duplicateResponse.json()).resolves.toMatchObject({
  138 |     error: "UsuarioYaExiste",
  139 |   })
  140 | 
  141 |   await expect(getBalance(request, auth.token)).resolves.toEqual({
  142 |     saldoTotal: INITIAL_POINTS,
  143 |     saldoReservado: 0,
  144 |     saldoDisponible: INITIAL_POINTS,
  145 |   })
```