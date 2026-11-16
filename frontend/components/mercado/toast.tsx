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
      className="fixed bottom-24 lg:bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-stone-200/80 bg-stone-900 px-4 py-3 text-sm font-medium text-stone-50 shadow-[0_10px_30px_rgba(28,25,23,0.22)] animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-amber-400" aria-hidden="true" />
      <span className="leading-snug">{toast}</span>
    </div>
  )
}
