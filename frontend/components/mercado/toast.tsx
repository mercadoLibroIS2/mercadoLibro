"use client"

import { CheckCircle2 } from "lucide-react"
import { useStore } from "./store"

export function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-3 text-base md:text-lg font-medium text-stone-800 shadow-lg animate-in fade-in slide-in-from-bottom-4"
    >
      <CheckCircle2 className="h-5 w-5 text-amber-700" />
      <span>{toast}</span>
    </div>
  )
}
