// Valores que acredita el backend (ver IntercambioServiceImpl y ReseniaServiceImpl).
// Si cambian allá, actualizarlos acá para que la interfaz no prometa otra cosa.
export const PUNTOS_INICIALES = 500
export const BONO_INTERCAMBIO_DIRECTO = 50
export const BONO_RESENIA = 25
export const BONO_CADENA = 50
export const REFERENCIA_LIBRO_NUEVO = 500
export const VALORACION_NEUTRA = 4

export function backendErrorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : "Error de conexión con el servidor"
}
