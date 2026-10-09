import { randomUUID } from "node:crypto"
import { expect, test, type APIRequestContext } from "@playwright/test"

const INITIAL_POINTS = 500
const LOW_VALUE_ISBN = process.env.P4_ISBN_MENOR || "978-84-376-0457-2"
const HIGH_VALUE_ISBN = process.env.P4_ISBN_MAYOR || "978-987-566-646-7"
const INSUFFICIENT_BALANCE_ISBN = process.env.P4_ISBN_SALDO_INSUFICIENTE
const FIXED_PUBLICATION_VALUE = 100

interface AuthResponse {
  id: string
  token: string
  username: string
  email: string
  puntos: number
}

interface UserSession {
  email: string
  token: string
}

interface Publication {
  publicacionId: {
    isbn: string
    emailPropietario: string
    horaPublicacion: string
  }
  estadoFisico: string
  valorPuntosSolicitado: number
  valorReferenciaCalculado: number
}

interface Exchange {
  isbnOfrecida: string
  tituloOfrecido: string
  propietarioOfrecida: string
  horaPublicacionOfrecida: string
  isbnSolicitada: string
  tituloSolicitado: string
  propietarioSolicitada: string
  horaPublicacionSolicitada: string
  estado: string
  puntosComprometidos: number
  motivoRechazo: string | null
}

interface ExchangePair {
  proposer: UserSession
  recipient: UserSession
  offered: Publication
  requested: Publication
  points: number
}

function uniqueUser(prefix: string) {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 16)

  return {
    nombre: `${prefix}${suffix}`,
    email: `${prefix}-${suffix}@example.test`,
    contrasenia: `P4-${suffix}-Ab!`,
  }
}

async function apiOk<T>(response: Awaited<ReturnType<APIRequestContext["get"]>>) {
  const text = await response.text()
  expect(response.ok(), `${response.status()}: ${text}`).toBe(true)
  if (!text) throw new Error(`La API devolvió un cuerpo vacío con HTTP ${response.status()}`)
  return JSON.parse(text) as T
}

async function registerUser(request: APIRequestContext, prefix: string): Promise<UserSession> {
  const input = uniqueUser(prefix)
  const response = await request.post("/api/auth/registro", { data: input })
  const auth = await apiOk<AuthResponse>(response)

  expect(auth?.token).toBeTruthy()
  expect(auth?.email).toBe(input.email)
  expect(auth?.puntos).toBe(INITIAL_POINTS)

  return { email: input.email, token: auth!.token }
}

async function publish(
  request: APIRequestContext,
  owner: UserSession,
  isbn: string,
): Promise<Publication> {
  const response = await request.post("/api/publicaciones/publicar", {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: {
      isbn,
      estadoFisico: "NUEVO",
      valorPuntosSolicitado: FIXED_PUBLICATION_VALUE,
      comentario: "Publicación creada por pruebas E2E P4",
    },
  })

  const publication = await apiOk<Publication>(response)
  expect(publication?.publicacionId.isbn).toBe(isbn)
  expect(publication?.publicacionId.emailPropietario).toBe(owner.email)
  expect(publication?.publicacionId.horaPublicacion).toBeTruthy()
  expect(publication?.valorReferenciaCalculado).toBeGreaterThan(0)

  return publication!
}

async function createPair(
  request: APIRequestContext,
  direction: "proposer-owes" | "recipient-owes" | "equal" = "proposer-owes",
): Promise<ExchangePair> {
  const proposer = await registerUser(request, "p4-proposer")
  const recipient = await registerUser(request, "p4-recipient")

  const offeredIsbn = direction === "recipient-owes" ? HIGH_VALUE_ISBN : LOW_VALUE_ISBN
  const requestedIsbn =
    direction === "recipient-owes"
      ? LOW_VALUE_ISBN
      : direction === "equal"
        ? LOW_VALUE_ISBN
        : HIGH_VALUE_ISBN

  const [offered, requested] = await Promise.all([
    publish(request, proposer, offeredIsbn),
    publish(request, recipient, requestedIsbn),
  ])

  if (direction === "proposer-owes") {
    expect(offered.valorReferenciaCalculado).toBeLessThan(requested.valorReferenciaCalculado)
  } else if (direction === "recipient-owes") {
    expect(offered.valorReferenciaCalculado).toBeGreaterThan(requested.valorReferenciaCalculado)
  } else {
    expect(offered.valorReferenciaCalculado).toBe(requested.valorReferenciaCalculado)
  }

  const points = Math.abs(
    requested.valorReferenciaCalculado - offered.valorReferenciaCalculado,
  )
  expect(points).toBeLessThanOrEqual(INITIAL_POINTS)

  return { proposer, recipient, offered, requested, points }
}

