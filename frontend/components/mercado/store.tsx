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
import { generateInitialChains } from "@/lib/chain-detector"
import {
  apiLogin,
  apiRegister,
  apiLogout,
  apiGetMe,
  apiListAvailablePublications,
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
  apiGetSaldoPuntos,
  apiGetHistorialPuntos,
  apiListNotificaciones,
  apiMarcarNotificacionLeida,
  apiMarcarTodasNotificacionesLeidas,
  apiCreateReview,
  getAuthToken,
  setAuthToken,
  CONDITION_TO_ESTADO,
  ESTADO_TO_CONDITION,
  type PublicacionResponse,
  type IntercambioResponse,
} from "@/lib/api"

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
    category: fallbackMeta?.category || seedMatch?.category || "General",
    condition: ESTADO_TO_CONDITION[pub.estadoFisico] || seedMatch?.condition || "Bueno",
    points: pub.valorPuntosSolicitado || seedMatch?.points || 10,
    referencePrice: pub.valorReferenciaCalculado ?? seedMatch?.referencePrice,
    description: pub.comentario || seedMatch?.description || "",
    coverUrl: pub.portadaUrl || fallbackMeta?.coverUrl || seedMatch?.coverUrl || `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`,
    ownerId: email,
    ownerName: seedMatch?.ownerName || (email ? email.split("@")[0] : "Lector"),
    ownerRating: 5.0,
    ownerTrades: 0,
    availability: "DISPONIBLE",
    createdAt: hora,
  }
}

function mergeBackendPublications(existingBooks: Book[], pubs: PublicacionResponse[]): Book[] {
  const seedByIsbn = new Map<string, Book>()
  for (const b of SEED_BOOKS) {
    seedByIsbn.set(b.isbn.replace(/[^0-9X]/gi, ""), b)
  }

  const backendBooks: Book[] = []
  for (const pub of pubs) {
    const rawIsbn = pub.publicacionId?.isbn || ""
    const cleanIsbn = rawIsbn.replace(/[^0-9X]/gi, "")
    const fallbackSeed = seedByIsbn.get(cleanIsbn)
    const book = publicacionResponseToBook(pub, fallbackSeed)

    const isJunkNoise =
      (!pub.titulo && !fallbackSeed) ||
      book.title.startsWith("Libro (") ||
      book.author === "Autor desconocido" ||
      book.ownerId.includes("testuser") ||
      book.ownerId.includes("mail@gmail")

    if (!isJunkNoise) {
      backendBooks.push(book)
    }
  }

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
    requesterName: dto.propietarioOfrecida.split("@")[0],
    ownerId: dto.propietarioSolicitada,
    ownerName: dto.propietarioSolicitada.split("@")[0],
    points: dto.puntosComprometidos || 0,
    createdAt: dto.horaPublicacionSolicitada || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    requesterConfirmed: dto.estado === "CONFIRMADO_POR_PROPONENTE",
    ownerConfirmed: dto.estado === "CONFIRMADO_POR_RECEPTOR",
  }
}

function compraResponseToTrade(dto: any): TradeRequest {
  const vendedor = dto.emailVendedor || dto.emailPropietario || ""
  const comprador = dto.emailComprador || ""
  const horaPub = dto.horaPublicacion || new Date().toISOString()
  const reqBookId = `${dto.isbn}|${vendedor}|${horaPub}`
  const id = `compra:${comprador}|${dto.isbn}|${vendedor}|${horaPub}`

  let status: any = "PENDIENTE"
  if (dto.estado === "ENTREGADA" || dto.estado === "COMPLETADA") {
    status = "COMPLETADO"
  } else if (dto.estado === "CANCELADA") {
    status = "CANCELADO"
  } else if (dto.estado === "ENVIADA" || dto.estado === "PAGADA") {
    status = "ACEPTADO"
  }

  return {
    id,
    type: "PUNTOS",
    status,
    requestedBookId: reqBookId,
    requesterId: comprador,
    requesterName: comprador ? comprador.split("@")[0] : "Comprador",
    ownerId: vendedor,
    ownerName: vendedor ? vendedor.split("@")[0] : "Vendedor",
    points: dto.puntos || dto.precioPuntos || 0,
    createdAt: dto.fecha || horaPub,
    updatedAt: dto.fecha || horaPub,
    requesterConfirmed: dto.estado === "ENTREGADA",
    ownerConfirmed: dto.estado === "ENVIADA" || dto.estado === "ENTREGADA",
  }
}

