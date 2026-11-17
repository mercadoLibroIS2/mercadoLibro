"use client"

import { useState } from "react"
import { BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Miniatura de portada con respaldo: si no hay URL o la imagen no carga, muestra el ícono
 * de libro en lugar del ícono de imagen rota del navegador.
 */
export function BookCoverThumb({
  src,
  alt = "",
  className,
  iconClassName,
}: {
  src?: string
  alt?: string
  className?: string
  iconClassName?: string
}) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-100 text-stone-400",
        className
      )}
    >
      {src && !failed ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <BookOpen className={cn("h-4 w-4", iconClassName)} aria-hidden="true" />
      )}
    </div>
  )
}
