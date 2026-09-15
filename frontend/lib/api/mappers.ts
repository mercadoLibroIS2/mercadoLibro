import type { Book, Condition, Category, User } from "@/lib/mercado-types"
import type {
  AuthResponseDTO,
  BackendCategoriaLibro,
  BackendEstadoFisico,
  LibroResponseDTO,
} from "./types"

// Mapeo Condition (Front) -> BackendEstadoFisico (Back)
export function conditionToBackend(condition: Condition): BackendEstadoFisico {
  switch (condition) {
    case "Nuevo":
      return "NUEVO"
    case "Como nuevo":
      return "COMO_NUEVO"
    case "Muy bueno":
    case "Bueno":
      return "BUEN_ESTADO"
    case "Aceptable":
      return "ACEPTABLE"
    case "Con marcas":
      return "DETERIORADO"
    default:
      return "BUEN_ESTADO"
  }
}

// Mapeo BackendEstadoFisico (Back) -> Condition (Front)
export function backendToCondition(estado: BackendEstadoFisico): Condition {
  switch (estado) {
    case "NUEVO":
      return "Nuevo"
    case "COMO_NUEVO":
      return "Como nuevo"
    case "BUEN_ESTADO":
      return "Bueno"
    case "ACEPTABLE":
      return "Aceptable"
    case "DETERIORADO":
      return "Con marcas"
    default:
      return "Bueno"
  }
}

// Mapeo Category (Front) -> BackendCategoriaLibro (Back)
export function categoryToBackend(category: Category | string): BackendCategoriaLibro {
  switch (category) {
    case "Ficción":
      return "FICCION_GENERAL"
    case "Ciencia":
      return "CIENCIA_Y_TECNOLOGIA"
    case "Historia":
      return "HISTORIA"
    case "Infantil":
      return "INFANTIL"
    case "Poesía":
      return "POESIA_Y_DRAMA"
    case "Técnico":
      return "ACADEMICO"
    case "Autoayuda":
      return "AUTOAYUDA_Y_DESARROLLO_PERSONAL"
    case "Comics y novela gráfica":
      return "COMIC"
    case "Biografía":
      return "BIOGRAFIAS"
    case "No ficción":
    case "Filosofía":
    default:
      return "OTROS"
  }
}

// Mapeo BackendCategoriaLibro (Back) -> Category (Front)
export function backendToCategory(cat: BackendCategoriaLibro): Category | string {
  switch (cat) {
    case "FICCION_GENERAL":
    case "CIENCIA_FICCION":
    case "FANTASIA":
    case "MISTERIO_Y_THRILLER":
    case "ROMANCE":
    case "TERROR_Y_SUSPENSO":
    case "NOVELA_HISTORICA":
      return "Ficción"
    case "HISTORIA":
      return "Historia"
    case "CIENCIA_Y_TECNOLOGIA":
      return "Ciencia"
    case "INFANTIL":
    case "JUVENIL":
      return "Infantil"
    case "POESIA_Y_DRAMA":
      return "Poesía"
    case "ACADEMICO":
      return "Técnico"
    case "AUTOAYUDA_Y_DESARROLLO_PERSONAL":
      return "Autoayuda"
    case "COMIC":
      return "Comics y novela gráfica"
    case "BIOGRAFIAS":
      return "Biografía"
    default:
      return "No ficción"
  }
}

// Mapeo AuthResponseDTO -> User (Modelo de Front)
export function authResponseToUser(auth: AuthResponseDTO): User {
  return {
    id: auth.id,
    name: auth.nombre,
    username: auth.nombre.toLowerCase().replace(/\s+/g, ""),
    email: auth.email,
    avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    rating: 5.0,
    totalReviews: 0,
    totalTrades: 0,
    availablePoints: auth.saldoTotal ?? 100,
    reservedPoints: 0,
    joinedDate: new Date().toLocaleDateString("es-AR", { month: "short", year: "numeric" }),
  }
}

// Mapeo LibroResponseDTO -> Book (Modelo de Front)
export function libroResponseToBook(
  dto: LibroResponseDTO,
  ownerName: string = "Usuario",
  extra?: { coverUrl?: string; description?: string; edition?: string }
): Book {
  const primaryCat = dto.categoria && dto.categoria.length > 0 ? dto.categoria[0] : "OTROS"
  return {
    id: dto.id,
    title: dto.titulo,
    author: dto.autor,
    isbn: dto.isbn,
    category: backendToCategory(primaryCat as BackendCategoriaLibro),
    condition: backendToCondition(dto.estadoFisico),
    points: dto.valorReferencia,
    edition: extra?.edition,
    description: extra?.description,
    coverUrl: extra?.coverUrl,
    ownerId: dto.propietario,
    ownerName: ownerName,
    ownerRating: 5.0,
    ownerTrades: 0,
    availability: dto.disponible ? "DISPONIBLE" : "RESERVADO",
    createdAt: new Date().toISOString(),
  }
}