function exchangeRequest(pair: ExchangePair) {
  return {
    isbnOfrecida: pair.offered.publicacionId.isbn,
    horaPublicacionOfrecida: pair.offered.publicacionId.horaPublicacion,
    isbnSolicitada: pair.requested.publicacionId.isbn,
    emailPropietarioSolicitada: pair.recipient.email,
    horaPublicacionSolicitada: pair.requested.publicacionId.horaPublicacion,
    puntosComprometidos: 0,
  }
}

function exchangeQuery(pair: ExchangePair) {
  const query = new URLSearchParams({
    isbnSolicitada: pair.requested.publicacionId.isbn,
    propietarioSolicitada: pair.recipient.email,
    horaSolicitada: pair.requested.publicacionId.horaPublicacion,
    isbnOfrecida: pair.offered.publicacionId.isbn,
    propietarioOfrecida: pair.proposer.email,
    horaOfrecida: pair.offered.publicacionId.horaPublicacion,
  })

  return query.toString()
}

async function propose(request: APIRequestContext, pair: ExchangePair) {
  const response = await request.post("/api/intercambios", {
    headers: { Authorization: `Bearer ${pair.proposer.token}` },
    data: exchangeRequest(pair),
  })
  return apiOk<Exchange>(response)
}

async function changeExchange(
  request: APIRequestContext,
  pair: ExchangePair,
  action: "aceptar" | "cancelar" | "completar",
  actor: UserSession,
) {
  const response = await request.patch(
    `/api/intercambios/${action}?${exchangeQuery(pair)}`,
    { headers: { Authorization: `Bearer ${actor.token}` } },
  )
  return apiOk<Exchange>(response)
}

async function getExchanges(
  request: APIRequestContext,
  direction: "enviados" | "recibidos",
  user: UserSession,
) {
  const response = await request.get(`/api/intercambios/${direction}`, {
    headers: { Authorization: `Bearer ${user.token}` },
  })
  return apiOk<Exchange[]>(response)
}

async function getExchangeState(request: APIRequestContext, pair: ExchangePair) {
  const response = await request.get(`/api/intercambios/estado?${exchangeQuery(pair)}`)
  return apiOk<string>(response)
}

async function getBalance(request: APIRequestContext, user: UserSession) {
  const response = await request.get("/api/movimientoPuntos/saldo", {
    headers: { Authorization: `Bearer ${user.token}` },
  })
  return apiOk<{ saldoTotal: number; saldoReservado: number; saldoDisponible: number }>(response)
}

async function getMovementTypes(request: APIRequestContext, user: UserSession) {
  const response = await request.get("/api/movimientoPuntos/historial", {
    headers: { Authorization: `Bearer ${user.token}` },
  })
  const movements = await apiOk<Array<{ tipo: string; monto: number; origen: string }>>(response)
  return movements!.map((movement) => movement.tipo)
}

function findExchange(exchanges: Exchange[], pair: ExchangePair) {
  return exchanges.find(
    (exchange) =>
      exchange.isbnOfrecida === pair.offered.publicacionId.isbn &&
      exchange.propietarioOfrecida === pair.proposer.email &&
      exchange.horaPublicacionOfrecida === pair.offered.publicacionId.horaPublicacion &&
      exchange.isbnSolicitada === pair.requested.publicacionId.isbn &&
      exchange.propietarioSolicitada === pair.recipient.email &&
      exchange.horaPublicacionSolicitada === pair.requested.publicacionId.horaPublicacion,
  )
}

