// ==============================================================================
// MERCADOLIBRO - SERVICIO DE CADENAS DE INTERCAMBIO (SPRING BOOT)
// ==============================================================================

import { apiFetch } from "./client"
import { dtoToLibro } from "./libro-service"
import type {
  CadenaIntercambio,
  CadenaIntercambioResponseDTO,
  PasoCadena,
  PasoCadenaResponseDTO,
} from "../mercado-types"

function dtoToPaso(dto: any): PasoCadena {
  const libroEntregaRaw = dto.libroEntrega || dto.libroQueEntrega
  const libroRecibeRaw = dto.libroRecibe || dto.libroQueRecibe
  const libroEntrega = libroEntregaRaw ? dtoToLibro(libroEntregaRaw) : null
  const libroRecibe = libroRecibeRaw ? dtoToLibro(libroRecibeRaw) : null
  const participanteId = dto.participanteId || dto.usuarioId || ""
  const nombre = dto.nombre || dto.usuarioNombre || "Participante"
  const email = dto.email || dto.usuarioEmail || ""

  return {
    participanteId,
    nombre,
    email,
    libroEntrega,
    libroRecibe,
    confirmado: !!dto.confirmado,
    intercambioId: dto.intercambioId || null,
    // Aliases
    confirmed: !!dto.confirmado,
    userId: participanteId,
    userName: nombre,
    givesBook: libroEntrega,
    receivesBook: libroRecibe,
  }
}

export function dtoToCadena(dto: CadenaIntercambioResponseDTO): CadenaIntercambio {
  const pasos = (dto.pasos || []).map(dtoToPaso)
  return {
    id: dto.id,
    estado: dto.estado,
    puntosBonus: dto.puntosBonus ?? 10,
    pasos,
    steps: pasos,
    status: dto.estado,
    cantidadParticipantes: dto.cantidadParticipantes ?? (dto.pasos?.length || 0),
  }
}

export const cadenaService = {
  /**
   * Obtiene las cadenas de intercambio en las que participa el usuario autenticado
   */
  async obtenerMisCadenas(): Promise<CadenaIntercambio[]> {
    const list = await apiFetch<CadenaIntercambioResponseDTO[]>("/api/cadenaIntercambio/mis-cadenas")
    return (list || []).map(dtoToCadena)
  },

  /**
   * Obtiene una cadena por su ID
   */
  async obtenerCadenaPorId(id: string): Promise<CadenaIntercambio> {
    const dto = await apiFetch<CadenaIntercambioResponseDTO>(`/api/cadenaIntercambio/${id}`)
    return dtoToCadena(dto)
  },

  /**
   * Confirma la participación del usuario actual en un paso de la cadena
   */
  async confirmarPaso(cadenaId: string): Promise<CadenaIntercambio> {
    const dto = await apiFetch<CadenaIntercambioResponseDTO>(
      `/api/cadenaIntercambio/${cadenaId}/confirmar`,
      { method: "POST" }
    )
    return dtoToCadena(dto)
  },

  /**
   * Rechaza la cadena de intercambio
   */
  async rechazarCadena(cadenaId: string): Promise<CadenaIntercambio> {
    const dto = await apiFetch<CadenaIntercambioResponseDTO>(
      `/api/cadenaIntercambio/${cadenaId}/rechazar`,
      { method: "POST" }
    )
    return dtoToCadena(dto)
  },
}
