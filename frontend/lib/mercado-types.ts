// ==============================================================================
// MERCADOLIBRO - MODELO DE DOMINIO Y TIPOS OFICIALES ALINEADOS CON BACKEND & BD
// ==============================================================================

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

// ------------------------------------------------------------------------------
// ENUMS OFICIALES DE SPRING BOOT & POSTGRESQL
// ------------------------------------------------------------------------------

export type Rol = "USUARIO" | "ADMIN"

export type EstadoFisico =
  | "NUEVO"
  | "COMO_NUEVO"
  | "BUEN_ESTADO"
  | "ACEPTABLE"
  | "DETERIORADO"

export const ESTADOS_FISICOS: EstadoFisico[] = [
  "NUEVO",
  "COMO_NUEVO",
  "BUEN_ESTADO",
  "ACEPTABLE",
  "DETERIORADO",
]

export const ESTADO_FISICO_LABELS: Record<EstadoFisico, string> = {
  NUEVO: "Nuevo",
  COMO_NUEVO: "Como nuevo",
  BUEN_ESTADO: "Buen estado",
  ACEPTABLE: "Aceptable",
  DETERIORADO: "Deteriorado",
}

export type CategoriaLibro =
  | "FICCION_GENERAL"
  | "CIENCIA_FICCION"
  | "FANTASIA"
  | "MISTERIO_Y_THRILLER"
  | "ROMANCE"
  | "TERROR_Y_SUSPENSO"
  | "NOVELA_HISTORICA"
  | "POESIA_Y_DRAMA"
  | "BIOGRAFIAS"
  | "HISTORIA"
  | "CIENCIA_Y_TECNOLOGIA"
  | "POLITICA"
  | "AUTOAYUDA_Y_DESARROLLO_PERSONAL"
  | "NEGOCIOS_Y_FINANZAS"
  | "SALUD"
  | "COCINA"
  | "INFANTIL"
  | "JUVENIL"
  | "COMIC"
  | "ACADEMICO"
  | "IDIOMAS"
  | "OTROS"

export const CATEGORIAS_LIBRO: CategoriaLibro[] = [
  "FICCION_GENERAL",
  "CIENCIA_FICCION",
  "FANTASIA",
  "MISTERIO_Y_THRILLER",
  "ROMANCE",
  "TERROR_Y_SUSPENSO",
  "NOVELA_HISTORICA",
  "POESIA_Y_DRAMA",
  "BIOGRAFIAS",
  "HISTORIA",
  "CIENCIA_Y_TECNOLOGIA",
  "POLITICA",
  "AUTOAYUDA_Y_DESARROLLO_PERSONAL",
  "NEGOCIOS_Y_FINANZAS",
  "SALUD",
  "COCINA",
  "INFANTIL",
  "JUVENIL",
  "COMIC",
  "ACADEMICO",
  "IDIOMAS",
  "OTROS",
]

export const CATEGORIA_LIBRO_LABELS: Record<CategoriaLibro, string> = {
  FICCION_GENERAL: "Ficción General",
  CIENCIA_FICCION: "Ciencia Ficción",
  FANTASIA: "Fantasía",
  MISTERIO_Y_THRILLER: "Misterio y Thriller",
  ROMANCE: "Romance",
  TERROR_Y_SUSPENSO: "Terror y Suspenso",
  NOVELA_HISTORICA: "Novela Histórica",
  POESIA_Y_DRAMA: "Poesía y Drama",
  BIOGRAFIAS: "Biografías",
  HISTORIA: "Historia",
  CIENCIA_Y_TECNOLOGIA: "Ciencia y Tecnología",
  POLITICA: "Política",
  AUTOAYUDA_Y_DESARROLLO_PERSONAL: "Autoayuda y Desarrollo Personal",
  NEGOCIOS_Y_FINANZAS: "Negocios y Finanzas",
  SALUD: "Salud",
  COCINA: "Cocina",
  INFANTIL: "Infantil",
  JUVENIL: "Juvenil",
  COMIC: "Cómic",
  ACADEMICO: "Académico",
  IDIOMAS: "Idiomas",
  OTROS: "Otros",
}

