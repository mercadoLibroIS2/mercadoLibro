import { Mail } from "lucide-react"

/** Contacto externo: abre el cliente de correo que tenga configurado el lector. */
export function EmailContact({
  email,
  name,
  contact = true,
}: {
  email?: string
  name: string
  contact?: boolean
}) {
  const address = email?.trim()
  if (!address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return null

  const recipient = encodeURIComponent(address).replace(/%40/g, "@")
  const subject = encodeURIComponent("Coordinar intercambio en MercadoLibro")

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
      <span className="break-all text-stone-600">{address}</span>
      {contact && (
        <a
          href={`mailto:${recipient}?subject=${subject}`}
          aria-label={`Contactar por email a ${name}`}
          className="inline-flex items-center gap-1.5 rounded-lg py-1 font-semibold text-amber-900 underline underline-offset-4 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
        >
          <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
          Contactar por email
        </a>
      )}
    </div>
  )
}
