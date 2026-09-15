"use client"

import { useState } from "react"
import { BookOpen, LogIn, Users, Loader2, AlertCircle } from "lucide-react"
import { useStore } from "./store"
import { Field } from "./field"
import type { User } from "@/lib/mercado-types"

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginScreen() {
  const { login, users, setScreen, showToast, signInWithBackend, signInWithSupabase } = useStore()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    const next: typeof errors = {}
    if (!identifier.trim()) {
      next.identifier = "Ingresá tu email o usuario"
    }
    if (!password) {
      next.password = "Ingresá tu contraseña"
    } else if (password.length < 4) {
      next.password = "La contraseña es demasiado corta"
    }

    setErrors(next)
    if (Object.keys(next).length > 0) return

    // Si es un usuario demo local con pass demo, permitir acceso rápido
    const demoUser = users.find(
      (u) =>
        u.email.toLowerCase() === identifier.toLowerCase() ||
        u.username.toLowerCase() === identifier.toLowerCase()
    )
    if (demoUser && password === "demo") {
      login(demoUser)
      return
    }

    setLoading(true)
    try {
      // 1. Intentar autenticación con Spring Boot backend (POST /api/auth/login)
      const res = await signInWithBackend(identifier.trim(), password)
      if (res.success) {
        return
      }

      // Si falló en backend, intentar fallback de Supabase si estuviera configurado
      if (res.error?.includes("Failed to fetch") || res.error?.includes("NetworkError")) {
        let targetEmail = identifier.trim()
        if (!targetEmail.includes("@") && demoUser) {
          targetEmail = demoUser.email
        }
        const sbRes = await signInWithSupabase(targetEmail, password)
        if (sbRes.success) {
          return
        }
      }

      setServerError(res.error || "No se pudo iniciar sesión. Verificá tus credenciales.")
    } catch {
      setServerError("Ocurrió un error inesperado al conectar con el servidor.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-2 flex items-center gap-2 text-amber-800">
            <BookOpen className="h-7 w-7" />
            <span className="font-serif text-2xl font-bold tracking-tight">MercadoLibro</span>
          </span>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            Iniciar Sesión
          </h1>
          <p className="mt-1.5 text-sm md:text-base md:text-lg text-stone-600">
            Accedé a tu perfil e intercambiá libros en la comunidad.
          </p>
        </div>

        {/* Quick Demo Login selector */}
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-1.5 text-sm md:text-base font-bold uppercase tracking-wider text-amber-900 mb-2.5">
            <Users className="h-4 w-4" />
            <span>Ingreso rápido con cuentas Demo:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => login(u)}
                className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white p-2.5 text-left hover:bg-amber-100/70 transition-colors shadow-xs"
              >
                <img src={u.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                <div className="truncate">
                  <p className="text-sm md:text-base md:text-lg font-bold text-stone-900 truncate">{u.name.split(" ")[0]}</p>
                  <p className="text-sm md:text-base font-semibold text-amber-900">{u.availablePoints} pts</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {serverError && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm md:text-base font-medium text-rose-800 animate-in fade-in">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <p>{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Field
            id="login-identifier"
            label="Email o nombre de usuario"
            placeholder="franco@mercadolibro.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={errors.identifier}
          />
          <Field
            id="login-password"
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-amber-800 px-5 py-3 text-base md:text-lg font-bold text-stone-50 transition-colors hover:bg-amber-900 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <LogIn className="h-4.5 w-4.5" />
                <span>Ingresar a la plataforma</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm md:text-base md:text-lg text-stone-600">
          ¿No tenés cuenta todavía?{" "}
          <button
            type="button"
            onClick={() => setScreen("registro")}
            className="font-bold text-amber-800 underline-offset-2 hover:underline"
          >
            Registrate acá
          </button>
        </p>
      </div>
    </div>
  )
}
