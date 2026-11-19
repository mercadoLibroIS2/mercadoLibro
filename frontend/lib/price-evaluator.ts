import type { Condition, DealEvaluation } from "./mercado-types"
import { REFERENCIA_LIBRO_NUEVO, VALORACION_NEUTRA } from "./puntos"

export const CONDITION_MULTIPLIERS: Record<Condition, number> = {
  Nuevo: 1.0,
  "Como nuevo": 0.9,
  "Muy bueno": 0.8,
  Bueno: 0.8,
  Aceptable: 0.65,
  "Con marcas": 0.45,
}

export const CATEGORY_BASE_PRICES: Record<string, number> = {
  Infantil: 350,
  Poesía: 400,
  Ciencia: 550,
  Técnico: 650,
}

/**
 * Misma fórmula que PoliticaPuntos en el backend, con categoría y páginas del ISBN.
 */
export function calculateReferencePrice(
  category: string,
  condition: Condition,
  _externalRating = VALORACION_NEUTRA,
  pages?: number | null
): number {
  const base = CATEGORY_BASE_PRICES[category] ?? REFERENCIA_LIBRO_NUEVO
  const conditionMult = CONDITION_MULTIPLIERS[condition] ?? CONDITION_MULTIPLIERS.Bueno
  const pagesMult = pages && pages > 0 ? Math.max(0.85, Math.min(1.15, 1 + (pages - 300) / 2000)) : 1
  return Math.max(5, Math.round((base * conditionMult * pagesMult) / 5) * 5)
}

/**
 * Evaluates requested points against reference price (RF30, RF43, RF44).
 * Si la publicación ya tiene el valor de referencia calculado por el backend, se usa ese
 * (`referenceOverride`) para que el semáforo coincida con el que guarda el servidor; la
 * fórmula local queda solo como estimación al publicar.
 */
export function evaluatePriceDeal(
  points: number,
  category: string,
  condition: Condition,
  externalRating = VALORACION_NEUTRA,
  referenceOverride?: number,
  pages?: number | null
): DealEvaluation {
  const ref =
    referenceOverride && referenceOverride > 0
      ? referenceOverride
      : calculateReferencePrice(category, condition, externalRating, pages)
  const ratio = points / ref

  let deal: "green" | "yellow" | "red"
  let label: string
  let hint: string

  if (ratio <= 0.7) {
    deal = "green"
    label = "Valor: Oportunidad"
    hint = `Muy por debajo del valor de referencia sugerido (${ref} pts).`
  } else if (ratio <= 1.1) {
    deal = "green"
    label = "Valor: Justo"
    hint = `Acorde al estado ${condition.toLowerCase()} y las características del libro (${ref} pts).`
  } else if (ratio <= 1.3) {
    deal = "yellow"
    label = "Valor: Levemente elevado"
    hint = `Un poco superior al valor de referencia sugerido (${ref} pts).`
  } else {
    deal = "red"
    label = "Valor: Elevado"
    hint = `Notable sobreprecio respecto a la referencia sugerida (${ref} pts).`
  }

  return {
    deal,
    label,
    hint,
    referencePrice: ref,
    factors: {
      conditionMultiplier: CONDITION_MULTIPLIERS[condition] ?? CONDITION_MULTIPLIERS.Bueno,
      externalRating,
      marketBase: CATEGORY_BASE_PRICES[category] ?? REFERENCIA_LIBRO_NUEVO,
    },
  }
}
