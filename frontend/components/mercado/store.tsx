"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type {
  Book,
  Condition,
  NotificationItem,
  PointMovement,
  PublicationInput,
  Review,
  Screen,
  TrackedBook,
  TradeChain,
  TradeRequest,
  TradeType,
  User,
} from "@/lib/mercado-types"
import { isUserMatch } from "@/lib/mercado-types"
import {
  SEED_BOOKS,
  SEED_NOTIFICATIONS,
  SEED_POINT_MOVEMENTS,
  SEED_REVIEWS,
  SEED_TRACKED,
  SEED_TRADES,
  SEED_USERS,
} from "@/lib/seed-data"
import { calculateReferencePrice, evaluatePriceDeal } from "@/lib/price-evaluator"
import { PUNTOS_INICIALES, BONO_INTERCAMBIO_DIRECTO, BONO_RESENIA, backendErrorMessage } from "@/lib/puntos"
import { generateInitialChains } from "@/lib/chain-detector"
import {
  apiLogin,
  apiRegister,
  apiLogout,
  apiGetMe,
  apiUpdateProfile,
  apiGetPublicProfile,
  apiChangePassword,
  apiListAvailablePublications,
  apiListMyPublications,
  apiCreatePublication,
  apiEditPublication,
  apiDeletePublication,
  apiRealizarCompra,
  apiProponerIntercambio,
  apiListIntercambiosEnviados,
  apiListIntercambiosRecibidos,
  apiAceptarIntercambio,
  apiRechazarIntercambio,
  apiCancelarIntercambio,
  apiCompletarIntercambio,
  apiListMisCompras,
  apiListMisVentas,
  apiConfirmarPagoCompra,
  apiMarcarCompraEnviada,
  apiMarcarCompraEntregada,
  apiCancelarCompra,
  parseIntercambioId,
  parseCompraId,
  apiFollowBook,
  apiGetFollowedBooks,
  apiUnfollowBook,
  apiGetSaldoPuntos,
  apiGetHistorialPuntos,
  apiListNotificaciones,
  apiMarcarNotificacionLeida,
  apiArchivarNotificacion,
  apiMarcarTodasNotificacionesLeidas,
  apiCreateReview,
  apiCreateReviewCompra,
  apiListReviewsCompras,
  apiListReviews,
  apiListPublications,
  apiListCadenas,
  apiAceptarCadena,
  apiRechazarCadena,
  getAuthToken,
  setAuthToken,
  CONDITION_TO_ESTADO,
  ESTADO_TO_CONDITION,
  type PublicacionResponse,
  type IntercambioResponse,
  type IntercambioIdParams,
  type CompraIdParams,
  type CadenaResponse,
  type CadenaPasoResponse,
  type ReportTarget,
} from "@/lib/api"

function cadenaPasoToBook(paso: CadenaPasoResponse): Book {
  const cleanIsbn = paso.isbn.replace(/[^0-9X]/gi, "")
  return {
    id: `${paso.isbn}|${paso.emailEntrega}|${paso.horaPublicacion}`,
    isbn: paso.isbn,
    title: paso.titulo || `Libro (${paso.isbn})`,
    author: paso.autor || "",
    category: "General",
    condition: (paso.estadoFisico && ESTADO_TO_CONDITION[paso.estadoFisico]) || "Bueno",
    points: paso.valorPuntosSolicitado ?? 0,
    coverUrl: `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`,
    ownerId: paso.emailEntrega,
    ownerName: paso.nombreEntrega,
    ownerRating: 0,
    ownerTrades: 0,
    availability: "DISPONIBLE",
    createdAt: paso.horaPublicacion,
  }
}

function cadenaResponseToChain(cadena: CadenaResponse): TradeChain {
  const pasos = cadena.pasos || []
  return {
    id: cadena.id,
    status: cadena.estado,
    createdAt: pasos[0]?.horaPublicacion || new Date().toISOString(),
    steps: pasos.map((paso) => {
      // Lo que recibe este participante es lo que entrega quien le pasa el libro
      const recibido = pasos.find((otro) => otro.emailRecibe === paso.emailEntrega) || paso
      return {
        userId: paso.emailEntrega,
        userName: paso.nombreEntrega,
        userAvatar: "",
        givesBook: cadenaPasoToBook(paso),
        receivesBook: cadenaPasoToBook(recibido),
        confirmed: paso.confirmado,
      }
    }),
  }
}

const ESTADO_PUBLICACION_TO_AVAILABILITY: Record<string, Book["availability"]> = {
  DISPONIBLE: "DISPONIBLE",
  RESERVADA: "RESERVADO",
  VENDIDA: "INTERCAMBIADO",
  ELIMINADA: "ELIMINADO",
}

/**
 * Con sesión del backend (JWT) toda operación se hace contra la API y sus errores se muestran.
 * Sin sesión (ingreso demo local del guion) las operaciones siguen siendo solo locales.
 */
function hasBackendSession(): boolean {
  return Boolean(getAuthToken())
}

// Marca como calificados los intercambios que ya tienen reseña del participante en el backend
function markReviewedTrades(trades: TradeRequest[], reviews: Review[]): TradeRequest[] {
  const same = (a?: string, b?: string) => Boolean(a && b && a.toLowerCase() === b.toLowerCase())
  return trades.map((t) => {
    const tradeReviews = reviews.filter((r) => r.tradeId === t.id)
    if (tradeReviews.length === 0) return t
    return {
      ...t,
      reviewedByRequester: t.reviewedByRequester || tradeReviews.some((r) => same(r.fromUserId, t.requesterId)),
      reviewedByOwner: t.reviewedByOwner || tradeReviews.some((r) => same(r.fromUserId, t.ownerId)),
    }
  })
}

function slugUsername(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "")
}

// Textos de las notificaciones del backend (solo envía el tipo).
const BACKEND_NOTIFICATIONS: Record<
  string,
  { type: NotificationItem["type"]; title: string; message: string; linkScreen?: NotificationItem["linkScreen"] }
> = {
  INTERCAMBIO_SOLICITADO: {
    type: "TRADE_REQUEST",
    title: "Nueva solicitud",
    message: "Alguien quiere uno de tus libros. Revisá tus solicitudes recibidas.",
    linkScreen: "intercambios",
  },
  INTERCAMBIO_ACEPTADO: {
    type: "TRADE_ACCEPTED",
    title: "Solicitud aceptada",
    message: "Aceptaron tu propuesta. Coordiná la entrega desde En Curso.",
    linkScreen: "intercambios",
  },
  INTERCAMBIO_COMPLETADO: {
    type: "TRADE_COMPLETED",
    title: "Intercambio completado",
    message: "Ambas partes confirmaron la recepción. ¡No te olvides de calificar!",
    linkScreen: "intercambios",
  },
  RESENIA_RECIBIDA: {
    type: "TRADE_COMPLETED",
    title: "Recibiste una reseña",
    message: "Otro lector calificó tu intercambio. Mirala en tu perfil.",
    linkScreen: "perfil",
  },
  PUNTOS_GANADOS: {
    type: "POINTS_RECEIVED",
    title: "Sumaste puntos",
    message: "Se acreditaron puntos en tu cuenta. Revisá tus movimientos en el perfil.",
    linkScreen: "perfil",
  },
  PUNTOS_GASTADOS: {
    type: "POINTS_RECEIVED",
    title: "Usaste puntos",
    message: "Se descontaron puntos de tu cuenta. Revisá tus movimientos en el perfil.",
    linkScreen: "perfil",
  },
  CADENA_DETECTADA: {
    type: "CHAIN_DETECTED",
    title: "Nueva cadena de intercambio",
    message: "Encontramos una cadena circular en la que participás. Revisala y confirmá tu parte.",
    linkScreen: "cadenas",
  },
  REPORTE_ACTUALIZADO: {
    type: "REPORT_UPDATE",
    title: "Novedades de tu reporte",
    message: "Un administrador revisó tu reporte.",
    linkScreen: "notificaciones",
  },
  LIBRO_SEGUIDO_PUBLICADO: {
    type: "TRACKER_MATCH",
    title: "Publicaron un libro que seguís",
    message: "Un título de tu Tracker ya está disponible en el catálogo.",
    linkScreen: "inicio",
  },
}

const ORIGEN_MOVIMIENTO: Record<string, string> = {
  ALTA_INICIAL: "Puntos de bienvenida",
  INTERCAMBIO: "Intercambio",
  COMPRA: "Compra",
  RESENIA: "Reseña",
  RESENA: "Reseña",
}

function backendMovementType(tipo: string, origen: string): PointMovement["type"] {
  if (origen === "ALTA_INICIAL") return "INICIAL"
  if (origen === "RESENIA" || origen === "RESENA") return "RECOMPENSA_RESEÑA"
  switch (tipo) {
    case "BONIFICACION":
      return "BONO_INTERCAMBIO"
    case "RESERVA":
      return "RESERVA"
    case "LIBERACION_RESERVA":
    case "DEVOLUCION":
      return "LIBERACION"
    case "EGRESO":
      return "TRANSFERENCIA_ENVIADA"
    default:
      return "TRANSFERENCIA_RECIBIDA"
  }
}

function publicacionResponseToBook(
  pub: PublicacionResponse,
  fallbackMeta?: { title?: string; author?: string; coverUrl?: string; category?: string }
): Book {
  const isbn = pub.publicacionId?.isbn || ""
  const email = pub.publicacionId?.emailPropietario || ""
  const hora = pub.publicacionId?.horaPublicacion || new Date().toISOString()
  const id = `${isbn}|${email}|${hora}`
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "")
  const seedMatch = SEED_BOOKS.find((s) => s.isbn.replace(/[^0-9X]/gi, "") === cleanIsbn)

  return {
    id,
    isbn,
    title: pub.titulo || fallbackMeta?.title || seedMatch?.title || `Libro (${isbn})`,
    author: pub.autor || fallbackMeta?.author || seedMatch?.author || "Autor desconocido",
    category: pub.categoria || fallbackMeta?.category || seedMatch?.category || "General",
    condition: ESTADO_TO_CONDITION[pub.estadoFisico] || "Bueno",
    points: pub.valorPuntosSolicitado ?? 0,
    referencePrice: pub.valorReferenciaCalculado ?? undefined,
    pages: pub.paginas,
    description: pub.comentario || "",
    coverUrl: pub.portadaUrl || fallbackMeta?.coverUrl || seedMatch?.coverUrl || `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`,
    ownerId: email,
    ownerName: pub.nombrePropietario || (email ? email.split("@")[0] : "Lector"),
    ownerRating: pub.reputacionPropietario ?? 0,
    ownerTrades: 0,
    externalRating: pub.puntuacionExterna ?? undefined,
    availability: ESTADO_PUBLICACION_TO_AVAILABILITY[pub.estadoPublicacion || "DISPONIBLE"] || "DISPONIBLE",
    createdAt: hora,
  }
}

