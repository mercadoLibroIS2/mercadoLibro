import type {
  Book,
  Condition,
  NotificationItem,
  NotificationType,
  PointMovement,
  PointMovementType,
  Review,
  Screen,
  TrackedBook,
  User,
} from "./mercado-types"
import { supabase } from "./supabase"

// Columnas públicas de usuario. La tabla no permite select("*") porque
// la columna de contraseña no es legible desde el cliente.
export const USUARIO_COLUMNS =
  "id,email,nombre,saldo_total,saldo_reservado,reputacion_promedio,rol,es_activo,nombre_completo,bio,ciudad,avatar_url,total_intercambios,total_resenias,fecha_alta"

// Columnas mínimas que existen aunque la migración nueva no se haya aplicado.
export const USUARIO_COLUMNS_BASICAS = "id,email,nombre,saldo_total,saldo_reservado,reputacion_promedio,rol,es_activo"

type Row = Record<string, unknown>

const MISSING_RELATION_CODES = new Set(["42P01", "PGRST205", "PGRST202", "42883", "42703", "PGRST204"])

/** true si el error indica que la migración de persistencia todavía no se aplicó. */
export function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const code = (error as { code?: string }).code
  return !!code && MISSING_RELATION_CODES.has(code)
}

/** Lee usuarios con las columnas nuevas y, si no existen, con las básicas. */
export async function selectUsuarios(
  build: (columns: string) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<Row[]> {
  const first = await build(USUARIO_COLUMNS)
  if (!first.error) return (first.data as Row[] | null) || []
  if (!isMissingSchemaError(first.error)) throw first.error
  const fallback = await build(USUARIO_COLUMNS_BASICAS)
  if (fallback.error) throw fallback.error
  return (fallback.data as Row[] | null) || []
}

const MOVEMENT_TYPE_FROM_DB: Record<string, PointMovementType> = {
  INICIAL: "INICIAL",
  RESERVA: "RESERVA",
  LIBERACION: "LIBERACION",
  TRANSFERENCIA_ENVIADA: "TRANSFERENCIA_ENVIADA",
  TRANSFERENCIA_RECIBIDA: "TRANSFERENCIA_RECIBIDA",
  BONO_INTERCAMBIO: "BONO_INTERCAMBIO",
  RECOMPENSA_RESENIA: "RECOMPENSA_RESEÑA",
}

function str(row: Row, key: string): string {
  const v = row[key]
  return typeof v === "string" ? v : v == null ? "" : String(v)
}

function num(row: Row, key: string): number {
  const v = Number(row[key])
  return Number.isFinite(v) ? v : 0
}

export interface PersistedSocialData {
  movements: PointMovement[] | null
  notifications: NotificationItem[] | null
  reviews: Review[] | null
  tracked: TrackedBook[] | null
}

/**
 * Carga lo persistido del usuario. Cada parte vale null si su tabla no existe
 * (migración sin aplicar) y en ese caso el store conserva los datos locales.
 */
export async function loadPersistedSocialData(
  currentUser: User,
  users: User[],
  books: Book[],
): Promise<PersistedSocialData> {
  const usersByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]))
  const userFor = (email: string) => usersByEmail.get(email.toLowerCase())

  const [movRes, notifRes, revRes, trackRes] = await Promise.all([
    supabase.from("movimiento_puntos_app").select("*").order("fecha", { ascending: false }).order("id", { ascending: false }),
    supabase.from("notificacion_app").select("*").order("fecha", { ascending: false }).limit(200),
    supabase.from("resenia_intercambio").select("*").order("fecha", { ascending: false }),
    supabase.from("seguimiento_libro").select("*").order("fecha", { ascending: false }),
  ])

  const pick = <T>(res: { data: unknown; error: unknown }, map: (rows: Row[]) => T): T | null => {
    if (res.error) {
      if (!isMissingSchemaError(res.error)) console.error("[Supabase] Error cargando datos:", res.error)
      return null
    }
    return map((res.data as Row[] | null) || [])
  }

  const movements = pick(movRes, (rows) =>
    rows.map((row): PointMovement => ({
      id: `pm-db-${str(row, "id")}`,
      userId: currentUser.id,
      type: MOVEMENT_TYPE_FROM_DB[str(row, "tipo")] || "INICIAL",
      amount: num(row, "monto"),
      balanceAfter: num(row, "saldo_resultante"),
      description: str(row, "descripcion"),
      date: str(row, "fecha"),
      tradeId: str(row, "solicitud_id") || undefined,
    })),
  )

  const notifications = pick(notifRes, (rows) =>
    rows.map((row): NotificationItem => {
      const isbn = str(row, "isbn")
      const book = isbn
        ? books.find((b) => b.isbn === isbn && b.availability === "DISPONIBLE") || books.find((b) => b.isbn === isbn)
        : undefined
      const tipo = str(row, "tipo") as NotificationType
      return {
        id: str(row, "id"),
        userId: currentUser.id,
        type: tipo,
        title: str(row, "titulo"),
        message: str(row, "mensaje"),
        read: row.leida === true,
        archived: row.archivada === true,
        date: str(row, "fecha"),
        linkScreen: (str(row, "pantalla") || undefined) as Screen | undefined,
        linkData: {
          tradeId: str(row, "solicitud_id") || undefined,
          // Solo las coincidencias del tracker abren el libro; el resto lleva a su pantalla.
          bookId: tipo === "TRACKER_MATCH" ? book?.id : undefined,
        },
      }
    }),
  )

  const reviews = pick(revRes, (rows) =>
    rows.map((row): Review => {
      const from = userFor(str(row, "email_autor"))
      const to = userFor(str(row, "email_destinatario"))
      return {
        id: str(row, "id"),
        tradeId: str(row, "solicitud_id"),
        fromUserId: from?.id || str(row, "email_autor"),
        fromUserName: from?.name || str(row, "email_autor").split("@")[0],
        toUserId: to?.id || str(row, "email_destinatario"),
        rating: num(row, "calificacion"),
        comment: str(row, "comentario"),
        date: str(row, "fecha"),
        bookTitle: str(row, "titulo_libro") || "Libro intercambiado",
      }
    }),
  )

  const tracked = pick(trackRes, (rows) =>
    rows.map((row): TrackedBook => ({
      id: str(row, "id"),
      userId: currentUser.id,
      title: str(row, "titulo"),
      author: str(row, "autor") || undefined,
      category: str(row, "categoria") || undefined,
      maxPoints: row.max_puntos == null ? undefined : num(row, "max_puntos"),
      acceptableConditions: Array.isArray(row.estados_aceptables)
        ? (row.estados_aceptables as Condition[])
        : undefined,
      privateNotes: str(row, "notas") || undefined,
      createdAt: str(row, "fecha"),
    })),
  )

  return { movements, notifications, reviews, tracked }
}

