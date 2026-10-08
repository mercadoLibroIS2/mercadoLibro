"use client"

import { useState } from "react"
import {
  BookPlus,
  Coins,
  Info,
  ArrowLeft,
  Image as ImageIcon,
  Sparkles,
  Loader2,
} from "lucide-react"
import { useStore } from "./store"
import { Field } from "./field"
import {
  CATEGORIES,
  CONDITIONS,
  type Condition,
  type Category,
} from "@/lib/mercado-types"
import { evaluatePriceDeal } from "@/lib/price-evaluator"
import { getApiBaseUrl } from "@/lib/api/client"

interface FormState {
  title: string
  author: string
  isbn: string
  category: Category | string
  condition: Condition
  edition: string
  points: string
  description: string
  coverUrl: string
}

const EMPTY_FORM: FormState = {
  title: "",
  author: "",
  isbn: "",
  category: "Ficción",
  condition: "Muy bueno",
  edition: "",
  points: "",
  description: "",
  coverUrl: "",
}

export function PublishForm() {
  const { currentUser, publishBook, setScreen, showToast } = useStore()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false)

  if (!currentUser) {
    return null
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSearchGoogleBooks() {
    const isbnQuery = form.isbn.trim()
    const titleQuery = form.title.trim()
    const query = isbnQuery || titleQuery

    if (!query) {
      showToast("Ingresá un ISBN o título para consultar en Google Books.")
      return
    }

    setIsSearchingGoogle(true)
    try {
      const cleanIsbn = isbnQuery.replace(/[^0-9X]/gi, "")
      let volume: {
        titulo?: string
        autor?: string
        descripcion?: string
        portadaUrl?: string
        editorial?: string
        anioPublicacion?: string
        categorias?: string[]
      } | null = null

      // 1. Intentar endpoint backend si está disponible
      try {
        const baseUrl = getApiBaseUrl()
        const backendEndpoint = cleanIsbn
          ? `${baseUrl}/api/libro/google-books/isbn/${cleanIsbn}`
          : `${baseUrl}/api/libro/google-books/buscar?query=${encodeURIComponent(titleQuery)}`
        const res = await fetch(backendEndpoint)
        if (res.ok) {
          const data = await res.json()
          volume = Array.isArray(data) ? data[0] : data
        }
      } catch {
        // Fallback a API pública directa de Google Books
      }

      // 2. Fallback a Google Books Volumes API directa
      if (!volume) {
        const googleUrl = cleanIsbn
          ? `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`
          : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(titleQuery)}&maxResults=1`
        const gRes = await fetch(googleUrl)
        if (gRes.ok) {
          const gData = await gRes.json()
          if (gData.items && gData.items.length > 0) {
            const vInfo = gData.items[0].volumeInfo
            volume = {
              titulo: vInfo.title + (vInfo.subtitle ? `: ${vInfo.subtitle}` : ""),
              autor: vInfo.authors ? vInfo.authors.join(", ") : "",
              descripcion: vInfo.description || "",
              portadaUrl: vInfo.imageLinks?.thumbnail?.replace("http://", "https://") || "",
              editorial: vInfo.publisher || "",
              anioPublicacion: vInfo.publishedDate || "",
              categorias: vInfo.categories || [],
            }
          }
        }
      }

      if (volume) {
        setForm((prev) => {
          let matchedCategory = prev.category
          if (volume.categorias && volume.categorias.length > 0) {
            const catString = volume.categorias.join(" ").toLowerCase()
            const found = CATEGORIES.find((c) =>
              catString.includes(c.toLowerCase()) ||
              (c === "Ficción" && catString.includes("fiction")) ||
              (c === "Historia" && catString.includes("history")) ||
              (c === "Ciencia" && catString.includes("science")) ||
              (c === "Infantil" && (catString.includes("children") || catString.includes("juvenile"))) ||
              (c === "Biografía" && (catString.includes("biography") || catString.includes("autobiography"))) ||
              (c === "Comics y novela gráfica" && (catString.includes("comic") || catString.includes("graphic novel")))
            )
            if (found) matchedCategory = found
          }

          let editionStr = prev.edition
          if (volume.editorial || volume.anioPublicacion) {
            editionStr = [volume.editorial, volume.anioPublicacion ? volume.anioPublicacion.substring(0, 4) : ""]
              .filter(Boolean)
              .join(" ")
          }

          return {
            ...prev,
            title: volume.titulo || prev.title,
            author: volume.autor || prev.author,
            description: volume.descripcion || prev.description,
            coverUrl: volume.portadaUrl || prev.coverUrl,
            edition: editionStr || prev.edition,
            category: matchedCategory,
          }
        })
        showToast("¡Datos y portada autocompletados desde Google Books!")
      } else {
        showToast("No se encontraron resultados en Google Books para esa búsqueda.")
      }
    } catch {
      showToast("No se pudo consultar Google Books en este momento.")
    } finally {
      setIsSearchingGoogle(false)
    }
  }

  const pointsNum = Number.parseInt(form.points, 10)
  const hasPoints = form.points !== "" && !Number.isNaN(pointsNum) && pointsNum > 0
  const evaluation = hasPoints
    ? evaluatePriceDeal(pointsNum, form.category, form.condition, 4.5)
    : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.title.trim()) next.title = "El título del libro es obligatorio"
    if (!form.author.trim()) next.author = "El autor es obligatorio"
    if (!form.category) next.category = "Seleccioná una categoría"
    if (!form.points.trim()) next.points = "Ingresá el valor en puntos"
    else if (Number.isNaN(pointsNum) || pointsNum <= 0)
      next.points = "Ingresá un número de puntos válido mayor a 0"

    setErrors(next)
    if (Object.keys(next).length > 0) return

    publishBook({
      title: form.title.trim(),
      author: form.author.trim(),
      isbn: form.isbn.trim(),
      category: form.category,
      condition: form.condition,
      edition: form.edition.trim() || undefined,
      points: pointsNum,
      description: form.description.trim() || undefined,
      coverUrl: form.coverUrl.trim() || undefined,
      externalRating: 4.5,
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setScreen("inicio")}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-serif text-xl sm:text-3xl font-bold text-stone-900">
              Publicar un Libro
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
        <Field
          id="pub-title"
          label="Título del libro *"
          placeholder="Ej. Cien años de soledad"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          error={errors.title}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="pub-author"
            label="Autor *"
            placeholder="Ej. Gabriel García Márquez"
            value={form.author}
            onChange={(e) => set("author", e.target.value)}
            error={errors.author}
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pub-isbn" className="block text-base md:text-lg font-bold text-stone-800">
                ISBN (opcional)
              </label>
              <button
                type="button"
                onClick={handleSearchGoogleBooks}
                disabled={isSearchingGoogle || (!form.isbn.trim() && !form.title.trim())}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-purple-700 hover:text-purple-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Autocompletar título, autor, portada y sinopsis desde Google Books"
              >
                {isSearchingGoogle ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                )}
                {isSearchingGoogle ? "Consultando..." : "Google Books"}
              </button>
            </div>
            <input
              id="pub-isbn"
              type="text"
              placeholder="Ej. 978-84-204-7183-9"
              value={form.isbn}
              onChange={(e) => set("isbn", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white p-3 text-base md:text-lg text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Category */}
          <div>
            <label htmlFor="pub-category" className="block text-base md:text-lg font-bold text-stone-800 mb-1.5">
              Categoría *
            </label>
            <select
              id="pub-category"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white p-3 text-base md:text-lg text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

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

          {/* Edition */}
          <div>
            <label htmlFor="pub-edition" className="block text-base md:text-lg font-bold text-stone-800 mb-1.5">
              Edición (opcional)
            </label>
            <input
              id="pub-edition"
              type="text"
              placeholder="Ej. Sudamericana 2021"
              value={form.edition}
              onChange={(e) => set("edition", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white p-3 text-base md:text-lg text-stone-900 outline-none focus:border-amber-700"
            />
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
              {evaluation.hint} (Valor de referencia: <strong>{evaluation.referencePrice} pts</strong>).
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
            placeholder="Detalles sobre marcas, notas especiales o estado de la encuadernación..."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white p-3 text-base md:text-lg text-stone-900 outline-none focus:border-amber-700"
          />
        </div>

        <div>
          <label htmlFor="pub-cover" className="block text-base md:text-lg font-bold text-stone-800 mb-1.5">
            Foto de portada (URL opcional)
          </label>
          <div className="relative">
            <ImageIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <input
              id="pub-cover"
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={form.coverUrl}
              onChange={(e) => set("coverUrl", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-11 pr-4 text-base md:text-lg text-stone-900 outline-none focus:border-amber-700"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
          <button
            type="button"
            onClick={() => setScreen("inicio")}
            className="rounded-xl border border-stone-200 px-4 py-2.5 text-base md:text-lg font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-amber-800 px-5 py-2.5 text-base md:text-lg font-bold text-white shadow-xs hover:bg-amber-900 transition-all active:scale-95"
          >
            <BookPlus className="h-4.5 w-4.5" />
            Publicar Libro
          </button>
        </div>
      </form>
    </div>
  )
}
