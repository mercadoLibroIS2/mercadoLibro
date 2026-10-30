import type {
  Condition,
  GoogleBookVolume,
} from "./mercado-types"

export type EstadoFisico =
  | "NUEVO"
  | "COMO_NUEVO"
  | "BUEN_ESTADO"
  | "ACEPTABLE"
  | "DETERIORADO"

export type ColorSemaforo = "VERDE" | "AMARILLO" | "ROJO" | "SIN_REFERENCIA"

export const CONDITION_TO_ESTADO: Record<Condition, EstadoFisico> = {
  Nuevo: "NUEVO",
  "Como nuevo": "COMO_NUEVO",
  "Muy bueno": "BUEN_ESTADO",
  Bueno: "BUEN_ESTADO",
  Aceptable: "ACEPTABLE",
  "Con marcas": "DETERIORADO",
}

export const ESTADO_TO_CONDITION: Record<EstadoFisico, Condition> = {
  NUEVO: "Nuevo",
  COMO_NUEVO: "Como nuevo",
  BUEN_ESTADO: "Bueno",
  ACEPTABLE: "Aceptable",
  DETERIORADO: "Con marcas",
}

export interface PublicacionId {
  isbn: string
  emailPropietario: string
  horaPublicacion: string
}

export interface PublicacionResponse {
  publicacionId: PublicacionId
  titulo: string
  autor: string
  portadaUrl: string
  estadoFisico: EstadoFisico
  valorPuntosSolicitado: number
  valorReferenciaCalculado: number
  colorSemaforo: ColorSemaforo
  comentario: string
}

export interface AuthResponse {
  id: string
  token: string
  username: string
  email: string
  rol: string
  puntos: number
}

export interface PerfilResponse {
  id: string
  nombre: string
  email: string
  rol: string
  saldoTotal: number
  saldoReservado: number
  saldoDisponible: number
  reputacionPromedio: number
}

export interface SaldoPuntosResponse {
  saldoTotal: number
  saldoReservado: number
  saldoDisponible: number
}

export interface MovimientoPuntosResponse {
  tipo: string
  monto: number
  origen: string
  fecha: string
}

export interface IntercambioResponse {
  isbnOfrecida: string
  tituloOfrecido: string
  propietarioOfrecida: string
  horaPublicacionOfrecida: string
  isbnSolicitada: string
  tituloSolicitado: string
  propietarioSolicitada: string
  horaPublicacionSolicitada: string
  estado:
    | "PENDIENTE"
    | "ACEPTADO"
    | "RECHAZADO"
    | "CANCELADO"
    | "COMPLETADO"
    | "CONFIRMADO_POR_PROPONENTE"
    | "CONFIRMADO_POR_RECEPTOR"
  puntosComprometidos: number
  motivoRechazo?: string
}

export interface IntercambioIdParams {
  isbnSolicitada: string
  propietarioSolicitada: string
  horaSolicitada: string
  isbnOfrecida: string
  propietarioOfrecida: string
  horaOfrecida: string
}

const TOKEN_KEY = "mercadolibro_token"

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function getBackendUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ||
    "https://mercadolibro.onrender.com"
  )
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = getBackendUrl()
  const token = getAuthToken()

  const headers = new Headers(options.headers || {})
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json")
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6000)

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    })
    clearTimeout(timeoutId)

    if (response.status === 204) {
      return null as unknown as T
    }

    if (!response.ok) {
      let errorMsg = `Error HTTP ${response.status}`
      try {
        const errJson = await response.json()
        errorMsg = errJson.message || errJson.error || JSON.stringify(errJson)
      } catch {
        const text = await response.text().catch(() => "")
        if (text) errorMsg = text
      }
      throw new Error(errorMsg)
    }

    return response.json() as Promise<T>
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === "AbortError") {
      throw new Error("El servidor tardó demasiado en responder (tiempo de espera agotado)")
    }
    throw err
  }
}

// -------------------------------------------------------------
// AUTH
// -------------------------------------------------------------

