import type { GoogleBookVolume } from "./mercado-types"
import { apiFindGoogleBookByIsbn } from "./api"

export async function findGoogleBookByIsbn(isbn: string): Promise<GoogleBookVolume | null> {
  return apiFindGoogleBookByIsbn(isbn)
}
