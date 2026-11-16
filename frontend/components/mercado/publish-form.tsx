"use client"

import { useState, type FormEvent } from "react"
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  BookPlus,
  CheckCircle2,
  Coins,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react"
import { useStore } from "./store"
import { Field } from "./field"
import {
  CONDITIONS,
  type Condition,
  type GoogleBookVolume,
} from "@/lib/mercado-types"
import { calculateReferencePrice, evaluatePriceDeal } from "@/lib/price-evaluator"
import { findGoogleBookByIsbn } from "@/lib/google-books"

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

const DEAL_STYLES = {
  green: {
    container: "border-emerald-200/80 bg-emerald-50/70 text-emerald-900",
    dot: "bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-800",
  },
  yellow: {
    container: "border-amber-200/80 bg-amber-50/80 text-amber-900",
    dot: "bg-amber-600",
    badge: "bg-amber-100 text-amber-800",
  },
  red: {
    container: "border-rose-200/80 bg-rose-50/70 text-rose-900",
    dot: "bg-rose-600",
    badge: "bg-rose-100 text-rose-800",
  },
} as const

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
  const [form, setForm] = useState<FormState>(() =>
    editingBook
      ? {
          isbn: editingBook.isbn || "",
          condition: editingBook.condition,
          points: String(editingBook.points),
          description: editingBook.description || "",
        }
      : EMPTY_FORM
  )
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)
  const [googleBook, setGoogleBook] = useState<GoogleBookVolume | null>(null)
  const [searchingGoogleBooks, setSearchingGoogleBooks] = useState(false)
  const [googleBooksError, setGoogleBooksError] = useState("")
  const [coverFailed, setCoverFailed] = useState(false)

  if (!currentUser) {
    return null
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  async function handleGoogleBooksSearch() {
    setGoogleBooksError("")
    setGoogleBook(null)
    setCoverFailed(false)

    const targetIsbn = form.isbn.trim()
    if (!targetIsbn) {
      setGoogleBooksError("Ingresá un código ISBN para consultar Google Books.")
      return
    }

    const clean = targetIsbn.replace(/[^0-9X]/gi, "")
    if (clean.length !== 10 && clean.length !== 13) {
      setGoogleBooksError(
        "Google Books requiere un ISBN de 10 o 13 dígitos (ej: 978-84-204-7183-9)."
      )
      return
    }

    setSearchingGoogleBooks(true)
    try {
      const result = await findGoogleBookByIsbn(clean)
      if (!result) {
        setGoogleBooksError("No se encontró ningún libro con ese ISBN en Google Books.")
        return
      }
      setGoogleBook(result)
      if (!form.points || form.points === "0") {
        const category = result.categorias?.[0] || "Ficción"
        const suggested = calculateReferencePrice(
          category,
          form.condition,
          result.ratingExterno ?? undefined
        )
        updateField("points", String(suggested))
      }
    } catch (error) {
      setGoogleBooksError(
        error instanceof Error ? error.message : "No se pudo consultar Google Books."
      )
    } finally {
      setSearchingGoogleBooks(false)
    }
  }

  const activeCategory =
    googleBook?.categorias?.[0] || editingBook?.category || "Ficción"
  const activeRating =
    googleBook?.ratingExterno ?? editingBook?.externalRating ?? 4.2
  const pointsNum = Number(form.points)
  const validPoints = !Number.isNaN(pointsNum) && pointsNum > 0
  const suggestedReference = calculateReferencePrice(
    activeCategory,
    form.condition,
    activeRating
  )
  const dealEval = validPoints
    ? evaluatePriceDeal(pointsNum, activeCategory, form.condition, activeRating)
    : null

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.isbn.trim()) {
      next.isbn = "El ISBN es obligatorio"
    }
    if (!form.points.trim()) {
      next.points = "Ingresá el valor en puntos"
    } else if (
      Number.isNaN(Number(form.points)) ||
      !Number.isInteger(Number(form.points)) ||
      Number(form.points) <= 0
    ) {
      next.points = "Ingresá un número de puntos válido mayor a 0"
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate() || saving) return

    setSaving(true)
    try {
      const payload = {
        isbn: form.isbn.trim(),
        condition: form.condition,
        points: Math.round(Number(form.points)),
        description: form.description.trim() || undefined,
        googleBook: googleBook ?? undefined,
      }

      const ok = editingBook
        ? await updateBook(editingBook.id, payload)
        : await publishBook(payload)

      if (ok) {
        setEditingBookId(null)
        setScreen("inicio")
      }
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditingBookId(null)
    setScreen("inicio")
  }

  const previewTitle = googleBook?.titulo || editingBook?.title
  const previewAuthor = googleBook?.autor || editingBook?.author
  const previewCover = googleBook?.portadaUrl || editingBook?.coverUrl
  const previewMeta = [
    googleBook?.editorial,
    googleBook?.anioPublicacion,
    googleBook?.paginas ? `${googleBook.paginas} págs.` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-8">
      <div className="flex items-start gap-3">
        {editingBook && (
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Volver al catálogo"
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200/90 bg-white text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800">
            <BookPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{editingBook ? "Edición de catálogo" : "Nueva publicación"}</span>
          </div>
          <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-stone-900 sm:text-[28px]">
            {editingBook ? "Modificar Publicación" : "Publicar un Libro"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-500">
            {editingBook
              ? "Actualizá el estado físico, los puntos solicitados o tus notas del ejemplar."
              : "Ingresá el ISBN para completar los datos automáticamente y definí un valor en puntos justo."}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-6 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(28,25,23,0.05)] sm:p-7"
      >
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field
                id="pub-isbn"
                label="ISBN del libro *"
                value={form.isbn}
                onChange={(e) => {
                  updateField("isbn", e.target.value)
                  if (googleBooksError) setGoogleBooksError("")
                }}
                readOnly={Boolean(editingBook)}
                placeholder="Ej: 978-84-204-7183-9"
                error={errors.isbn}
                autoComplete="off"
              />
            </div>
            {!editingBook && (
              <button
                type="button"
                onClick={handleGoogleBooksSearch}
                disabled={searchingGoogleBooks}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-50 px-4 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 hover:border-stone-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              >
                {searchingGoogleBooks ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-800" aria-hidden="true" />
                ) : (
                  <Search className="h-4 w-4 text-amber-800" aria-hidden="true" />
                )}
                <span>Buscar</span>
              </button>
            )}
          </div>

          {!editingBook && !errors.isbn && (
            <p className="text-xs leading-relaxed text-stone-500">
              Usá el código de 10 o 13 dígitos de la contratapa para traer título, autor y portada desde Google Books.
            </p>
          )}

          {googleBooksError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2.5 text-xs sm:text-[13px] font-medium text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{googleBooksError}</span>
            </div>
          )}

          {previewTitle && (
            <div className="flex items-center gap-3.5 rounded-xl border border-stone-200/80 bg-[#faf8f5] p-3.5">
              <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200/80 bg-stone-100">
                {previewCover && !coverFailed ? (
                  <img
                    src={previewCover}
                    alt={`Portada de ${previewTitle}`}
                    onError={() => setCoverFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <BookOpen className="h-5 w-5 text-stone-400" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{googleBook ? "Libro verificado en Google Books" : "Ejemplar en edición"}</span>
                </div>
                <p className="mt-0.5 truncate text-sm font-semibold text-stone-900">
                  {previewTitle}
                </p>
                {previewAuthor && (
                  <p className="truncate text-xs text-stone-600">{previewAuthor}</p>
                )}
                {previewMeta && (
                  <p className="mt-0.5 truncate text-[11px] text-stone-400">{previewMeta}</p>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="h-px bg-stone-100" aria-hidden="true" />

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pub-condition"
              className="text-sm font-semibold tracking-tight text-stone-800"
            >
              Estado físico *
            </label>
            <select
              id="pub-condition"
              value={form.condition}
              onChange={(e) => updateField("condition", e.target.value as Condition)}
              className="h-11 w-full rounded-xl border border-stone-200/90 bg-white px-3.5 text-sm sm:text-[15px] text-stone-900 shadow-[0_1px_2px_rgba(28,25,23,0.03)] outline-none transition-all duration-150 hover:border-stone-300 focus:border-amber-700 focus:ring-3 focus:ring-amber-700/15"
            >
              {CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
            <p className="text-xs text-stone-500">
              Sé honesto con marcas, subrayados o desgaste en el lomo.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="pub-points"
                className="text-sm font-semibold tracking-tight text-stone-800"
              >
                Puntos solicitados *
              </label>
              <button
                type="button"
                onClick={() => updateField("points", String(suggestedReference))}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              >
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                <span>Sugerido: {suggestedReference} pts</span>
              </button>
            </div>
            <div className="relative">
              <Coins
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700"
                aria-hidden="true"
              />
              <input
                id="pub-points"
                type="number"
                min={1}
                step={1}
                value={form.points}
                onChange={(e) => updateField("points", e.target.value)}
                placeholder={String(suggestedReference)}
                aria-invalid={errors.points ? true : undefined}
                aria-describedby={errors.points ? "pub-points-error" : undefined}
                className={
                  "h-11 w-full rounded-xl border bg-white pl-10 pr-12 text-sm sm:text-[15px] font-medium tabular-nums text-stone-900 shadow-[0_1px_2px_rgba(28,25,23,0.03)] outline-none transition-all duration-150 placeholder:font-normal placeholder:text-stone-400 " +
                  (errors.points
                    ? "border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                    : "border-stone-200/90 hover:border-stone-300 focus:border-amber-700 focus:ring-3 focus:ring-amber-700/15")
                }
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400">
                pts
              </span>
            </div>
            {errors.points ? (
              <p
                id="pub-points-error"
                className="flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-rose-600"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.points}</span>
              </p>
            ) : (
              <p className="text-xs text-stone-500">
                Valor en puntos para intercambio directo en el catálogo.
              </p>
            )}
          </div>
        </section>

        {dealEval && (
          <div
            className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 transition-colors ${DEAL_STYLES[dealEval.deal].container}`}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DEAL_STYLES[dealEval.deal].dot}`}
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold leading-snug">{dealEval.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed opacity-85">
                  {dealEval.hint}
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${DEAL_STYLES[dealEval.deal].badge}`}
            >
              Ref. {dealEval.referencePrice} pts
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="pub-description"
            className="text-sm font-semibold tracking-tight text-stone-800"
          >
            Descripción y estado (opcional)
          </label>
          <textarea
            id="pub-description"
            rows={3}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Contá detalles útiles para el lector: edición, tapa blanda o dura, zonas de entrega..."
            className="w-full resize-none rounded-xl border border-stone-200/90 bg-white px-3.5 py-2.5 text-sm sm:text-[15px] leading-relaxed text-stone-900 shadow-[0_1px_2px_rgba(28,25,23,0.03)] outline-none transition-all duration-150 placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-700 focus:ring-3 focus:ring-amber-700/15"
          />
        </div>

        <div className="flex flex-col-reverse gap-2.5 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="h-11 rounded-xl border border-stone-200/90 bg-white px-5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-800 px-6 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-amber-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>{editingBook ? "Guardar cambios" : "Publicar Libro"}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
