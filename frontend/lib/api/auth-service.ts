// ==============================================================================
// MERCADOLIBRO - SERVICIO DE AUTENTICACIÓN (SPRING BOOT JWT)
// ==============================================================================

import {
  apiFetch,
  setAuthToken,
  removeAuthToken,
  getAuthToken,
} from "./client"
import type {
  AuthResponseDTO,
  LoginRequestDTO,
  UsuarioRequestDTO,
  Usuario,
} from "../mercado-types"

const USER_SESSION_KEY = "mercadolibro_user_session"

export const authService = {
  /**
   * Inicia sesión con nombre de usuario o email y contraseña contra Spring Boot
   */
  async login(credenciales: LoginRequestDTO): Promise<{ token: string; usuario: Usuario }> {
    const response = await apiFetch<AuthResponseDTO>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credenciales),
    })

    setAuthToken(response.token)

    const usuario: Usuario = {
      id: response.id,
      nombre: response.nombre,
      email: response.email,
      saldoTotal: response.saldoTotal ?? 100,
      saldoReservado: 0,
      reputacionPromedio: 5.0,
      rol: (response.rol as Usuario["rol"]) || "USUARIO",
      esActivo: true,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(response.nombre || response.email)}`,
      name: response.nombre,
      username: response.nombre,
      availablePoints: response.saldoTotal ?? 100,
      reservedPoints: 0,
      rating: 5.0,
      totalTrades: 0,
      totalReviews: 0,
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(usuario))
    }

    return { token: response.token, usuario }
  },

  /**
   * Registra un nuevo usuario en la base de datos a través de Spring Boot
   */
  async registrar(datos: UsuarioRequestDTO): Promise<{ token: string; usuario: Usuario }> {
    const response = await apiFetch<AuthResponseDTO>("/api/auth/registro", {
      method: "POST",
      body: JSON.stringify(datos),
    })

    setAuthToken(response.token)

    const usuario: Usuario = {
      id: response.id,
      nombre: response.nombre,
      email: response.email,
      saldoTotal: response.saldoTotal ?? 100,
      saldoReservado: 0,
      reputacionPromedio: 5.0,
      rol: (response.rol as Usuario["rol"]) || "USUARIO",
      esActivo: true,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(response.nombre || response.email)}`,
      name: response.nombre,
      username: response.nombre,
      availablePoints: response.saldoTotal ?? 100,
      reservedPoints: 0,
      rating: 5.0,
      totalTrades: 0,
      totalReviews: 0,
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(usuario))
    }

    return { token: response.token, usuario }
  },

  /**
   * Cierra sesión en el servidor y limpia el almacenamiento local
   */
  async logout(): Promise<void> {
    const token = getAuthToken()
    if (token) {
      try {
        await apiFetch<void>("/api/auth/logout", {
          method: "POST",
        })
      } catch {
        // Ignorar error al cerrar sesión
      }
    }
    removeAuthToken()
    if (typeof window !== "undefined") {
      localStorage.removeItem(USER_SESSION_KEY)
    }
  },

  /**
   * Obtiene la sesión guardada en localStorage si existe
   */
  obtenerSesionGuardada(): Usuario | null {
    if (typeof window === "undefined") return null
    const token = getAuthToken()
    if (!token) return null
    try {
      const data = localStorage.getItem(USER_SESSION_KEY)
      return data ? (JSON.parse(data) as Usuario) : null
    } catch {
      return null
    }
  },

  guardarUsuarioLocal(usuario: Usuario): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(usuario))
    }
  },
}
