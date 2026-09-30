"use client"

import { AlertCircle } from "lucide-react"
import type { InputHTMLAttributes } from "react"

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Field({ label, error, id, ...props }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-base md:text-lg font-bold text-stone-800">
        {label}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        className={
          "w-full rounded-xl border bg-white px-4 py-2.5 text-base md:text-lg text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:ring-2 " +
          (error
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : "border-stone-200 focus:border-amber-700 focus:ring-amber-100")
        }
      />
      {error ? (
        <p className="flex items-center gap-1.5 text-sm md:text-base md:text-lg font-medium text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
