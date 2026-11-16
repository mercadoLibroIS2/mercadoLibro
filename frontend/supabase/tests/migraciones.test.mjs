// Uso: cd frontend/supabase/tests && npm install && npm test
// Prueba las migraciones de MercadoLibro sobre un Postgres real (PGlite) con roles y RLS como en Supabase.
import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repo = process.argv[2]
const read = (p) => readFileSync(p, "utf8")
const db = new PGlite()

let passed = 0
let failed = 0
function check(name, cond, extra = "") {
  if (cond) { passed++; console.log("  ok   " + name) }
  else { failed++; console.log("  FAIL " + name + (extra ? " -> " + extra : "")) }
}

async function as(email, sql, params = []) {
  const claims = email === "anon" ? { role: "anon" } : { email, role: "authenticated" }
  const role = email === "anon" ? "anon" : "authenticated"
  try {
    await db.exec("begin")
    await db.exec(inline("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]))
    await db.exec("set local role " + role)
    const res = await db.exec(inline(sql, params))
    await db.exec("commit")
    return res[res.length - 1].rows
  } catch (e) {
    try { await db.exec("rollback") } catch {}
    throw e
  }
}
function lit(v) {
  if (v === null || v === undefined) return "null"
  if (typeof v === "object") v = JSON.stringify(v)
  return "'" + String(v).replace(/'/g, "''") + "'"
}
function inline(sql, params) {
  return sql.replace(/\$(\d+)/g, (_, i) => lit(params[Number(i) - 1]))
}
async function fails(email, sql, params = []) {
  try { await as(email, sql, params); return null } catch (e) { return e.message }
}
const one = async (sql, params) => (await db.query(sql, params)).rows[0]

const migrations = [
  join(repo, "frontend/lib/supabase-schema.sql"),
  join(repo, "frontend/supabase/migrations/20261114120000_seguridad_y_persistencia.sql"),
  join(repo, "frontend/supabase/migrations/20261116120000_categorias_reportes_admin.sql"),
]

await db.exec(read(join(repo, "frontend/supabase/tests/base.sql")))
// Datos existentes antes de aplicar las migraciones (como en la demo real).
await db.exec(`insert into auth.users (email, raw_user_meta_data) values
  ('lucia@mercadolibro.demo', '{"username":"lucia"}'),
  ('tomas@mercadolibro.demo', '{"username":"tomas"}'),
  ('admin@mercadolibro.demo', '{"username":"admin"}')`)
for (const m of migrations) {
  try { await db.exec(read(m)) } catch (e) { console.log("ERROR aplicando " + m + ": " + e.message); process.exit(1) }
}
console.log("Migraciones aplicadas")
// Idempotencia: volver a correr las dos migraciones nuevas.
for (const m of migrations.slice(1)) {
  try { await db.exec(read(m)) } catch (e) { console.log("ERROR re-aplicando " + m + ": " + e.message); process.exit(1) }
}
console.log("Migraciones re-aplicadas (idempotentes)")
await db.exec("update public.usuario set rol = 'ADMINISTRADOR' where email = 'admin@mercadolibro.demo'")

const L = "lucia@mercadolibro.demo", T = "tomas@mercadolibro.demo", A = "admin@mercadolibro.demo"
const saldo = async (e) => one("select saldo_total, saldo_reservado from usuario where email = $1", [e])

console.log("\n[Seguridad]")
check("anon no puede leer usuarios", !!(await fails("anon", "select email from usuario")))
check("autenticado no puede leer contrasenia", !!(await fails(L, "select contrasenia from usuario")))
check("autenticado lee columnas públicas", (await as(L, "select email, rol, es_activo, nombre_completo from usuario")).length === 3)
check("no puede cambiarse el saldo", !!(await fails(L, "update usuario set saldo_total = 9999 where email = $1", [L])))
await as(L, "update usuario set nombre_completo = 'Lucía Fernández', ciudad = 'Montevideo' where email = $1", [L])
check("puede editar su perfil", (await one("select nombre_completo from usuario where email = $1", [L])).nombre_completo === "Lucía Fernández")
await as(T, "update usuario set nombre_completo = 'hack' where email = $1", [L])
check("no puede editar el perfil de otro", (await one("select nombre_completo from usuario where email = $1", [L])).nombre_completo === "Lucía Fernández")
check("movimiento inicial creado para usuarios existentes", Number((await one("select count(*) c from movimiento_puntos_app where email_usuario = $1", [L])).c) === 1)

console.log("\n[Publicaciones y categorías]")
await as(L, "insert into libro (isbn, titulo, autores) values ('111', 'Rayuela', 'Cortázar'), ('222', 'Ficciones', 'Borges')")
await as(T, "insert into libro (isbn, titulo, autores) values ('333', 'El Aleph', 'Borges')")
check("asignar categoría a libro sin categoría", !(await fails(L, "insert into libro_categoria (isbn, nombre_categoria) values ('111', 'Ficción')")))
check("no se puede pisar la categoría", !!(await fails(T, "insert into libro_categoria (isbn, nombre_categoria) values ('111', 'Historia')")))
check("categoría inexistente rechazada", !!(await fails(L, "insert into libro_categoria (isbn, nombre_categoria) values ('222', 'Inventada')")))
check("no se puede borrar categoría", !!(await fails(T, "delete from libro_categoria where isbn = '111'")))
const pub = async (who, isbn, pts, hora) => as(who,
  "insert into publicacion (isbn, email_propietario, hora_publicacion, estado_fisico, valor_puntos_solicitado, estado_publicacion) values ($1, $2, $3, 'NUEVO', $4, 'VENDIDA') returning estado_publicacion",
  [isbn, who, hora, pts])
const p1 = await pub(L, "111", 40, "2026-11-01 10:00:00")
check("insert fuerza estado DISPONIBLE", p1[0].estado_publicacion === "DISPONIBLE")
await pub(L, "222", 30, "2026-11-01 11:00:00")
await pub(T, "333", 25, "2026-11-01 12:00:00")
check("no puede publicar a nombre de otro", !!(await fails(T, "insert into publicacion (isbn, email_propietario, hora_publicacion, estado_fisico, valor_puntos_solicitado) values ('111', $1, now(), 'NUEVO', 10)", [L])))

console.log("\n[Intercambio por puntos]")
const req = (id, extra = {}) => ({
  id, tipo: "PUNTOS", isbn_solicitada: "111", email_propietario_solicitada: L,
  hora_publicacion_solicitada: "2026-11-01T10:00:00", email_solicitante: T, ...extra,
})
const t1 = "00000000-0000-0000-0000-000000000001"
await as(T, "select crear_solicitud_intercambio($1)", [req(t1)])
let s = await saldo(T)
check("reserva puntos (100 -> 60 / 40 reservados)", s.saldo_total === 60 && s.saldo_reservado === 40, JSON.stringify(s))
check("publicación queda RESERVADA", (await one("select estado_publicacion from publicacion where isbn='111'")).estado_publicacion === "RESERVADA")
check("dueño no puede liberar una publicación reservada", !!(await fails(L, "update publicacion set estado_publicacion = 'DISPONIBLE' where isbn = '111'")))
check("no puede pedir lo ya reservado", !!(await fails(A, "select crear_solicitud_intercambio($1)", [req("00000000-0000-0000-0000-0000000000aa", { email_solicitante: A })])))
check("solicitante no puede aceptar", !!(await fails(T, "select gestionar_solicitud_intercambio($1, 'ACEPTAR')", [t1])))
check("dueño acepta", (await as(L, "select gestionar_solicitud_intercambio($1, 'ACEPTAR') r", [t1]))[0].r.estado === "ACEPTADO")
let r = (await as(T, "select gestionar_solicitud_intercambio($1, 'CONFIRMAR') r", [t1]))[0].r
check("una sola confirmación no completa", r.estado === "ACEPTADO", JSON.stringify(r))
r = (await as(L, "select gestionar_solicitud_intercambio($1, 'CONFIRMAR') r", [t1]))[0].r
check("ambas confirmaciones completan", r.estado === "COMPLETADO", JSON.stringify(r))
s = await saldo(T); const sl = await saldo(L)
check("comprador: 60 + 10 bono, 0 reservado", s.saldo_total === 70 && s.saldo_reservado === 0, JSON.stringify(s))
check("vendedor: 100 + 40 + 10 bono", sl.saldo_total === 150, JSON.stringify(sl))
check("publicación VENDIDA", (await one("select estado_publicacion from publicacion where isbn='111'")).estado_publicacion === "VENDIDA")
check("movimientos del comprador visibles solo para él", (await as(T, "select tipo from movimiento_puntos_app")).every(() => true) && (await as(T, "select distinct email_usuario from movimiento_puntos_app")).length === 1)
check("notificaciones de completado", Number((await one("select count(*) c from notificacion_app where tipo = 'TRADE_COMPLETED'")).c) === 2)

console.log("\n[Reseñas y reputación]")
await as(T, "select crear_resenia_intercambio($1, 3, 'Todo bien')", [t1])
check("reputación del vendedor = 3", Number((await one("select reputacion_promedio from usuario where email = $1", [L])).reputacion_promedio) === 3)
check("no puede reseñar dos veces", !!(await fails(T, "select crear_resenia_intercambio($1, 5, 'otra')", [t1])))
check("calificación fuera de rango", !!(await fails(L, "select crear_resenia_intercambio($1, 6, 'x')", [t1])))
check("recompensa +5", (await saldo(T)).saldo_total === 75)

console.log("\n[Intercambio directo + cancelar]")
const t2 = "00000000-0000-0000-0000-000000000002"
await as(T, "select crear_solicitud_intercambio($1)", [{ id: t2, tipo: "DIRECTO", isbn_solicitada: "222", email_propietario_solicitada: L,
  hora_publicacion_solicitada: "2026-11-01T11:00:00", isbn_ofrecida: "333", email_propietario_ofrecida: T,
  hora_publicacion_ofrecida: "2026-11-01T12:00:00", email_solicitante: T }])
check("ambos libros reservados", Number((await one("select count(*) c from publicacion where estado_publicacion = 'RESERVADA'")).c) === 2)
await as(L, "select gestionar_solicitud_intercambio($1, 'RECHAZAR')", [t2])
check("rechazo libera ambos libros", Number((await one("select count(*) c from publicacion where estado_publicacion = 'RESERVADA'")).c) === 0)

console.log("\n[Seguimiento]")
await as(T, "insert into seguimiento_libro (titulo, autor, max_puntos) values ('rayuela', 'cortázar', 50)")
check("no ve seguimientos de otros", (await as(L, "select * from seguimiento_libro")).length === 0)
await pub(L, "111", 45, "2026-11-02 10:00:00")
check("aviso TRACKER_MATCH al publicar", Number((await one("select count(*) c from notificacion_app where tipo='TRACKER_MATCH' and email_usuario=$1", [T])).c) === 1)
await pub(L, "111", 80, "2026-11-02 11:00:00")
check("sin aviso si supera el máximo", Number((await one("select count(*) c from notificacion_app where tipo='TRACKER_MATCH'")).c) === 1)

console.log("\n[Reportes y administración]")
const t3 = "00000000-0000-0000-0000-000000000003"
await as(T, "select crear_solicitud_intercambio($1)", [req(t3, { hora_publicacion_solicitada: "2026-11-02T10:00:00" })])
await as(L, "select gestionar_solicitud_intercambio($1, 'ACEPTAR')", [t3])
const before = await saldo(T)
const rep = (await as(T, "select crear_reporte('INTERCAMBIO', 'LIBRO_NO_ENTREGADO', 'No me lo entregó', null, null, null, $1) id", [t3]))[0].id
check("reporte creado", !!rep)
check("reporte duplicado rechazado", !!(await fails(T, "select crear_reporte('INTERCAMBIO', 'FRAUDE', 'x', null, null, null, $1)", [t3])))
check("no puede reportarse a sí mismo", !!(await fails(T, "select crear_reporte('USUARIO', 'OTRO', 'x', $1)", [T])))
check("tercero no reporta intercambio ajeno", !!(await fails(A, "select crear_reporte('INTERCAMBIO', 'OTRO', 'x', null, null, null, $1)", [t3])))
check("denunciado no ve el reporte", (await as(L, "select * from reporte_app")).length === 0)
check("denunciante ve su reporte", (await as(T, "select * from reporte_app")).length === 1)
check("admin ve el reporte", (await as(A, "select * from reporte_app")).length === 1)
check("admin recibe notificación", Number((await one("select count(*) c from notificacion_app where email_usuario=$1 and tipo='REPORT_UPDATE'", [A])).c) === 1)
check("no admin no puede resolver", !!(await fails(T, "select resolver_reporte($1, 'RESUELTO', 'x', 'NINGUNA')", [rep])))
check("no admin no ve estadísticas", !!(await fails(T, "select estadisticas_admin()")))
await as(A, "select resolver_reporte($1, 'RESUELTO', 'Se canceló y se devolvieron los puntos', 'CANCELAR_INTERCAMBIO')", [rep])
const after = await saldo(T)
check("cancelación devuelve los puntos", after.saldo_total === before.saldo_total + 45 && after.saldo_reservado === 0, JSON.stringify({ before, after }))
check("intercambio CANCELADO", (await one("select estado from solicitud_intercambio where id = $1", [t3])).estado === "CANCELADO")
check("publicación vuelve a DISPONIBLE", (await one("select estado_publicacion from publicacion where isbn='111' and hora_publicacion='2026-11-02 10:00:00'")).estado_publicacion === "DISPONIBLE")
const rep2 = (await as(T, "select crear_reporte('USUARIO', 'COMPORTAMIENTO_INAPROPIADO', 'insultos', $1) id", [L]))[0].id
await as(A, "select resolver_reporte($1, 'RESUELTO', 'Cuenta suspendida', 'SUSPENDER_USUARIO')", [rep2])
check("usuario suspendido", (await one("select es_activo from usuario where email = $1", [L])).es_activo === false)
check("suspendido no puede publicar", !!(await fails(L, "insert into publicacion (isbn, email_propietario, hora_publicacion, estado_fisico, valor_puntos_solicitado) values ('222', $1, now(), 'NUEVO', 10)", [L])))
check("sus publicaciones disponibles se ocultan", Number((await one("select count(*) c from publicacion where email_propietario = $1 and estado_publicacion = 'DISPONIBLE'", [L])).c) === 0)
await as(A, "select reactivar_usuario($1)", [L])
check("reactivado", (await one("select es_activo from usuario where email = $1", [L])).es_activo === true)
const stats = (await as(A, "select estadisticas_admin() s"))[0].s
check("estadísticas", stats.usuarios === 3 && stats.reportes_cerrados === 2 && Array.isArray(stats.categorias_populares), JSON.stringify(stats))
check("intercambios estancados (0 días)", Array.isArray(await as(A, "select * from intercambios_estancados_admin(0)")))

console.log("\n[Reinicio de demo]")
await as(T, "select reiniciar_usuario_demo()")
s = await saldo(T)
check("saldo reiniciado a 100", s.saldo_total === 100 && s.saldo_reservado === 0)

console.log(`\n${passed} ok, ${failed} fallas`)
process.exit(failed ? 1 : 0)
