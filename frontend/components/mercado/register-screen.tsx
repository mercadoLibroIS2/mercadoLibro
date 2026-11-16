"use client"

import { useState } from "react"
import { BookOpen, Gift, UserPlus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useStore } from "./store"
import { Field } from "./field"

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FormState {
  name: string
  username: string
  email: string
  password: string
  confirm: string
}

const EMPTY: FormState = { name: "", username: "", email: "", password: "", confirm: "" }

export function RegisterScreen() {
  const { setScreen, signUpWithSupabase } = useStore()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
    if (serverError) setServerError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    setInfoMessage(null)

    const next: Partial<FormState> = {}
    if (!form.name.trim()) next.name = "Ingresá tu nombre completo"
    else if (form.name.trim().length < 3) next.name = "El nombre debe tener al menos 3 caracteres"
    if (!form.username.trim()) next.username = "Elegí un nombre de usuario"
    else if (form.username.includes(" ")) next.username = "El usuario no puede tener espacios"
    if (!form.email.trim()) next.email = "Ingresá tu email"
    else if (!emailRe.test(form.email)) next.email = "El email no tiene un formato válido"
    if (!form.password) next.password = "Creá una contraseña"
    else if (form.password.length < 8) next.password = "Mínimo 8 caracteres"
    if (!form.confirm) next.confirm = "Repetí la contraseña"
    else if (form.confirm !== form.password) next.confirm = "Las contraseñas no coinciden"

    setErrors(next)
    if (Object.keys(next).length > 0) return

    setLoading(true)
    try {
      const res = await signUpWithSupabase(
        form.name.trim(),
        form.username.trim().toLowerCase(),
        form.email.trim(),
        form.password
      )

      if (!res.success) {
        setServerError(res.error || "No se pudo registrar la cuenta.")
      } else if (res.requiresEmailConfirmation) {
        setInfoMessage(
          "¡Cuenta creada! Enviamos un correo de confirmación a " +
            form.email +
            ". Por favor, revisá tu casilla antes de iniciar sesión."
        )
      }
    } catch {
      setServerError("Error de conexión al registrar. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgba(28,25,23,0.05)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-800 text-stone-50 shadow-sm shadow-amber-900/20">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </div>
          <span className="font-serif text-lg font-bold tracking-tight text-amber-900">
            MercadoLibro
          </span>
          <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Creá tu cuenta
          </h1>
          <p className="mt-1.5 text-sm sm:text-[15px] leading-relaxed text-stone-600">
            Unite a la comunidad de intercambio de libros sin dinero.
          </p>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5">
          <Gift className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
            <strong className="font-semibold">¡100 puntos virtuales de regalo!</strong> Al registrarte recibirás automáticamente 100 puntos en tu billetera (RF14) para tu primer intercambio.
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

        {infoMessage && (
          <div
            role="status"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-sm font-medium text-emerald-800 animate-in fade-in duration-150"
          >
            <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600" aria-hidden="true" />
            <p className="leading-snug">{infoMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Field
            id="reg-name"
            label="Nombre completo"
            placeholder="Ana García"
            autoComplete="name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
          />
          <Field
            id="reg-username"
            label="Nombre de usuario"
            placeholder="anagarcia"
            autoComplete="username"
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            error={errors.username}
          />
          <Field
            id="reg-email"
            label="Email"
            type="email"
            placeholder="ana@ejemplo.com"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            error={errors.email}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="reg-password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              error={errors.password}
            />
            <Field
              id="reg-confirm"
              label="Confirmar contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              error={errors.confirm}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-800 px-4 text-sm sm:text-[15px] font-semibold text-stone-50 shadow-sm shadow-amber-900/15 transition-all duration-150 ease-out hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
                <span>Creando cuenta...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4.5 w-4.5" aria-hidden="true" />
                <span>Crear cuenta y recibir 100 pts</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-6 border-t border-stone-100 pt-5 text-center text-sm text-stone-600">
          ¿Ya tenés cuenta?{" "}
          <button
            type="button"
            onClick={() => setScreen("login")}
            className="font-semibold text-amber-800 underline-offset-4 transition-colors hover:text-amber-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 rounded-sm px-1"
          >
            Iniciá sesión
          </button>
        </p>
      </div>
    </div>
  )
}
