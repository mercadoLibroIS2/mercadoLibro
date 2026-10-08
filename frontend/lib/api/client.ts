// ==============================================================================
// MERCADOLIBRO - CLIENTE HTTP BASE PARA SPRING BOOT API
// ==============================================================================

const TOKEN_KEY = "mercadolibro_jwt_token"

export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // Si estamos en el navegador y hay variable de entorno, usarla
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
  }
  return process.env.BACKEND_INTERNAL_URL || "http://localhost:8080"
}

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null
  const directToken = localStorage.getItem(TOKEN_KEY)
  if (directToken) return directToken

  // Fallback: detectar token de la sesión de Supabase almacenado en localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith("sb-") || key.includes("supabase")) && key.endsWith("-auth-token")) {
        const item = localStorage.getItem(key)
        if (item) {
          const parsed = JSON.parse(item)
          if (parsed.access_token) {
            return parsed.access_token
          }
          if (parsed.currentSession?.access_token) {
            return parsed.currentSession.access_token
          }
        }
      }
    }
  } catch {
    // ignorar
  }

  return null
}

export const setAuthToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

export const removeAuthToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export interface ApiErrorResponse {
  status?: number
  message?: string
  error?: string
  errors?: Record<string, string>
  timestamp?: string
}

export class ApiError extends Error {
  status: number
  details?: ApiErrorResponse

  constructor(status: number, message: string, details?: ApiErrorResponse) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl().replace(/\/$/, "")
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  const url = `${baseUrl}${cleanEndpoint}`

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  }

  const token = getAuthToken()
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  const contentType = response.headers.get("content-type")
  const isJson = contentType && contentType.includes("application/json")

  if (!response.ok) {
    let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`
    let details: ApiErrorResponse | undefined

    if (isJson) {
      try {
        details = (await response.json()) as ApiErrorResponse
        errorMessage = details.message || details.error || errorMessage
      } catch {
        // Fallback a texto plano
      }
    } else {
      try {
        const text = await response.text()
        if (text) errorMessage = text
      } catch {
        // Ignorar
      }
    }

    throw new ApiError(response.status, errorMessage, details)
  }

  if (isJson) {
    return (await response.json()) as T
  }

  return (await response.text()) as unknown as T
}
