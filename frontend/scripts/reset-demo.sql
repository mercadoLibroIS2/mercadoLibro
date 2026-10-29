-- Deja los usuarios @mercadolibro.demo como antes de la demo.
-- 1) Ejecutar este SQL en el SQL Editor de Supabase.
-- 2) Volver a correr: node scripts/seed-demo.mjs   (recrea publicaciones e intercambios iniciales)
-- 3) En el navegador de la demo, borrar los datos del sitio (notificaciones/reseñas viven en localStorage).
begin;

delete from public.solicitud_intercambio
 where email_solicitante like '%@mercadolibro.demo'
    or email_propietario like '%@mercadolibro.demo';

delete from public.publicacion
 where email_propietario like '%@mercadolibro.demo';

update public.usuario
   set saldo_total = 100,
       saldo_reservado = 0
 where email like '%@mercadolibro.demo';

commit;
