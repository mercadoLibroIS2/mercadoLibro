"use client"

import { useEffect, useState } from "react"
import { BookOpen, Pencil, Trash2 } from "lucide-react"
import {
  deletePublication,
  editPublication,
  listMyPublications,
  type BookCondition,
  type Publication,
  type PublicationChanges,
} from "@/lib/publications"

const CONDITIONS: { value: BookCondition; label: string }[] = [
  { value: "NUEVO", label: "Nuevo" },
  { value: "COMO_NUEVO", label: "Como nuevo" },
  { value: "BUENO", label: "Bueno" },
  { value: "ACEPTABLE", label: "Aceptable" },
  { value: "MALO", label: "Malo" },
]

function publicationKey(publication: Publication) {
  return `${publication.isbn}:${publication.email_propietario_id}:${publication.hora_de_publicacion}`
}

export function MyPublications({
  onCountChange,
}: {
  onCountChange: (count: number) => void
}) {
  const [publications, setPublications] = useState<Publication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Publication | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    listMyPublications()
      .then((results) => {
        if (!active) return
        setPublications(results)
        onCountChange(results.length)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las publicaciones.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [onCountChange])

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return

    const formData = new FormData(event.currentTarget)
    const points = Number(formData.get("points"))
    if (!Number.isSafeInteger(points) || points < 0) {
      setError("Ingresá un valor de puntos válido, igual o mayor a cero.")
      return
    }

    const changes: PublicationChanges = {
      estado_fisico: formData.get("condition") as BookCondition,
      valor_puntos_solicitado: points,
      comentario: String(formData.get("comment") || "").trim() || null,
    }

    setSaving(true)
    setError(null)
    try {
      await editPublication(editing, changes)
      setPublications((current) =>
        current.map((publication) =>
          publicationKey(publication) === publicationKey(editing)
            ? { ...publication, ...changes }
            : publication
        )
      )
      setEditing(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo editar la publicación.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(publication: Publication) {
    const title = publication.book?.titulo || publication.isbn
    if (!window.confirm(`¿Eliminar la publicación de "${title}"?`)) return

    setError(null)
    try {
      await deletePublication(publication)
      setPublications((current) =>
        current.filter((item) => publicationKey(item) !== publicationKey(publication))
      )
      onCountChange(publications.length - 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar la publicación.")
    }
  }

  if (loading) {
    return <p className="rounded-2xl bg-white p-6 text-center text-stone-600">Cargando publicaciones…</p>
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      {editing && (
        <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-amber-200 bg-white p-4 shadow-xs">
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900">Editar publicación</h3>
            <p className="text-sm text-stone-600">{editing.book?.titulo || editing.isbn}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-stone-700">
              Estado físico
              <select
                name="condition"
                defaultValue={editing.estado_fisico}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-3 text-base"
              >
                {CONDITIONS.map((condition) => (
                  <option key={condition.value} value={condition.value}>{condition.label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-stone-700">
              Puntos solicitados
              <input
                name="points"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={editing.valor_puntos_solicitado}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-3 text-base"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold text-stone-700">
            Comentario (opcional)
            <textarea
              name="comment"
              maxLength={500}
              rows={3}
              defaultValue={editing.comentario || ""}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-3 text-base"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2 font-semibold">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-amber-800 px-4 py-2 font-bold text-white disabled:opacity-60">
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}

      {publications.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <BookOpen className="mb-2 h-8 w-8 text-stone-300" />
          <p className="font-serif font-bold text-stone-800">Sin publicaciones activas</p>
          <p className="mt-1 text-sm text-stone-500">Tus publicaciones disponibles o reservadas aparecerán acá.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {publications.map((publication) => {
            const canEdit = publication.estado === "DISPONIBLE"
            const book = publication.book
            return (
              <article key={publicationKey(publication)} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
                <div className="flex h-20 items-center justify-center bg-amber-50 text-amber-800">
                  <BookOpen className="h-8 w-8" aria-hidden="true" />
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif font-bold text-stone-900">{book?.titulo || publication.isbn}</h3>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      canEdit ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                    }`}>
                      {publication.estado}
                    </span>
                  </div>
                  {book?.autores && <p className="text-sm text-stone-600">{book.autores}</p>}
                  <p className="text-sm text-stone-600">
                    {CONDITIONS.find((condition) => condition.value === publication.estado_fisico)?.label || publication.estado_fisico}
                    {" · "}
                    <strong className="text-amber-900">{publication.valor_puntos_solicitado} pts</strong>
                  </p>
                  {publication.comentario && <p className="text-sm text-stone-600">{publication.comentario}</p>}
                  {!book && <p className="text-xs text-stone-500">ISBN: {publication.isbn}</p>}
                  {canEdit && (
                    <div className="flex gap-2 border-t border-stone-100 pt-3">
                      <button
                        type="button"
                        onClick={() => setEditing(publication)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        <Pencil className="h-4 w-4" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(publication)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
