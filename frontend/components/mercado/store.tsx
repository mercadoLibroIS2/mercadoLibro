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
import { supabase } from "@/lib/supabase"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import {
  databaseCondition,
  databaseBook,
  databasePublicationId,
  findDatabaseBook,
  loadDatabasePublications,
  loadDatabaseUsers,
} from "@/lib/publicaciones-db"
import {
  createSolicitudIntercambio,
  loadSolicitudesIntercambio,
  saveSolicitudIntercambio,
  updateSolicitudIntercambio,
} from "@/lib/intercambios-db"

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

  // Helper to map Supabase User and database Profile to our App User
  const syncSupabaseUser = useCallback(async (sbUser: SupabaseUser) => {
    try {
      let profileData: Partial<User> | null = null
      const { data: uData, error: uErr } = await supabase
        .from("usuario")
        .select("*")
        .eq("email", sbUser.email)
        .maybeSingle()

      if (!uErr && uData) {
        if (uData.saldo_total == null || uData.saldo_reservado == null) {
          throw new Error("El perfil de Supabase no tiene saldos inicializados.")
        }
        const availablePoints = Number(uData.saldo_total)
        const reservedPoints = Number(uData.saldo_reservado)
        if (!Number.isFinite(availablePoints) || !Number.isFinite(reservedPoints)) {
          throw new Error("El saldo guardado en Supabase no es válido.")
        }
        profileData = {
          id: sbUser.id,
          name: sbUser.user_metadata?.name || uData.nombre_usuario || uData.nombre || sbUser.email?.split("@")[0],
          username: uData.nombre_usuario || uData.nombre || sbUser.user_metadata?.username,
          email: uData.email || sbUser.email,
          avatar: sbUser.user_metadata?.avatar,
          availablePoints,
          reservedPoints,
          rating: Number(uData.reputacion_promedio) || 5.0,
          totalReviews: 0,
          totalTrades: 0,
          joinedDate: uData.created_at || sbUser.created_at,
        }
      } else {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sbUser.id)
          .maybeSingle()
        if (error) throw uErr || error
        if (!data) {
          throw new Error("No se encontró el perfil con saldo en Supabase. Verificá que la migración de usuario esté aplicada.")
        }
        if (data.available_points == null || data.reserved_points == null) {
          throw new Error("El perfil de Supabase no tiene saldos inicializados.")
        }
        const availablePoints = Number(data.available_points)
        const reservedPoints = Number(data.reserved_points)
        if (!Number.isFinite(availablePoints) || !Number.isFinite(reservedPoints)) {
          throw new Error("El saldo guardado en Supabase no es válido.")
        }
        profileData = {
          id: data.id,
          name: data.name,
          username: data.username,
          email: data.email || sbUser.email,
          avatar: data.avatar,
          bio: data.bio,
          city: data.city,
          availablePoints,
          reservedPoints,
          rating: Number(data.rating) || 5.0,
          totalReviews: data.total_reviews || 0,
          totalTrades: data.total_trades || 0,
          joinedDate: data.created_at,
        }
      }

      const meta = sbUser.user_metadata || {}
      const rawEmail = sbUser.email || ""
      const defaultUsername = rawEmail.split("@")[0] || "usuario"
      const defaultName = meta.name || defaultUsername.charAt(0).toUpperCase() + defaultUsername.slice(1)
      if (profileData?.availablePoints === undefined || profileData.reservedPoints === undefined) {
        throw new Error("No se pudo leer el saldo persistido del usuario.")
      }

      const appUser: User = {
        id: sbUser.id,
        name: profileData?.name || meta.name || defaultName,
        username: (profileData?.username || meta.username || defaultUsername).replace("@", "").toLowerCase(),
        email: profileData?.email || rawEmail,
        avatar: profileData?.avatar || meta.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250",
        bio: profileData?.bio || meta.bio || "",
        city: profileData?.city || meta.city || "Montevideo",
        rating: profileData?.rating ?? 5.0,
        totalReviews: profileData?.totalReviews ?? 0,
        totalTrades: profileData?.totalTrades ?? 0,
        availablePoints: profileData.availablePoints,
        reservedPoints: profileData.reservedPoints,
        joinedDate: profileData?.joinedDate || sbUser.created_at || new Date().toISOString(),
      }

      let databaseUsers: User[] = []
      try {
        databaseUsers = (await loadDatabaseUsers()).filter(
          (u) => u.email.toLowerCase() !== appUser.email.toLowerCase()
        )
      } catch (error) {
        console.error("[Supabase] Error cargando usuarios:", error)
      }
      const knownUsers = [...SEED_USERS, ...databaseUsers, appUser]

      setState((prev) => {
        const sameUser = (a: User, b: User) => a.id === b.id || a.email.toLowerCase() === b.email.toLowerCase()
        const fresh = [...databaseUsers, appUser]
        const users = [...prev.users.filter((u) => !fresh.some((f) => sameUser(u, f))), ...fresh]
        return { ...prev, users, currentUser: appUser }
      })

      let persistedBooks: Book[] = []
      try {
        persistedBooks = await loadDatabasePublications(appUser, knownUsers)
        setState((prev) => ({
          ...prev,
          books: [
            ...persistedBooks,
            ...prev.books.filter((book) => {
              // Con publicaciones reales, los libros de demostración locales no se pueden solicitar.
              if (persistedBooks.length > 0) return false
              try {
                databasePublicationId(book)
                return false
              } catch {
                return true
              }
            }),
          ],
        }))
      } catch (error) {
        console.error("[Supabase] Error cargando publicaciones:", error)
        showToast("No se pudieron cargar las publicaciones guardadas. Revisá la conexión y las políticas de Supabase.")
      }

      try {
        const persistedTrades = await loadSolicitudesIntercambio(appUser, persistedBooks, knownUsers)
        setState((prev) => ({
          ...prev,
          trades: [
            ...persistedTrades,
            ...prev.trades.filter((trade) => trade.requesterId === appUser.id || trade.ownerId === appUser.id)
              .filter((trade) => !persistedTrades.some((saved) => saved.id === trade.id)),
          ],
        }))
      } catch (error) {
        console.error("[Supabase] Error cargando solicitudes de intercambio:", error)
        showToast("No se pudieron cargar los intercambios guardados. Ejecutá la migración y revisá las políticas de Supabase.")
      }

      return appUser
    } catch (err) {
      console.error("[Supabase] Error sincronizando usuario:", err)
      showToast(err instanceof Error ? `No se pudo cargar el saldo desde Supabase: ${err.message}` : "No se pudo cargar el saldo desde Supabase.")
      return null
    }
  }, [showToast])

  // Sincronizar sesión de Supabase al cargar la app y al cambiar el estado
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncSupabaseUser(session.user).then((u) => {
          if (u) {
            setScreen((currentScreen) => (currentScreen === "login" || currentScreen === "registro" ? "inicio" : currentScreen))
          }
        })
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        queueMicrotask(() => {
          void syncSupabaseUser(session.user)
        })
      } else if (event === "SIGNED_OUT") {
        setState((prev) => ({ ...prev, currentUser: null }))
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [syncSupabaseUser])

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
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) {
          let friendlyError = error.message
          if (error.message.toLowerCase().includes("invalid login credentials")) {
            friendlyError = "Email o contraseña incorrectos"
          } else if (error.message.toLowerCase().includes("email not confirmed")) {
            friendlyError = "Debes confirmar tu correo electrónico antes de ingresar"
          }
          return { success: false, error: friendlyError }
        }

        if (data.user) {
          const u = await syncSupabaseUser(data.user)
          if (!u) {
            return { success: false, error: "No se pudo cargar tu perfil y saldo desde Supabase." }
          }
          setScreen("bienvenida")
          showToast(`¡Bienvenido/a de nuevo, ${u.name || "lector"}!`)
          return { success: true }
        }

        return { success: false, error: "No se pudo iniciar sesión." }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error inesperado al conectar con Supabase"
        return { success: false, error: message }
      }
    },
    [syncSupabaseUser, showToast]
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
        availablePoints: 100, // RF14: 100 initial points
        reservedPoints: 0,
        joinedDate: new Date().toISOString(),
      }

      const initialMovement: PointMovement = {
        id: "pm-" + Date.now(),
        userId: id,
        type: "INICIAL",
        amount: 100,
        balanceAfter: 100,
        description: "Bienvenida a Mercado Libro — Asignación de 100 puntos iniciales (RF14)",
        date: new Date().toISOString(),
      }

      setState((prev) => ({
        ...prev,
        users: [...prev.users, newUser],
        currentUser: newUser,
        pointMovements: [initialMovement, ...prev.pointMovements],
      }))

      // Directs to Welcome / Onboarding screen after registration
      setScreen("bienvenida")
      showToast("¡Cuenta creada con éxito! Recibiste 100 puntos de bienvenida.")
    },
    [showToast]
  )

  const signUpWithSupabase = useCallback(
    async (name: string, username: string, email: string, password: string) => {
      try {
        const cleanEmail = email.trim().toLowerCase()
        const cleanUsername = username.trim().toLowerCase().replace("@", "")
        const cleanName = name.trim()

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: cleanName,
              username: cleanUsername,
            },
          },
        })

        if (error) {
          let friendlyError = error.message
          if (error.message.toLowerCase().includes("user already registered")) {
            friendlyError = "Ya existe una cuenta registrada con este correo"
          } else if (error.message.toLowerCase().includes("password should be at least")) {
            friendlyError = "La contraseña debe tener al menos 6 caracteres"
          }
          return { success: false, error: friendlyError }
        }

        // Si se requiere confirmación por email
        if (data.user && !data.session) {
          showToast("¡Cuenta creada! Revisa tu email para confirmar el acceso.")
          return { success: true, requiresEmailConfirmation: true }
        }

        if (data.user) {
          const u = await syncSupabaseUser(data.user)
          const initialMovement: PointMovement = {
            id: "pm-" + Date.now(),
            userId: data.user.id,
            type: "INICIAL",
            amount: 100,
            balanceAfter: 100,
            description: "Bienvenida a Mercado Libro — Asignación de 100 puntos iniciales (RF14)",
            date: new Date().toISOString(),
          }
          setState((prev) => ({
            ...prev,
            pointMovements: [initialMovement, ...prev.pointMovements],
          }))
          setScreen("bienvenida")
          showToast("¡Cuenta creada con éxito! Recibiste 100 puntos de bienvenida.")
          return { success: true }
        }

        return { success: false, error: "No se pudo completar el registro." }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error inesperado al conectar con Supabase"
        return { success: false, error: message }
      }
    },
    [syncSupabaseUser, showToast]
  )

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
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

  // --- Books CRUD & Matching (RF01-RF04, RF35) ---
  const publishBook = useCallback(
    async (data: PublicationInput): Promise<boolean> => {
      const currentUser = state.currentUser
      if (!currentUser) return false

      try {
        const book = await findDatabaseBook(data.isbn.trim(), data.googleBook)
        const timestamp = new Date().toISOString()
        const { data: publication, error } = await supabase
          .from("publicacion")
          .insert({
            isbn: data.isbn.trim(),
            email_propietario: currentUser.email,
            hora_publicacion: timestamp,
            estado_fisico: databaseCondition(data.condition),
            valor_puntos_solicitado: data.points,
            comentario: data.description || null,
            estado_publicacion: "DISPONIBLE",
          })
          .select("*")
          .single()
        if (error) throw error
        if (!publication) throw new Error("Supabase no devolvió la publicación creada.")

        const { data: category, error: categoryError } = await supabase
          .from("libro_categoria")
          .select("*")
          .eq("isbn", data.isbn.trim())
          .maybeSingle()
        if (categoryError) throw categoryError

        const newBook = databaseBook(
          publication as Record<string, unknown>,
          book,
          { email: currentUser.email, nombre: currentUser.name, reputacion_promedio: currentUser.rating },
          category as Record<string, unknown> | null || undefined,
          state.users,
          currentUser,
        )
        setState((prev) => ({ ...prev, books: [newBook, ...prev.books] }))
        showToast(`"${newBook.title}" se publicó y guardó en Supabase.`)
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error inesperado al guardar la publicación."
        console.error("[Supabase] Error creando publicación:", error)
        showToast(`No se pudo guardar la publicación: ${message}`)
        return false
      }
    },
    [state.currentUser, state.users, showToast]
  )

  const updateBook = useCallback(
    async (bookId: string, patch: PublicationInput): Promise<boolean> => {
      const book = state.books.find((candidate) => candidate.id === bookId)
      if (!book || book.ownerId !== state.currentUser?.id) {
        showToast("Solo el dueño puede editar esta publicación.")
        return false
      }
      if (book.availability !== "DISPONIBLE") {
        showToast("No se puede editar una publicación que no está disponible.")
        return false
      }

      try {
        const [isbn, email, timestamp] = databasePublicationId(book)
        const { data, error } = await supabase
          .from("publicacion")
          .update({
            estado_fisico: databaseCondition(patch.condition),
            valor_puntos_solicitado: patch.points,
            comentario: patch.description || null,
          })
          .eq("isbn", isbn)
          .eq("email_propietario", email)
          .eq("hora_publicacion", timestamp)
          .select("*")
          .single()
        if (error) throw error
        if (!data) throw new Error("Supabase no devolvió la publicación actualizada.")

        setState((prev) => ({
          ...prev,
          books: prev.books.map((candidate) =>
            candidate.id === bookId
              ? { ...candidate, ...patch, referencePrice: calculateReferencePrice(candidate.category, patch.condition, 4.5) }
              : candidate,
          ),
        }))
        showToast("Publicación actualizada en Supabase.")
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error inesperado al actualizar la publicación."
        console.error("[Supabase] Error actualizando publicación:", error)
        showToast(`No se pudo actualizar la publicación: ${message}`)
        return false
      }
    },
    [showToast, state.books, state.currentUser]
  )

  const deleteBook = useCallback(
    async (bookId: string): Promise<boolean> => {
      const book = state.books.find((b) => b.id === bookId)
      if (!book || book.ownerId !== state.currentUser?.id) {
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

      try {
        const [isbn, email, timestamp] = databasePublicationId(book)
        const { data, error } = await supabase
          .from("publicacion")
          .update({ estado_publicacion: "ELIMINADA" })
          .eq("isbn", isbn)
          .eq("email_propietario", email)
          .eq("hora_publicacion", timestamp)
          .select("isbn")
          .single()
        if (error) throw error
        if (!data) throw new Error("No se encontró la publicación para eliminar.")

        setState((prev) => ({ ...prev, books: prev.books.filter((candidate) => candidate.id !== bookId) }))
        showToast("Publicación eliminada de Supabase.")
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error inesperado al eliminar la publicación."
        console.error("[Supabase] Error eliminando publicación:", error)
        showToast(`No se pudo eliminar la publicación: ${message}`)
        return false
      }
    },
    [state.books, state.currentUser, showToast]
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

      const tradeId = crypto.randomUUID()
      const newTrade: TradeRequest = {
        id: tradeId,
        type: "PUNTOS",
        status: "PENDIENTE",
        requestedBookId: book.id,
        requesterId: state.currentUser.id,
        requesterName: state.currentUser.name,
        ownerId: book.ownerId,
        ownerName: book.ownerName,
        points: book.points,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const newMov: PointMovement = {
        id: "pm-" + Date.now(),
        userId: state.currentUser.id,
        type: "RESERVA",
        amount: -book.points,
        balanceAfter: state.currentUser.availablePoints - book.points,
        description: `Reserva de puntos para solicitar "${book.title}" a ${book.ownerName}`,
        date: new Date().toISOString(),
        tradeId,
      }

      const notif: NotificationItem = {
        id: "notif-" + Date.now(),
        userId: book.ownerId,
        type: "TRADE_REQUEST",
        title: "Nueva solicitud de intercambio por puntos",
        message: `${state.currentUser.name} solicitó tu libro "${book.title}" por ${book.points} puntos.`,
        read: false,
        date: new Date().toISOString(),
        linkScreen: "intercambios",
        linkData: { tradeId, bookId: book.id },
      }

      try {
        await saveSolicitudIntercambio(
          createSolicitudIntercambio(tradeId, "PUNTOS", "PENDIENTE", book, undefined, state.currentUser),
        )
      } catch (error) {
        console.error("[Supabase] Error guardando solicitud por puntos:", error)
        showToast(error instanceof Error ? `No se pudo guardar la solicitud: ${error.message}` : "No se pudo guardar la solicitud en Supabase.")
        return false
      }

      setState((prev) => {
        const updatedRequester = {
          ...prev.currentUser!,
          availablePoints: prev.currentUser!.availablePoints - book.points,
          reservedPoints: prev.currentUser!.reservedPoints + book.points,
        }
        return {
          ...prev,
          currentUser: updatedRequester,
          users: prev.users.map((u) => (u.id === updatedRequester.id ? updatedRequester : u)),
          books: prev.books.map((b) => (b.id === book.id ? { ...b, availability: "RESERVADO" } : b)),
          trades: [newTrade, ...prev.trades],
          pointMovements: [newMov, ...prev.pointMovements],
          notifications: [notif, ...prev.notifications],
        }
      })

      showToast(`¡Solicitud enviada! Se reservaron ${book.points} puntos de tu saldo.`)
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

      const tradeId = crypto.randomUUID()
      const newTrade: TradeRequest = {
        id: tradeId,
        type: "DIRECTO",
        status: "PENDIENTE",
        requestedBookId: targetBook.id,
        offeredBookId: offeredBook.id,
        requesterId: state.currentUser.id,
        requesterName: state.currentUser.name,
        ownerId: targetBook.ownerId,
        ownerName: targetBook.ownerName,
        points: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const notif: NotificationItem = {
        id: "notif-" + Date.now(),
        userId: targetBook.ownerId,
        type: "TRADE_REQUEST",
        title: "Propuesta de intercambio directo",
        message: `${state.currentUser.name} ofrece "${offeredBook.title}" a cambio de tu libro "${targetBook.title}".`,
        read: false,
        date: new Date().toISOString(),
        linkScreen: "intercambios",
        linkData: { tradeId, bookId: targetBook.id },
      }

      try {
        await saveSolicitudIntercambio(
          createSolicitudIntercambio(tradeId, "DIRECTO", "PENDIENTE", targetBook, offeredBook, state.currentUser),
        )
      } catch (error) {
        console.error("[Supabase] Error guardando propuesta de trueque:", error)
        showToast(error instanceof Error ? `No se pudo guardar la propuesta: ${error.message}` : "No se pudo guardar la propuesta en Supabase.")
        return false
      }

      setState((prev) => ({
        ...prev,
        books: prev.books.map((b) =>
          b.id === targetBook.id || b.id === offeredBook.id ? { ...b, availability: "RESERVADO" } : b
        ),
        trades: [newTrade, ...prev.trades],
        notifications: [notif, ...prev.notifications],
      }))

      showToast(`Propuesta directa enviada a ${targetBook.ownerName}.`)
      return true
    },
    [state.currentUser, state.books, showToast]
  )

  const acceptTrade = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade) return
      try {
        await updateSolicitudIntercambio(tradeId, "ACEPTAR")
      } catch (error) {
        console.error("[Supabase] Error aceptando solicitud:", error)
        showToast(error instanceof Error ? `No se pudo aceptar la solicitud: ${error.message}` : "No se pudo actualizar la solicitud en Supabase.")
        return
      }

      const notif: NotificationItem = {
        id: "notif-" + Date.now(),
        userId: trade.requesterId,
        type: "TRADE_ACCEPTED",
        title: "¡Intercambio aceptado!",
        message: `${trade.ownerName} aceptó tu solicitud de intercambio. Podés coordinar la entrega y confirmar recepción.`,
        read: false,
        date: new Date().toISOString(),
        linkScreen: "intercambios",
        linkData: { tradeId: trade.id },
      }

      setState((prev) => ({
        ...prev,
        trades: prev.trades.map((t) => (t.id === tradeId ? { ...t, status: "ACEPTADO", updatedAt: new Date().toISOString() } : t)),
        notifications: [notif, ...prev.notifications],
      }))

      showToast("Has aceptado el intercambio. El libro queda bloqueado para entrega.")
    },
    [state.trades, showToast]
  )

  const rejectTrade = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade) return
      try {
        await updateSolicitudIntercambio(tradeId, "RECHAZAR")
      } catch (error) {
        console.error("[Supabase] Error rechazando solicitud:", error)
        showToast(error instanceof Error ? `No se pudo rechazar la solicitud: ${error.message}` : "No se pudo actualizar la solicitud en Supabase.")
        return
      }

      const movements: PointMovement[] = []
      if (trade.type === "PUNTOS" && trade.points > 0) {
        const requester = state.users.find((u) => u.id === trade.requesterId)
        if (requester) {
          movements.push({
            id: "pm-" + Date.now(),
            userId: trade.requesterId,
            type: "LIBERACION",
            amount: trade.points,
            balanceAfter: requester.availablePoints + trade.points,
            description: `Liberación de reserva por propuesta rechazada (#${trade.id.slice(-5)})`,
            date: new Date().toISOString(),
            tradeId,
          })
        }
      }

      const notif: NotificationItem = {
        id: "notif-" + Date.now(),
        userId: trade.requesterId,
        type: "TRADE_REJECTED",
        title: "Solicitud rechazada",
        message: `Tu propuesta de intercambio con ${trade.ownerName} no fue aceptada.`,
        read: false,
        date: new Date().toISOString(),
        linkScreen: "intercambios",
      }

      setState((prev) => {
        const updatedUsers = prev.users.map((u) => {
          if (trade.type === "PUNTOS" && u.id === trade.requesterId) {
            return {
              ...u,
              availablePoints: u.availablePoints + trade.points,
              reservedPoints: Math.max(0, u.reservedPoints - trade.points),
            }
          }
          return u
        })

        const updatedCurrent =
          prev.currentUser?.id === trade.requesterId && trade.type === "PUNTOS"
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
          trades: prev.trades.map((t) => (t.id === tradeId ? { ...t, status: "RECHAZADO", updatedAt: new Date().toISOString() } : t)),
          pointMovements: [...movements, ...prev.pointMovements],
          notifications: [notif, ...prev.notifications],
        }
      })

      showToast("Solicitud rechazada. Puntos y libros liberados.")
    },
    [state.trades, state.users, showToast]
  )

  const cancelTrade = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade || !state.currentUser) return
      try {
        await updateSolicitudIntercambio(tradeId, "CANCELAR")
      } catch (error) {
        console.error("[Supabase] Error cancelando intercambio:", error)
        showToast(error instanceof Error ? `No se pudo cancelar el intercambio: ${error.message}` : "No se pudo actualizar la solicitud en Supabase.")
        return
      }

      const isRequester = state.currentUser.id === trade.requesterId
      const otherUserId = isRequester ? trade.ownerId : trade.requesterId
      const otherUserName = isRequester ? trade.ownerName : trade.requesterName

      const movements: PointMovement[] = []
      if (trade.type === "PUNTOS" && trade.points > 0) {
        const requester = state.users.find((u) => u.id === trade.requesterId)
        if (requester) {
          movements.push({
            id: "pm-" + Date.now(),
            userId: trade.requesterId,
            type: "LIBERACION",
            amount: trade.points,
            balanceAfter: requester.availablePoints + trade.points,
            description: `Liberación de garantía por cancelación de intercambio (#${trade.id.slice(-5)})`,
            date: new Date().toISOString(),
            tradeId,
          })
        }
      }

      const notif: NotificationItem = {
        id: "notif-" + Date.now(),
        userId: otherUserId,
        type: "TRADE_REJECTED",
        title: "Intercambio cancelado",
        message: `${state.currentUser.name} canceló el intercambio. Los puntos y libros fueron liberados a su estado original.`,
        read: false,
        date: new Date().toISOString(),
        linkScreen: "intercambios",
      }

      setState((prev) => {
        const updatedUsers = prev.users.map((u) => {
          if (trade.type === "PUNTOS" && u.id === trade.requesterId) {
            return {
              ...u,
              availablePoints: u.availablePoints + trade.points,
              reservedPoints: Math.max(0, u.reservedPoints - trade.points),
            }
          }
          return u
        })

        const updatedCurrent =
          prev.currentUser?.id === trade.requesterId && trade.type === "PUNTOS"
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
            t.id === tradeId ? { ...t, status: "CANCELADO", updatedAt: new Date().toISOString() } : t
          ),
          pointMovements: [...movements, ...prev.pointMovements],
          notifications: [notif, ...prev.notifications],
        }
      })

      showToast("Intercambio cancelado. Libros y puntos liberados con éxito.")
    },
    [state.trades, state.currentUser, state.users, showToast]
  )

  const confirmTradeReceipt = useCallback(
    async (tradeId: string) => {
      const trade = state.trades.find((t) => t.id === tradeId)
      if (!trade || !state.currentUser) return

      const isRequester = state.currentUser.id === trade.requesterId
      const isOwner = state.currentUser.id === trade.ownerId

      const updatedTrade: TradeRequest = {
        ...trade,
        requesterConfirmed: isRequester ? true : trade.requesterConfirmed,
        ownerConfirmed: isOwner ? true : trade.ownerConfirmed,
      }

      const shouldComplete =
        trade.type === "PUNTOS"
          ? updatedTrade.requesterConfirmed
          : updatedTrade.requesterConfirmed && updatedTrade.ownerConfirmed

      const movements: PointMovement[] = []
      const bonusAmount = trade.type === "PUNTOS" ? 10 : 5

      if (shouldComplete) {
        updatedTrade.status = "COMPLETADO"
        updatedTrade.updatedAt = new Date().toISOString()

        const requesterUser = state.users.find((u) => u.id === trade.requesterId)
        const ownerUser = state.users.find((u) => u.id === trade.ownerId)

        const requesterNewAvail = (requesterUser?.availablePoints ?? 0) + bonusAmount
        const ownerNewAvail =
          (ownerUser?.availablePoints ?? 0) + (trade.type === "PUNTOS" ? trade.points : 0) + bonusAmount

        if (trade.type === "PUNTOS") {
          movements.push({
            id: "pm-tr-recv-" + Date.now(),
            userId: trade.ownerId,
            type: "TRANSFERENCIA_RECIBIDA",
            amount: trade.points,
            balanceAfter: ownerNewAvail,
            description: `Puntos recibidos por intercambio completado de libro`,
            date: new Date().toISOString(),
            tradeId,
          })

          movements.push({
            id: "pm-tr-sent-" + Date.now(),
            userId: trade.requesterId,
            type: "TRANSFERENCIA_ENVIADA",
            amount: -trade.points,
            balanceAfter: requesterNewAvail,
            description: `Transferencia definitiva de puntos a ${trade.ownerName}`,
            date: new Date().toISOString(),
            tradeId,
          })
        }

        movements.push({
          id: "pm-bonus-1-" + Date.now(),
          userId: trade.requesterId,
          type: "BONO_INTERCAMBIO",
          amount: bonusAmount,
          balanceAfter: requesterNewAvail,
          description: `¡Bono por intercambio exitoso! (+${bonusAmount} pts)`,
          date: new Date().toISOString(),
          tradeId,
        })
        movements.push({
          id: "pm-bonus-2-" + Date.now(),
          userId: trade.ownerId,
          type: "BONO_INTERCAMBIO",
          amount: bonusAmount,
          balanceAfter: ownerNewAvail,
          description: `¡Bono por intercambio exitoso! (+${bonusAmount} pts)`,
          date: new Date().toISOString(),
          tradeId,
        })
      }

      try {
        await updateSolicitudIntercambio(tradeId, "CONFIRMAR")
      } catch (error) {
        console.error("[Supabase] Error confirmando recepción:", error)
        showToast(error instanceof Error ? `No se pudo registrar la confirmación: ${error.message}` : "No se pudo actualizar la solicitud en Supabase.")
        return
      }

      setState((prev) => {
        let updatedUsers = prev.users.map((u) => {
          let avail = u.availablePoints
          let res = u.reservedPoints
          let trades = u.totalTrades

          if (shouldComplete) {
            trades += 1
            if (u.id === trade.requesterId) {
              if (trade.type === "PUNTOS") {
                res = Math.max(0, res - trade.points)
              }
              avail += bonusAmount
            }
            if (u.id === trade.ownerId) {
              if (trade.type === "PUNTOS") {
                avail += trade.points
              }
              avail += bonusAmount
            }
          }

          return { ...u, availablePoints: avail, reservedPoints: res, totalTrades: trades }
        })

        const activeCurrent = updatedUsers.find((u) => u.id === prev.currentUser?.id) || prev.currentUser

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
    [state.trades, state.currentUser, state.users, showToast]
  )

  const addReview = useCallback(
    (tradeId: string, toUserId: string, rating: number, comment: string, bookTitle: string) => {
      if (!state.currentUser) return

      // If bookTitle is generic, resolve from requested book
      const trade = state.trades.find((t) => t.id === tradeId)
      const requestedBook = trade ? state.books.find((b) => b.id === trade.requestedBookId) : null
      const finalTitle = (!bookTitle || bookTitle.startsWith("Intercambio #")) && requestedBook?.title
        ? requestedBook.title
        : bookTitle || "Libro intercambiado"

      const reviewId = "rev-" + Date.now()
      const newReview: Review = {
        id: reviewId,
        tradeId,
        fromUserId: state.currentUser.id,
        fromUserName: state.currentUser.name,
        toUserId,
        rating,
        comment,
        date: new Date().toISOString(),
        bookTitle: finalTitle,
      }

      const bonusMov: PointMovement = {
        id: "pm-rev-" + Date.now(),
        userId: state.currentUser.id,
        type: "RECOMPENSA_RESEÑA",
        amount: 5,
        balanceAfter: state.currentUser.availablePoints + 5,
        description: `Recompensa por dejar una reseña a ${state.users.find((u) => u.id === toUserId)?.name || toUserId} (+5 pts)`,
        date: new Date().toISOString(),
        tradeId,
      }

      setState((prev) => {
        const targetReviews = prev.reviews.filter((r) => r.toUserId === toUserId)
        const allTargetRatings = [...targetReviews.map((r) => r.rating), rating]
        const newAverage = Number((allTargetRatings.reduce((a, b) => a + b, 0) / allTargetRatings.length).toFixed(1))

        const updatedUsers = prev.users.map((u) => {
          if (u.id === toUserId) {
            return { ...u, rating: newAverage, totalReviews: u.totalReviews + 1 }
          }
          if (u.id === prev.currentUser?.id) {
            return { ...u, availablePoints: u.availablePoints + 5 }
          }
          return u
        })

        const activeCurrent = updatedUsers.find((u) => u.id === prev.currentUser?.id) || prev.currentUser

        return {
          ...prev,
          currentUser: activeCurrent,
          users: updatedUsers,
          reviews: [newReview, ...prev.reviews],
          pointMovements: [bonusMov, ...prev.pointMovements],
          trades: prev.trades.map((t) => {
            if (t.id === tradeId) {
              return t.requesterId === prev.currentUser?.id
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
