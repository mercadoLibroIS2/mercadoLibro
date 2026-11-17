"use client"

import { useEffect, useState } from "react"

/**
 * Render apaga el backend cuando no hay tráfico y tarda ~1 minuto en despertar. Si una espera
 * supera unos segundos se avisa, para que el usuario no reintente (y termine con "el usuario ya existe").
 */
export function SlowServerHint({ active }: { active: boolean }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    setSlow(false)
    if (!active) return
    const timer = setTimeout(() => setSlow(true), 5000)
    return () => clearTimeout(timer)
  }, [active])

  if (!active || !slow) return null
  return (
    <p role="status" className="mt-3 text-center text-xs leading-relaxed text-stone-500">
      El servidor se está despertando, puede tardar hasta un minuto. No cierres ni recargues la página.
    </p>
  )
}
