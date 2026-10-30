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

function publicacionResponseToBook(pub: PublicacionResponse): Book {
  const isbn = pub.publicacionId?.isbn || ""
  const email = pub.publicacionId?.emailPropietario || ""
  const hora = pub.publicacionId?.horaPublicacion || new Date().toISOString()
  const id = `${isbn}|${email}|${hora}`
  return {
    id,
    isbn,
    title: pub.titulo || `Libro (${isbn})`,
    author: pub.autor || "Autor desconocido",
    category: "General",
    condition: ESTADO_TO_CONDITION[pub.estadoFisico] || "Bueno",
    points: pub.valorPuntosSolicitado || 10,
    referencePrice: pub.valorReferenciaCalculado,
    description: pub.comentario || "",
    coverUrl: pub.portadaUrl || `https://covers.openlibrary.org/b/isbn/${isbn.replace(/[^0-9X]/gi, "")}-M.jpg`,
    ownerId: email,
    ownerName: email ? email.split("@")[0] : "Lector",
    ownerRating: 5.0,
    ownerTrades: 0,
    availability: "DISPONIBLE",
    createdAt: hora,
  }
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

const STORAGE_KEY = "mercadolibro_v2_data"

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
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.users && parsed.books) {
          // Keep currentUser as null on initial page refresh if we want login screen first,
          // or restore data smoothly.
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
    if (!book || book.ownerId !== state.currentUser?.id) {
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
          const appUser: User = {
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
          setState((prev) => ({
            ...prev,
            currentUser: appUser,
            users: prev.users.some((u) => u.email === appUser.email)
              ? prev.users.map((u) => (u.email === appUser.email ? appUser : u))
              : [appUser, ...prev.users],
          }))
          setScreen((currentScreen) =>
            currentScreen === "login" || currentScreen === "registro" ? "inicio" : currentScreen
          )

          // Cargar datos asociados del usuario (intercambios, compras, puntos, notificaciones)
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
            books: pubs.map(publicacionResponseToBook),
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
        let updatedCurrentUser = prev.currentUser
        let updatedUsers = prev.users

        if (saldo && updatedCurrentUser) {
          updatedCurrentUser = {
            ...updatedCurrentUser,
            availablePoints: saldo.saldoDisponible,
            reservedPoints: saldo.saldoReservado,
          }
          updatedUsers = prev.users.map((u) =>
            u.id === updatedCurrentUser!.id ? updatedCurrentUser! : u
          )
        }

        return {
          ...prev,
          currentUser: updatedCurrentUser,
          users: updatedUsers,
          books: pubs && pubs.length > 0 ? pubs.map(publicacionResponseToBook) : prev.books,
          trades: backendTrades.length > 0 ? backendTrades : prev.trades,
          pointMovements: backendMovements.length > 0 ? backendMovements : prev.pointMovements,
          notifications: backendNotifs.length > 0 ? backendNotifs : prev.notifications,
        }
      })
    } catch (err) {
      console.warn("[Backend] Error cargando datos asociados del usuario:", err)
    }
  }

  // --- Auth & User Switching ---
  const switchUser = useCallback(
    (userId: string) => {
      const found = state.users.find((u) => u.id === userId)
      if (!found) return
      setState((prev) => ({ ...prev, currentUser: found }))
      showToast(`Cambiado a usuario: ${found.name}`)
    },
    [showToast, state.users]
  )

  const login = useCallback(
    (user: User) => {
      setState((prev) => {
        const existing = prev.users.find((u) => u.email.toLowerCase() === user.email.toLowerCase())
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

        const appUser: User = {
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

        setState((prev) => ({
          ...prev,
          currentUser: appUser,
          users: prev.users.some((u) => u.email === appUser.email)
            ? prev.users.map((u) => (u.email === appUser.email ? appUser : u))
            : [appUser, ...prev.users],
        }))

        // Refrescar publicaciones disponibles
        try {
          const pubs = await apiListAvailablePublications()
          if (pubs && pubs.length > 0) {
            setState((prev) => ({
              ...prev,
              books: pubs.map(publicacionResponseToBook),
            }))
          }
        } catch {
          // ignore
        }

        // Cargar intercambios, compras, puntos y notificaciones reales
        loadUserData(authData.id)

        setScreen("bienvenida")
        showToast(`¡Bienvenido/a de nuevo, ${appUser.name}!`)
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

  // --- Books CRUD (Spring Boot Backend) ---
  const publishBook = useCallback(
    async (data: PublicationInput): Promise<boolean> => {
      const currentUser = state.currentUser
      if (!currentUser) return false

      try {
        const estadoFisico = CONDITION_TO_ESTADO[data.condition] || "BUEN_ESTADO"
        const pub = await apiCreatePublication({
          isbn: data.isbn.trim(),
          estadoFisico,
          valorPuntosSolicitado: data.points,
          comentario: data.description || "",
        })

        const newBook = publicacionResponseToBook(pub)
        setState((prev) => ({ ...prev, books: [newBook, ...prev.books] }))
        showToast(`"${newBook.title}" se publicó correctamente en el backend.`)
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error inesperado al guardar la publicación."
        console.error("[Backend] Error creando publicación:", error)
        showToast(`No se pudo guardar la publicación: ${message}`)
        return false
      }
    },
    [state.currentUser, showToast]
  )

  const updateBook = useCallback(
    async (bookId: string, patch: PublicationInput): Promise<boolean> => {
      const book = state.books.find((candidate) => candidate.id === bookId)
      if (!book) return false

      try {
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
        )

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
              : candidate,
          ),
        }))
        showToast("Publicación actualizada en el backend.")
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error inesperado al actualizar la publicación."
        console.error("[Backend] Error actualizando publicación:", error)
        showToast(`No se pudo actualizar la publicación: ${message}`)
        return false
      }
    },
    [showToast, state.books]
  )

  const deleteBook = useCallback(
    async (bookId: string): Promise<boolean> => {
      const book = state.books.find((b) => b.id === bookId)
      if (!book) return false

      try {
        const [isbn, emailPropietario, horaPublicacion] = bookId.includes("|")
          ? bookId.split("|")
          : [book.isbn, book.ownerId, book.createdAt]

        await apiDeletePublication({
          isbn,
          emailPropietario,
          horaPublicacion,
        })

        setState((prev) => ({ ...prev, books: prev.books.filter((candidate) => candidate.id !== bookId) }))
        showToast("Publicación eliminada correctamente.")
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error inesperado al eliminar la publicación."
        console.error("[Backend] Error eliminando publicación:", error)
        showToast(`No se pudo eliminar la publicación: ${message}`)
        return false
      }
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
      if (book.ownerId === state.currentUser.id) {
        showToast("No podés solicitar un libro de tu propia autoría/cuenta.")
        return false
      }
      if (state.currentUser.availablePoints < book.points) {
        showToast(`Saldo insuficiente. Necesitás ${book.points} pts y tenés ${state.currentUser.availablePoints} pts disponibles.`)
        return false
      }

      try {
        const [isbn, emailPropietario, horaPublicacion] = bookId.includes("|")
          ? bookId.split("|")
          : [book.isbn, book.ownerId, book.createdAt]

        await apiRealizarCompra({
          isbn,
          emailPropietario,
          horaPublicacion,
        })

        try {
          await apiConfirmarPagoCompra({
            compradorEmail: state.currentUser.email,
            isbn,
            propietarioEmail: emailPropietario,
            horaPublicacion,
          })
        } catch (pagoErr) {
          console.warn("[Backend] Auto confirmar pago compra:", pagoErr)
        }

        await loadUserData(state.currentUser.id)
        showToast(`¡Solicitud enviada! Se reservaron ${book.points} puntos de tu saldo en el backend.`)
        return true
      } catch (error) {
        console.error("[Backend] Error realizando solicitud por puntos:", error)
        showToast(error instanceof Error ? `No se pudo enviar la solicitud: ${error.message}` : "No se pudo enviar la solicitud al backend.")
        return false
      }
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

      try {
        const [targetIsbn, targetOwner, targetHour] = targetBook.id.includes("|")
          ? targetBook.id.split("|")
          : [targetBook.isbn, targetBook.ownerId, targetBook.createdAt]

        const [offeredIsbn, , offeredHour] = offeredBook.id.includes("|")
          ? offeredBook.id.split("|")
          : [offeredBook.isbn, offeredBook.ownerId, offeredBook.createdAt]

        await apiProponerIntercambio({
          isbnOfrecida: offeredIsbn,
          horaPublicacionOfrecida: offeredHour,
          isbnSolicitada: targetIsbn,
          emailPropietarioSolicitada: targetOwner,
          horaPublicacionSolicitada: targetHour,
          puntosComprometidos: 0,
        })

        await loadUserData(state.currentUser.id)
        showToast(`Propuesta directa enviada a ${targetBook.ownerName}.`)
        return true
      } catch (error) {
        console.error("[Backend] Error proponiendo intercambio directo:", error)
        showToast(error instanceof Error ? `No se pudo enviar la propuesta: ${error.message}` : "No se pudo enviar la propuesta al backend.")
        return false
      }
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
          await apiAceptarIntercambio(intercambioId)
        } else {
          const compraId = parseCompraId(tradeId)
          if (compraId) {
            await apiMarcarCompraEnviada(compraId, "Envío coordinado por el vendedor")
          }
        }
        await loadUserData(state.currentUser.id)
        showToast("Has aceptado el intercambio. El libro queda bloqueado para entrega.")
      } catch (error) {
        console.error("[Backend] Error al aceptar intercambio:", error)
        showToast(error instanceof Error ? error.message : "Error al aceptar el intercambio.")
      }
    },
    [state.trades, state.currentUser, showToast]
  )

  const rejectTrade = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade || !state.currentUser) return

      try {
        const intercambioId = parseIntercambioId(tradeId)
        if (intercambioId) {
          await apiRechazarIntercambio(intercambioId, "Propuesta no aceptada")
        } else {
          const compraId = parseCompraId(tradeId)
          if (compraId) {
            await apiCancelarCompra(compraId, "Compra rechazada por el vendedor")
          }
        }
        await loadUserData(state.currentUser.id)
        showToast("Solicitud rechazada. Puntos y libros liberados.")
      } catch (error) {
        console.error("[Backend] Error al rechazar:", error)
        showToast(error instanceof Error ? error.message : "Error al rechazar.")
      }
    },
    [state.trades, state.currentUser, showToast]
  )

  const cancelTrade = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade || !state.currentUser) return

      try {
        const intercambioId = parseIntercambioId(tradeId)
        if (intercambioId) {
          await apiCancelarIntercambio(intercambioId)
        } else {
          const compraId = parseCompraId(tradeId)
          if (compraId) {
            await apiCancelarCompra(compraId, "Cancelado por el usuario")
          }
        }
        await loadUserData(state.currentUser.id)
        showToast("Intercambio cancelado. Libros y puntos liberados con éxito.")
      } catch (error) {
        console.error("[Backend] Error al cancelar:", error)
        showToast(error instanceof Error ? error.message : "Error al cancelar.")
      }
    },
    [state.trades, state.currentUser, showToast]
  )

  const confirmTradeReceipt = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade || !state.currentUser) return

      try {
        let isFullyCompleted = false
        const intercambioId = parseIntercambioId(tradeId)
        if (intercambioId) {
          const updated = await apiCompletarIntercambio(intercambioId)
          isFullyCompleted = updated.estado === "COMPLETADO"
        } else {
          const compraId = parseCompraId(tradeId)
          if (compraId) {
            await apiMarcarCompraEntregada(compraId)
            isFullyCompleted = true
          }
        }
        await loadUserData(state.currentUser.id)
        if (isFullyCompleted) {
          showToast("¡Intercambio completado con éxito! Se aplicaron los puntos y bonos correspondientes.")
          setReviewTrade(trade)
        } else {
          showToast("Confirmación registrada. Esperando a la otra parte para finalizar.")
        }
      } catch (error) {
        console.error("[Backend] Error confirmando recepción:", error)
        showToast(error instanceof Error ? error.message : "Error al confirmar recepción.")
      }
    },
    [state.trades, state.currentUser, showToast]
  )

  const addReview = useCallback(
    async (tradeId: string, toUserId: string, rating: number, comment: string, bookTitle: string) => {
      if (!state.currentUser) return

      const intercambioId = parseIntercambioId(tradeId)
      if (intercambioId) {
        try {
          await apiCreateReview({
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
          })
          showToast("¡Reseña publicada con éxito en el backend! (+50 pts otorgados)")
        } catch (err) {
          console.error("[Backend] Error creando reseña:", err)
          showToast(err instanceof Error ? `Reseña: ${err.message}` : "Error registrando la reseña en el backend.")
        }
      } else {
        showToast("¡Reseña registrada con éxito!")
      }

      await loadUserData(state.currentUser.id)
      setReviewTrade(null)
    },
    [state.currentUser, showToast]
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
        n.userId === prev.currentUser?.id ? { ...n, read: true } : n
      ),
    }))
  }, [state.currentUser])

  const confirmChainStep = useCallback(
    (chainId: string) => {
      if (!state.currentUser) return

      const chain = state.chains.find((item) => item.id === chainId)
      const currentStep = chain?.steps.find((step) => step.userId === state.currentUser?.id)
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
            step.userId === prev.currentUser?.id ? { ...step, confirmed: true } : step
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
        !chain?.steps.some((step) => step.userId === state.currentUser?.id) ||
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
