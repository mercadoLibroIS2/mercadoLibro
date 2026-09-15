import { apiClient, setAuthToken } from "./client"
import type { AuthResponseDTO, LoginRequestDTO, UsuarioRequestDTO } from "./types"

export const authService = {
  /**
   * Inicia sesión contra el backend de Spring Boot (POST /api/auth/login)
   */
  async login(credentials: LoginRequestDTO): Promise<AuthResponseDTO> {
    const data = await apiClient<AuthResponseDTO>("/auth/login", {
      method: "POST",
      body: credentials,
    })
    if (data.token) {
      setAuthToken(data.token)
    }
    return data
  },

  /**
   * Registra un nuevo usuario en Spring Boot (POST /api/auth/registro)
   */
  async registrar(userData: UsuarioRequestDTO): Promise<AuthResponseDTO> {
    const data = await apiClient<AuthResponseDTO>("/auth/registro", {
      method: "POST",
      body: userData,
    })
    if (data.token) {
      setAuthToken(data.token)
    }
    return data
  },

  /**
   * Cierra sesión invalidando el token en el backend (POST /api/auth/logout)
   */
  async logout(): Promise<void> {
    try {
      await apiClient<void>("/auth/logout", {
        method: "POST",
        requiresAuth: true,
      })
    } catch {
      // Ignorar errores de logout si el token ya expiró
    } finally {
      setAuthToken(null)
    }
  },

  /**
   * Refresca el token JWT actual (POST /api/auth/refrescar)
   */
  async refrescar(): Promise<AuthResponseDTO> {
    const data = await apiClient<AuthResponseDTO>("/auth/refrescar", {
      method: "POST",
      requiresAuth: true,
    })
    if (data.token) {
      setAuthToken(data.token)
    }
    return data
  },
}
