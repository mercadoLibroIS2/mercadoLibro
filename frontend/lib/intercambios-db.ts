import type { Book, TradeRequest, TradeStatus, TradeType, User } from "./mercado-types"
import { databasePublicationId } from "./publicaciones-db"
import { supabase } from "./supabase"

interface SolicitudIntercambioRow {
  id: string
  tipo: TradeType
  estado: TradeStatus
  isbn_solicitada: string
  email_propietario_solicitada: string
  hora_publicacion_solicitada: string
  isbn_ofrecida: string | null
  email_propietario_ofrecida: string | null
  hora_publicacion_ofrecida: string | null
  email_solicitante: string
  email_propietario: string
  puntos: number
  solicitante_confirmado: boolean
  propietario_confirmado: boolean
  fecha_creacion: string
  fecha_actualizacion: string
}

export function createSolicitudIntercambio(
  id: string,
  type: TradeType,
  status: TradeStatus,
  requestedBook: Book,
  offeredBook: Book | undefined,
  requester: User,
): Omit<SolicitudIntercambioRow, "fecha_creacion" | "fecha_actualizacion"> {
  const [isbnRequested, emailOwner, hourRequested] = databasePublicationId(requestedBook)
  const [isbnOffered, emailOfferedOwner, hourOffered] = offeredBook
    ? databasePublicationId(offeredBook)
    : [null, null, null]

  return {
    id,
    tipo: type,
    estado: status,
    isbn_solicitada: isbnRequested,
    email_propietario_solicitada: emailOwner,
    hora_publicacion_solicitada: hourRequested,
    isbn_ofrecida: isbnOffered,
    email_propietario_ofrecida: emailOfferedOwner,
    hora_publicacion_ofrecida: hourOffered,
    email_solicitante: requester.email,
    email_propietario: emailOwner,
    puntos: type === "PUNTOS" ? requestedBook.points : 0,
    solicitante_confirmado: false,
    propietario_confirmado: false,
  }
}

export async function saveSolicitudIntercambio(
  request: Omit<SolicitudIntercambioRow, "fecha_creacion" | "fecha_actualizacion">,
): Promise<void> {
  const { error } = await supabase.rpc("crear_solicitud_intercambio", { p_solicitud: request })
  if (error) throw error
}

export async function updateSolicitudIntercambio(
  id: string,
  action: "ACEPTAR" | "RECHAZAR" | "CANCELAR" | "CONFIRMAR",
): Promise<void> {
  const { data, error } = await supabase.rpc("gestionar_solicitud_intercambio", {
    p_solicitud_id: id,
    p_accion: action,
  })
  if (error) throw error
  if (!data) throw new Error("La solicitud no existe o no tenés permiso para modificarla.")
}

export async function loadSolicitudesIntercambio(
  currentUser: User,
  books: Book[],
  users: User[],
): Promise<TradeRequest[]> {
  const { data, error } = await supabase
    .from("solicitud_intercambio")
    .select("*")
    .order("fecha_creacion", { ascending: false })

  if (error) throw error

  const publications = new Map(books.map((book) => [book.id, book]))
  const usersByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]))
  const userForEmail = (email: string): User => usersByEmail.get(email.toLowerCase()) || {
    id: email,
    name: email.split("@")[0] || email,
    username: email.split("@")[0] || email,
    email,
    avatar: "",
    rating: 5,
    totalReviews: 0,
    totalTrades: 0,
    availablePoints: 0,
    reservedPoints: 0,
    joinedDate: "",
  }

  return ((data || []) as SolicitudIntercambioRow[])
    .flatMap((row): TradeRequest[] => {
      const requestedBookId = JSON.stringify([
        row.isbn_solicitada,
        row.email_propietario_solicitada,
        row.hora_publicacion_solicitada,
      ])
      const offeredBookId = row.isbn_ofrecida && row.email_propietario_ofrecida && row.hora_publicacion_ofrecida
        ? JSON.stringify([row.isbn_ofrecida, row.email_propietario_ofrecida, row.hora_publicacion_ofrecida])
        : undefined
      const requester = userForEmail(row.email_solicitante)
      const owner = userForEmail(row.email_propietario)
      const requestedBook = publications.get(requestedBookId)
      if (!requestedBook) return []

      return [{
        id: row.id,
        type: row.tipo,
        status: row.estado,
        requestedBookId,
        offeredBookId,
        requesterId: requester.id,
        requesterName: requester.name,
        ownerId: owner.id,
        ownerName: owner.name,
        points: row.puntos,
        createdAt: row.fecha_creacion,
        updatedAt: row.fecha_actualizacion,
        requesterConfirmed: row.solicitante_confirmado,
        ownerConfirmed: row.propietario_confirmado,
      }]
    })
    .filter((trade) =>
      trade.requesterId === currentUser.id
      || trade.ownerId === currentUser.id
      || trade.requesterId.toLowerCase() === currentUser.email.toLowerCase()
      || trade.ownerId.toLowerCase() === currentUser.email.toLowerCase(),
    )
}
