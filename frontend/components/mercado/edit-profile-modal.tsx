"use client"

import { useState } from "react"
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

  function handleSubmit(e: React.FormEvent) {
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
      avatar: avatar.trim() || currentUser?.avatar,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 p-0 sm:p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white p-4 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="flex justify-center pb-2 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-stone-300" />
        </div>

        <div className="mb-3 flex items-center justify-between border-b border-stone-100 pb-3">
          <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
            Editar Perfil
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div>
            <label className="block text-sm md:text-base font-bold text-stone-700 mb-1">
              Biografía / Presentación
            </label>
            <textarea
              rows={2}
              placeholder="Contale a la comunidad tus gustos literarios..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-sm md:text-base outline-none focus:border-amber-700 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm md:text-base font-bold text-stone-700 mb-1">
              URL de foto de perfil (Avatar)
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2 text-sm md:text-base outline-none focus:border-amber-700 focus:bg-white"
            />
          </div>

          <div className="mt-2 flex justify-end gap-2 border-t border-stone-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm md:text-base font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-800 px-4 py-2 text-sm md:text-base font-bold text-white hover:bg-amber-900 shadow-xs transition-all active:scale-95"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
