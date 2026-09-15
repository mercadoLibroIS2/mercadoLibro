const TOKEN_STORAGE_KEY = "mercadolibro_jwt_token"

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

// Obtener la URL base: Si está configurado NEXT_PUBLIC_API_URL usarla, de lo contrario usar el proxy /api/backend
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")
  }
  return "/api/backend"
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown
  requiresAuth?: boolean
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, requiresAuth = false, headers = {}, ...rest } = options

  const baseUrl = getBaseUrl()
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  const url = `${baseUrl}${cleanEndpoint}`

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(headers as Record<string, string>),
  }

  if (requiresAuth || getAuthToken()) {
    const token = getAuthToken()
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`
    }
  }

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Manejo de respuestas sin contenido (204 No Content o status OK vacío)
  if (response.status === 204) {
    return {} as T
  }

  const contentType = response.headers.get("content-type")
  const isJson = contentType && contentType.includes("application/json")
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    let errorMessage = `Error HTTP ${response.status}`
    if (typeof data === "object" && data !== null) {
      const err = data as Record<string, unknown>
      errorMessage =
        (err.message as string) ||
        (err.error as string) ||
        (err.errors ? Object.values(err.errors).join(", ") : errorMessage)
    } else if (typeof data === "string" && data.trim()) {
      errorMessage = data
    }
    throw new ApiError(errorMessage, response.status, data)
  }

  return data as T
}
