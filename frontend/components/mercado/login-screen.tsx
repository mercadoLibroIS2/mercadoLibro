"use client"

import { useState } from "react"
import { BookOpen, LogIn, Loader2, AlertCircle } from "lucide-react"
import { useStore } from "./store"
import { Field } from "./field"

export function LoginScreen() {
  const { login, users, setScreen, signInWithSupabase } = useStore()
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
    } else if (password.length < 8 && password !== "demo") {
      next.password = "La contraseña debe tener al menos 8 caracteres"
    }

    setErrors(next)
    if (Object.keys(next).length > 0) return

    const demoUser = users.find(
      (u) =>
        u.email.toLowerCase() === identifier.toLowerCase() ||
        u.username.toLowerCase() === identifier.toLowerCase()
    )

    let targetEmail = identifier.trim()
    if (!targetEmail.includes("@") && demoUser) {
      targetEmail = demoUser.email
    }

    setLoading(true)
    try {
      const res = await signInWithSupabase(targetEmail, password)
      if (!res.success) {
        if (demoUser) {
          login(demoUser)
          return
        }
        setServerError(res.error || "No se pudo iniciar sesión. Verificá tus credenciales.")
      }
    } catch (err: unknown) {
      if (demoUser) {
        login(demoUser)
        return
      }
      const message =
        err instanceof Error ? err.message : "Ocurrió un error inesperado al conectar con el servidor."
      setServerError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgba(28,25,23,0.05)]">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-800 text-stone-50 shadow-sm shadow-amber-900/20">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </div>
          <span className="font-serif text-lg font-bold tracking-tight text-amber-900">
            MercadoLibro
          </span>
          <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Iniciar Sesión
          </h1>
          <p className="mt-1.5 text-sm sm:text-[15px] leading-relaxed text-stone-600">
            Accedé a tu perfil e intercambiá libros en la comunidad.
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-sm font-medium text-rose-800 animate-in fade-in duration-150"
          >
            <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-rose-600" aria-hidden="true" />
            <p className="leading-snug">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Field
            id="login-identifier"
            label="Email o nombre de usuario"
            placeholder="lucia@mercadolibro.demo"
            autoComplete="username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value)
              if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: undefined }))
              if (serverError) setServerError(null)
            }}
            error={errors.identifier}
          />
          <Field
            id="login-password"
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
              if (serverError) setServerError(null)
            }}
            error={errors.password}
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-800 px-5 text-sm sm:text-[15px] font-semibold text-stone-50 shadow-sm shadow-amber-900/15 transition-all duration-150 ease-out hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <LogIn className="h-4.5 w-4.5" aria-hidden="true" />
                <span>Ingresar a la plataforma</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-6 border-t border-stone-100 pt-5 text-center text-sm text-stone-600">
          ¿No tenés cuenta todavía?{" "}
          <button
            type="button"
            onClick={() => setScreen("registro")}
            className="font-semibold text-amber-800 underline-offset-4 transition-colors hover:text-amber-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 rounded-sm px-1"
          >
            Registrate acá
          </button>
        </p>
      </div>
    </div>
  )
}
