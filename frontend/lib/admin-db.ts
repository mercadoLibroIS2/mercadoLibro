import { supabase } from "./supabase"

// Reportes (denuncias) y panel de administración. Todo pasa por funciones de la base
// (security definer) que validan quién llama; el cliente no escribe las tablas directamente.

export type ReportType = "USUARIO" | "PUBLICACION" | "INTERCAMBIO"
export type ReportReason =
  | "LIBRO_NO_ENTREGADO"
  | "LIBRO_EN_MAL_ESTADO"
  | "PUBLICACION_ENGANOSA"
  | "COMPORTAMIENTO_INAPROPIADO"
  | "FRAUDE"
  | "OTRO"
export type ReportStatus = "ABIERTO" | "EN_REVISION" | "RESUELTO" | "DESCARTADO"
export type AdminAction = "NINGUNA" | "CANCELAR_INTERCAMBIO" | "ELIMINAR_PUBLICACION" | "SUSPENDER_USUARIO"

export const REPORT_REASONS: Record<ReportReason, string> = {
  LIBRO_NO_ENTREGADO: "No entregó el libro",
  LIBRO_EN_MAL_ESTADO: "El libro llegó en peor estado que el publicado",
  PUBLICACION_ENGANOSA: "Publicación engañosa o con datos falsos",
  COMPORTAMIENTO_INAPROPIADO: "Comportamiento inapropiado",
  FRAUDE: "Intento de fraude",
  OTRO: "Otro motivo",
}

export const REASONS_BY_TYPE: Record<ReportType, ReportReason[]> = {
  INTERCAMBIO: ["LIBRO_NO_ENTREGADO", "LIBRO_EN_MAL_ESTADO", "FRAUDE", "COMPORTAMIENTO_INAPROPIADO", "OTRO"],
  PUBLICACION: ["PUBLICACION_ENGANOSA", "FRAUDE", "OTRO"],
  USUARIO: ["COMPORTAMIENTO_INAPROPIADO", "FRAUDE", "OTRO"],
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  ABIERTO: "Abierto",
  EN_REVISION: "En revisión",
  RESUELTO: "Resuelto",
  DESCARTADO: "Descartado",
}

export interface ReportTarget {
  type: ReportType
  /** Texto para mostrar qué se está reportando. */
  label: string
  reportedEmail?: string
  isbn?: string
  publicationTime?: string
  tradeId?: string
}

export interface Report {
  id: string
  reporterEmail: string
  type: ReportType
  reportedEmail: string | null
  isbn: string | null
  publicationTime: string | null
  tradeId: string | null
  reason: ReportReason
  detail: string | null
  status: ReportStatus
  resolution: string | null
  actionTaken: AdminAction | null
  resolvedBy: string | null
  createdAt: string
  resolvedAt: string | null
}

export interface AdminStats {
  usuarios: number
  usuarios_suspendidos: number
  publicaciones_disponibles: number
  publicaciones_reservadas: number
  publicaciones_intercambiadas: number
  intercambios_por_estado: Record<string, number>
  intercambios_por_tipo: Record<string, number>
  puntos_en_circulacion: number
  puntos_reservados: number
  reputacion_promedio: number | null
  resenias: number
  reportes_abiertos: number
  reportes_cerrados: number
  categorias_populares: { categoria: string; publicaciones: number }[]
  usuarios_mas_activos: { email: string; nombre: string; intercambios: number; reputacion: number }[]
}

export interface StalledTrade {
  id: string
  tipo: string
  estado: string
  titulo: string
  solicitante: string
  propietario: string
  puntos: number
  solicitante_confirmado: boolean
  propietario_confirmado: boolean
  fecha_actualizacion: string
}

type Row = Record<string, unknown>
const str = (row: Row, key: string): string | null => (row[key] == null ? null : String(row[key]))

function toReport(row: Row): Report {
  return {
    id: String(row.id),
    reporterEmail: String(row.email_denunciante),
    type: row.tipo as ReportType,
    reportedEmail: str(row, "email_denunciado"),
    isbn: str(row, "isbn"),
    publicationTime: str(row, "hora_publicacion"),
    tradeId: str(row, "solicitud_id"),
    reason: row.motivo as ReportReason,
    detail: str(row, "detalle"),
    status: row.estado as ReportStatus,
    resolution: str(row, "resolucion"),
    actionTaken: str(row, "accion_tomada") as AdminAction | null,
    resolvedBy: str(row, "email_resolutor"),
    createdAt: String(row.fecha),
    resolvedAt: str(row, "fecha_resolucion"),
  }
}

/** Mensaje claro cuando la migración de reportes todavía no se aplicó. */
function friendly(error: unknown): Error {
  const code = (error as { code?: string })?.code
  if (code && ["PGRST202", "PGRST205", "42883", "42P01"].includes(code)) {
    return new Error("Los reportes todavía no están habilitados en la base (falta aplicar la migración).")
  }
  return error instanceof Error ? error : new Error((error as { message?: string })?.message || "Error inesperado.")
}

export async function createReport(target: ReportTarget, reason: ReportReason, detail: string): Promise<void> {
  const { error } = await supabase.rpc("crear_reporte", {
    p_tipo: target.type,
    p_motivo: reason,
    p_detalle: detail.trim() || null,
    p_email_denunciado: target.reportedEmail || null,
    p_isbn: target.isbn || null,
    p_hora_publicacion: target.publicationTime || null,
    p_solicitud_id: target.tradeId || null,
  })
  if (error) throw friendly(error)
}

/** Reportes visibles para quien consulta: los propios, o todos si es administrador. */
export async function loadReports(): Promise<Report[]> {
  const { data, error } = await supabase.from("reporte_app").select("*").order("fecha", { ascending: false }).limit(300)
  if (error) throw friendly(error)
  return ((data || []) as Row[]).map(toReport)
}

export async function resolveReport(
  id: string,
  status: Exclude<ReportStatus, "ABIERTO">,
  resolution: string,
  action: AdminAction,
): Promise<void> {
  const { error } = await supabase.rpc("resolver_reporte", {
    p_reporte_id: id,
    p_estado: status,
    p_resolucion: resolution.trim() || null,
    p_accion: action,
  })
  if (error) throw friendly(error)
}

export async function reactivateUser(email: string): Promise<void> {
  const { error } = await supabase.rpc("reactivar_usuario", { p_email: email })
  if (error) throw friendly(error)
}

export async function loadAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc("estadisticas_admin")
  if (error) throw friendly(error)
  return data as AdminStats
}

export async function loadStalledTrades(days = 7): Promise<StalledTrade[]> {
  const { data, error } = await supabase.rpc("intercambios_estancados_admin", { p_dias: days })
  if (error) throw friendly(error)
  return (data || []) as StalledTrade[]
}
