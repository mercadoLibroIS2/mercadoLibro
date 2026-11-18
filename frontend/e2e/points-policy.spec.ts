import { expect, test } from "@playwright/test"
import { calculateReferencePrice, evaluatePriceDeal } from "../lib/price-evaluator"
import { BONO_CADENA, BONO_INTERCAMBIO_DIRECTO, BONO_RESENIA, PUNTOS_INICIALES } from "../lib/puntos"
import type { Condition } from "../lib/mercado-types"

test("registro, referencias y bonos usan una sola escala", () => {
  expect(PUNTOS_INICIALES).toBe(500)
  expect(BONO_INTERCAMBIO_DIRECTO).toBe(50)
  expect(BONO_RESENIA).toBe(25)
  expect(BONO_CADENA).toBe(50)
  const references: Array<[Condition, number]> = [
    ["Nuevo", 625], ["Como nuevo", 565], ["Bueno", 500],
    ["Muy bueno", 500], ["Aceptable", 405], ["Con marcas", 280],
  ]
  for (const [condition, reference] of references) {
    expect(calculateReferencePrice("Ficción", condition)).toBe(reference)
    expect(calculateReferencePrice("Técnico", condition)).toBe(reference)
  }
  expect(calculateReferencePrice("", "Bueno", 0)).toBe(400)
  expect(calculateReferencePrice("", "Bueno", 5)).toBe(525)
})

test("el semáforo coincide con los límites del servidor y respeta su referencia", () => {
  for (const [price, color] of [[550, "green"], [555, "yellow"], [650, "yellow"], [655, "red"]] as const) {
    expect(evaluatePriceDeal(price, "Ficción", "Bueno").deal).toBe(color)
  }
  expect(evaluatePriceDeal(600, "Ficción", "Bueno", 4, 625).deal).toBe("green")
})
