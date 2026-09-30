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

export type Condition =
  | "Nuevo"
  | "Como nuevo"
  | "Muy bueno"
  | "Bueno"
  | "Aceptable"
  | "Con marcas"

export const CONDITIONS: Condition[] = [
  "Nuevo",
  "Como nuevo",
  "Muy bueno",
  "Bueno",
  "Aceptable",
  "Con marcas",
]

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
  externalRating?: number
  createdAt: string
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
  balanceAfter: number
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
}

export interface TradeChain {
  id: string
  status: "PROPUESTA" | "EN_CURSO" | "COMPLETADA" | "CANCELADA"
  steps: ChainStep[]
  createdAt: string
}