test("proponer intercambio calcula la compensación, reserva al proponente y lista enviados/recibidos", async ({
  request,
}) => {
  const pair = await createPair(request)
  const exchange = await propose(request, pair)

  expect(exchange).toMatchObject({
    estado: "PENDIENTE",
    puntosComprometidos: pair.points,
    propietarioOfrecida: pair.proposer.email,
    propietarioSolicitada: pair.recipient.email,
  })

  const [proposerBalance, recipientBalance, sent, received] = await Promise.all([
    getBalance(request, pair.proposer),
    getBalance(request, pair.recipient),
    getExchanges(request, "enviados", pair.proposer),
    getExchanges(request, "recibidos", pair.recipient),
  ])
  expect(proposerBalance).toEqual({
    saldoTotal: INITIAL_POINTS,
    saldoReservado: pair.points,
    saldoDisponible: INITIAL_POINTS - pair.points,
  })
  expect(recipientBalance?.saldoReservado).toBe(0)
  expect(findExchange(sent!, pair)?.estado).toBe("PENDIENTE")
  expect(findExchange(received!, pair)?.puntosComprometidos).toBe(pair.points)
})

test("al ofrecer el libro de mayor valor, la compensación se reserva al receptor al aceptar", async ({
  request,
}) => {
  const pair = await createPair(request, "recipient-owes")
  const proposal = await propose(request, pair)
  expect(proposal?.puntosComprometidos).toBe(pair.points)
  expect((await getBalance(request, pair.proposer))?.saldoReservado).toBe(0)

  const accepted = await changeExchange(request, pair, "aceptar", pair.recipient)
  expect(accepted?.estado).toBe("ACEPTADO")
  expect(await getExchangeState(request, pair)).toBe("ACEPTADO")

  const [proposerBalance, recipientBalance] = await Promise.all([
    getBalance(request, pair.proposer),
    getBalance(request, pair.recipient),
  ])
  expect(proposerBalance?.saldoReservado).toBe(0)
  expect(recipientBalance).toEqual({
    saldoTotal: INITIAL_POINTS,
    saldoReservado: pair.points,
    saldoDisponible: INITIAL_POINTS - pair.points,
  })
})

test("aceptar y confirmar completa el intercambio, paga la diferencia y acredita bonos", async ({
  request,
}) => {
  const pair = await createPair(request)
  await propose(request, pair)

  const accepted = await changeExchange(request, pair, "aceptar", pair.recipient)
  expect(accepted?.estado).toBe("ACEPTADO")

  const firstConfirmation = await changeExchange(request, pair, "completar", pair.proposer)
  expect(firstConfirmation?.estado).toBe("CONFIRMADO_POR_PROPONENTE")
  expect(await getExchangeState(request, pair)).toBe("CONFIRMADO_POR_PROPONENTE")

  const completed = await changeExchange(request, pair, "completar", pair.recipient)
  expect(completed?.estado).toBe("COMPLETADO")
  expect(await getExchangeState(request, pair)).toBe("COMPLETADO")

  const [proposerBalance, recipientBalance, sent, received, proposerMovements, recipientMovements] =
    await Promise.all([
      getBalance(request, pair.proposer),
      getBalance(request, pair.recipient),
      getExchanges(request, "enviados", pair.proposer),
      getExchanges(request, "recibidos", pair.recipient),
      getMovementTypes(request, pair.proposer),
      getMovementTypes(request, pair.recipient),
    ])

  expect(proposerBalance).toEqual({
    saldoTotal: INITIAL_POINTS - pair.points + 100,
    saldoReservado: 0,
    saldoDisponible: INITIAL_POINTS - pair.points + 100,
  })
  expect(recipientBalance).toEqual({
    saldoTotal: INITIAL_POINTS + pair.points + 100,
    saldoReservado: 0,
    saldoDisponible: INITIAL_POINTS + pair.points + 100,
  })
  expect(findExchange(sent!, pair)?.estado).toBe("COMPLETADO")
  expect(findExchange(received!, pair)?.estado).toBe("COMPLETADO")
  expect(proposerMovements).toContain("EGRESO")
  expect(proposerMovements).toContain("BONIFICACION")
  expect(recipientMovements).toContain("INGRESO")
  expect(recipientMovements).toContain("BONIFICACION")
})

test("cancelar una propuesta pendiente libera la compensación y permite proponerla otra vez", async ({
  request,
}) => {
  const pair = await createPair(request)
  await propose(request, pair)
  expect((await getBalance(request, pair.proposer))?.saldoReservado).toBe(pair.points)

  const cancelled = await changeExchange(request, pair, "cancelar", pair.proposer)
  expect(cancelled?.estado).toBe("CANCELADO")
  expect(await getExchangeState(request, pair)).toBe("CANCELADO")
  expect((await getBalance(request, pair.proposer))?.saldoReservado).toBe(0)
  expect(await getMovementTypes(request, pair.proposer)).toContain("LIBERACION_RESERVA")

  const retried = await propose(request, pair)
  expect(retried?.estado).toBe("PENDIENTE")
  expect(retried?.puntosComprometidos).toBe(pair.points)
  expect((await getBalance(request, pair.proposer))?.saldoReservado).toBe(pair.points)
  expect(findExchange(await getExchanges(request, "enviados", pair.proposer)!, pair)?.estado).toBe(
    "PENDIENTE",
  )
})

