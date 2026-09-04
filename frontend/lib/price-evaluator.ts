import type { Condition, DealEvaluation } from "./mercado-types"

export const CONDITION_MULTIPLIERS: Record<Condition, number> = {
  Nuevo: 1.5,
  "Como nuevo": 1.3,
  "Muy bueno": 1.0,
  Bueno: 0.8,
  Aceptable: 0.6,
  "Con marcas": 0.45,
}

export const CATEGORY_BASE_PRICES: Record<string, number> = {
  Ficción: 50,
  "No ficción": 55,
  Ciencia: 60,
  Historia: 55,
  Infantil: 40,
  Poesía: 45,
  Técnico: 70,
  Autoayuda: 45,
  "Comics y novela gráfica": 65,
  Filosofía: 50,
  Biografía: 55,
}

/**
 * Calculates reference price based on RF40/RF41
 */
export function calculateReferencePrice(
  category: string,
  condition: Condition,
  externalRating = 4.2
): number {
  const base = CATEGORY_BASE_PRICES[category] || 50
  const conditionMult = CONDITION_MULTIPLIERS[condition] || 1.0
  const ratingMult = 0.8 + (externalRating / 5) * 0.4 // 4.0/5 -> 1.12

  const calculated = Math.round(base * conditionMult * ratingMult)
  return Math.max(10, calculated)
}

/**
 * Evaluates requested points against reference price (RF30, RF43, RF44)
 */
export function evaluatePriceDeal(
  points: number,
  category: string,
  condition: Condition,
  externalRating = 4.2
): DealEvaluation {
  const ref = calculateReferencePrice(category, condition, externalRating)
  const ratio = points / ref

  let deal: "green" | "yellow" | "red"
  let label: string
  let hint: string

  if (ratio <= 0.7) {
    deal = "green"
    label = "Valor: Oportunidad"
    hint = `Muy por debajo del valor de referencia sugerido (${ref} pts).`
  } else if (ratio <= 1.15) {
    deal = "green"
    label = "Valor: Justo"
    hint = `Acorde al estado ${condition.toLowerCase()} y valoración del libro (${ref} pts).`
  } else if (ratio <= 1.4) {
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
      conditionMultiplier: CONDITION_MULTIPLIERS[condition] || 1.0,
      externalRating,
      marketBase: CATEGORY_BASE_PRICES[category] || 50,
    },
  }
}
