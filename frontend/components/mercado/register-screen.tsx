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
  const { register, setScreen, signUpWithSupabase } = useStore()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    setInfoMessage(null)

    const next: Partial<FormState> = {}
    if (!form.name.trim()) next.name = "Ingresá tu nombre completo"
    if (!form.username.trim()) next.username = "Elegí un nombre de usuario"
    else if (form.username.includes(" ")) next.username = "El usuario no puede tener espacios"
    if (!form.email.trim()) next.email = "Ingresá tu email"
    else if (!emailRe.test(form.email)) next.email = "El email no tiene un formato válido"
    if (!form.password) next.password = "Creá una contraseña"
    else if (form.password.length < 6) next.password = "Mínimo 6 caracteres"
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
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="mb-5 flex flex-col items-center text-center">
          <span className="mb-2 flex items-center gap-2 text-amber-800">
            <BookOpen className="h-6 w-6" />
            <span className="font-serif text-xl font-bold tracking-tight">MercadoLibro</span>
          </span>
          <h1 className="mt-1 font-serif text-2xl font-bold text-stone-900">
            Creá tu cuenta
          </h1>
          <p className="mt-1 text-sm md:text-base text-stone-500">
            Unite a la comunidad de intercambio de libros sin dinero.
          </p>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Gift className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <p className="text-sm md:text-base text-amber-900 leading-relaxed">
            <strong className="font-bold">¡100 puntos virtuales de regalo!</strong> Al registrarte recibirás automáticamente 100 puntos en tu billetera (RF14) para tu primer intercambio.
          </p>
        </div>

        {serverError && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm md:text-base font-medium text-rose-800 animate-in fade-in">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <p>{serverError}</p>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm md:text-base font-medium text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p>{infoMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Field
            id="reg-name"
            label="Nombre completo"
            placeholder="Ana García"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
          />
          <Field
            id="reg-username"
            label="Nombre de usuario"
            placeholder="anagarcia"
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            error={errors.username}
          />
          <Field
            id="reg-email"
            label="Email"
            type="email"
            placeholder="ana@ejemplo.com"
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
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              error={errors.password}
            />
            <Field
              id="reg-confirm"
              label="Confirmar contraseña"
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              error={errors.confirm}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-amber-800 px-4 py-2.5 text-sm md:text-base font-bold text-stone-50 transition-colors hover:bg-amber-900 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creando cuenta...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Crear cuenta y recibir 100 pts</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm md:text-base text-stone-600">
          ¿Ya tenés cuenta?{" "}
          <button
            type="button"
            onClick={() => setScreen("login")}
            className="font-bold text-amber-800 underline-offset-2 hover:underline"
          >
            Iniciá sesión
          </button>
        </p>
      </div>
    </div>
  )
}