test("cancelar después de aceptar libera puntos y vuelve a habilitar las publicaciones", async ({
  request,
}) => {
  const pair = await createPair(request)
  await propose(request, pair)
  await changeExchange(request, pair, "aceptar", pair.recipient)
  expect((await getBalance(request, pair.proposer))?.saldoReservado).toBe(pair.points)

  const cancelled = await changeExchange(request, pair, "cancelar", pair.recipient)
  expect(cancelled?.estado).toBe("CANCELADO")

  const [proposerBalance, recipientBalance] = await Promise.all([
    getBalance(request, pair.proposer),
    getBalance(request, pair.recipient),
  ])
  expect(proposerBalance?.saldoTotal).toBe(INITIAL_POINTS)
  expect(proposerBalance?.saldoReservado).toBe(0)
  expect(recipientBalance?.saldoReservado).toBe(0)
  expect(await getMovementTypes(request, pair.proposer)).toContain("LIBERACION_RESERVA")

  const newProposal = await propose(request, pair)
  expect(newProposal?.estado).toBe("PENDIENTE")
})

test("un intercambio sin diferencia de valor no retiene puntos", async ({ request }) => {
  const pair = await createPair(request, "equal")
  const proposal = await propose(request, pair)

  expect(pair.points).toBe(0)
  expect(proposal?.puntosComprometidos).toBe(0)
  expect((await getBalance(request, pair.proposer))?.saldoReservado).toBe(0)
  expect((await getBalance(request, pair.recipient))?.saldoReservado).toBe(0)

  const accepted = await changeExchange(request, pair, "aceptar", pair.recipient)
  expect(accepted?.estado).toBe("ACEPTADO")
  expect((await getBalance(request, pair.proposer))?.saldoReservado).toBe(0)
  expect((await getBalance(request, pair.recipient))?.saldoReservado).toBe(0)
})

test("solo el receptor puede aceptar; los estados terminales no se aceptan de nuevo", async ({
  request,
}) => {
  const pair = await createPair(request)
  await propose(request, pair)

  const proposerAccept = await request.patch(
    `/api/intercambios/aceptar?${exchangeQuery(pair)}`,
    { headers: { Authorization: `Bearer ${pair.proposer.token}` } },
  )
  expect(proposerAccept.ok()).toBe(false)
  expect(await getExchangeState(request, pair)).toBe("PENDIENTE")

  await changeExchange(request, pair, "aceptar", pair.recipient)
  const repeatedAccept = await request.patch(
    `/api/intercambios/aceptar?${exchangeQuery(pair)}`,
    { headers: { Authorization: `Bearer ${pair.recipient.token}` } },
  )
  expect(repeatedAccept.ok()).toBe(false)
  expect(await getExchangeState(request, pair)).toBe("ACEPTADO")
})

test("los listados distinguen estados en curso e historial tras cancelar", async ({ request }) => {
  const pair = await createPair(request)
  await propose(request, pair)

  expect(findExchange(await getExchanges(request, "enviados", pair.proposer)!, pair)?.estado).toBe(
    "PENDIENTE",
  )
  expect(
    findExchange(await getExchanges(request, "recibidos", pair.recipient)!, pair)?.estado,
  ).toBe("PENDIENTE")

  await changeExchange(request, pair, "aceptar", pair.recipient)
  expect(findExchange(await getExchanges(request, "enviados", pair.proposer)!, pair)?.estado).toBe(
    "ACEPTADO",
  )
  expect(
    findExchange(await getExchanges(request, "recibidos", pair.recipient)!, pair)?.estado,
  ).toBe("ACEPTADO")

  await changeExchange(request, pair, "cancelar", pair.proposer)
  expect(findExchange(await getExchanges(request, "enviados", pair.proposer)!, pair)?.estado).toBe(
    "CANCELADO",
  )
  expect(
    findExchange(await getExchanges(request, "recibidos", pair.recipient)!, pair)?.estado,
  ).toBe("CANCELADO")
})

