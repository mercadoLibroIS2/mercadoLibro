"use client"

import { AlertCircle } from "lucide-react"
import type { InputHTMLAttributes } from "react"

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export function Field({ label, error, hint, id, className = "", ...props }: FieldProps) {
  const errorId = id && error ? `${id}-error` : undefined
  const hintId = id && hint && !error ? `${id}-hint` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-semibold tracking-tight text-stone-800"
      >
        {label}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId || hintId}
        className={
          "h-11 w-full rounded-xl border bg-white px-3.5 text-sm sm:text-[15px] text-stone-900 shadow-[0_1px_2px_rgba(28,25,23,0.03)] outline-none transition-all duration-150 ease-out placeholder:text-stone-400 read-only:bg-stone-50 read-only:text-stone-500 " +
          (error
            ? "border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
            : "border-stone-200/90 hover:border-stone-300 focus:border-amber-700 focus:ring-3 focus:ring-amber-700/15") +
          (className ? ` ${className}` : "")
        }
      />
      {error ? (
        <p
          id={errorId}
          className="flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-rose-600 animate-in fade-in duration-150"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
