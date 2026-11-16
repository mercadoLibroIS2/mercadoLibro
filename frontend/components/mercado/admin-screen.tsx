"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Coins,
  Flag,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react"
import { useStore } from "./store"
import {
  loadAdminStats,
  loadReports,
  loadStalledTrades,
  reactivateUser,
  REPORT_REASONS,
  REPORT_STATUS_LABELS,
  resolveReport,
  type AdminAction,
  type AdminStats,
  type Report,
  type ReportStatus,
  type StalledTrade,
} from "@/lib/admin-db"

type AdminTab = "reportes" | "estadisticas" | "conflictos" | "usuarios"

const STATUS_COLORS: Record<ReportStatus, string> = {
  ABIERTO: "bg-rose-100 text-rose-800 border-rose-200",
  EN_REVISION: "bg-amber-100 text-amber-900 border-amber-200",
  RESUELTO: "bg-emerald-100 text-emerald-800 border-emerald-200",
  DESCARTADO: "bg-stone-100 text-stone-600 border-stone-200",
}

const ACTION_LABELS: Record<AdminAction, string> = {
  NINGUNA: "Sin acción sobre los datos",
  CANCELAR_INTERCAMBIO: "Cancelar el intercambio (devuelve puntos y libera libros)",
  ELIMINAR_PUBLICACION: "Dar de baja la publicación",
  SUSPENDER_USUARIO: "Suspender al usuario reportado",
}

const TRADE_STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendientes",
  ACEPTADO: "Aceptados",
  COMPLETADO: "Completados",
  RECHAZADO: "Rechazados",
  CANCELADO: "Cancelados",
}

function formatDate(value: string | null) {
  if (!value) return ""
  return new Date(value).toLocaleString("es-UY", { dateStyle: "short", timeStyle: "short" })
}

function actionsFor(report: Report): AdminAction[] {
  const actions: AdminAction[] = ["NINGUNA"]
  if (report.type === "INTERCAMBIO" && report.tradeId) actions.push("CANCELAR_INTERCAMBIO")
  if (report.type === "PUBLICACION") actions.push("ELIMINAR_PUBLICACION")
  if (report.reportedEmail) actions.push("SUSPENDER_USUARIO")
  return actions
}

