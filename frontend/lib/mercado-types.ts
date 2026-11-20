export type Screen =
  | "inicio"
  | "perfil"
  | "perfil_publico"
  | "publicar"
  | "intercambios"
  | "tracker"
  | "cadenas"
  | "notificaciones"
  | "login"
  | "registro"
  | "bienvenida"
  | "admin"

export type Condition =
  | "Nuevo"
  | "Como nuevo"
  | "Muy bueno"
  | "Bueno"
  | "Aceptable"
  | "Con marcas"

// Solo los estados que existen en el backend (EstadoFisico). "Muy bueno" queda en el tipo
// por compatibilidad con datos viejos, pero no se ofrece: se guardaba como "Bueno".
export const CONDITIONS: Condition[] = ["Nuevo", "Como nuevo", "Bueno", "Aceptable", "Con marcas"]

export const CATEGORIES = [
  "Ficción",
  "No ficción",
  "Ciencia",
  "Historia",
  "Infantil",
  "Poesía",
  "Técnico",
  "Autoayuda",
  "Comics y novela gráfica",
  "Filosofía",
  "Biografía",
] as const

export type Category = (typeof CATEGORIES)[number]

export type BookAvailability = "DISPONIBLE" | "RESERVADO" | "INTERCAMBIADO" | "ELIMINADO"

export interface Book {
  id: string
  title: string
  author: string
  isbn: string
  category: Category | string
  condition: Condition
  points: number
  edition?: string
  description?: string
  coverUrl?: string
  ownerId: string
  ownerName: string
  ownerRating: number
  ownerTrades: number
  availability: BookAvailability
  referencePrice?: number
  pages?: number | null
  externalRating?: number
  createdAt: string
}

export interface GoogleBookVolume {
  googleBooksId: string
  isbn: string
  titulo: string
  autor: string
  descripcion: string
  portadaUrl: string
  editorial: string
  anioPublicacion: string
  categorias: string[]
  paginas: number | null
  ratingExterno: number | null
}

export type PublicationInput = Pick<Book, "isbn" | "condition" | "points"> &
  Pick<Book, "description"> & {
    googleBook?: GoogleBookVolume
    category?: string
  }

// Google Books devuelve categorías en inglés: se traducen a las del catálogo cuando hay equivalente
const GOOGLE_CATEGORY_MAP: Array<[RegExp, Category]> = [
  [/comic|graphic novel/i, "Comics y novela gráfica"],
  [/juvenile|children/i, "Infantil"],
  [/poetry/i, "Poesía"],
  [/biograph/i, "Biografía"],
  [/histor/i, "Historia"],
  [/philosoph/i, "Filosofía"],
  [/self-help|self help/i, "Autoayuda"],
  [/computer|technolog|engineering/i, "Técnico"],
  [/science|mathemat|nature/i, "Ciencia"],
  [/fiction/i, "Ficción"],
]

export function mapGoogleCategory(raw?: string | null): Category | "" {
  if (!raw) return ""
  const direct = CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase())
  if (direct) return direct
  return GOOGLE_CATEGORY_MAP.find(([re]) => re.test(raw))?.[1] || ""
}

export interface User {
  id: string
  name: string
  username: string
  email: string
  avatar: string
  bio?: string
  city?: string
  rating: number
  totalReviews: number
  totalTrades: number
  availablePoints: number
  reservedPoints: number
  joinedDate: string
  /** Rol en el backend: "USUARIO" o "ADMINISTRADOR". */
  role?: string
}

export type Deal = "green" | "yellow" | "red"

export interface DealEvaluation {
  deal: Deal
  label: string
  hint: string
  referencePrice: number
  factors: {
    conditionMultiplier: number
    externalRating: number
    marketBase: number
  }
}

export type TradeType = "PUNTOS" | "DIRECTO"

export type TradeStatus =
  | "PENDIENTE"
  | "ACEPTADO"
  | "RECHAZADO"
  | "CANCELADO"
  | "COMPLETADO"

export interface TradeRequest {
  id: string
  type: TradeType
  status: TradeStatus
  requestedBookId: string
  offeredBookId?: string
  requesterId: string
  requesterName: string
  ownerId: string
  ownerName: string
  points: number
  createdAt: string
  updatedAt: string
  requesterConfirmed?: boolean
  ownerConfirmed?: boolean
  reviewedByRequester?: boolean
  reviewedByOwner?: boolean
  /** Títulos que informa el backend: los libros reservados ya no están en el catálogo. */
  requestedBookTitle?: string
  offeredBookTitle?: string
  /** Email de quien paga la compensación en un trueque directo (el dueño del libro de menor valor). */
  compensationPayerId?: string
}

export type PointMovementType =
  | "INICIAL"
  | "RESERVA"
  | "LIBERACION"
  | "TRANSFERENCIA_ENVIADA"
  | "TRANSFERENCIA_RECIBIDA"
  | "BONO_INTERCAMBIO"
  | "RECOMPENSA_RESEÑA"

export interface PointMovement {
  id: string
  userId: string
  type: PointMovementType
  amount: number
  /** Puede faltar en movimientos que vienen del backend. */
  balanceAfter?: number
  description: string
  date: string
  tradeId?: string
}

export interface Review {
  id: string
  tradeId: string
  fromUserId: string
  fromUserName: string
  toUserId: string
  rating: number
  comment: string
  date: string
  bookTitle: string
}

export interface TrackedBook {
  id: string
  userId: string
  title: string
  author?: string
  category?: string
  isbn?: string
  maxPoints?: number
  acceptableConditions?: Condition[]
  privateNotes?: string
  createdAt: string
}

export type NotificationType =
  | "TRADE_REQUEST"
  | "TRADE_ACCEPTED"
  | "TRADE_REJECTED"
  | "TRADE_COMPLETED"
  | "TRACKER_MATCH"
  | "CHAIN_DETECTED"
  | "POINTS_RECEIVED"
  | "REPORT_UPDATE"

export interface NotificationItem {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  archived?: boolean
  date: string
  linkScreen?: Screen
  linkData?: {
    bookId?: string
    tradeId?: string
    chainId?: string
    userId?: string
  }
}

export interface ChainStep {
  userId: string
  userName: string
  userAvatar: string
  givesBook: Book
  receivesBook: Book
  confirmed: boolean
  received?: boolean
}

export interface TradeChain {
  id: string
  status: "PROPUESTA" | "EN_CURSO" | "COMPLETADA" | "CANCELADA"
  steps: ChainStep[]
  createdAt: string
}

export function isUserMatch(
  user: { id?: string | null; email?: string | null } | null | undefined,
  targetIdOrEmail: string | null | undefined
): boolean {
  if (!user || !targetIdOrEmail) return false
  const target = targetIdOrEmail.toLowerCase().trim()
  return Boolean(
    (user.id && user.id.toLowerCase().trim() === target) ||
    (user.email && user.email.toLowerCase().trim() === target)
  )
}

