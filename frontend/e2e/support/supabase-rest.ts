import type { Route } from "@playwright/test"

// Respuestas por defecto para la API REST de Supabase en las pruebas e2e del frontend.
// - `usuario`: devuelve la fila del usuario pedido (la app exige el perfil con saldo para iniciar sesión).
// - Tablas de la migración de persistencia: responde "tabla inexistente" (PGRST205), igual que una base
//   sin la migración aplicada. Así la app usa el estado local que siembra cada prueba.
// - Cualquier otra tabla: lista vacía.

export const MIGRATION_TABLES = new Set([
  "movimiento_puntos_app",
  "notificacion_app",
  "resenia_intercambio",
  "seguimiento_libro",
  "reporte_app",
])

// Funciones (RPC) que agregan las migraciones nuevas: sin migración, PostgREST responde PGRST202.
export const MIGRATION_RPCS = new Set([
  "crear_resenia_intercambio",
  "crear_reporte",
  "resolver_reporte",
  "reactivar_usuario",
  "estadisticas_admin",
  "intercambios_estancados_admin",
  "reiniciar_usuario_demo",
])

export interface MockUser {
  id: string
  email: string
  username?: string
  name?: string
  avatar?: string
  bio?: string
  city?: string
  availablePoints?: number
  reservedPoints?: number
  rating?: number
  totalReviews?: number
  totalTrades?: number
}

export function usuarioRow(user: MockUser): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    nombre: user.username || user.email.split("@")[0],
    saldo_total: user.availablePoints ?? 100,
    saldo_reservado: user.reservedPoints ?? 0,
    reputacion_promedio: user.rating ?? 5,
    rol: "USUARIO",
    es_activo: true,
    nombre_completo: user.name ?? null,
    avatar_url: user.avatar ?? null,
    bio: user.bio ?? null,
    ciudad: user.city ?? null,
    total_resenias: user.totalReviews ?? 0,
    total_intercambios: user.totalTrades ?? 0,
  }
}

function requestedEmails(url: URL): string[] | null {
  const filter = url.searchParams.get("email")
  if (!filter) return null
  if (filter.startsWith("eq.")) return [decodeURIComponent(filter.slice(3))]
  if (filter.startsWith("in.(")) return filter.slice(4, -1).split(",").map((e) => decodeURIComponent(e.replace(/^"|"$/g, "")))
  return null
}

/**
 * Atiende la consulta si es una de las tablas conocidas y devuelve true; si no, devuelve false.
 * `anyEmail` crea al vuelo el perfil de un email desconocido (para pruebas de registro).
 */
export async function fulfillDefaultRest(
  route: Route,
  users: MockUser[],
  options: { anyEmail?: boolean } = {},
): Promise<boolean> {
  const url = new URL(route.request().url())
  const table = url.pathname.split("/").pop() || ""

  if (url.pathname.includes("/rest/v1/rpc/") && MIGRATION_RPCS.has(table)) {
    await route.fulfill({
      status: 404,
      json: { code: "PGRST202", message: `Could not find the function public.${table} in the schema cache` },
    })
    return true
  }

  if (MIGRATION_TABLES.has(table)) {
    await route.fulfill({
      status: 404,
      json: { code: "PGRST205", message: `Could not find the table 'public.${table}' in the schema cache` },
    })
    return true
  }

  if (table === "usuario" && route.request().method() === "GET") {
    const emails = requestedEmails(url)
    let rows = users
      .filter((u) => !emails || emails.some((e) => e.toLowerCase() === u.email.toLowerCase()))
      .map(usuarioRow)
    if (rows.length === 0 && options.anyEmail && emails?.length === 1) {
      rows = [usuarioRow({ id: `mock-${emails[0]}`, email: emails[0] })]
    }
    await route.fulfill({ json: rows })
    return true
  }

  return false
}
