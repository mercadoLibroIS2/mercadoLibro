# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: p3-points.spec.ts >> el registro inválido no crea una cuenta ni otorga puntos
- Location: e2e/p3-points.spec.ts:149:5

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8086
Call log:
  - → POST http://127.0.0.1:8086/api/auth/registro
    - user-agent: Playwright/1.63.0 (arm64; macOS 27.0) node/24.5
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - content-type: application/json
    - content-length: 98

```

# Test source

```ts
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
  146 |   await expect(getMovements(request, auth.token)).resolves.toHaveLength(1)
  147 | })
  148 | 
  149 | test("el registro inválido no crea una cuenta ni otorga puntos", async ({ request }) => {
  150 |   const validData = newRegistration()
  151 |   const invalidRegistrations: Registration[] = [
  152 |     { ...validData, nombre: "ab" },
  153 |     { ...validData, email: "email-invalido" },
  154 |     { ...validData, contrasenia: "corta" },
  155 |     { ...validData, contrasenia: "" },
  156 |   ]
  157 | 
  158 |   for (const data of invalidRegistrations) {
> 159 |     const response = await request.post("/api/auth/registro", { data })
      |                                    ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8086
  160 |     expect(response.status(), JSON.stringify(data)).toBe(400)
  161 |   }
  162 | })
  163 | 
  164 | test("usuarios diferentes consultan saldo e historial con sus propios tokens", async ({ request }) => {
  165 |   const first = await register(request)
  166 |   const second = await register(request)
  167 | 
  168 |   const [firstBalance, secondBalance, firstMovements, secondMovements] = await Promise.all([
  169 |     getBalance(request, first.auth.token),
  170 |     getBalance(request, second.auth.token),
  171 |     getMovements(request, first.auth.token),
  172 |     getMovements(request, second.auth.token),
  173 |   ])
  174 | 
  175 |   expect(first.auth.id).not.toBe(second.auth.id)
  176 |   expect(firstBalance.saldoTotal).toBe(INITIAL_POINTS)
  177 |   expect(secondBalance.saldoTotal).toBe(INITIAL_POINTS)
  178 |   expect(firstBalance.saldoReservado).toBe(0)
  179 |   expect(secondBalance.saldoReservado).toBe(0)
  180 |   expect(firstMovements).toHaveLength(1)
  181 |   expect(secondMovements).toHaveLength(1)
  182 |   expect(firstMovements[0].tipo).toBe("INGRESO")
  183 |   expect(secondMovements[0].tipo).toBe("INGRESO")
  184 | })
  185 | 
```