export async function apiLogin(credentials: {
  nombreOEmail: string
  contrasenia: string
}): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  })
  if (data?.token) {
    setAuthToken(data.token)
  }
  return data
}

export async function apiRegister(userData: {
  nombre: string
  email: string
  contrasenia: string
}): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/api/auth/registro", {
    method: "POST",
    body: JSON.stringify(userData),
  })
  if (data?.token) {
    setAuthToken(data.token)
  }
  return data
}

export async function apiLogout(): Promise<void> {
  try {
    await request<void>("/api/auth/logout", { method: "POST" })
  } finally {
    setAuthToken(null)
  }
}

export async function apiGetMe(): Promise<PerfilResponse> {
  return request<PerfilResponse>("/api/usuario/me")
}

export async function apiChangePassword(dto: {
  contraseniaActual: string
  contraseniaNueva: string
}): Promise<void> {
  return request<void>("/api/usuario/me/contrasenia", {
    method: "PUT",
    body: JSON.stringify(dto),
  })
}

// -------------------------------------------------------------
// PUBLICACIONES / CATÁLOGO
// -------------------------------------------------------------

export async function apiListAvailablePublications(): Promise<PublicacionResponse[]> {
  return request<PublicacionResponse[]>("/api/publicaciones/disponibles")
}

export async function apiListMyPublications(): Promise<PublicacionResponse[]> {
  return request<PublicacionResponse[]>("/api/publicaciones/mis-publicaciones")
}

export async function apiCreatePublication(dto: {
  isbn: string
  estadoFisico: EstadoFisico
  valorPuntosSolicitado: number
  comentario?: string
}): Promise<PublicacionResponse> {
  return request<PublicacionResponse>("/api/publicaciones/publicar", {
    method: "POST",
    body: JSON.stringify(dto),
  })
}

