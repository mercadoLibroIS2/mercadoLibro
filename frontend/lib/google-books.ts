import type { GoogleBookVolume } from "./mercado-types"

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8086"

export async function findGoogleBookByIsbn(isbn: string): Promise<GoogleBookVolume | null> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "")
  if (!cleanIsbn) return null

  const response = await fetch(
    `${backendUrl}/api/libro/google-books/isbn/${encodeURIComponent(cleanIsbn)}`,
  )
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Google Books respondió con HTTP ${response.status}.`)
  }
  return response.json() as Promise<GoogleBookVolume>
}