test("solicitudes no autenticadas e intercambios propios son rechazados", async ({ request }) => {
  const proposer = await registerUser(request, "p4-owner")
  const offered = await publish(request, proposer, LOW_VALUE_ISBN)
  const requested = await publish(request, proposer, HIGH_VALUE_ISBN)
  const ownPair: ExchangePair = {
    proposer,
    recipient: proposer,
    offered,
    requested,
    points: Math.abs(
      requested.valorReferenciaCalculado - offered.valorReferenciaCalculado,
    ),
  }

  const unauthenticated = await request.post("/api/intercambios", {
    data: exchangeRequest(ownPair),
  })
  expect([401, 403]).toContain(unauthenticated.status())

  const ownProposal = await request.post("/api/intercambios", {
    headers: { Authorization: `Bearer ${proposer.token}` },
    data: {
      ...exchangeRequest(ownPair),
      emailPropietarioSolicitada: proposer.email,
    },
  })
  expect(ownProposal.ok()).toBe(false)

  const sentWithoutToken = await request.get("/api/intercambios/enviados")
  const receivedWithoutToken = await request.get("/api/intercambios/recibidos")
  expect([401, 403]).toContain(sentWithoutToken.status())
  expect([401, 403]).toContain(receivedWithoutToken.status())
})

test("una publicación reservada impide una nueva propuesta y una cancelación repetida", async ({
  request,
}) => {
  const pair = await createPair(request)
  await propose(request, pair)
  await changeExchange(request, pair, "aceptar", pair.recipient)

  const unavailableProposal = await request.post("/api/intercambios", {
    headers: { Authorization: `Bearer ${pair.proposer.token}` },
    data: exchangeRequest(pair),
  })
  expect(unavailableProposal.ok()).toBe(false)

  await changeExchange(request, pair, "cancelar", pair.proposer)
  const repeatedCancel = await request.patch(
    `/api/intercambios/cancelar?${exchangeQuery(pair)}`,
    { headers: { Authorization: `Bearer ${pair.proposer.token}` } },
  )
  expect(repeatedCancel.ok()).toBe(false)
  expect(await getExchangeState(request, pair)).toBe("CANCELADO")
})

test("la propuesta sin campos obligatorios falla sin alterar el saldo", async ({ request }) => {
  const pair = await createPair(request)
  const invalidProposal = await request.post("/api/intercambios", {
    headers: { Authorization: `Bearer ${pair.proposer.token}` },
    data: { ...exchangeRequest(pair), horaPublicacionOfrecida: null },
  })

  expect(invalidProposal.status()).toBe(400)
  expect(await getBalance(request, pair.proposer)).toEqual({
    saldoTotal: INITIAL_POINTS,
    saldoReservado: 0,
    saldoDisponible: INITIAL_POINTS,
  })
  expect(findExchange(await getExchanges(request, "enviados", pair.proposer), pair)).toBeUndefined()
})

test("un proponente sin puntos suficientes no puede reservar una compensación mayor al saldo", async ({
  request,
}) => {
  test.skip(
    !INSUFFICIENT_BALANCE_ISBN,
    "Configurar P4_ISBN_SALDO_INSUFICIENTE con un libro cuyo valor supere en más de 500 puntos al ISBN menor.",
  )

  const proposer = await registerUser(request, "p4-shortfall")
  const recipient = await registerUser(request, "p4-shortfall-owner")
  const [offered, requested] = await Promise.all([
    publish(request, proposer, LOW_VALUE_ISBN),
    publish(request, recipient, INSUFFICIENT_BALANCE_ISBN!),
  ])
  const difference = requested.valorReferenciaCalculado - offered.valorReferenciaCalculado
  test.skip(difference <= INITIAL_POINTS, "Los ISBN configurados no superan el saldo inicial.")

  const pair: ExchangePair = {
    proposer,
    recipient,
    offered,
    requested,
    points: difference,
  }
  const response = await request.post("/api/intercambios", {
    headers: { Authorization: `Bearer ${proposer.token}` },
    data: exchangeRequest(pair),
  })

  expect(response.ok()).toBe(false)
  expect(await getBalance(request, proposer)).toEqual({
    saldoTotal: INITIAL_POINTS,
    saldoReservado: 0,
    saldoDisponible: INITIAL_POINTS,
  })
  expect(findExchange(await getExchanges(request, "enviados", proposer), pair)).toBeUndefined()
})