export function toCategoriaLibro(val: string): CategoriaLibro {
  if (CATEGORIAS_LIBRO.includes(val as CategoriaLibro)) {
    return val as CategoriaLibro
  }
  const entry = Object.entries(CATEGORIA_LIBRO_LABELS).find(
    ([, label]) => label.toLowerCase() === val.toLowerCase()
  )
  if (entry) return entry[0] as CategoriaLibro

  const lower = val.toLowerCase()
  if (lower.includes("ficci")) return "FICCION_GENERAL"
  if (lower.includes("cien")) return "CIENCIA_Y_TECNOLOGIA"
  if (lower.includes("histo")) return "HISTORIA"
  if (lower.includes("infan")) return "INFANTIL"
  if (lower.includes("poes")) return "POESIA_Y_DRAMA"
  if (lower.includes("auto")) return "AUTOAYUDA_Y_DESARROLLO_PERSONAL"
  if (lower.includes("comic")) return "COMIC"
  if (lower.includes("bio")) return "BIOGRAFIAS"
  return "OTROS"
}

export function toEstadoFisico(val: string): EstadoFisico {
  if (ESTADOS_FISICOS.includes(val as EstadoFisico)) {
    return val as EstadoFisico
  }
  const entry = Object.entries(ESTADO_FISICO_LABELS).find(
    ([, label]) => label.toLowerCase() === val.toLowerCase()
  )
  if (entry) return entry[0] as EstadoFisico

  const lower = val.toLowerCase()
  if (lower.includes("nuevo") && !lower.includes("como")) return "NUEVO"
  if (lower.includes("como nuevo")) return "COMO_NUEVO"
  if (lower.includes("buen") || lower.includes("muy")) return "BUEN_ESTADO"
  if (lower.includes("aceptable")) return "ACEPTABLE"
  if (lower.includes("marca") || lower.includes("deteriorado")) return "DETERIORADO"
  return "BUEN_ESTADO"
}

export type EstadoIntercambio =
  | "PENDIENTE"
  | "RECHAZADO"
  | "ACEPTADO"
  | "COMPLETADO"

export type TipoIntercambio =
  | "LIBRO_POR_LIBRO"
  | "LIBRO_POR_PUNTOS"

export type EstadoCadena =
  | "PROPUESTA"
  | "EN_CURSO"
  | "COMPLETADA"
  | "CANCELADA"

export type TipoMovimiento =
  | "ENTRADA"
  | "SALIDA"

export type TipoNotificacion =
  | "INTERCAMBIO_SOLICITADO"
  | "INTERCAMBIO_ACEPTADO"
  | "INTERCAMBIO_COMPLETADO"
  | "RESENIA_RECIBIDA"
  | "PUNTOS_GANADOS"
  | "PUNTOS_GASTADOS"

export type BookAvailability = "DISPONIBLE" | "RESERVADO" | "INTERCAMBIADO" | "ELIMINADO"
export type Condition = EstadoFisico | string
export const CONDITIONS: string[] = [
  "Nuevo",
  "Como nuevo",
  "Muy bueno",
  "Bueno",
  "Aceptable",
  "Con marcas",
]
export const CATEGORIES: readonly string[] = [
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
]
export type Category = string

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

// ------------------------------------------------------------------------------
// ENTIDADES Y MODELOS DEL DOMINIO
// ------------------------------------------------------------------------------

export interface Libro {
  id: string
  isbn: string
  titulo?: string
  autor?: string
  categoria?: CategoriaLibro[]
  estadoFisico?: EstadoFisico
  valorReferencia?: number
  disponible?: boolean
  propietarioId?: string
  propietarioNombre?: string
  propietarioRating?: number
  propietarioIntercambios?: number

  // Aliases retrocompatibles para la UI
  title: string
  author: string
  points: number
  condition: Condition
  category: Category | string
  availability: BookAvailability
  ownerId: string
  ownerName: string
  ownerRating: number
  ownerTrades: number
  referencePrice?: number
  edition?: string

