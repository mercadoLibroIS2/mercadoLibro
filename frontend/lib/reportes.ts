import type { ReportReason, ReportStatus, ReportType } from "./api"

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
