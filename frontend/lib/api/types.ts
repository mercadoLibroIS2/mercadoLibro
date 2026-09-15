// Enums del Backend (Spring Boot)
export type BackendEstadoFisico =
  | "NUEVO"
  | "COMO_NUEVO"
  | "BUEN_ESTADO"
  | "ACEPTABLE"
  | "DETERIORADO"

export type BackendCategoriaLibro =
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

export type BackendRol = "USUARIO" | "ADMIN"

// DTOs de Autenticación
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

// DTOs de Libros
export interface LibroRequestDTO {
  isbn: string
  titulo: string
  autor: string
  categoria: BackendCategoriaLibro[]
  estadoFisico: BackendEstadoFisico
  valorReferencia: number
  disponible: boolean
  propietario?: string
}

export interface LibroResponseDTO {
  id: string
  isbn: string
  titulo: string
  autor: string
  categoria: BackendCategoriaLibro[]
  estadoFisico: BackendEstadoFisico
  valorReferencia: number
  disponible: boolean
  propietario: string
}

// DTOs de Reseñas
export interface ReseniaControllerDTO {
  calificado: string // UUID del usuario a calificar
  intercambioId: string // UUID del intercambio
  calificacion: number // float entre 0 y 5
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

// Estructura de error estándar de Spring Boot
export interface BackendApiError {
  status?: number
  message?: string
  error?: string
  errors?: Record<string, string>
  timestamp?: string
}