function mergeBackendPublications(existingBooks: Book[], pubs: PublicacionResponse[]): Book[] {
  const seedByIsbn = new Map<string, Book>()
  for (const b of SEED_BOOKS) {
    seedByIsbn.set(b.isbn.replace(/[^0-9X]/gi, ""), b)
  }

  const backendBooks: Book[] = []
  const seenIds = new Set<string>()
  for (const pub of pubs) {
    const rawIsbn = pub.publicacionId?.isbn || ""
    const cleanIsbn = rawIsbn.replace(/[^0-9X]/gi, "")
    const fallbackSeed = seedByIsbn.get(cleanIsbn)
    const book = publicacionResponseToBook(pub, fallbackSeed)

    // Los datos del servidor son autoritativos; no descartar usuarios por su email
    // ni publicaciones válidas por metadatos incompletos.
    if (!seenIds.has(book.id) && book.availability !== "ELIMINADO") {
      seenIds.add(book.id)
      backendBooks.push(book)
    }
  }

  // Con sesión del backend solo se muestran publicaciones reales: los libros demo no existen
  // en el servidor y cualquier solicitud sobre ellos fallaría.
  if (hasBackendSession()) return backendBooks

  const result: Book[] = []
  const usedIsbns = new Set<string>()

  for (const bb of backendBooks) {
    const cleanIsbn = bb.isbn.replace(/[^0-9X]/gi, "")
    result.push(bb)
    usedIsbns.add(cleanIsbn)
  }

  for (const sb of SEED_BOOKS) {
    const cleanIsbn = sb.isbn.replace(/[^0-9X]/gi, "")
    if (!usedIsbns.has(cleanIsbn)) {
      result.push(sb)
      usedIsbns.add(cleanIsbn)
    }
  }

  for (const eb of existingBooks) {
    const cleanIsbn = eb.isbn.replace(/[^0-9X]/gi, "")
    if (!usedIsbns.has(cleanIsbn) && !eb.title.startsWith("Libro (") && eb.author !== "Autor desconocido") {
      result.push(eb)
      usedIsbns.add(cleanIsbn)
    }
  }

  return result
}

function intercambioResponseToTrade(dto: IntercambioResponse): TradeRequest {
  const reqBookId = `${dto.isbnSolicitada}|${dto.propietarioSolicitada}|${dto.horaPublicacionSolicitada}`
  const offBookId = `${dto.isbnOfrecida}|${dto.propietarioOfrecida}|${dto.horaPublicacionOfrecida}`
  const id = `${reqBookId}:${offBookId}`

  let status: any = "PENDIENTE"
  if (dto.estado === "ACEPTADO" || dto.estado === "CONFIRMADO_POR_PROPONENTE" || dto.estado === "CONFIRMADO_POR_RECEPTOR") {
    status = "ACEPTADO"
  } else if (dto.estado === "RECHAZADO") {
    status = "RECHAZADO"
  } else if (dto.estado === "CANCELADO") {
    status = "CANCELADO"
  } else if (dto.estado === "COMPLETADO") {
    status = "COMPLETADO"
  }

  return {
    id,
    type: "DIRECTO",
    status,
    requestedBookId: reqBookId,
    offeredBookId: offBookId,
    requesterId: dto.propietarioOfrecida,
    requesterName: dto.nombrePropietarioOfrecida || dto.propietarioOfrecida.split("@")[0],
    ownerId: dto.propietarioSolicitada,
    ownerName: dto.nombrePropietarioSolicitada || dto.propietarioSolicitada.split("@")[0],
    points: dto.puntosComprometidos || 0,
    createdAt: dto.horaPublicacionSolicitada || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    requesterConfirmed: dto.estado === "CONFIRMADO_POR_PROPONENTE",
    ownerConfirmed: dto.estado === "CONFIRMADO_POR_RECEPTOR",
    requestedBookTitle: dto.tituloSolicitado || undefined,
    offeredBookTitle: dto.tituloOfrecido || undefined,
    compensationPayerId: dto.emailPagaCompensacion || undefined,
  }
}

function compraResponseToTrade(dto: any): TradeRequest {
  const vendedor = dto.emailVendedor || dto.emailPropietario || ""
  const comprador = dto.emailComprador || ""
  const horaPub = dto.horaPublicacion || new Date().toISOString()
  const reqBookId = `${dto.isbn}|${vendedor}|${horaPub}`
  const id = `compra:${comprador}|${dto.isbn}|${vendedor}|${horaPub}`

  // PAGADA solo reserva puntos: sigue pendiente hasta que el vendedor acepte/envíe.
  let status: any = "PENDIENTE"
  if (dto.estado === "ENTREGADA" || dto.estado === "COMPLETADA") {
    status = "COMPLETADO"
  } else if (dto.estado === "CANCELADA") {
    status = "CANCELADO"
  } else if (dto.estado === "ENVIADA") {
    status = "ACEPTADO"
  }

  return {
    id,
    type: "PUNTOS",
    status,
    requestedBookId: reqBookId,
    requesterId: comprador,
    requesterName: dto.nombreComprador || (comprador ? comprador.split("@")[0] : "Comprador"),
    ownerId: vendedor,
    ownerName: dto.nombreVendedor || (vendedor ? vendedor.split("@")[0] : "Vendedor"),
    points: dto.puntos || dto.precioPuntos || 0,
    createdAt: dto.fecha || horaPub,
    updatedAt: dto.fecha || horaPub,
    requesterConfirmed: dto.estado === "ENTREGADA",
    ownerConfirmed: dto.estado === "ENVIADA" || dto.estado === "ENTREGADA",
    requestedBookTitle: dto.titulo || undefined,
  }
}

const STORAGE_KEY = "mercadolibro_demo_clean_v6"

interface AppState {
  users: User[]
  currentUser: User | null
  books: Book[]
  trades: TradeRequest[]
  pointMovements: PointMovement[]
  reviews: Review[]
  trackedBooks: TrackedBook[]
  notifications: NotificationItem[]
  chains: TradeChain[]
}

interface StoreContextValue extends AppState {
  screen: Screen
  setScreen: (s: Screen) => void
  editingBookId: string | null
  setEditingBookId: (id: string | null) => void
  startPublishing: () => void
  startEditingBook: (bookId: string) => void
  selectedBookId: string | null
  setSelectedBookId: (id: string | null) => void
  selectedProfileUserId: string | null
  setSelectedProfileUserId: (id: string | null) => void
  tradeModalBook: Book | null
  tradeModalInitialType: TradeType
  setTradeModalBook: (b: Book | null, type?: TradeType) => void
  reviewTrade: TradeRequest | null
  setReviewTrade: (t: TradeRequest | null) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedCategory: string
  setSelectedCategory: (c: string) => void
  toast: string | null
  showToast: (msg: string) => void
  reportTarget: ReportTarget | null
  setReportTarget: (t: ReportTarget | null) => void
  isLoadingCatalog: boolean

  // Auth & User Switch
  login: (user: User) => void
  register: (name: string, username: string, email: string) => void
  logout: () => void
  signInWithSupabase: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUpWithSupabase: (name: string, username: string, email: string, password: string) => Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  switchUser: (userId: string) => void
  updateProfile: (patch: Partial<User>) => void
  viewUserProfile: (userId: string) => void

  // Books
  publishBook: (data: PublicationInput) => Promise<boolean>
  updateBook: (bookId: string, data: PublicationInput) => Promise<boolean>
  deleteBook: (bookId: string) => Promise<boolean>

  // Trades
  requestTradeWithPoints: (bookId: string) => Promise<boolean>
  requestDirectTrade: (targetBookId: string, offeredBookId: string) => Promise<boolean>
  acceptTrade: (tradeId: string) => Promise<void>
  rejectTrade: (tradeId: string) => Promise<void>
  cancelTrade: (tradeId: string) => Promise<void>
  confirmTradeReceipt: (tradeId: string) => Promise<void>

  // Reviews
  addReview: (tradeId: string, toUserId: string, rating: number, comment: string, bookTitle: string) => void

  // Tracker
  addToTracker: (data: Pick<TrackedBook, "isbn" | "title" | "author">) => Promise<boolean>
  removeFromTracker: (id: string) => Promise<void>

  // Notifications
  markNotificationRead: (id: string) => void
  archiveNotification: (id: string) => void
  markAllNotificationsRead: () => void

