# Escala vigente de puntos

La referencia es un libro promedio **en buen estado**, con valoración externa de 4/5: **500 puntos**.

| Concepto | Puntos |
| --- | ---: |
| Registro | 500, una sola vez |
| Trueque libro por libro completado | +50 por participante |
| Reseña válida de trueque o compra completada | +25 para quien la escribe |
| Cadena completada | +50 por participante, sin sumar otro bono de trueque |
| Compra con puntos completada | Transferencia del precio, sin bono adicional |

En trueques, la diferencia entre las referencias de ambos ejemplares se reserva y transfiere al completar las dos recepciones. Esa transferencia no crea puntos. El bono de +50 se entrega una sola vez al completar el trueque.

## Referencias y semáforo

Con valoración de 4/5 o sin valoración externa:

| Conservación | Referencia |
| --- | ---: |
| Nuevo | 625 |
| Como nuevo | 565 |
| Bueno | 500 |
| Aceptable | 405 |
| Con marcas | 280 |

La referencia parte de 625 para un ejemplar nuevo y aplica los factores 1, 0,9, 0,8, 0,65 y 0,45. Cada estrella externa por encima o debajo de 4 ajusta el valor un 5 %. Se redondea al múltiplo de 5 más cercano. Sin valoración se usa 4; una valoración de cero sí cuenta como cero. La categoría sirve para organizar y filtrar, sin modificar el valor. Ya no hay excepciones para ISBN concretos ni otra escala basada en cantidad de páginas.

El propietario elige el precio solicitado. Verde: hasta el 110 % de la referencia; amarillo: más del 110 % y hasta el 130 %; rojo: más del 130 %. Por ejemplo, con referencia 500: 550 es verde, 555–650 amarillo y 655 rojo. Un precio de hasta el 70 % lleva además la etiqueta de oportunidad.

## Datos existentes

Las referencias y colores del catálogo disponible o reservado se calculan con la política vigente, incluso si la base conserva valores orientativos de la escala anterior. Las publicaciones nuevas o editadas guardan la nueva referencia. Los trueques nuevos usan la misma fórmula para la compensación.

No se modifican precios solicitados, saldos, movimientos históricos ni compensaciones ya acordadas. Tampoco se reescriben las referencias históricas de publicaciones vendidas. Los bonos de operaciones que se completen desde esta versión siguen esta política.

No requiere migración de esquema ni un script sobre Supabase. Los libros antiguos publicados a 100 puntos siguen ofrecidos a 100 hasta que su dueño cambie el precio; el semáforo los mostrará como oportunidad frente a la nueva referencia.

## Implementación

Servidor: `PoliticaPuntos.java`, usada por referencias, catálogo, trueques, reseñas, registro y cadenas. Interfaz: `lib/puntos.ts` y `lib/price-evaluator.ts`, con los mismos casos de prueba. La referencia del servidor tiene prioridad. Los datos ilustrativos locales y el script `frontend/scripts/seed-demo.mjs` también usan esta escala. Los valores de registro en los archivos SQL se actualizaron para instalaciones nuevas; esos archivos no se ejecutan como parte de este cambio.

La política reduce la emisión: un trueque completo crea 100 puntos entre ambos participantes; con dos reseñas crea 150 en total. Una compra no crea puntos por la transferencia, aunque sus reseñas sí reciben bono. Sigue existiendo emisión de puntos; esta escala no garantiza por sí sola estabilidad a largo plazo.

## Validación de este cambio

- 27 pruebas Java aprobadas: política, publicaciones, reseñas de ambas modalidades, cadenas y módulos de usuarios/puntos.
- 12 escenarios de API de trueques aprobados con backend real en H2 aislada. Incluyen compensación en ambas direcciones, reservas, cancelaciones, doble confirmación y saldo insuficiente por reservas anteriores. Dos pruebas de la fórmula/semáforo de la interfaz también aprobadas.
- Dos sesiones de navegador contra ese backend: trueque con referencias 500/625, reserva y transferencia de 125, saldos finales 425/675 tras +50 por usuario, reseña +25 y persistencia tras F5.
- Compra de 500 puntos en dos sesiones: reserva 500, aceptación/envío, recepción, saldos 0/1000 sin bono de compra; reseña +25 y perfiles/historial persistidos.
- Publicación desde formulario: registro 500, sugerencias 500 en Bueno y 625 en Nuevo, límites verde/amarillo/rojo comprobados, guardado a 500 y visibilidad después de F5.
- TypeScript y sintaxis del script de datos de demo sin errores.

La suite antigua `p6-notifications-reviews.spec.ts` todavía no está adaptada a la carga autoritativa desde el backend: usa la clave local `mercadolibro_demo_clean_v5` mientras la aplicación usa `v6`, y sus mocks devuelven vacíos para datos que antes se conservaban localmente. En su ejecución hubo 10 fallos, un caso aprobado y dos omitidos. Los bonos esperados se actualizaron a 25, pero esos fallos de fixtures no se consideran aprobados ni se sustituyen por resultados simulados. Los flujos reales de reseñas y perfiles sí se verificaron en ambas modalidades como se describe arriba.

Todos los datos de estas pruebas son locales. No se ejecutaron scripts ni se modificaron saldos en Supabase.