const STORAGE_KEY = "mercadolibro_demo_clean_v5"

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

  // Auth & User Switch
  login: (user: User) => void
  register: (name: string, username: string, email: string) => void
  logout: () => void
  signInWithSupabase: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUpWithSupabase: (name: string, username: string, email: string, password: string) => Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }>
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
  addToTracker: (data: Omit<TrackedBook, "id" | "userId" | "createdAt">) => void
  removeFromTracker: (id: string) => void

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
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null)
  const [tradeModalBook, setTradeModalBookState] = useState<Book | null>(null)
  const [tradeModalInitialType, setTradeModalInitialType] = useState<TradeType>("PUNTOS")
  const [reviewTrade, setReviewTrade] = useState<TradeRequest | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas")
  const [toast, setToast] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

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
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const hasLegacyNoise = parsed.books?.some((b: any) =>
          b.ownerName?.includes("Camila") ||
          b.ownerId?.startsWith("user-") ||
          b.title?.startsWith("Libro (") ||
          b.author === "Autor desconocido" ||
          b.ownerId?.includes("testuser") ||
          b.ownerId?.includes("mail@gmail")
        )
        if (parsed.users && parsed.books && !hasLegacyNoise) {
          setState((prev) => ({
            ...prev,
            users: parsed.users,
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
            const appUser: User = existingDemo
              ? existingDemo
              : {
                  id: profile.id,
                  name: profile.nombre,
                  username: profile.nombre.toLowerCase().replace(/\s+/g, ""),
                  email: profile.email,
                  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250",
                  rating: profile.reputacionPromedio || 5.0,
                  totalReviews: 0,
                  totalTrades: 0,
                  availablePoints: profile.saldoDisponible ?? 0,
                  reservedPoints: profile.saldoReservado ?? 0,
                  joinedDate: new Date().toISOString(),
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
  }, [])

  const loadUserData = async (userId: string) => {
    try {
      const [enviados, recibidos, compras, ventas, historial, notifs, saldo, pubs] = await Promise.all([
        apiListIntercambiosEnviados().catch(() => []),
        apiListIntercambiosRecibidos().catch(() => []),
        apiListMisCompras().catch(() => []),
        apiListMisVentas().catch(() => []),
        apiGetHistorialPuntos().catch(() => []),
        apiListNotificaciones().catch(() => []),
        apiGetSaldoPuntos().catch(() => null),
        apiListAvailablePublications().catch(() => []),
      ])

      const backendTrades: TradeRequest[] = [
        ...enviados.map(intercambioResponseToTrade),
        ...recibidos.map(intercambioResponseToTrade),
        ...compras.map(compraResponseToTrade),
        ...ventas.map(compraResponseToTrade),
      ]

      const backendMovements: PointMovement[] = (historial || []).map((m, idx) => ({
        id: `mov-${idx}-${m.fecha}`,
        userId,
        type: (m.tipo as any) || "INICIAL",
        amount: m.monto,
        balanceAfter: 0,
        description: `${m.origen || "Sistema"}: ${m.tipo}`,
        date: m.fecha,
      }))

      const backendNotifs: NotificationItem[] = (notifs || []).map((n) => ({
        id: n.id,
        userId,
        type: (n.tipo as any) || "TRADE_REQUEST",
        title: (n.tipo || "").replace(/_/g, " "),
        message: `Notificación de ${n.tipo}`,
        read: n.leida,
        archived: n.archivada,
        date: n.fechaCreacion,
      }))

      setState((prev) => {
        const isDemoUser = prev.currentUser?.email?.endsWith("@mercadolibro.demo")
        let updatedCurrentUser = prev.currentUser
        let updatedUsers = prev.users

        if (saldo && updatedCurrentUser && !isDemoUser) {
          updatedCurrentUser = {
            ...updatedCurrentUser,
            availablePoints: saldo.saldoDisponible,
            reservedPoints: saldo.saldoReservado,
          }
          updatedUsers = prev.users.map((u) =>
            isUserMatch(u, updatedCurrentUser!.email) ? updatedCurrentUser! : u
          )
        }

        return {
          ...prev,
          currentUser: updatedCurrentUser,
          users: updatedUsers,
          books: pubs && pubs.length > 0 ? mergeBackendPublications(prev.books, pubs) : prev.books,
          trades: !isDemoUser && backendTrades.length > 0 ? backendTrades : prev.trades,
          pointMovements: !isDemoUser && backendMovements.length > 0 ? backendMovements : prev.pointMovements,
          notifications: !isDemoUser && backendNotifs.length > 0 ? backendNotifs : prev.notifications,
        }
      })
    } catch (err) {
      console.warn("[Backend] Error cargando datos asociados del usuario:", err)
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
          const appUser: User = existingDemo
            ? existingDemo
            : {
                id: authData.id,
                name: userProfile?.nombre || authData.username,
                username: authData.username || authData.email.split("@")[0],
                email: authData.email,
                avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250",
                rating: userProfile?.reputacionPromedio || 5.0,
                totalReviews: 0,
                totalTrades: 0,
                availablePoints: userProfile?.saldoDisponible ?? authData.puntos ?? 100,
                reservedPoints: userProfile?.saldoReservado ?? 0,
                joinedDate: new Date().toISOString(),
              }
          finalUserName = appUser.name
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
        avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250`,
        rating: 5.0,
        totalReviews: 0,
        totalTrades: 0,
        availablePoints: 100,
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
          username: authData.username || username,
          email: authData.email,
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250",
          rating: 5.0,
          totalReviews: 0,
          totalTrades: 0,
          availablePoints: authData.puntos ?? 100,
          reservedPoints: 0,
          joinedDate: new Date().toISOString(),
        }

        const initialMovement: PointMovement = {
          id: "pm-" + Date.now(),
          userId: authData.id,
          type: "INICIAL",
          amount: authData.puntos ?? 100,
          balanceAfter: authData.puntos ?? 100,
          description: "Bienvenida a Mercado Libro — Asignación de puntos iniciales",
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
        showToast("¡Cuenta creada con éxito en el backend!")
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
    (patch: Partial<User>) => {
      if (!state.currentUser) return
      setState((prev) => {
        const updated = { ...prev.currentUser!, ...patch }
        return {
          ...prev,
          currentUser: updated,
          users: prev.users.map((u) => (u.id === updated.id ? updated : u)),
        }
      })
      showToast("Perfil actualizado correctamente.")
    },
    [state.currentUser, showToast]
  )

  const viewUserProfile = useCallback((userId: string) => {
    setSelectedProfileUserId(userId)
    setScreen("perfil_publico")
  }, [])

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
        category: data.googleBook?.categorias?.[0] || seedMatch?.category || "Ficción",
      }

      try {
        const estadoFisico = CONDITION_TO_ESTADO[data.condition] || "BUEN_ESTADO"
        const pub = await apiCreatePublication({
          isbn: data.isbn.trim(),
          estadoFisico,
          valorPuntosSolicitado: data.points,
          comentario: data.description || "",
        })

        const newBook: Book = {
          ...publicacionResponseToBook(pub, fallbackMeta),
          condition: data.condition,
          points: data.points,
          description: data.description || "",
          ownerId: currentUser.email,
          ownerName: currentUser.name,
          ownerRating: currentUser.rating || 5.0,
          ownerTrades: currentUser.totalTrades || 0,
          referencePrice: calculateReferencePrice(fallbackMeta.category, data.condition, 4.5),
        }
        setState((prev) => ({ ...prev, books: [newBook, ...prev.books] }))
        showToast(`"${newBook.title}" se publicó correctamente en el catálogo.`)
        return true
      } catch (error) {
        console.warn("[Backend] Fallback local creando publicación:", error)
        const nowIso = new Date().toISOString()
        const localBook: Book = {
          id: `${data.isbn.trim()}|${currentUser.email}|${nowIso}`,
          isbn: data.isbn.trim(),
          title: fallbackMeta.title,
          author: fallbackMeta.author,
          category: fallbackMeta.category,
          condition: data.condition,
          points: data.points,
          referencePrice: calculateReferencePrice(fallbackMeta.category, data.condition, 4.5),
          description: data.description || "",
          coverUrl: fallbackMeta.coverUrl,
          ownerId: currentUser.email,
          ownerName: currentUser.name,
          ownerRating: currentUser.rating || 5.0,
          ownerTrades: currentUser.totalTrades || 0,
          availability: "DISPONIBLE",
          createdAt: nowIso,
        }
        setState((prev) => ({ ...prev, books: [localBook, ...prev.books] }))
        showToast(`"${localBook.title}" se publicó correctamente en el catálogo.`)
        return true
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

      await apiEditPublication(
        { isbn, emailPropietario, horaPublicacion },
        {
          estadoFisico: CONDITION_TO_ESTADO[patch.condition] || "BUEN_ESTADO",
          valorPuntosSolicitado: patch.points,
          comentario: patch.description || "",
        }
      ).catch((error) => {
        console.warn("[Backend] Fallback local actualizando publicación:", error)
      })

      setState((prev) => ({
        ...prev,
        books: prev.books.map((candidate) =>
          candidate.id === bookId
            ? {
                ...candidate,
                condition: patch.condition,
                points: patch.points,
                description: patch.description,
                referencePrice: calculateReferencePrice(candidate.category, patch.condition, 4.5),
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
      if (!book) return false

      const [isbn, emailPropietario, horaPublicacion] = bookId.includes("|")
        ? bookId.split("|")
        : [book.isbn, book.ownerId, book.createdAt]

      await apiDeletePublication({
        isbn,
        emailPropietario,
        horaPublicacion,
      }).catch((error) => {
        console.warn("[Backend] Fallback local eliminando publicación:", error)
      })

      setState((prev) => ({ ...prev, books: prev.books.filter((candidate) => candidate.id !== bookId) }))
      showToast("Publicación eliminada correctamente.")
      return true
    },
    [state.books, showToast]
  )

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

      // Intentar sincronizar con el backend sin bloquear ni perder el estado local
      apiRealizarCompra({
        isbn,
        emailPropietario,
        horaPublicacion,
      })
        .then(() =>
          apiConfirmarPagoCompra({
            compradorEmail: state.currentUser!.email,
            isbn,
            propietarioEmail: emailPropietario,
            horaPublicacion,
          }).catch(() => {})
        )
        .catch((apiErr) => {
          console.warn("[Backend] apiRealizarCompra fallback local:", apiErr)
        })

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
      return true
    },
    [state.currentUser, state.books, showToast]
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

      apiProponerIntercambio({
        isbnOfrecida: offeredIsbn,
        horaPublicacionOfrecida: offeredHour,
        isbnSolicitada: targetIsbn,
        emailPropietarioSolicitada: targetOwner,
        horaPublicacionSolicitada: targetHour,
        puntosComprometidos: 0,
      }).catch((error) => {
        console.warn("[Backend] Fallback local proponiendo intercambio directo:", error)
      })

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
      return true
    },
    [state.currentUser, state.books, showToast]
  )

  const acceptTrade = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade || !state.currentUser) return

      try {
        const intercambioId = parseIntercambioId(tradeId)
        if (intercambioId) {
          await apiAceptarIntercambio(intercambioId).catch(() => {})
        } else {
          const compraId = parseCompraId(tradeId)
          if (compraId) {
            await apiMarcarCompraEnviada(compraId, "Envío coordinado por el vendedor").catch(() => {})
          }
        }
      } catch (err) {
        console.warn("[Trade] acceptTrade fallback local:", err)
      }

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
    },
    [state.trades, state.books, state.currentUser, showToast]
  )

  const rejectTrade = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade || !state.currentUser) return

      try {
        const intercambioId = parseIntercambioId(tradeId)
        if (intercambioId) {
          await apiRechazarIntercambio(intercambioId, "Propuesta no aceptada").catch(() => {})
        } else {
          const compraId = parseCompraId(tradeId)
          if (compraId) {
            await apiCancelarCompra(compraId, "Compra rechazada por el vendedor").catch(() => {})
          }
        }
      } catch (err) {
        console.warn("[Trade] rejectTrade fallback local:", err)
      }

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
    },
    [state.trades, state.users, state.currentUser, showToast]
  )

  const cancelTrade = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade || !state.currentUser) return

      try {
        const intercambioId = parseIntercambioId(tradeId)
        if (intercambioId) {
          await apiCancelarIntercambio(intercambioId).catch(() => {})
        } else {
          const compraId = parseCompraId(tradeId)
          if (compraId) {
            await apiCancelarCompra(compraId, "Cancelado por el usuario").catch(() => {})
          }
        }
      } catch (err) {
        console.warn("[Trade] cancelTrade fallback local:", err)
      }

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
    },
    [state.trades, state.users, state.currentUser, showToast]
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

      try {
        const intercambioId = parseIntercambioId(tradeId)
        if (intercambioId) {
          await apiCompletarIntercambio(intercambioId).catch(() => {})
        } else {
          const compraId = parseCompraId(tradeId)
          if (compraId) {
            await apiMarcarCompraEntregada(compraId).catch(() => {})
          }
        }
      } catch (err) {
        console.warn("[Trade] confirmReceipt fallback local:", err)
      }

      const nowIso = new Date().toISOString()
      const movements: PointMovement[] = []
      const bonusAmount = trade.type === "PUNTOS" ? 10 : 5
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

        movements.push({
          id: `pm-bonus-1-${Date.now()}`,
          userId: trade.requesterId,
          type: "BONO_INTERCAMBIO",
          amount: bonusAmount,
          balanceAfter: requesterNewAvail,
          description: `¡Bono por intercambio exitoso! (+${bonusAmount} pts)`,
          date: nowIso,
          tradeId,
        })
        movements.push({
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
        showToast(`¡Intercambio completado con éxito! Recibieron un bono de +${bonusAmount} puntos cada uno.`)
        setReviewTrade(updatedTrade)
      } else {
        if (trade.type === "PUNTOS" && isOwner) {
          showToast("Has confirmado la entrega. Esperando confirmación de recepción del comprador.")
        } else {
          showToast("Confirmación registrada. Esperando a la otra parte para finalizar.")
        }
      }
    },
    [state.trades, state.books, state.users, state.currentUser, showToast]
  )

  const addReview = useCallback(
    async (tradeId: string, toUserId: string, rating: number, comment: string, bookTitle: string) => {
      if (!state.currentUser) return

      const intercambioId = parseIntercambioId(tradeId)
      if (intercambioId) {
        apiCreateReview({
          intercambioId: {
            isbnSolicitada: intercambioId.isbnSolicitada,
            propietarioSolicitada: intercambioId.propietarioSolicitada,
            horaSolicitada: intercambioId.horaSolicitada,
            isbnOfrecida: intercambioId.isbnOfrecida,
            propietarioOfrecida: intercambioId.propietarioOfrecida,
            horaOfrecida: intercambioId.horaOfrecida,
          },
          calificacion: Math.min(5, Math.max(1, Math.round(rating))),
          comentario: comment || "",
        }).catch((err) => {
          console.warn("[Backend] Fallback local creando reseña:", err)
        })
      }

      const trade = state.trades.find((t) => t.id === tradeId)
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
        amount: 5,
        balanceAfter: state.currentUser.availablePoints + 5,
        description: `Recompensa por dejar una reseña a ${targetUserObj?.name || toUserId} (+5 pts)`,
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
            return { ...u, availablePoints: u.availablePoints + 5 }
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

      showToast("¡Reseña publicada! Ganaste +5 puntos por colaborar con la comunidad.")
      setReviewTrade(null)
    },
    [state.currentUser, state.trades, state.books, state.users, showToast]
  )

  const addToTracker = useCallback(
    (data: Omit<TrackedBook, "id" | "userId" | "createdAt">) => {
      if (!state.currentUser) return

      const id = "track-" + Date.now()
      const newTracked: TrackedBook = {
        ...data,
        id,
        userId: state.currentUser.id,
        createdAt: new Date().toISOString(),
      }

      if (state.currentUser.id && data.isbn) {
        apiFollowBook(state.currentUser.id, data.isbn).catch((err) =>
          console.warn("[Backend] Error siguiendo libro:", err)
        )
      }

      setState((prev) => ({
        ...prev,
        trackedBooks: [newTracked, ...prev.trackedBooks],
      }))

      showToast(`"${data.title}" se agregó a tu Tracker de libros seguidos.`)
    },
    [state.currentUser, showToast]
  )

  const removeFromTracker = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        trackedBooks: prev.trackedBooks.filter((t) => t.id !== id),
      }))
      showToast("Libro quitado de tu tracker.")
    },
    [showToast]
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
    (chainId: string) => {
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
    [state.currentUser, state.chains, showToast]
  )

  const rejectChain = useCallback(
    (chainId: string) => {
      const chain = state.chains.find((item) => item.id === chainId)
      if (
        !state.currentUser ||
        !chain?.steps.some((step) => isUserMatch(state.currentUser, step.userId)) ||
        (chain.status !== "PROPUESTA" && chain.status !== "EN_CURSO")
      ) {
        return
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
        login,
        register,
        logout,
        signInWithSupabase,
        signUpWithSupabase,
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