  // Campos enriquecidos opcionales (vía Google Books API)
  portadaUrl?: string
  coverUrl?: string
  descripcion?: string
  description?: string
  editorial?: string
  anioPublicacion?: string
  ratingExterno?: number
  externalRating?: number
  fechaCreacion?: string
  createdAt?: string
}

export interface Usuario {
  id: string
  nombre?: string
  email: string
  saldoTotal?: number
  saldoReservado?: number
  reputacionPromedio?: number
  rol?: Rol
  esActivo?: boolean
  avatar?: string
  bio?: string
  ciudad?: string
  city?: string
  totalIntercambios?: number
  totalTrades: number
  totalResenias?: number
  totalReviews: number
  fechaRegistro?: string
  joinedDate?: string

  // Aliases retrocompatibles
  name: string
  username: string
  availablePoints: number
  reservedPoints: number
  rating: number
}

export interface PasoCadena {
  participanteId?: string
  nombre?: string
  email?: string
  libroEntrega?: Libro | null
  libroRecibe?: Libro | null
  confirmado?: boolean
  intercambioId?: string | null

  // Aliases retrocompatibles
  confirmed?: boolean
  userId?: string
  userName?: string
  userAvatar?: string
  givesBook?: Libro | null
  receivesBook?: Libro | null
}

export interface CadenaIntercambio {
  id: string
  estado?: EstadoCadena
  puntosBonus?: number
  pasos?: PasoCadena[]
  cantidadParticipantes?: number
  fechaCreacion?: string
  createdAt?: string

  // Aliases retrocompatibles
  status?: string
  steps: PasoCadena[]
}

export interface Intercambio {
  id: string
  puntosComprometidos?: number
  tipo?: TipoIntercambio
  estado?: EstadoIntercambio
  libroDeseadoId?: string
  libroDeseado?: Libro
  libroOfrecidoId?: string
  libroOfrecido?: Libro
  prestadorId?: string
  prestadorNombre?: string
  receptorId?: string
  receptorNombre?: string
  fechaCreacion?: string
  fechaActualizacion?: string
  confirmadoPorPrestador?: boolean
  confirmadoPorReceptor?: boolean
  reseniaPrestador?: boolean
  reseniaReceptor?: boolean

  // Aliases retrocompatibles
  type: any
  status: any
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

export interface Resenia {
  id: string
  autorId?: string
  autorNombre?: string
  calificadoId?: string
  calificadoNombre?: string
  intercambioId?: string
  calificacion?: number
  comentario?: string
  fecha?: string
  libroTitulo?: string

  // Aliases retrocompatibles
  tradeId: string
  fromUserId: string
  fromUserName: string
  toUserId: string
  rating: number
  comment: string
  date: string
  bookTitle: string
}

export interface Notificacion {
  id: string
  usuarioId?: string
  tipo?: TipoNotificacion
  mensaje?: string
  leido?: boolean
  fecha?: string
  titulo?: string
  linkScreen?: Screen
  linkData?: Record<string, any>

  // Aliases retrocompatibles
  userId: string
  type: any
  title: string
  message: string
  read: boolean
  date: string
  archived?: boolean
}

export interface MovimientoPuntos {
  id: string
  usuarioId?: string
  intercambioId?: string
  tipo?: TipoMovimiento
  cantidad?: number
  descripcion?: string
  balancePosterior?: number
  fecha?: string

  // Aliases retrocompatibles
  userId: string
  type: any
  amount: number
  balanceAfter: number
  description: string
  date: string
  tradeId?: string
}

export interface LibroSeguido {
  id: string
  usuarioId?: string
  titulo?: string
  autor?: string
  categoria?: string
  maxPuntos?: number
  estadosAceptables?: EstadoFisico[]
  notasPrivadas?: string
  fechaCreacion?: string