export function AdminScreen() {
  const { currentUser, users, showToast } = useStore()
  const [tab, setTab] = useState<AdminTab>("reportes")
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [stalled, setStalled] = useState<StalledTrade[]>([])
  const [stalledDays, setStalledDays] = useState(7)
  const [showClosed, setShowClosed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const nameFor = useCallback(
    (email: string | null) => {
      if (!email) return "—"
      return users.find((u) => u.email.toLowerCase() === email.toLowerCase())?.name || email
    },
    [users],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [r, s, t] = await Promise.all([loadReports(), loadAdminStats(), loadStalledTrades(stalledDays)])
      setReports(r)
      setStats(s)
      setStalled(t)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el panel.")
    } finally {
      setLoading(false)
    }
  }, [stalledDays])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (currentUser?.role !== "ADMINISTRADOR") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-stone-300" />
        <h1 className="mt-3 font-serif text-2xl font-bold text-stone-900">Acceso restringido</h1>
        <p className="mt-1 text-stone-600">Esta sección es solo para administradores.</p>
      </div>
    )
  }

  const openReports = reports.filter((r) => r.status === "ABIERTO" || r.status === "EN_REVISION")
  const visibleReports = showClosed ? reports : openReports
  const suspended = users.filter((u) => u.active === false)

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-4 sm:mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-3 sm:pb-4">
        <div>
          <h1 className="font-serif text-xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-800" /> Panel de administración
          </h1>
          <p className="text-sm md:text-base text-stone-600 mt-1">
            Reportes de la comunidad, gestión de conflictos y estado general de la plataforma.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div role="tablist" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["reportes", `Reportes${openReports.length ? ` (${openReports.length})` : ""}`, Flag],
            ["conflictos", `Intercambios estancados${stalled.length ? ` (${stalled.length})` : ""}`, Clock],
            ["estadisticas", "Reportes generales", BarChart3],
            ["usuarios", `Cuentas suspendidas${suspended.length ? ` (${suspended.length})` : ""}`, Users],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm md:text-base font-semibold transition-colors ${
              tab === id ? "bg-amber-800 text-white" : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "reportes" && (
        <section>
          <label className="mb-3 flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            Mostrar también los reportes cerrados
          </label>
          {visibleReports.length === 0 ? (
            <EmptyState text={loading ? "Cargando reportes..." : "No hay reportes pendientes. ¡Todo en orden!"} />
          ) : (
            <div className="space-y-3">
              {visibleReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  nameFor={nameFor}
                  onResolved={async (status, resolution, action) => {
                    try {
                      await resolveReport(report.id, status, resolution, action)
                      showToast(status === "EN_REVISION" ? "Reporte marcado en revisión." : "Reporte cerrado y notificado.")
                      await refresh()
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : "No se pudo actualizar el reporte.")
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "conflictos" && (
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-stone-600">
            <span>Intercambios pendientes o aceptados sin movimiento hace más de</span>
            <select
              aria-label="Días sin movimiento"
              value={stalledDays}
              onChange={(e) => setStalledDays(Number(e.target.value))}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1"
            >
              {[0, 3, 7, 14, 30].map((d) => (
                <option key={d} value={d}>
                  {d} días
                </option>
              ))}
            </select>
          </div>
          {stalled.length === 0 ? (
            <EmptyState text="No hay intercambios estancados." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-stone-50 text-stone-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Libro</th>
                    <th className="px-3 py-2 font-semibold">Solicitante → Dueño</th>
                    <th className="px-3 py-2 font-semibold">Tipo</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                    <th className="px-3 py-2 font-semibold">Confirmaciones</th>
                    <th className="px-3 py-2 font-semibold">Último cambio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {stalled.map((t) => (
                    <tr key={t.id}>
                      <td className="px-3 py-2 font-semibold text-stone-900">{t.titulo}</td>
                      <td className="px-3 py-2">
                        {t.solicitante} → {t.propietario}
                      </td>
                      <td className="px-3 py-2">{t.tipo === "PUNTOS" ? `${t.puntos} pts` : "Directo"}</td>
                      <td className="px-3 py-2">{t.estado}</td>
                      <td className="px-3 py-2">
                        {t.estado === "ACEPTADO"
                          ? `${t.solicitante_confirmado ? "✓" : "✗"} solicitante · ${t.propietario_confirmado ? "✓" : "✗"} dueño`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-stone-500">{formatDate(t.fecha_actualizacion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-stone-500">
            Para intervenir un intercambio, cualquiera de las partes puede reportarlo desde &quot;Mis intercambios&quot;;
            desde el reporte se puede cancelar devolviendo los puntos.
          </p>
        </section>
      )}

      {tab === "estadisticas" && stats && <StatsView stats={stats} />}
      {tab === "estadisticas" && !stats && <EmptyState text={loading ? "Cargando..." : "Sin datos."} />}

      {tab === "usuarios" && (
        <section>
          {suspended.length === 0 ? (
            <EmptyState text="No hay cuentas suspendidas." />
          ) : (
            <div className="space-y-2">
              {suspended.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3">
                  <div>
                    <p className="font-bold text-stone-900">{u.name}</p>
                    <p className="text-sm text-stone-500">{u.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await reactivateUser(u.email)
                        showToast(`${u.name} fue reactivado.`)
                        window.location.reload()
                      } catch (err) {
                        showToast(err instanceof Error ? err.message : "No se pudo reactivar.")
                      }
                    }}
                    className="flex items-center gap-2 rounded-xl bg-emerald-700 px-3.5 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                  >
                    <UserCheck className="h-4 w-4" /> Reactivar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
      <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-stone-300" />
      {text}
    </div>
  )
}

function ReportCard({
  report,
  nameFor,
  onResolved,
}: {
  report: Report
  nameFor: (email: string | null) => string
  onResolved: (status: Exclude<ReportStatus, "ABIERTO">, resolution: string, action: AdminAction) => Promise<void>
}) {
  const [resolution, setResolution] = useState("")
  const [action, setAction] = useState<AdminAction>("NINGUNA")
  const [busy, setBusy] = useState(false)
  const closed = report.status === "RESUELTO" || report.status === "DESCARTADO"

  async function run(status: Exclude<ReportStatus, "ABIERTO">) {
    if (status !== "EN_REVISION" && resolution.trim().length < 5) {
      alert("Escribí una resolución para el denunciante (al menos 5 caracteres).")
      return
    }
    if (action === "SUSPENDER_USUARIO" && !confirm(`¿Suspender la cuenta de ${nameFor(report.reportedEmail)}?`)) return
    setBusy(true)
    await onResolved(status, resolution, status === "RESUELTO" ? action : "NINGUNA")
    setBusy(false)
  }

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
            {report.type === "INTERCAMBIO" ? "Intercambio" : report.type === "PUBLICACION" ? "Publicación" : "Usuario"} ·{" "}
            {formatDate(report.createdAt)}
          </p>
          <h3 className="mt-0.5 font-bold text-stone-900">{REPORT_REASONS[report.reason]}</h3>
          <p className="text-sm text-stone-600">
            <strong>{nameFor(report.reporterEmail)}</strong> reportó a <strong>{nameFor(report.reportedEmail)}</strong>
            {report.isbn ? ` · ISBN ${report.isbn}` : ""}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[report.status]}`}>
          {REPORT_STATUS_LABELS[report.status]}
        </span>
      </div>
      {report.detail && <p className="mt-2 whitespace-pre-line rounded-xl bg-stone-50 p-3 text-sm text-stone-700">{report.detail}</p>}

      {closed ? (
        <p className="mt-2 text-sm text-stone-600">
          <strong>Resolución:</strong> {report.resolution || "—"}
          {report.actionTaken && report.actionTaken !== "NINGUNA" ? ` · Acción: ${ACTION_LABELS[report.actionTaken]}` : ""}
          {report.resolvedAt ? ` · ${formatDate(report.resolvedAt)}` : ""}
        </p>
      ) : (
        <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
          <select
            aria-label="Acción"
            value={action}
            onChange={(e) => setAction(e.target.value as AdminAction)}
            className="w-full rounded-xl border border-stone-200 bg-white p-2 text-sm"
          >
            {actionsFor(report).map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a]}
              </option>
            ))}
          </select>
          <textarea
            aria-label="Resolución"
            rows={2}
            maxLength={1000}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Resolución que va a recibir quien reportó..."
            className="w-full rounded-xl border border-stone-200 p-2 text-sm"
          />
          <div className="flex flex-wrap justify-end gap-2">
            {report.status === "ABIERTO" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void run("EN_REVISION")}
                className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
              >
                Marcar en revisión
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void run("DESCARTADO")}
              className="rounded-xl border border-stone-200 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
            >
              Descartar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run("RESUELTO")}
              className="rounded-xl bg-emerald-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              Resolver
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function StatsView({ stats }: { stats: AdminStats }) {
  const cards = [
    { label: "Usuarios", value: stats.usuarios, sub: `${stats.usuarios_suspendidos} suspendidos`, icon: Users },
    {
      label: "Publicaciones disponibles",
      value: stats.publicaciones_disponibles,
      sub: `${stats.publicaciones_reservadas} reservadas · ${stats.publicaciones_intercambiadas} intercambiadas`,
      icon: BarChart3,
    },
    {
      label: "Puntos en circulación",
      value: stats.puntos_en_circulacion,
      sub: `${stats.puntos_reservados} reservados en garantía`,
      icon: Coins,
    },
    {
      label: "Reputación promedio",
      value: stats.reputacion_promedio ?? "—",
      sub: `${stats.resenias} reseñas · ${stats.reportes_abiertos} reportes abiertos`,
      icon: ShieldCheck,
    },
  ]
  const tradeTotal = Object.values(stats.intercambios_por_estado).reduce((a, b) => a + b, 0)
  const maxCategory = Math.max(1, ...stats.categorias_populares.map((c) => c.publicaciones))

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-500">
              <Icon className="h-4 w-4" /> {label}
            </p>
            <p className="mt-1 font-serif text-3xl font-bold text-stone-900 tabular-nums">{value}</p>
            <p className="text-xs text-stone-500">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <h3 className="font-bold text-stone-900">Intercambios por estado ({tradeTotal})</h3>
          <ul className="mt-3 space-y-2">
            {Object.entries(TRADE_STATUS_LABELS).map(([key, label]) => {
              const value = stats.intercambios_por_estado[key] || 0
              return (
                <li key={key} className="text-sm">
                  <div className="flex justify-between text-stone-700">
                    <span>{label}</span>
                    <span className="tabular-nums font-semibold">{value}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-stone-100">
                    <div className="h-2 rounded-full bg-amber-700" style={{ width: `${tradeTotal ? (value / tradeTotal) * 100 : 0}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-stone-500">
            Por puntos: {stats.intercambios_por_tipo.PUNTOS || 0} · Directos: {stats.intercambios_por_tipo.DIRECTO || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <h3 className="font-bold text-stone-900">Categorías con más publicaciones</h3>
          <ul className="mt-3 space-y-2">
            {stats.categorias_populares.map((c) => (
              <li key={c.categoria} className="text-sm">
                <div className="flex justify-between text-stone-700">
                  <span>{c.categoria}</span>
                  <span className="tabular-nums font-semibold">{c.publicaciones}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-stone-100">
                  <div className="h-2 rounded-full bg-amber-700" style={{ width: `${(c.publicaciones / maxCategory) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <h3 className="font-bold text-stone-900">Usuarios más activos</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="py-1.5 font-semibold">Usuario</th>
                <th className="py-1.5 font-semibold text-right">Intercambios</th>
                <th className="py-1.5 font-semibold text-right">Reputación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {stats.usuarios_mas_activos.map((u) => (
                <tr key={u.email}>
                  <td className="py-1.5">
                    {u.nombre} <span className="text-stone-400">({u.email})</span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{u.intercambios}</td>
                  <td className="py-1.5 text-right tabular-nums">★ {Number(u.reputacion).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
