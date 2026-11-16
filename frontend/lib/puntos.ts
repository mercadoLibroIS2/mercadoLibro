// Valores que acredita el backend (ver IntercambioServiceImpl y ReseniaServiceImpl).
// Si cambian allá, actualizarlos acá para que la interfaz no prometa otra cosa.
export const BONO_INTERCAMBIO_DIRECTO = 100
export const BONO_RESENIA = 50

export function backendErrorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : "Error de conexión con el servidor"
}