export async function apiEditPublication(
  id: PublicacionId,
  dto: {
    estadoFisico: EstadoFisico
    valorPuntosSolicitado: number
    comentario?: string
  },
): Promise<void> {
  const params = new URLSearchParams({
    isbn: id.isbn,
    emailPropietario: id.emailPropietario,
    horaPublicacion: id.horaPublicacion,
  })
  return request<void>(`/api/publicaciones/editar?${params.toString()}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  })
}

export async function apiDeletePublication(id: PublicacionId): Promise<void> {
  const params = new URLSearchParams({
    isbn: id.isbn,
    emailPropietario: id.emailPropietario,
    horaPublicacion: id.horaPublicacion,
  })
  return request<void>(`/api/publicaciones/eliminar?${params.toString()}`, {
    method: "DELETE",
  })
}

// -------------------------------------------------------------
// GOOGLE BOOKS
// -------------------------------------------------------------

export async function apiFindGoogleBookByIsbn(
  isbn: string,
): Promise<GoogleBookVolume | null> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "")
  if (!cleanIsbn) return null
  try {
    return await request<GoogleBookVolume>(
      `/api/libro/google-books/isbn/${encodeURIComponent(cleanIsbn)}`,
    )
  } catch (err: any) {
    if (err.message?.includes("404")) return null
    throw err
  }
}

// -------------------------------------------------------------
// INTERCAMBIOS
// -------------------------------------------------------------

export async function apiProponerIntercambio(dto: {
  isbnOfrecida: string
  horaPublicacionOfrecida: string
  isbnSolicitada: string
  emailPropietarioSolicitada: string
  horaPublicacionSolicitada: string
  puntosComprometidos: number
}): Promise<IntercambioResponse> {
  return request<IntercambioResponse>("/api/intercambios", {
    method: "POST",
    body: JSON.stringify(dto),
  })
}

export async function apiListIntercambiosEnviados(): Promise<IntercambioResponse[]> {
  return request<IntercambioResponse[]>("/api/intercambios/enviados")
}

export async function apiListIntercambiosRecibidos(): Promise<IntercambioResponse[]> {
  return request<IntercambioResponse[]>("/api/intercambios/recibidos")
}

function buildIntercambioQueryParams(id: IntercambioIdParams): string {
  return new URLSearchParams({
    isbnSolicitada: id.isbnSolicitada,
    propietarioSolicitada: id.propietarioSolicitada,
    horaSolicitada: id.horaSolicitada,
    isbnOfrecida: id.isbnOfrecida,
    propietarioOfrecida: id.propietarioOfrecida,
    horaOfrecida: id.horaOfrecida,
  }).toString()
}

export async function apiAceptarIntercambio(
  id: IntercambioIdParams,
): Promise<IntercambioResponse> {
  return request<IntercambioResponse>(
    `/api/intercambios/aceptar?${buildIntercambioQueryParams(id)}`,
    { method: "PATCH" },
  )
}

export async function apiRechazarIntercambio(
  id: IntercambioIdParams,
  motivo?: string,
): Promise<IntercambioResponse> {
  return request<IntercambioResponse>(
    `/api/intercambios/rechazar?${buildIntercambioQueryParams(id)}`,
    {
      method: "PATCH",
      body: motivo ? JSON.stringify({ motivo }) : undefined,
    },
  )
}

export async function apiCancelarIntercambio(
  id: IntercambioIdParams,
): Promise<IntercambioResponse> {
  return request<IntercambioResponse>(
    `/api/intercambios/cancelar?${buildIntercambioQueryParams(id)}`,
    { method: "PATCH" },
  )
}

export async function apiCompletarIntercambio(
  id: IntercambioIdParams,
): Promise<IntercambioResponse> {
  return request<IntercambioResponse>(
    `/api/intercambios/completar?${buildIntercambioQueryParams(id)}`,
    { method: "PATCH" },
  )
}

// -------------------------------------------------------------
// PUNTOS
// -------------------------------------------------------------

export async function apiGetSaldoPuntos(): Promise<SaldoPuntosResponse> {
  return request<SaldoPuntosResponse>("/api/movimientoPuntos/saldo")
}

export async function apiGetHistorialPuntos(): Promise<MovimientoPuntosResponse[]> {
  return request<MovimientoPuntosResponse[]>("/api/movimientoPuntos/historial")
}

// -------------------------------------------------------------
// LIBROS SEGUIDOS (TRACKER)
// -------------------------------------------------------------

export async function apiFollowBook(usuarioId: string, isbn: string): Promise<void> {
  return request<void>(`/api/usuario/${usuarioId}/libros-seguidos/${isbn}`, {
    method: "POST",
  })
}

export async function apiGetFollowedBooks(usuarioId: string): Promise<any[]> {
  return request<any[]>(`/api/usuario/${usuarioId}/libros-seguidos`)
}

// -------------------------------------------------------------
// RESEÑAS
// -------------------------------------------------------------

export async function apiCreateReview(dto: {
  intercambioId: any
  calificacion: number
  comentario?: string
}): Promise<any> {
  return request<any>("/api/resenia", {
    method: "POST",
    body: JSON.stringify(dto),
  })
}

// -------------------------------------------------------------
// COMPRAS (ADQUISICIÓN POR PUNTOS)
// -------------------------------------------------------------

export async function apiRealizarCompra(dto: {
  isbn: string
  emailPropietario: string
  horaPublicacion: string
}): Promise<any> {
  return request<any>("/api/compras", {
    method: "POST",
    body: JSON.stringify(dto),
  })
}

export async function apiListMisCompras(): Promise<any[]> {
  return request<any[]>("/api/compras/mis-compras")
}

export async function apiListMisVentas(): Promise<any[]> {
  return request<any[]>("/api/compras/mis-ventas")
}

export interface CompraIdParams {
  compradorEmail: string
  isbn: string
  propietarioEmail: string
  horaPublicacion: string
}

export function parseIntercambioId(id: string): IntercambioIdParams | null {
  if (id.startsWith("compra:") || !id.includes(":")) return null
  const [reqPart, offPart] = id.split(":")
  if (!reqPart || !offPart) return null
  const reqSub = reqPart.split("|")
  const offSub = offPart.split("|")
  if (reqSub.length < 3 || offSub.length < 3) return null
  return {
    isbnSolicitada: reqSub[0],
    propietarioSolicitada: reqSub[1],
    horaSolicitada: reqSub[2],
    isbnOfrecida: offSub[0],
    propietarioOfrecida: offSub[1],
    horaOfrecida: offSub[2],
  }
}

export function parseCompraId(id: string): CompraIdParams | null {
  if (!id.startsWith("compra:")) return null
  const raw = id.substring("compra:".length)
  const parts = raw.split("|")
  if (parts.length < 4) return null
  return {
    compradorEmail: parts[0],
    isbn: parts[1],
    propietarioEmail: parts[2],
    horaPublicacion: parts[3],
  }
}

export async function apiConfirmarPagoCompra(id: CompraIdParams): Promise<any> {
  const params = new URLSearchParams({
    compradorEmail: id.compradorEmail,
    isbn: id.isbn,
    propietarioEmail: id.propietarioEmail,
    horaPublicacion: id.horaPublicacion,
  })
  return request<any>(`/api/compras/confirmar-pago?${params.toString()}`, {
    method: "PATCH",
  })
}

export async function apiMarcarCompraEnviada(
  id: CompraIdParams,
  infoEnvio = "Envío coordinado",
): Promise<any> {
  const params = new URLSearchParams({
    compradorEmail: id.compradorEmail,
    isbn: id.isbn,
    propietarioEmail: id.propietarioEmail,
    horaPublicacion: id.horaPublicacion,
  })
  return request<any>(`/api/compras/enviar?${params.toString()}`, {
    method: "PATCH",
    body: JSON.stringify({ infoEnvio }),
  })
}

export async function apiMarcarCompraEntregada(id: CompraIdParams): Promise<any> {
  const params = new URLSearchParams({
    compradorEmail: id.compradorEmail,
    isbn: id.isbn,
    propietarioEmail: id.propietarioEmail,
    horaPublicacion: id.horaPublicacion,
  })
  return request<any>(`/api/compras/entregar?${params.toString()}`, {
    method: "PATCH",
  })
}

export async function apiCancelarCompra(
  id: CompraIdParams,
  motivo?: string,
): Promise<any> {
  const params = new URLSearchParams({
    compradorEmail: id.compradorEmail,
    isbn: id.isbn,
    propietarioEmail: id.propietarioEmail,
    horaPublicacion: id.horaPublicacion,
  })
  return request<any>(`/api/compras/cancelar?${params.toString()}`, {
    method: "PATCH",
    body: motivo ? JSON.stringify({ motivo }) : undefined,
  })
}

// -------------------------------------------------------------
// NOTIFICACIONES
// -------------------------------------------------------------

export interface NotificacionBackendResponse {
  id: string
  tipo: string
  leida: boolean
  archivada: boolean
  fechaCreacion: string
}

export async function apiListNotificaciones(soloNoLeidas = false): Promise<NotificacionBackendResponse[]> {
  try {
    const data = await request<any>(`/api/notificacion?soloNoLeidas=${soloNoLeidas}`)
    return (data?.content || data || []) as NotificacionBackendResponse[]
  } catch {
    return []
  }
}

export async function apiMarcarNotificacionLeida(id: string): Promise<void> {
  return request<void>(`/api/notificacion/${id}/leida`, { method: "PATCH" })
}

export async function apiMarcarTodasNotificacionesLeidas(): Promise<void> {
  return request<void>("/api/notificacion/marcar-todas", { method: "PATCH" })
}

// -------------------------------------------------------------
// CADENAS
// -------------------------------------------------------------

export async function apiListCadenas(): Promise<any[]> {
  try {
    return await request<any[]>("/api/cadenaIntercambio")
  } catch {
    return []
  }
}


