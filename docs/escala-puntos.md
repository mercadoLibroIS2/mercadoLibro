# Escala vigente de puntos

La referencia es un libro promedio **nuevo**, de categoría general y 300 páginas, con un valor sugerido de **500 puntos**.

| Concepto | Puntos |
| --- | ---: |
| Registro | 500, una sola vez |
| Trueque libro por libro completado | +50 por participante |
| Reseña válida de trueque o compra completada | +25 para quien la escribe |
| Cadena completada | +50 por participante, sin sumar otro bono de trueque |
| Compra con puntos completada | Transferencia del precio, sin bono adicional |

En trueques, la diferencia entre los precios publicados de ambos ejemplares se reserva y transfiere al completar las dos recepciones. Esa transferencia no crea puntos. El bono de +50 se entrega una sola vez al completar el trueque.

## Referencias y semáforo

El valor sugerido se calcula por ISBN como **base de categoría × factor por páginas × factor por estado**, redondeado al múltiplo de cinco más cercano.

| Categoría | Base para nuevo |
| --- | ---: |
| Infantil | 350 |
| Poesía | 400 |
| Ciencia o divulgación | 550 |
| Técnico o académico | 650 |
| Ficción, historia, biografía y otras categorías | 500 |
| Sin clasificar | 500 |

El factor de páginas es `1 + (páginas - 300) / 2000`, limitado al intervalo de 0,85 a 1,15. Sin páginas válidas se usa 1. Los factores de estado son 1 para nuevo, 0,9 para como nuevo, 0,8 para bueno, 0,65 para aceptable y 0,45 para con marcas. Una novela de 300 páginas se sugiere a 500 nueva, 450 como nueva, 400 buena, 325 aceptable o 225 con marcas. Un manual técnico nuevo de 500 páginas se sugiere a 715. Un infantil nuevo de 100 páginas se sugiere a 315.

La categoría y páginas se obtienen de Google Books / Open Library y quedan guardadas en el libro. El formulario muestra la categoría de solo lectura y el backend ignora la categoría que envíe un cliente. Las estrellas externas se muestran como información, sin afectar el precio.

Los libros existentes completan sus metadatos al consultar la referencia, publicarse o editarse. Si el proveedor no aporta datos para un libro existente, se conserva una categoría reconocida ya guardada y se usa el factor neutro para las páginas desconocidas. Sin categoría reconocida se usa Sin clasificar. Las publicaciones del mismo ISBN comparten estos metadatos.

El propietario elige el precio solicitado. Verde: hasta el 110 % de la referencia; amarillo: más del 110 % y hasta el 130 %; rojo: más del 130 %. Por ejemplo, con referencia 500: 550 es verde, 555–650 amarillo y 655 rojo. Un precio de hasta el 70 % lleva además la etiqueta de oportunidad.

## Datos existentes

Las referencias y colores del catálogo disponible o reservado se calculan con la política vigente, incluso si la base conserva valores orientativos de la escala anterior. Las publicaciones nuevas o editadas guardan la nueva referencia. Los trueques nuevos calculan la compensación con los precios publicados. La referencia sugerida se usa para el semáforo.

No se modifican precios solicitados, saldos, movimientos históricos ni compensaciones ya acordadas. Tampoco se reescriben las referencias históricas de publicaciones vendidas. Los bonos de operaciones que se completen desde esta versión siguen esta política.

Antes de desplegar esta versión se debe aplicar `ingenieriaSoftware2/src/main/resources/migrations/20261119_libro_precio_metadata.sql` en Supabase, que agrega las columnas `paginas` y `categoria_referencia`. Los libros antiguos publicados a 100 puntos siguen ofrecidos a 100 hasta que su dueño cambie el precio; el semáforo los mostrará como oportunidad frente a la nueva referencia.

## Implementación

Servidor: `PoliticaPuntos.java`, usada por referencias, catálogo, trueques, reseñas, registro y cadenas. Interfaz: `lib/puntos.ts` y `lib/price-evaluator.ts`, con los mismos casos de prueba. La referencia del servidor tiene prioridad. Los datos ilustrativos locales y el script `frontend/scripts/seed-demo.mjs` también usan esta escala. Los valores de registro en los archivos SQL se actualizaron para instalaciones nuevas; esos archivos no se ejecutan como parte de este cambio.

La política reduce la emisión: un trueque completo crea 100 puntos entre ambos participantes; con dos reseñas crea 150 en total. Una compra no crea puntos por la transferencia, aunque sus reseñas sí reciben bono. Sigue existiendo emisión de puntos; esta escala no garantiza por sí sola estabilidad a largo plazo.

## Validación

Las pruebas cubren los valores por categoría, páginas y estado, los límites del ajuste, la independencia de las estrellas, los metadatos guardados al importar y el rechazo de cambios de categoría enviados desde el cliente. La compensación de trueques se verifica por los precios publicados, independiente de las referencias.