  // Chains
  confirmChainStep: (chainId: string) => void
  rejectChain: (chainId: string) => void
  resetToInitialData: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

function getInitialState(): AppState {
  return {
    users: SEED_USERS,
    currentUser: null, // Always start without active session so login screen is shown first
    books: SEED_BOOKS,
    trades: SEED_TRADES,
    pointMovements: SEED_POINT_MOVEMENTS,
    reviews: SEED_REVIEWS,
    trackedBooks: SEED_TRACKED,
    notifications: SEED_NOTIFICATIONS,
    chains: generateInitialChains(SEED_BOOKS, SEED_USERS),
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(getInitialState)
  const [screen, setScreen] = useState<Screen>("login")
  const [editingBookId, setEditingBookId] = useState<string | null>(null)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null)
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null)
  const [tradeModalBook, setTradeModalBookState] = useState<Book | null>(null)
  const [tradeModalInitialType, setTradeModalInitialType] = useState<TradeType>("PUNTOS")
  const [reviewTrade, setReviewTrade] = useState<TradeRequest | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas")
  const [toast, setToast] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)

  const setTradeModalBook = useCallback((b: Book | null, type: TradeType = "PUNTOS") => {
    setTradeModalBookState(b)
    setTradeModalInitialType(type)
  }, [])

  const startPublishing = useCallback(() => {
    setEditingBookId(null)
    setSelectedBookId(null)
    setScreen("publicar")
  }, [])

  // Load from local storage
  useEffect(() => {
    try {
      localStorage.removeItem("mercadolibro_state_v1")
      localStorage.removeItem("mercadolibro_state_v2")
      localStorage.removeItem("mercadolibro_demo_clean_v3")
      localStorage.removeItem("mercadolibro_demo_clean_v4")
      localStorage.removeItem("mercadolibro_demo_clean_v5")
      const saved = localStorage.getItem(STORAGE_KEY)
      // Con sesión del backend, el servidor es la fuente de verdad: una copia local vieja
      // (usuarios, intercambios, puntos de otra versión) hacía fallar los intercambios.
      if (saved && getAuthToken()) {
        localStorage.removeItem(STORAGE_KEY)
      } else if (saved) {
        const parsed = JSON.parse(saved)
        const hasLegacyNoise = parsed.books?.some((b: any) =>
          b.title?.startsWith("Libro (") ||
          b.author === "Autor desconocido" ||
          b.ownerId?.includes("testuser") ||
          b.ownerId?.includes("mail@gmail")
        )
        if (parsed.users && parsed.books && !hasLegacyNoise) {
          const sanitizedUsers = (parsed.users as User[]).map((u) => ({
            ...u,
            avatar: u.avatar?.includes("images.unsplash.com") ? "" : u.avatar || "",
          }))
          setState((prev) => ({
            ...prev,
            users: sanitizedUsers,
            books: parsed.books,
            trades: parsed.trades || prev.trades,
            pointMovements: parsed.pointMovements || prev.pointMovements,
            reviews: parsed.reviews || prev.reviews,
            trackedBooks: parsed.trackedBooks || prev.trackedBooks,
            notifications: parsed.notifications || prev.notifications,
            chains: parsed.chains || prev.chains,
          }))
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  // Persist to local storage
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage unavailable
    }
  }, [state, hydrated])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout((showToast as unknown as { _t?: number })._t)
    const t = window.setTimeout(() => setToast(null), 3500)
    ;(showToast as unknown as { _t?: number })._t = t
  }, [])

  const startEditingBook = useCallback((bookId: string) => {
    const book = state.books.find((candidate) => candidate.id === bookId)
    if (!book || !isUserMatch(state.currentUser, book.ownerId)) {
      showToast("Solo el dueño puede editar esta publicación.")
      return
    }
    if (book.availability !== "DISPONIBLE") {
      showToast("No se puede editar una publicación que no está disponible.")
      return
    }

    setEditingBookId(bookId)
    setSelectedBookId(null)
    setScreen("publicar")
  }, [showToast, state.books, state.currentUser])

  const resetToInitialData = useCallback(() => {
    const init = getInitialState()
    setState(init)
    setScreen("login")
    showToast("Datos restaurados al estado inicial.")
  }, [showToast])

  // Sincronizar sesión con el backend de Spring Boot al cargar la app
  useEffect(() => {
    const token = getAuthToken()
    if (token) {
      apiGetMe()
        .then((profile) => {
          setState((prev) => {
            const existingDemo = prev.users.find((u) => isUserMatch(u, profile.email))
            let appUser: User = existingDemo
              ? existingDemo
              : {
                  id: profile.id,
                  name: profile.nombre,
                  username: profile.nombre.toLowerCase().replace(/\s+/g, ""),
                  email: profile.email,
                  avatar: "",
                  rating: profile.reputacionPromedio || 0,
                  totalReviews: 0,
                  totalTrades: 0,
                  availablePoints: profile.saldoDisponible ?? 0,
                  reservedPoints: profile.saldoReservado ?? 0,
                  joinedDate: new Date().toISOString(),
                }
            appUser = {
              ...appUser,
              id: profile.id,
              availablePoints: profile.saldoDisponible ?? appUser.availablePoints,
              reservedPoints: profile.saldoReservado ?? appUser.reservedPoints,
              role: profile.rol,
            }
            return {
              ...prev,
              currentUser: appUser,
              users: prev.users.some((u) => isUserMatch(u, appUser.email))
                ? prev.users.map((u) => (isUserMatch(u, appUser.email) ? appUser : u))
                : [appUser, ...prev.users],
            }
          })
          setScreen((currentScreen) =>
            currentScreen === "login" || currentScreen === "registro" ? "inicio" : currentScreen
          )

          loadUserData(profile.id)
        })
        .catch(() => {
          setAuthToken(null)
          setState((prev) => ({ ...prev, currentUser: null }))
        })
    }

    // Cargar publicaciones disponibles directamente desde Spring Boot
    apiListAvailablePublications()
      .then((pubs) => {
        if (pubs && pubs.length > 0) {
          setState((prev) => ({
            ...prev,
            books: mergeBackendPublications(prev.books, pubs),
          }))
        }
      })
      .catch((err) => {
        console.warn("[Backend] No se pudieron cargar publicaciones iniciales:", err)
      })
      .finally(() => {
        setIsLoadingCatalog(false)
      })
  }, [])

  const loadUserData = async (userId: string) => {
    try {
      const [
        enviados,
        recibidos,
        compras,
        ventas,
        historial,
        notifs,
        saldo,
        pubs,
        myPubs,
        followedBooks,
        backendReviews,
        backendCadenas,
        backendReviewsCompras,
      ] = await Promise.all([
        apiListIntercambiosEnviados().catch(() => []),
        apiListIntercambiosRecibidos().catch(() => []),
        apiListMisCompras().catch(() => []),
        apiListMisVentas().catch(() => []),
        apiGetHistorialPuntos().catch(() => []),
        apiListNotificaciones().catch(() => []),
        apiGetSaldoPuntos().catch(() => null),
        apiListAvailablePublications(),
        apiListMyPublications(),
        apiGetFollowedBooks(userId).catch(() => []),
        apiListReviews().catch(() => []),
        apiListCadenas().catch(() => []),
        apiListReviewsCompras().catch(() => []),
      ])

      const backendTrades: TradeRequest[] = [
        ...enviados.map(intercambioResponseToTrade),
        ...recibidos.map(intercambioResponseToTrade),
        ...compras.map(compraResponseToTrade),
        ...ventas.map(compraResponseToTrade),
      ]

      const backendMovements: PointMovement[] = (historial || []).map((m, idx) => {
        const type = backendMovementType(m.tipo, m.origen)
        const negative = type === "RESERVA" || type === "TRANSFERENCIA_ENVIADA"
        return {
          id: `mov-${idx}-${m.fecha}`,
          userId,
          type,
          amount: negative ? -Math.abs(m.monto) : Math.abs(m.monto),
          // El backend no informa el saldo resultante de cada movimiento
          balanceAfter: undefined,
          description: ORIGEN_MOVIMIENTO[m.origen] || m.origen || "Sistema",
          date: m.fecha,
        }
      })

      const backendNotifs: NotificationItem[] = (notifs || []).map((n) => {
        const meta = BACKEND_NOTIFICATIONS[n.tipo] || {
          type: "TRADE_REQUEST" as const,
          title: "Aviso",
          message: "Tenés novedades en tu cuenta.",
        }
        return {
          id: n.id,
          userId,
          type: meta.type,
          title: meta.title,
          // El backend manda el contexto (qué libro, quién); el texto genérico queda de respaldo
          message: n.mensaje || meta.message,
          read: n.leida,
          archived: n.archivada,
          date: n.fechaCreacion,
          linkScreen: meta.linkScreen,
        }
      })

      setState((prev) => {
        // Con sesión del backend los datos del usuario salen siempre del servidor (antes las
        // cuentas @mercadolibro.demo o sin intercambios veían datos de ejemplo locales).
        const useLocalData = !hasBackendSession()
        let updatedCurrentUser = prev.currentUser
        let updatedUsers = prev.users

        if (saldo && updatedCurrentUser && !useLocalData) {
          updatedCurrentUser = {
            ...updatedCurrentUser,
            availablePoints: saldo.saldoDisponible,
            reservedPoints: saldo.saldoReservado,
            totalTrades: backendTrades.filter((t) => t.status === "COMPLETADO").length,
          }
          updatedUsers = prev.users.map((u) =>
            isUserMatch(u, updatedCurrentUser!.email) ? updatedCurrentUser! : u
          )
        }

        const allBackendPubs = [...(pubs || []), ...(myPubs || [])]
        const mergedBooks =
          allBackendPubs.length > 0 || hasBackendSession()
            ? mergeBackendPublications(prev.books, allBackendPubs)
            : prev.books

        let mergedReviews = prev.reviews
        if ((backendReviews && backendReviews.length > 0) || (backendReviewsCompras && backendReviewsCompras.length > 0)) {
          const mappedReviews: Review[] = (backendReviews || []).map((r) => {
            const reqIsbn = r.intercambioId?.isbnSolicitante || (r.intercambioId as any)?.isbnSolicitada || ""
            const reqProp = r.intercambioId?.propietarioIdSolicitante || (r.intercambioId as any)?.propietarioSolicitada || ""
            const reqHora = r.intercambioId?.horaDePublicacionSolicitante || (r.intercambioId as any)?.horaSolicitada || ""
            const offIsbn = r.intercambioId?.isbnOfrecida || ""
            const offProp = r.intercambioId?.propietarioIdOfrecida || (r.intercambioId as any)?.propietarioOfrecida || ""
            const offHora = r.intercambioId?.horaDePublicacionOfrecida || (r.intercambioId as any)?.horaOfrecida || ""
            const tradeId = `${reqIsbn}|${reqProp}|${reqHora}:${offIsbn}|${offProp}|${offHora}`
            const id = `rev-backend-${tradeId}-${r.solicitanteReviewer ? "sol" : "ofr"}`
            const matchedBook = mergedBooks.find((b) => b.isbn.replace(/[^0-9X]/gi, "") === reqIsbn.replace(/[^0-9X]/gi, ""))
            const fromUser = prev.users.find((u) => isUserMatch(u, r.emailReviewer))
            return {
              id,
              tradeId,
              fromUserId: r.emailReviewer,
              fromUserName: fromUser?.name || (r.emailReviewer ? r.emailReviewer.split("@")[0] : "Usuario"),
              toUserId: r.emailReseniado,
              rating: r.calificacion,
              comment: r.comentario || "",
              date: reqHora || new Date().toISOString(),
              bookTitle: matchedBook?.title || `Libro (${reqIsbn || "Intercambio"})`,
            }
          })
          // Reseñas de compras: el id del trade sigue el formato de compraResponseToTrade
          for (const r of backendReviewsCompras || []) {
            const tradeId = `compra:${r.compradorEmail}|${r.isbn}|${r.propietarioEmail}|${r.horaPublicacion}`
            const fromUser = prev.users.find((u) => isUserMatch(u, r.emailReviewer))
            mappedReviews.push({
              id: `rev-compra-${tradeId}-${r.compradorReviewer ? "comprador" : "vendedor"}`,
              tradeId,
              fromUserId: r.emailReviewer,
              fromUserName: fromUser?.name || r.emailReviewer.split("@")[0],
              toUserId: r.emailReseniado,
              rating: r.calificacion,
              comment: r.comentario || "",
              date: r.horaPublicacion,
              bookTitle: backendTrades.find((t) => t.id === tradeId)?.requestedBookTitle || `Libro (${r.isbn})`,
            })
          }
          // La reseña recién publicada se agrega en el momento con un id local (rev-<timestamp>).
          // Cuando llega la misma desde el backend se reemplaza, para no mostrarla dos veces.
          const norm = (v?: string) => (v || "").trim().toLowerCase()
          const backendKeys = new Set(mappedReviews.map((mr) => `${mr.tradeId}#${norm(mr.fromUserId)}`))
          const backendContent = new Set(
            mappedReviews.map((mr) => `${norm(mr.fromUserId)}#${norm(mr.toUserId)}#${mr.rating}#${mr.comment.trim()}`),
          )
          const mappedIds = new Set(mappedReviews.map((mr) => mr.id))
          const keptLocal = prev.reviews.filter((rev) => {
            if (mappedIds.has(rev.id)) return false
            if (backendKeys.has(`${rev.tradeId}#${norm(rev.fromUserId)}`)) return false
            const optimistic = /^rev-\d+$/.test(rev.id)
            return !(
              optimistic &&
              backendContent.has(`${norm(rev.fromUserId)}#${norm(rev.toUserId)}#${rev.rating}#${(rev.comment || "").trim()}`)
            )
          })
          mergedReviews = [...mappedReviews, ...keptLocal]
        }

        let mergedTrackedBooks = prev.trackedBooks
        if (hasBackendSession()) {
          // Con sesión, los libros seguidos del usuario son exactamente los del backend
          const tracked: TrackedBook[] = (followedBooks || []).map((fb: any) => {
            const isbn = typeof fb === "string" ? fb : fb?.isbn || ""
            const cleanIsbn = isbn.replace(/[^0-9X]/gi, "")
            const matchedBook = mergedBooks.find((b) => b.isbn.replace(/[^0-9X]/gi, "") === cleanIsbn)
            return {
              id: `track-backend-${userId}-${isbn}`,
              userId,
              isbn,
              title: fb?.titulo || matchedBook?.title || `Libro con ISBN ${isbn}`,
              author: fb?.autores || matchedBook?.author,
              category: fb?.categorias?.[0] || matchedBook?.category,
              createdAt: new Date().toISOString(),
            }
          })
          mergedTrackedBooks = [
            ...tracked,
            ...prev.trackedBooks.filter((t) => t.userId !== userId),
          ]
        } else if (followedBooks && followedBooks.length > 0) {
          const mappedTracked: TrackedBook[] = followedBooks.map((fb: any) => {
            const isbn = typeof fb === "string" ? fb : fb?.isbn || ""
            const cleanIsbn = isbn.replace(/[^0-9X]/gi, "")
            const matchedBook = mergedBooks.find((b) => b.isbn.replace(/[^0-9X]/gi, "") === cleanIsbn)
            return {
              id: `track-backend-${userId}-${isbn}`,
              userId,
              isbn,
              title: fb?.titulo || fb?.title || matchedBook?.title || `Libro (${isbn})`,
              author: fb?.autor || fb?.author || matchedBook?.author,
              category: fb?.categoria || fb?.category || matchedBook?.category,
              createdAt: new Date().toISOString(),
            }
          })
          const existingTrackedKeys = new Set(
            prev.trackedBooks.map((t) => `${t.userId}|${(t.isbn || t.title).toLowerCase()}`)
          )
          const newTracked = mappedTracked.filter(
            (mt) => !existingTrackedKeys.has(`${mt.userId}|${(mt.isbn || mt.title).toLowerCase()}`)
          )
          if (newTracked.length > 0) {
            mergedTrackedBooks = [...newTracked, ...prev.trackedBooks]
          }
        }


        return {
          ...prev,
          currentUser: updatedCurrentUser,
          users: updatedUsers,
          books: mergedBooks,
          trades: useLocalData ? prev.trades : markReviewedTrades(backendTrades, mergedReviews),
          pointMovements: useLocalData ? prev.pointMovements : backendMovements,
          notifications: useLocalData ? prev.notifications : backendNotifs,
          reviews: mergedReviews,
          trackedBooks: mergedTrackedBooks,
          // Con sesión del backend las cadenas son las reales (detectadas por el servidor)
          chains: hasBackendSession() ? (backendCadenas || []).map(cadenaResponseToChain) : prev.chains,
        }
      })
    } catch (err) {
      console.warn("[Backend] Error cargando datos asociados del usuario:", err)
      showToast("No se pudieron actualizar los datos. Conservamos la última información; intentá recargar.")
    }
  }

  // --- Auth & User Switching ---
  const switchUser = useCallback(
    (userId: string) => {
      const found = state.users.find((u) => isUserMatch(u, userId))
      if (!found) return
      setState((prev) => ({ ...prev, currentUser: found }))
      showToast(`Cambiado a usuario: ${found.name}`)
    },
    [showToast, state.users]
  )

  const login = useCallback(
    (user: User) => {
      setState((prev) => {
        const existing = prev.users.find((u) => isUserMatch(u, user.email))
        const currentUser = existing || user
        const users = existing ? prev.users : [...prev.users, user]
        return { ...prev, users, currentUser }
      })
      // Directs to Welcome / Onboarding screen after login
      setScreen("bienvenida")
      showToast(`¡Bienvenido/a de nuevo, ${user.name}!`)
    },
    [showToast]
  )

  const signInWithSupabase = useCallback(
    async (emailOrUsername: string, password: string) => {
      try {
        const authData = await apiLogin({
          nombreOEmail: emailOrUsername.trim(),
          contrasenia: password,
        })

        if (!authData?.token) {
          return { success: false, error: "No se recibió token de autenticación del backend." }
        }

        let userProfile: any = null
        try {
          userProfile = await apiGetMe()
        } catch {
          userProfile = null
        }

        let finalUserName = userProfile?.nombre || authData.username

        setState((prev) => {
          const existingDemo = prev.users.find((u) => isUserMatch(u, authData.email))
          let appUser: User = existingDemo
            ? existingDemo
            : {
                id: authData.id,
                name: userProfile?.nombre || authData.username,
                username: slugUsername(authData.username || authData.email.split("@")[0]),
                email: authData.email,
                avatar: "",
                rating: userProfile?.reputacionPromedio || 0,
                totalReviews: 0,
                totalTrades: 0,
                availablePoints: userProfile?.saldoDisponible ?? authData.puntos ?? PUNTOS_INICIALES,
                reservedPoints: userProfile?.saldoReservado ?? 0,
                joinedDate: new Date().toISOString(),
              }
          finalUserName = appUser.name
          appUser = {
            ...appUser,
            id: authData.id,
            availablePoints: userProfile?.saldoDisponible ?? authData.puntos ?? appUser.availablePoints,
            reservedPoints: userProfile?.saldoReservado ?? appUser.reservedPoints,
            role: userProfile?.rol || authData.rol,
          }
          return {
            ...prev,
            currentUser: appUser,
            users: prev.users.some((u) => isUserMatch(u, appUser.email))
              ? prev.users.map((u) => (isUserMatch(u, appUser.email) ? appUser : u))
              : [appUser, ...prev.users],
          }
        })

        // Refrescar publicaciones disponibles
        try {
          const pubs = await apiListAvailablePublications()
          if (pubs && pubs.length > 0) {
            setState((prev) => ({
              ...prev,
              books: mergeBackendPublications(prev.books, pubs),
            }))
          }
        } catch {
          // ignore
        }

        // Cargar intercambios, compras, puntos y notificaciones reales
        loadUserData(authData.id)

        setScreen("bienvenida")
        showToast(`¡Bienvenido/a de nuevo, ${finalUserName}!`)
        return { success: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al conectar con el servidor"
        return { success: false, error: message }
      }
    },
    [showToast]
  )

  const register = useCallback(
    (name: string, username: string, email: string) => {
      const id = "user-" + Date.now()
      const newUser: User = {
        id,
        name,
        username: username.replace("@", ""),
        email,
        avatar: "",
        rating: 0,
        totalReviews: 0,
        totalTrades: 0,
        availablePoints: PUNTOS_INICIALES,
        reservedPoints: 0,
        joinedDate: new Date().toISOString(),
      }

      setState((prev) => ({
        ...prev,
        users: [...prev.users, newUser],
        currentUser: newUser,
      }))

      setScreen("bienvenida")
      showToast("¡Cuenta creada con éxito!")
    },
    [showToast]
  )

  const signUpWithSupabase = useCallback(
    async (name: string, username: string, email: string, password: string) => {
      try {
        const cleanEmail = email.trim().toLowerCase()
        const cleanName = name.trim()

        const authData = await apiRegister({
          nombre: cleanName,
          email: cleanEmail,
          contrasenia: password,
        })

        const appUser: User = {
          id: authData.id,
          name: authData.username || cleanName,
          username: slugUsername(username || authData.username || cleanName),
          email: authData.email,
          avatar: "",
          rating: 0,
          totalReviews: 0,
          totalTrades: 0,
          availablePoints: authData.puntos ?? PUNTOS_INICIALES,
          reservedPoints: 0,
          joinedDate: new Date().toISOString(),
        }

        const initialMovement: PointMovement = {
          id: "pm-" + Date.now(),
          userId: authData.id,
          type: "INICIAL",
          amount: authData.puntos ?? PUNTOS_INICIALES,
          balanceAfter: authData.puntos ?? PUNTOS_INICIALES,
          description: "Bienvenida a MercadoLibro — Asignación de puntos iniciales",
          date: new Date().toISOString(),
        }

        setState((prev) => ({
          ...prev,
          currentUser: appUser,
          users: [...prev.users, appUser],
          pointMovements: [initialMovement, ...prev.pointMovements],
        }))

        try {
          const pubs = await apiListAvailablePublications()
          if (pubs && pubs.length > 0) {
            setState((prev) => ({
              ...prev,
              books: mergeBackendPublications(prev.books, pubs),
            }))
          }
        } catch {
          // ignore
        }

        loadUserData(authData.id)

        setScreen("bienvenida")
        showToast("¡Cuenta creada con éxito!")
        return { success: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al conectar con el backend"
        return { success: false, error: message }
      }
    },
    [showToast]
  )

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // ignore
    }
    setAuthToken(null)
    setState((prev) => ({ ...prev, currentUser: null }))
    setScreen("login")
    showToast("Sesión cerrada.")
  }, [showToast])

  const updateProfile = useCallback(
    async (patch: Partial<User>) => {
      if (!state.currentUser) return
      if (patch.name && hasBackendSession()) {
        try {
          await apiUpdateProfile(patch.name)
        } catch (err) {
          showToast(`No se pudo actualizar el perfil: ${backendErrorMessage(err)}`)
          return
        }
      }
      setState((prev) => {
        const updated = { ...prev.currentUser!, ...patch }
        return {
          ...prev,
          currentUser: updated,
          users: prev.users.map((u) =>
            isUserMatch(u, updated.id) || isUserMatch(u, prev.currentUser?.email) ? updated : u
          ),
        }
      })
      showToast("Perfil actualizado correctamente.")
    },
    [state.currentUser, showToast]
  )

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        await apiChangePassword({
          contraseniaActual: currentPassword,
          contraseniaNueva: newPassword,
        })
        showToast("Contraseña actualizada correctamente.")
        return { success: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "No se pudo actualizar la contraseña."
        return { success: false, error: message }
      }
    },
    [showToast]
  )

  const viewUserProfile = useCallback(async (userId: string) => {
    setSelectedProfileUserId(userId)
    setScreen("perfil_publico")
    try {
      const profile = await apiGetPublicProfile(userId)
      const user: User = {
        id: profile.id, email: profile.email, name: profile.nombre,
        username: slugUsername(profile.nombre), avatar: "", rating: profile.reputacionPromedio ?? 0,
        totalReviews: 0, totalTrades: 0, availablePoints: 0, reservedPoints: 0, joinedDate: "",
      }
      setState((prev) => ({ ...prev,
        users: [...prev.users.filter((u) => !isUserMatch(u, user.email)), user],
      }))
      // Actualizar las reseñas de compras y trueques, no ignorar la respuesta del servidor.
      if (state.currentUser) await loadUserData(state.currentUser.id)
      const publications = (await apiListPublications()).filter((p) => p.publicacionId.emailPropietario === profile.email)
      setState((prev) => ({ ...prev,
        books: [...prev.books.filter((b) => !isUserMatch(user, b.ownerId)), ...publications.map((p) => publicacionResponseToBook(p))],
      }))
    } catch (err) {
      showToast(`No se pudo cargar el perfil: ${backendErrorMessage(err)}`)
    }
  }, [state.currentUser, showToast])

  // --- Books CRUD (Spring Boot Backend + Local Fallback) ---
  const publishBook = useCallback(
    async (data: PublicationInput): Promise<boolean> => {
      const currentUser = state.currentUser
      if (!currentUser) return false

      const cleanIsbn = data.isbn.trim().replace(/[^0-9X]/gi, "")
      const seedMatch = SEED_BOOKS.find((s) => s.isbn.replace(/[^0-9X]/gi, "") === cleanIsbn)
      const fallbackMeta = {
        title: data.googleBook?.titulo || seedMatch?.title || `Ejemplar (${data.isbn.trim()})`,
        author: data.googleBook?.autor || seedMatch?.author || "Autor verificado",
        coverUrl:
          data.googleBook?.portadaUrl ||
          seedMatch?.coverUrl ||
          `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`,
        category: data.category || data.googleBook?.categorias?.[0] || seedMatch?.category || "Ficción",
      }

      try {
        const estadoFisico = CONDITION_TO_ESTADO[data.condition] || "BUEN_ESTADO"
        const pub = await apiCreatePublication({
          isbn: data.isbn.trim(),
          estadoFisico,
          valorPuntosSolicitado: data.points,
          comentario: data.description || "",
          categoria: data.category,
        })

        const newBook: Book = {
          ...publicacionResponseToBook(pub, fallbackMeta),
          condition: data.condition,
          points: data.points,
          description: data.description || "",
          ownerId: currentUser.email,
          ownerName: currentUser.name,
          ownerRating: currentUser.rating || 0,
          ownerTrades: currentUser.totalTrades || 0,
          referencePrice:
            pub.valorReferenciaCalculado ?? calculateReferencePrice(fallbackMeta.category, data.condition, undefined, data.googleBook?.paginas),
        }
        setState((prev) => ({ ...prev, books: [newBook, ...prev.books] }))
        showToast(`"${newBook.title}" se publicó correctamente en el catálogo.`)
        return true
      } catch (error) {
        showToast(`No se pudo publicar el libro: ${backendErrorMessage(error)}`)
        return false
      }
    },
    [state.currentUser, showToast]
  )

  const updateBook = useCallback(
    async (bookId: string, patch: PublicationInput): Promise<boolean> => {
      const book = state.books.find((candidate) => candidate.id === bookId)
      if (!book) return false

      const [isbn, emailPropietario, horaPublicacion] = bookId.includes("|")
        ? bookId.split("|")
        : [book.isbn, book.ownerId, book.createdAt]

      if (hasBackendSession()) {
        try {
          await apiEditPublication(
            { isbn, emailPropietario, horaPublicacion },
            {
              estadoFisico: CONDITION_TO_ESTADO[patch.condition] || "BUEN_ESTADO",
              valorPuntosSolicitado: patch.points,
              comentario: patch.description || "",
              categoria: patch.category,
            }
          )
        } catch (error) {
          showToast(`No se pudo actualizar la publicación: ${backendErrorMessage(error)}`)
          return false
        }
      }

      // El backend recalcula referencia y semáforo al editar: tomar su valor
      let backendReference: number | undefined
      let backendCategory: string | undefined
      if (hasBackendSession()) {
        const mine = await apiListMyPublications().catch(() => [])
        const updated = mine.find((pub) => `${pub.publicacionId.isbn}|${pub.publicacionId.emailPropietario}|${pub.publicacionId.horaPublicacion}` === bookId)
        backendReference = updated?.valorReferenciaCalculado ?? undefined
        backendCategory = updated?.categoria ?? undefined
      }

      setState((prev) => ({
        ...prev,
        books: prev.books.map((candidate) =>
          candidate.id === bookId
            ? {
                ...candidate,
                condition: patch.condition,
                points: patch.points,
                description: patch.description,
                category: backendCategory || patch.category || candidate.category,
                referencePrice:
                  backendReference ?? calculateReferencePrice(candidate.category, patch.condition, undefined, candidate.pages),
              }
            : candidate
        ),
      }))
      showToast("Publicación actualizada correctamente.")
      return true
    },
    [showToast, state.books]
  )

  const deleteBook = useCallback(
    async (bookId: string): Promise<boolean> => {
      const book = state.books.find((b) => b.id === bookId)
      if (!book || !isUserMatch(state.currentUser, book.ownerId)) {
        showToast("Solo el dueño puede eliminar esta publicación.")
        return false
      }
      if (book.availability === "RESERVADO") {
        showToast("No se puede eliminar un libro con intercambio en curso (RF04).")
        return false
      }
      if (book.availability !== "DISPONIBLE") {
        showToast("No se puede eliminar una publicación que no está disponible.")
        return false
      }

      const [isbn, emailPropietario, horaPublicacion] = bookId.includes("|")
        ? bookId.split("|")
        : [book.isbn, book.ownerId, book.createdAt]

      if (hasBackendSession()) {
        try {
          await apiDeletePublication({ isbn, emailPropietario, horaPublicacion })
        } catch (error) {
          showToast(`No se pudo eliminar la publicación: ${backendErrorMessage(error)}`)
          return false
        }
      }

      setState((prev) => ({ ...prev, books: prev.books.filter((candidate) => candidate.id !== bookId) }))
      showToast("Publicación eliminada correctamente.")
      return true
    },
    [state.books, state.trades, state.currentUser, showToast]
  )

  // Ejecuta en el backend la acción sobre un intercambio/compra real y devuelve false si
  // falla, mostrando el motivo. Antes los errores se ignoraban y la interfaz simulaba un
  // éxito que el backend nunca registró. Los intercambios con usuarios demo siguen siendo locales.
  const runTradeBackendAction = useCallback(
    async (
      trade: TradeRequest,
      actions: {
        intercambio?: (id: IntercambioIdParams) => Promise<unknown>
        compra?: (id: CompraIdParams) => Promise<unknown>
      },
      errorPrefix: string
    ): Promise<boolean> => {
      if (!hasBackendSession()) return true
      try {
        const intercambioId = parseIntercambioId(trade.id)
        if (intercambioId && actions.intercambio) {
          await actions.intercambio(intercambioId)
          return true
        }
        const compraId = parseCompraId(trade.id)
        if (compraId && actions.compra) {
          await actions.compra(compraId)
        }
        return true
      } catch (err) {
        showToast(`${errorPrefix}: ${backendErrorMessage(err)}`)
        return false
      }
    },
    [showToast]
  )

  // Después de una operación real, el saldo, los movimientos y los estados salen del backend
  const refreshFromBackend = useCallback(() => {
    if (state.currentUser && hasBackendSession()) {
      // Recarga en segundo plano: loadUserData maneja sus propios errores
      void loadUserData(state.currentUser.id)
    }
  }, [state.currentUser])

  // Sincronización con lo que hacen los demás usuarios: no hay push desde el backend, así que se
  // recarga al volver a la pestaña y cada 45 s mientras está visible.
  const currentUserId = state.currentUser?.id
  useEffect(() => {
    if (!currentUserId || !hasBackendSession()) return
    let lastRefresh = Date.now()
    const refresh = () => {
      if (document.visibilityState !== "visible") return
      // Evita recargas encadenadas cuando focus y visibilitychange llegan juntos
      if (Date.now() - lastRefresh < 5_000) return
      lastRefresh = Date.now()
      void loadUserData(currentUserId)
    }
    const interval = window.setInterval(refresh, 45_000)
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refresh)
    }
    // loadUserData es estable en la práctica (solo usa setState y la API)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  // --- Trade Operations (RF06 - RF13, RF17 - RF20) ---
  const requestTradeWithPoints = useCallback(
    async (bookId: string): Promise<boolean> => {
      if (!state.currentUser) return false
      const book = state.books.find((b) => b.id === bookId)
      if (!book || book.availability !== "DISPONIBLE") {
        showToast("El libro no se encuentra disponible.")
        return false
      }
      if (isUserMatch(state.currentUser, book.ownerId)) {
        showToast("No podés solicitar un libro de tu propia autoría/cuenta.")
        return false
      }
      if (state.currentUser.availablePoints < book.points) {
        showToast(`Saldo insuficiente. Necesitás ${book.points} pts y tenés ${state.currentUser.availablePoints} pts disponibles.`)
        return false
      }

      const [isbn, emailPropietario, horaPublicacion] = bookId.includes("|")
        ? bookId.split("|")
        : [book.isbn, book.ownerId, book.createdAt]

      const isRealPurchase = hasBackendSession()
      if (isRealPurchase) {
        try {
          await apiRealizarCompra({ isbn, emailPropietario, horaPublicacion })
          await apiConfirmarPagoCompra({
            compradorEmail: state.currentUser.email,
            isbn,
            propietarioEmail: emailPropietario,
            horaPublicacion,
          })
        } catch (err) {
          showToast(`No se pudo enviar la solicitud: ${backendErrorMessage(err)}`)
          return false
        }
      }

      const tradeId = `compra:${state.currentUser.email}|${isbn}|${emailPropietario}|${horaPublicacion}`
      const nowIso = new Date().toISOString()

      const newTrade: TradeRequest = {
        id: tradeId,
        type: "PUNTOS",
        status: "PENDIENTE",
        requestedBookId: bookId,
        requesterId: state.currentUser.email,
        requesterName: state.currentUser.name,
        ownerId: book.ownerId,
        ownerName: book.ownerName,
        points: book.points,
        createdAt: nowIso,
        updatedAt: nowIso,
      }

      const reserveMov: PointMovement = {
        id: `pm-res-${Date.now()}`,
        userId: state.currentUser.email,
        type: "RESERVA",
        amount: -book.points,
        balanceAfter: Math.max(0, state.currentUser.availablePoints - book.points),
        description: `Reserva en garantía por solicitud de '${book.title}'`,
        date: nowIso,
        tradeId,
      }

      const ownerNotif: NotificationItem = {
        id: `notif-req-${Date.now()}`,
        userId: book.ownerId,
        type: "TRADE_REQUEST",
        title: "Nueva solicitud de intercambio",
        message: `${state.currentUser.name} solicitó tu libro '${book.title}' por ${book.points} puntos.`,
        read: false,
        date: nowIso,
        linkScreen: "intercambios",
        linkData: { tradeId, bookId },
      }

      setState((prev) => {
        if (!prev.currentUser) return prev
        const updatedUser: User = {
          ...prev.currentUser,
          availablePoints: Math.max(0, prev.currentUser.availablePoints - book.points),
          reservedPoints: (prev.currentUser.reservedPoints || 0) + book.points,
        }
        return {
          ...prev,
          currentUser: updatedUser,
          users: prev.users.map((u) => (isUserMatch(u, updatedUser.email) ? updatedUser : u)),
          books: prev.books.map((b) => (b.id === bookId ? { ...b, availability: "RESERVADO" } : b)),
          trades: [newTrade, ...prev.trades],
          pointMovements: [reserveMov, ...prev.pointMovements],
          notifications: [ownerNotif, ...prev.notifications],
        }
      })

      showToast(`¡Solicitud enviada! Se reservaron ${book.points} puntos de tu saldo en garantía.`)
      if (isRealPurchase) refreshFromBackend()
      return true
    },
    [state.currentUser, state.books, showToast, refreshFromBackend]
  )

  const requestDirectTrade = useCallback(
    async (targetBookId: string, offeredBookId: string): Promise<boolean> => {
      if (!state.currentUser) return false
      const targetBook = state.books.find((b) => b.id === targetBookId)
      const offeredBook = state.books.find((b) => b.id === offeredBookId)

      if (!targetBook || targetBook.availability !== "DISPONIBLE") {
        showToast("El libro solicitado ya no está disponible.")
        return false
      }
      if (!offeredBook || offeredBook.availability !== "DISPONIBLE") {
        showToast("Tu libro ofrecido no está disponible.")
        return false
      }

      const [targetIsbn, targetOwner, targetHour] = targetBook.id.includes("|")
        ? targetBook.id.split("|")
        : [targetBook.isbn, targetBook.ownerId, targetBook.createdAt]

      const [offeredIsbn, , offeredHour] = offeredBook.id.includes("|")
        ? offeredBook.id.split("|")
        : [offeredBook.isbn, offeredBook.ownerId, offeredBook.createdAt]

      const isRealProposal = hasBackendSession()
      if (isRealProposal) {
        try {
          await apiProponerIntercambio({
            isbnOfrecida: offeredIsbn,
            horaPublicacionOfrecida: offeredHour,
            isbnSolicitada: targetIsbn,
            emailPropietarioSolicitada: targetOwner,
            horaPublicacionSolicitada: targetHour,
            puntosComprometidos: 0,
          })
        } catch (err) {
          showToast(`No se pudo enviar la propuesta: ${backendErrorMessage(err)}`)
          return false
        }
      }

      const nowIso = new Date().toISOString()
      const tradeId = `${targetBook.id}:${offeredBook.id}`
      const newTrade: TradeRequest = {
        id: tradeId,
        type: "DIRECTO",
        status: "PENDIENTE",
        requestedBookId: targetBookId,
        offeredBookId,
        requesterId: state.currentUser.email,
        requesterName: state.currentUser.name,
        ownerId: targetBook.ownerId,
        ownerName: targetBook.ownerName,
        points: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      }

      setState((prev) => ({
        ...prev,
        books: prev.books.map((b) => (b.id === offeredBookId ? { ...b, availability: "RESERVADO" } : b)),
        trades: [newTrade, ...prev.trades],
      }))

      showToast(`Propuesta directa enviada a ${targetBook.ownerName}.`)
      if (isRealProposal) refreshFromBackend()
      return true
    },
    [state.currentUser, state.books, showToast, refreshFromBackend]
  )

  const acceptTrade = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade || !state.currentUser) return

      const ok = await runTradeBackendAction(
        trade,
        {
          intercambio: apiAceptarIntercambio,
          compra: (id) => apiMarcarCompraEnviada(id, "Envío coordinado por el vendedor"),
        },
        "No se pudo aceptar la solicitud"
      )
      if (!ok) return

      const requestedBook = state.books.find((b) => b.id === trade.requestedBookId)
      const nowIso = new Date().toISOString()
      const notif: NotificationItem = {
        id: `notif-acc-${Date.now()}`,
        userId: trade.requesterId,
        type: "TRADE_ACCEPTED",
        title: "¡Solicitud aceptada!",
        message: `${state.currentUser.name} aceptó tu solicitud por '${requestedBook?.title || "el libro"}'. Coordiná la entrega desde En Curso.`,
        read: false,
        date: nowIso,
        linkScreen: "intercambios",
        linkData: { tradeId },
      }

      setState((prev) => ({
        ...prev,
        books: prev.books.map((b) =>
          b.id === trade.requestedBookId || b.id === trade.offeredBookId
            ? { ...b, availability: "RESERVADO" }
            : b
        ),
        trades: prev.trades.map((t) =>
          t.id === tradeId ? { ...t, status: "ACEPTADO", ownerConfirmed: false, updatedAt: nowIso } : t
        ),
        notifications: [notif, ...prev.notifications],
      }))
      showToast("Has aceptado el intercambio. El libro queda bloqueado para entrega.")
      refreshFromBackend()
    },
    [state.trades, state.books, state.currentUser, showToast, runTradeBackendAction, refreshFromBackend]
  )

  const rejectTrade = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade || !state.currentUser) return

      const ok = await runTradeBackendAction(
        trade,
        {
          intercambio: (id) => apiRechazarIntercambio(id, "Propuesta no aceptada"),
          compra: (id) => apiCancelarCompra(id, "Compra rechazada por el vendedor"),
        },
        "No se pudo rechazar la solicitud"
      )
      if (!ok) return

      const nowIso = new Date().toISOString()
      const movements: PointMovement[] = []
      if (trade.type === "PUNTOS" && trade.points > 0) {
        const requester = state.users.find((u) => isUserMatch(u, trade.requesterId))
        if (requester) {
          movements.push({
            id: `pm-lib-${Date.now()}`,
            userId: trade.requesterId,
            type: "LIBERACION",
            amount: trade.points,
            balanceAfter: requester.availablePoints + trade.points,
            description: `Liberación de reserva por propuesta rechazada`,
            date: nowIso,
            tradeId,
          })
        }
      }

      const notif: NotificationItem = {
        id: `notif-rej-${Date.now()}`,
        userId: trade.requesterId,
        type: "TRADE_REJECTED",
        title: "Solicitud rechazada",
        message: `Tu propuesta de intercambio con ${trade.ownerName} no fue aceptada.`,
        read: false,
        date: nowIso,
        linkScreen: "intercambios",
      }

      setState((prev) => {
        const updatedUsers = prev.users.map((u) => {
          if (trade.type === "PUNTOS" && isUserMatch(u, trade.requesterId)) {
            return {
              ...u,
              availablePoints: u.availablePoints + trade.points,
              reservedPoints: Math.max(0, u.reservedPoints - trade.points),
            }
          }
          return u
        })

        const updatedCurrent =
          prev.currentUser && isUserMatch(prev.currentUser, trade.requesterId) && trade.type === "PUNTOS"
            ? {
                ...prev.currentUser,
                availablePoints: prev.currentUser.availablePoints + trade.points,
                reservedPoints: Math.max(0, prev.currentUser.reservedPoints - trade.points),
              }
            : prev.currentUser

        return {
          ...prev,
          currentUser: updatedCurrent,
          users: updatedUsers,
          books: prev.books.map((b) =>
            b.id === trade.requestedBookId || b.id === trade.offeredBookId
              ? { ...b, availability: "DISPONIBLE" }
              : b
          ),
          trades: prev.trades.map((t) =>
            t.id === tradeId ? { ...t, status: "RECHAZADO", updatedAt: nowIso } : t
          ),
          pointMovements: [...movements, ...prev.pointMovements],
          notifications: [notif, ...prev.notifications],
        }
      })
      showToast("Solicitud rechazada. Puntos y libros liberados.")
      refreshFromBackend()
    },
    [state.trades, state.users, state.currentUser, showToast, runTradeBackendAction, refreshFromBackend]
  )

  const cancelTrade = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade || !state.currentUser) return

      const ok = await runTradeBackendAction(
        trade,
        {
          intercambio: apiCancelarIntercambio,
          compra: (id) => apiCancelarCompra(id, "Cancelado por el usuario"),
        },
        "No se pudo cancelar el intercambio"
      )
      if (!ok) return

      const nowIso = new Date().toISOString()
      const movements: PointMovement[] = []
      if (trade.type === "PUNTOS" && trade.points > 0) {
        const requester = state.users.find((u) => isUserMatch(u, trade.requesterId))
        if (requester) {
          movements.push({
            id: `pm-canc-${Date.now()}`,
            userId: trade.requesterId,
            type: "LIBERACION",
            amount: trade.points,
            balanceAfter: requester.availablePoints + trade.points,
            description: `Liberación de garantía por cancelación de intercambio`,
            date: nowIso,
            tradeId,
          })
        }
      }

      setState((prev) => {
        const updatedUsers = prev.users.map((u) => {
          if (trade.type === "PUNTOS" && isUserMatch(u, trade.requesterId)) {
            return {
              ...u,
              availablePoints: u.availablePoints + trade.points,
              reservedPoints: Math.max(0, u.reservedPoints - trade.points),
            }
          }
          return u
        })

        const updatedCurrent =
          prev.currentUser && isUserMatch(prev.currentUser, trade.requesterId) && trade.type === "PUNTOS"
            ? {
                ...prev.currentUser,
                availablePoints: prev.currentUser.availablePoints + trade.points,
                reservedPoints: Math.max(0, prev.currentUser.reservedPoints - trade.points),
              }
            : prev.currentUser

        return {
          ...prev,
          currentUser: updatedCurrent,
          users: updatedUsers,
          books: prev.books.map((b) =>
            b.id === trade.requestedBookId || b.id === trade.offeredBookId
              ? { ...b, availability: "DISPONIBLE" }
              : b
          ),
          trades: prev.trades.map((t) =>
            t.id === tradeId ? { ...t, status: "CANCELADO", updatedAt: nowIso } : t
          ),
          pointMovements: [...movements, ...prev.pointMovements],
        }
      })
      showToast("Intercambio cancelado. Libros y puntos liberados con éxito.")
      refreshFromBackend()
    },
    [state.trades, state.users, state.currentUser, showToast, runTradeBackendAction, refreshFromBackend]
  )

  const confirmTradeReceipt = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade || !state.currentUser) return

      const isRequester = isUserMatch(state.currentUser, trade.requesterId)
      const isOwner = isUserMatch(state.currentUser, trade.ownerId)

      const updatedTrade: TradeRequest = {
        ...trade,
        requesterConfirmed: isRequester ? true : trade.requesterConfirmed,
        ownerConfirmed: isOwner ? true : trade.ownerConfirmed,
      }

      const shouldComplete =
        trade.type === "PUNTOS"
          ? Boolean(updatedTrade.requesterConfirmed)
          : Boolean(updatedTrade.requesterConfirmed && updatedTrade.ownerConfirmed)

      // Compra: el vendedor confirma el envío (PAGADA → ENVIADA) y luego el comprador la
      // recepción (ENVIADA → ENTREGADA). Antes ambos llamaban a /entregar y el backend lo rechazaba.
      const ok = await runTradeBackendAction(
        trade,
        {
          intercambio: apiCompletarIntercambio,
          compra: isOwner
            ? (id) => apiMarcarCompraEnviada(id, "Envío coordinado por el vendedor")
            : apiMarcarCompraEntregada,
        },
        isOwner && trade.type === "PUNTOS" ? "No se pudo confirmar la entrega" : "No se pudo confirmar la recepción"
      )
      if (!ok) return

      const nowIso = new Date().toISOString()
      const movements: PointMovement[] = []
      // Igual que el backend: solo el trueque directo da bonificación; la compra no.
      const bonusAmount = trade.type === "PUNTOS" ? 0 : BONO_INTERCAMBIO_DIRECTO
      const requestedBook = state.books.find((b) => b.id === trade.requestedBookId)

      if (shouldComplete) {
        updatedTrade.status = "COMPLETADO"
        updatedTrade.updatedAt = nowIso

        const requesterUser = state.users.find((u) => isUserMatch(u, trade.requesterId))
        const ownerUser = state.users.find((u) => isUserMatch(u, trade.ownerId))

        const requesterNewAvail = (requesterUser?.availablePoints ?? 0) + bonusAmount
        const ownerNewAvail =
          (ownerUser?.availablePoints ?? 0) + (trade.type === "PUNTOS" ? trade.points : 0) + bonusAmount

        if (trade.type === "PUNTOS") {
          movements.push({
            id: `pm-tr-recv-${Date.now()}`,
            userId: trade.ownerId,
            type: "TRANSFERENCIA_RECIBIDA",
            amount: trade.points,
            balanceAfter: (ownerUser?.availablePoints ?? 0) + trade.points,
            description: `Puntos recibidos por intercambio completado de '${requestedBook?.title || "libro"}'`,
            date: nowIso,
            tradeId,
          })

          movements.push({
            id: `pm-tr-sent-${Date.now()}`,
            userId: trade.requesterId,
            type: "TRANSFERENCIA_ENVIADA",
            amount: -trade.points,
            balanceAfter: requesterUser?.availablePoints ?? 0,
            description: `Transferencia definitiva de puntos a ${trade.ownerName}`,
            date: nowIso,
            tradeId,
          })
        }

        if (bonusAmount > 0) movements.push({
          id: `pm-bonus-1-${Date.now()}`,
          userId: trade.requesterId,
          type: "BONO_INTERCAMBIO",
          amount: bonusAmount,
          balanceAfter: requesterNewAvail,
          description: `¡Bono por intercambio exitoso! (+${bonusAmount} pts)`,
          date: nowIso,
          tradeId,
        })
        if (bonusAmount > 0) movements.push({
          id: `pm-bonus-2-${Date.now()}`,
          userId: trade.ownerId,
          type: "BONO_INTERCAMBIO",
          amount: bonusAmount,
          balanceAfter: ownerNewAvail,
          description: `¡Bono por intercambio exitoso! (+${bonusAmount} pts)`,
          date: nowIso,
          tradeId,
        })
      }

      setState((prev) => {
        const updatedUsers = prev.users.map((u) => {
          let avail = u.availablePoints
          let res = u.reservedPoints
          let trades = u.totalTrades

          if (shouldComplete) {
            if (isUserMatch(u, trade.requesterId)) {
              trades += 1
              if (trade.type === "PUNTOS") {
                res = Math.max(0, res - trade.points)
              }
              avail += bonusAmount
            }
            if (isUserMatch(u, trade.ownerId)) {
              trades += 1
              if (trade.type === "PUNTOS") {
                avail += trade.points
              }
              avail += bonusAmount
            }
          }

          return { ...u, availablePoints: avail, reservedPoints: res, totalTrades: trades }
        })

        const activeCurrent =
          updatedUsers.find((u) => isUserMatch(u, prev.currentUser?.email)) || prev.currentUser

        return {
          ...prev,
          currentUser: activeCurrent,
          users: updatedUsers,
          books: prev.books.map((b) =>
            shouldComplete && (b.id === trade.requestedBookId || b.id === trade.offeredBookId)
              ? { ...b, availability: "INTERCAMBIADO" }
              : b
          ),
          trades: prev.trades.map((t) => (t.id === tradeId ? updatedTrade : t)),
          pointMovements: [...movements, ...prev.pointMovements],
        }
      })

      if (shouldComplete) {
        showToast(
          bonusAmount > 0
            ? `¡Intercambio completado con éxito! Recibieron un bono de +${bonusAmount} puntos cada uno.`
            : "¡Compra completada con éxito!"
        )
        setReviewTrade(updatedTrade)
      } else {
        if (trade.type === "PUNTOS" && isOwner) {
          showToast("Has confirmado la entrega. Esperando confirmación de recepción del comprador.")
        } else {
          showToast("Confirmación registrada. Esperando a la otra parte para finalizar.")
        }
      }
      refreshFromBackend()
    },
    [state.trades, state.books, state.users, state.currentUser, showToast, runTradeBackendAction, refreshFromBackend]
  )

  const addReview = useCallback(
    async (tradeId: string, toUserId: string, rating: number, comment: string, bookTitle: string) => {
      if (!state.currentUser) return

      const trade = state.trades.find((t) => t.id === tradeId)
      const intercambioId = parseIntercambioId(tradeId)
      const compraId = parseCompraId(tradeId)
      const isRealTrade = Boolean(intercambioId || compraId) && hasBackendSession()
      if (compraId && isRealTrade) {
        try {
          await apiCreateReviewCompra({
            ...compraId,
            calificacion: Math.min(5, Math.max(1, Math.round(rating))),
            comentario: comment || "",
          })
        } catch (err) {
          showToast(`No se pudo publicar la reseña: ${backendErrorMessage(err)}`)
          return
        }
      }
      if (intercambioId && isRealTrade) {
        try {
          // Nombres de campo de IntercambioId (backend), no los de IntercambioIdParams
          await apiCreateReview({
            intercambioId: {
              isbnSolicitante: intercambioId.isbnSolicitada,
              propietarioIdSolicitante: intercambioId.propietarioSolicitada,
              horaDePublicacionSolicitante: intercambioId.horaSolicitada,
              isbnOfrecida: intercambioId.isbnOfrecida,
              propietarioIdOfrecida: intercambioId.propietarioOfrecida,
              horaDePublicacionOfrecida: intercambioId.horaOfrecida,
            },
            calificacion: Math.min(5, Math.max(1, Math.round(rating))),
            comentario: comment || "",
          })
        } catch (err) {
          showToast(`No se pudo publicar la reseña: ${backendErrorMessage(err)}`)
          return
        }
      }

      const requestedBook = trade ? state.books.find((b) => b.id === trade.requestedBookId) : null
      const finalTitle =
        (!bookTitle || bookTitle.startsWith("Intercambio #")) && requestedBook?.title
          ? requestedBook.title
          : bookTitle || "Libro intercambiado"

      const nowIso = new Date().toISOString()
      const reviewId = `rev-${Date.now()}`
      const newReview: Review = {
        id: reviewId,
        tradeId,
        fromUserId: state.currentUser.email,
        fromUserName: state.currentUser.name,
        toUserId,
        rating,
        comment,
        date: nowIso,
        bookTitle: finalTitle,
      }

      const targetUserObj = state.users.find((u) => isUserMatch(u, toUserId))
      const bonusMov: PointMovement = {
        id: `pm-rev-${Date.now()}`,
        userId: state.currentUser.email,
        type: "RECOMPENSA_RESEÑA",
        amount: BONO_RESENIA,
        balanceAfter: state.currentUser.availablePoints + BONO_RESENIA,
        description: `Recompensa por dejar una reseña a ${targetUserObj?.name || toUserId} (+${BONO_RESENIA} pts)`,
        date: nowIso,
        tradeId,
      }

      setState((prev) => {
        const targetReviews = prev.reviews.filter((r) => isUserMatch({ id: toUserId, email: toUserId } as any, r.toUserId))
        const allTargetRatings = [...targetReviews.map((r) => r.rating), rating]
        const newAverage = Number((allTargetRatings.reduce((a, b) => a + b, 0) / allTargetRatings.length).toFixed(1))

        const updatedUsers = prev.users.map((u) => {
          if (isUserMatch(u, toUserId)) {
            return { ...u, rating: newAverage, totalReviews: u.totalReviews + 1 }
          }
          if (isUserMatch(u, prev.currentUser?.email)) {
            return { ...u, availablePoints: u.availablePoints + BONO_RESENIA }
          }
          return u
        })

        const activeCurrent =
          updatedUsers.find((u) => isUserMatch(u, prev.currentUser?.email)) || prev.currentUser

        return {
          ...prev,
          currentUser: activeCurrent,
          users: updatedUsers,
          reviews: [newReview, ...prev.reviews],
          pointMovements: [bonusMov, ...prev.pointMovements],
          trades: prev.trades.map((t) => {
            if (t.id === tradeId) {
              return isUserMatch(prev.currentUser, t.requesterId)
                ? { ...t, reviewedByRequester: true }
                : { ...t, reviewedByOwner: true }
            }
            return t
          }),
        }
      })

      showToast(`¡Reseña publicada! Ganaste +${BONO_RESENIA} puntos por colaborar con la comunidad.`)
      setReviewTrade(null)
      if (isRealTrade) refreshFromBackend()
    },
    [state.currentUser, state.trades, state.books, state.users, showToast, refreshFromBackend]
  )

  const addToTracker = useCallback(
    async (data: Pick<TrackedBook, "isbn" | "title" | "author">): Promise<boolean> => {
      const user = state.currentUser
      if (!user) return false
      const isbn = (data.isbn || "").trim()
      if (!isbn) {
        showToast("No se puede seguir un libro sin ISBN.")
        return false
      }
      const clean = isbn.replace(/[^0-9X]/gi, "")
      if (state.trackedBooks.some((t) => isUserMatch(user, t.userId) && (t.isbn || "").replace(/[^0-9X]/gi, "") === clean)) {
        showToast("Ya estás siguiendo este libro.")
        return false
      }

      if (hasBackendSession()) {
        try {
          await apiFollowBook(user.id, isbn)
        } catch (err) {
          const message = backendErrorMessage(err)
          showToast(
            /libro no existe/i.test(message)
              ? "No se pudo seguir el libro: no encontramos ese ISBN en Google Books ni en Open Library."
              : `No se pudo seguir el libro: ${message}`,
          )
          return false
        }
      }

      const newTracked: TrackedBook = {
        id: `track-backend-${user.id}-${isbn}`,
        userId: user.id,
        isbn,
        title: data.title,
        author: data.author,
        createdAt: new Date().toISOString(),
      }
      setState((prev) => ({ ...prev, trackedBooks: [newTracked, ...prev.trackedBooks] }))
      showToast(`"${data.title}" se agregó a tu Tracker. Te avisamos cuando alguien lo publique.`)
      return true
    },
    [state.currentUser, state.trackedBooks, showToast]
  )

  const removeFromTracker = useCallback(
    async (id: string) => {
      const trackedBook = state.trackedBooks.find((t) => t.id === id)
      if (trackedBook && state.currentUser?.id && trackedBook.isbn && hasBackendSession()) {
        try {
          await apiUnfollowBook(state.currentUser.id, trackedBook.isbn)
        } catch (err) {
          showToast(`No se pudo dejar de seguir el libro: ${backendErrorMessage(err)}`)
          return
        }
      }
      setState((prev) => ({
        ...prev,
        trackedBooks: prev.trackedBooks.filter((t) => t.id !== id),
      }))
      showToast("Libro quitado de tu tracker.")
    },
    [state.trackedBooks, state.currentUser, showToast]
  )

  const markNotificationRead = useCallback((id: string) => {
    apiMarcarNotificacionLeida(id).catch((err) => console.warn("[Backend] Error al marcar notificación leída:", err))
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }))
  }, [])

  const archiveNotification = useCallback(
    (id: string) => {
      apiArchivarNotificacion(id).catch((err) =>
        console.warn("[Backend] Error archivando notificación:", err)
      )
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, archived: true } : n)),
      }))
      showToast("Notificación archivada.")
    },
    [showToast]
  )

  const markAllNotificationsRead = useCallback(() => {
    if (!state.currentUser) return
    apiMarcarTodasNotificacionesLeidas().catch((err) => console.warn("[Backend] Error al marcar todas las notificaciones:", err))
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        isUserMatch(prev.currentUser, n.userId) ? { ...n, read: true } : n
      ),
    }))
  }, [state.currentUser])

  const confirmChainStep = useCallback(
    async (chainId: string) => {
      if (!state.currentUser) return

      const chain = state.chains.find((item) => item.id === chainId)
      const currentStep = chain?.steps.find((step) => isUserMatch(state.currentUser, step.userId))
      if (
        !chain ||
        !currentStep ||
        currentStep.confirmed ||
        (chain.status !== "PROPUESTA" && chain.status !== "EN_CURSO")
      ) {
        return
      }

      if (hasBackendSession()) {
        try {
          const actualizada = await apiAceptarCadena(chainId)
          setState((prev) => ({
            ...prev,
            chains: prev.chains.map((c) => (c.id === chainId ? cadenaResponseToChain(actualizada) : c)),
          }))
          if (actualizada.estado === "COMPLETADA") {
            showToast(`¡Cadena completada! Cada participante recibió +${actualizada.puntosBonus} pts.`)
          } else if (actualizada.estado === "CANCELADA") {
            showToast("La cadena se canceló porque uno de los libros ya no está disponible.")
          } else {
            showToast("Confirmaste tu participación. Falta que confirmen los demás.")
          }
          refreshFromBackend()
        } catch (err) {
          showToast(`No se pudo confirmar la cadena: ${backendErrorMessage(err)}`)
        }
        return
      }

      setState((prev) => {
        const updatedChains = prev.chains.map((chain) => {
          if (chain.id !== chainId) return chain
          const updatedSteps = chain.steps.map((step) =>
            isUserMatch(prev.currentUser, step.userId) ? { ...step, confirmed: true } : step
          )
          const allConfirmed = updatedSteps.every((s) => s.confirmed)
          return {
            ...chain,
            steps: updatedSteps,
            status: allConfirmed ? ("COMPLETADA" as const) : ("EN_CURSO" as const),
          }
        })
        return { ...prev, chains: updatedChains }
      })

      showToast("Confirmaste tu participación en la cadena de intercambio.")
    },
    [state.currentUser, state.chains, showToast, refreshFromBackend]
  )

  const rejectChain = useCallback(
    async (chainId: string) => {
      const chain = state.chains.find((item) => item.id === chainId)
      if (
        !state.currentUser ||
        !chain?.steps.some((step) => isUserMatch(state.currentUser, step.userId)) ||
        (chain.status !== "PROPUESTA" && chain.status !== "EN_CURSO")
      ) {
        return
      }

      if (hasBackendSession()) {
        try {
          await apiRechazarCadena(chainId)
        } catch (err) {
          showToast(`No se pudo rechazar la cadena: ${backendErrorMessage(err)}`)
          return
        }
      }

      setState((prev) => ({
        ...prev,
        chains: prev.chains.map((c) => (c.id === chainId ? { ...c, status: "CANCELADA" } : c)),
      }))
      showToast("Cadena de intercambio rechazada.")
    },
    [state.currentUser, state.chains, showToast]
  )

  return (
    <StoreContext.Provider
      value={{
        ...state,
        screen,
        setScreen,
        editingBookId,
        setEditingBookId,
        startPublishing,
        startEditingBook,
        selectedBookId,
        setSelectedBookId,
        selectedProfileUserId,
        setSelectedProfileUserId,
        tradeModalBook,
        tradeModalInitialType,
        setTradeModalBook,
        reviewTrade,
        setReviewTrade,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        toast,
        showToast,
        reportTarget,
        setReportTarget,
        isLoadingCatalog,
        login,
        register,
        logout,
        signInWithSupabase,
        signUpWithSupabase,
        changePassword,
        switchUser,
        updateProfile,
        viewUserProfile,
        publishBook,
        updateBook,
        deleteBook,
        requestTradeWithPoints,
        requestDirectTrade,
        acceptTrade,
        rejectTrade,
        cancelTrade,
        confirmTradeReceipt,
        addReview,
        addToTracker,
        removeFromTracker,
        markNotificationRead,
        archiveNotification,
        markAllNotificationsRead,
        confirmChainStep,
        rejectChain,
        resetToInitialData,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}