  // Aliases retrocompatibles
  userId: string
  title: string
  author?: string
  category?: string
  maxPoints?: number
  acceptableConditions?: Condition[]
  privateNotes?: string
  createdAt: string
}

// ------------------------------------------------------------------------------
// FUNCIONES AUXILIARES DE ACCESO LIMPIO A MODELOS
// ------------------------------------------------------------------------------

export function getLibroTitulo(l?: Libro | null): string {
  if (!l) return ""
  return l.titulo || l.title || ""
}

export function getLibroAutor(l?: Libro | null): string {
  if (!l) return ""
  return l.autor || l.author || ""
}

export function getLibroPuntos(l?: Libro | null): number {
  if (!l) return 0
  return l.valorReferencia ?? l.points ?? 0
}

export function getLibroPortada(l?: Libro | null): string {
  if (!l) return "/placeholder.svg"
  return l.portadaUrl || l.coverUrl || "/placeholder.svg"
}

export function getLibroEstado(l?: Libro | null): string {
  if (!l) return ""
  if (l.estadoFisico && ESTADO_FISICO_LABELS[l.estadoFisico]) {
    return ESTADO_FISICO_LABELS[l.estadoFisico]
  }
  return l.condition || ""
}

export function getUsuarioNombre(u?: Usuario | null): string {
  if (!u) return ""
  return u.nombre || u.name || u.username || ""
}

export function getUsuarioSaldo(u?: Usuario | null): number {
  if (!u) return 0
  return u.saldoTotal ?? u.availablePoints ?? 0
}

// ------------------------------------------------------------------------------
// DTOS DE LA API SPRING BOOT
// ------------------------------------------------------------------------------

export interface LoginRequestDTO {
  nombreOEmail: string
  contrasenia: string
}

export interface UsuarioRequestDTO {
  nombre: string
  email: string
  contrasenia: string
}

export interface AuthResponseDTO {
  id: string
  token: string
  nombre: string
  email: string
  rol: string
  saldoTotal: number
}

export interface LibroRequestDTO {
  isbn: string
  titulo: string
  autor: string
  categoria: CategoriaLibro[]
  estadoFisico: EstadoFisico
  valorReferencia: number
  disponible: boolean
}

export interface LibroResponseDTO {
  id: string
  isbn: string
  titulo: string
  autor: string
  categoria: CategoriaLibro[]
  estadoFisico: EstadoFisico
  valorReferencia: number
  disponible: boolean
  propietario: string
}

export interface GoogleBookVolumeDTO {
  isbn: string
  titulo: string
  autor: string
  descripcion: string
  portadaUrl: string
  editorial: string
  anioPublicacion: string
  categorias: string[]
  paginas: number
  ratingExterno: number
}

export interface PasoCadenaResponseDTO {
  participanteId: string
  nombre: string
  email: string
  libroEntrega: LibroResponseDTO | null
  libroRecibe: LibroResponseDTO | null
  confirmado: boolean
  intercambioId: string | null
}

export interface CadenaIntercambioResponseDTO {
  id: string
  estado: EstadoCadena
  puntosBonus: number
  pasos: PasoCadenaResponseDTO[]
  cantidadParticipantes: number
}

export interface ReseniaControllerDTO {
  calificado: string
  intercambioId: string
  calificacion: number
  comentario: string
}

export interface ReseniaResponseDTO {
  id: string
  autorId: string
  calificadoId: string
  intercambioId: string
  calificacion: number
  comentario: string
  fecha: string
}

export interface SpringPage<T> {
  content: T[]
  pageable: {
    pageNumber: number
    pageSize: number
  }
  totalElements: number
  totalPages: number
  last: boolean
  first: boolean
  size: number
  number: number
}

// Aliases directos para tipado retrocompatible
export type Book = Libro
export type User = Usuario
export type TradeRequest = Intercambio
export type TradeChain = CadenaIntercambio
export type ChainStep = PasoCadena
export type Review = Resenia
export type NotificationItem = Notificacion
export type PointMovement = MovimientoPuntos
export type TrackedBook = LibroSeguido
export type TradeStatus = EstadoIntercambio | string
export type TradeType = TipoIntercambio | string
export type NotificationType = TipoNotificacion | string
export type PointMovementType = TipoMovimiento | string