export async function createReview(tradeId: string, rating: number, comment: string): Promise<void> {
  const { error } = await supabase.rpc("crear_resenia_intercambio", {
    p_solicitud_id: tradeId,
    p_calificacion: rating,
    p_comentario: comment,
  })
  if (error) throw error
}

export async function insertTrackedBook(
  email: string,
  data: Omit<TrackedBook, "id" | "userId" | "createdAt">,
): Promise<string> {
  const { data: row, error } = await supabase
    .from("seguimiento_libro")
    .insert({
      email_usuario: email,
      titulo: data.title,
      autor: data.author || null,
      categoria: data.category || null,
      max_puntos: data.maxPoints || null,
      estados_aceptables: data.acceptableConditions?.length ? data.acceptableConditions : null,
      notas: data.privateNotes || null,
    })
    .select("id")
    .single()
  if (error) throw error
  return str(row as Row, "id")
}

export async function deleteTrackedBook(id: string): Promise<void> {
  const { error } = await supabase.from("seguimiento_libro").delete().eq("id", id)
  if (error) throw error
}

export async function updateNotifications(ids: string[], patch: { leida?: boolean; archivada?: boolean }): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from("notificacion_app").update(patch).in("id", ids)
  if (error) throw error
}

export async function updateUsuarioProfile(
  email: string,
  patch: { name?: string; bio?: string; city?: string; avatar?: string },
): Promise<void> {
  const { error } = await supabase
    .from("usuario")
    .update({
      nombre_completo: patch.name ?? null,
      bio: patch.bio ?? null,
      ciudad: patch.city ?? null,
      avatar_url: patch.avatar ?? null,
    })
    .eq("email", email)
    .select("email")
    .single()
  if (error) throw error
}

/** UUID válido: los ids de la base lo son; los locales ("track-123") no. */
export function isDatabaseId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}
