"use client"

import { useState } from "react"
import {
  BookPlus,
  Coins,
  ArrowLeft,
  Loader2,
  Search,
} from "lucide-react"
import { useStore } from "./store"
import { Field } from "./field"
import {
  CONDITIONS,
  type Condition,
} from "@/lib/mercado-types"
import { evaluatePriceDeal } from "@/lib/price-evaluator"
import { findGoogleBookByIsbn } from "@/lib/google-books"
import type { GoogleBookVolume } from "@/lib/mercado-types"

interface FormState {
  isbn: string
  condition: Condition
  points: string
  description: string
}

const EMPTY_FORM: FormState = {
  isbn: "",
  condition: "Muy bueno",
  points: "",
  description: "",
}

export function PublishForm() {
  const {
    books,
    currentUser,
    editingBookId,
    publishBook,
    updateBook,
    setEditingBookId,
    setScreen,
  } = useStore()
  const editingBook = books.find((book) => book.id === editingBookId)
  const [form, setForm] = useState<FormState>(() => editingBook ? {
    isbn: editingBook.isbn || "",
    condition: editingBook.condition,
    points: String(editingBook.points),
    description: editingBook.description || "",
  } : EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)
  const [googleBook, setGoogleBook] = useState<GoogleBookVolume | null>(null)
  const [searchingGoogleBooks, setSearchingGoogleBooks] = useState(false)
  const [googleBooksError, setGoogleBooksError] = useState("")

  if (!currentUser) {
    return null
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleGoogleBooksSearch() {
    setGoogleBooksError("")
    setGoogleBook(null)
    if (!form.isbn.trim()) {
      setGoogleBooksError("Ingresá un ISBN para consultar Google Books.")
      return
    }

    setSearchingGoogleBooks(true)
    try {
      const result = await findGoogleBookByIsbn(form.isbn)
      if (!result) {
        setGoogleBooksError("No se encontró ese ISBN en Google Books.")
        return
      }
      setGoogleBook(result)
    } catch (error) {
      setGoogleBooksError(error instanceof Error ? error.message : "No se pudo consultar Google Books.")
    } finally {
      setSearchingGoogleBooks(false)
    }
  }

  const pointsNum = Number(form.points)
  const hasPoints = form.points !== "" && Number.isInteger(pointsNum) && pointsNum > 0
  const evaluation = hasPoints
    ? evaluatePriceDeal(pointsNum, editingBook?.category || "Ficción", form.condition, 4.5)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.isbn.trim()) next.isbn = "El ISBN es obligatorio"
    if (!form.points.trim()) next.points = "Ingresá el valor en puntos"
    else if (!Number.isInteger(pointsNum) || pointsNum <= 0)
      next.points = "Ingresá un número de puntos válido mayor a 0"

    setErrors(next)
    if (Object.keys(next).length > 0) return

    const publicationData = {
      isbn: form.isbn.trim(),
      condition: form.condition,
      points: pointsNum,
      description: form.description.trim() || undefined,
      googleBook: googleBook || undefined,
    }

    setSaving(true)
    try {
      const succeeded = editingBook
        ? await updateBook(editingBook.id, publicationData)
        : await publishBook(publicationData)
      if (succeeded) {
        setEditingBookId(null)
        setScreen("inicio")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditingBookId(null)
              setScreen("inicio")
            }}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-serif text-xl sm:text-3xl font-bold text-stone-900">
              {editingBook ? "Modificar Publicación" : "Publicar un Libro"}
            </h1>
            <p className="text-sm md:text-base text-stone-500">
              Completá los datos del ejemplar para el catálogo.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-4 sm:p-8 shadow-xs"
      >
        <div>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field
                id="pub-isbn"
                label="ISBN del libro *"
                placeholder="Ej. 978-84-204-7183-9"
                value={form.isbn}
                onChange={(e) => set("isbn", e.target.value)}
                readOnly={Boolean(editingBook)}
                error={errors.isbn}
              />
            </div>
            {!editingBook && (
              <button
                type="button"
                onClick={handleGoogleBooksSearch}
                disabled={searchingGoogleBooks}
                className="mb-0.5 inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-purple-700 px-3 text-sm font-bold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {searchingGoogleBooks ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {searchingGoogleBooks ? "Buscando..." : "Buscar"}
              </button>
            )}
          </div>
          {googleBooksError && <p className="mt-1 text-sm font-semibold text-red-600">{googleBooksError}</p>}
          {googleBook && (
            <div className="mt-3 flex gap-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
              {googleBook.portadaUrl && (
                <img src={googleBook.portadaUrl} alt="" className="h-20 w-14 rounded object-cover" />
              )}
              <div className="min-w-0 text-sm text-stone-700">
                <p className="font-bold text-stone-900">{googleBook.titulo}</p>
                <p>{googleBook.autor || "Autor no disponible"}</p>
                {googleBook.editorial && <p className="text-stone-500">{googleBook.editorial}</p>}
                <p className="mt-1 text-xs text-purple-800">Los datos se guardarán junto con la publicación.</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Condition */}
          <div>
            <label htmlFor="pub-condition" className="block text-base md:text-lg font-bold text-stone-800 mb-1.5">
              Estado físico *
            </label>
            <select
              id="pub-condition"
              value={form.condition}
              onChange={(e) => set("condition", e.target.value as Condition)}
              className="w-full rounded-xl border border-stone-200 bg-white p-3 text-base md:text-lg text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Points and Live Semáforo */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
            <div className="flex-1">
              <label htmlFor="pub-points" className="block text-base md:text-lg font-bold text-amber-950 mb-1.5">
                Puntos solicitados *
              </label>
              <div className="relative">
                <Coins className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-700" />
                <input
                  id="pub-points"
                  type="number"
                  min={1}
                  placeholder="Ej. 50"
                  value={form.points}
                  onChange={(e) => set("points", e.target.value)}
                  className="w-full rounded-xl border border-amber-300 bg-white py-2.5 pl-11 pr-4 text-base font-bold text-stone-900 outline-none focus:border-amber-700"
                />
              </div>
              {errors.points && (
                <p className="mt-1 text-sm md:text-base md:text-lg font-semibold text-red-600">{errors.points}</p>
              )}
            </div>

            {/* Semáforo preview badge */}
            {evaluation && (
              <div className="sm:text-right">
                <span className="text-sm md:text-base font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Evaluación de Precio
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm md:text-base md:text-lg font-bold ${
                    evaluation.deal === "green"
                      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                      : evaluation.deal === "yellow"
                      ? "border-amber-300 bg-amber-100 text-amber-900"
                      : "border-rose-300 bg-rose-100 text-rose-800"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      evaluation.deal === "green"
                        ? "bg-emerald-600"
                        : evaluation.deal === "yellow"
                        ? "bg-amber-600"
                        : "bg-rose-600"
                    }`}
                  />
                  {evaluation.label}
                </span>
              </div>
            )}
          </div>

          {evaluation ? (
            <p className="text-sm md:text-base md:text-lg text-stone-600 italic">
              {evaluation.hint} (estimación local: <strong>{evaluation.referencePrice} pts</strong>).
            </p>
          ) : (
            <p className="text-sm md:text-base md:text-lg text-stone-500">
              El semáforo evaluará automáticamente si el valor es conveniente o justo.
            </p>
          )}
        </div>

        {/* Description & Cover */}
        <div>
          <label htmlFor="pub-desc" className="block text-base md:text-lg font-bold text-stone-800 mb-1.5">
            Descripción y estado (opcional)
          </label>
          <textarea
            id="pub-desc"
            rows={2}
            maxLength={255}
            placeholder="Detalles sobre marcas, notas especiales o estado de la encuadernación..."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white p-3 text-base md:text-lg text-stone-900 outline-none focus:border-amber-700"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
          <button
            type="button"
            onClick={() => {
              setEditingBookId(null)
              setScreen("inicio")
            }}
            className="rounded-xl border border-stone-200 px-4 py-2.5 text-base md:text-lg font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-amber-800 px-5 py-2.5 text-base md:text-lg font-bold text-white shadow-xs hover:bg-amber-900 transition-all active:scale-95"
          >
            <BookPlus className="h-4.5 w-4.5" />
            {saving ? "Guardando..." : editingBook ? "Guardar cambios" : "Publicar Libro"}
          </button>
        </div>
      </form>
    </div>
  )
}
