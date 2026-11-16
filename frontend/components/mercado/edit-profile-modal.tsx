"use client"

import { useEffect, useState, type FormEvent } from "react"
import { X } from "lucide-react"
import { useStore } from "./store"
import { Field } from "./field"

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { currentUser, updateProfile } = useStore()
  const [name, setName] = useState(currentUser?.name ?? "")
  const [email, setEmail] = useState(currentUser?.email ?? "")
  const [bio, setBio] = useState(currentUser?.bio ?? "")
  const [city, setCity] = useState(currentUser?.city ?? "")
  const [avatar, setAvatar] = useState(currentUser?.avatar ?? "")
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!name.trim()) next.name = "El nombre no puede estar vacío"
    if (!email.trim()) next.email = "El email no puede estar vacío"
    else if (!emailRe.test(email)) next.email = "El email no tiene un formato válido"
    setErrors(next)
    if (Object.keys(next).length > 0) return

    updateProfile({
      name: name.trim(),
      email: email.trim(),
      bio: bio.trim(),
      city: city.trim(),
      avatar: avatar.trim(),
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl border border-stone-200/90 bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 sm:rounded-3xl sm:p-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pb-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-stone-300" aria-hidden="true" />
        </div>

        <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3.5">
          <h2
            id="edit-profile-title"
            className="font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-900"
          >
            Editar Perfil
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de edición de perfil"
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            <X className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5 overflow-y-auto">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field
              id="edit-name"
              label="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />
            <Field
              id="edit-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
          </div>

          <Field
            id="edit-city"
            label="Ciudad / Ubicación"
            placeholder="Ej. Buenos Aires, Argentina"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-bio"
              className="text-sm font-semibold tracking-tight text-stone-800"
            >
              Biografía / Presentación
            </label>
            <textarea
              id="edit-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Contá qué géneros te gusta leer o por qué zonas coordinás trueques..."
              className="w-full resize-none rounded-xl border border-stone-200/90 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-900 outline-none transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-700 focus:ring-3 focus:ring-amber-700/15"
            />
          </div>

          <Field
            id="edit-avatar"
            label="URL de foto de perfil (Avatar)"
            type="url"
            placeholder="https://..."
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
          />

          <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-stone-200/90 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-900 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
