# Demo de 12 minutos

El flujo común de una usuaria (Lucía publica, pide un libro, lo recibe y califica) y un trueque directo libro por libro. En el camino se provocan errores a propósito para mostrar cómo la app los frena (marcados como **Error a propósito**). Se hace con **dos ventanas lado a lado**, ya logueadas, así no hay que cerrar sesión entre usuarios.

Versión larga (25 min, con registro, reportes y panel de administración): [demo-version-larga.md](demo-version-larga.md).

## Antes de empezar (5 minutos antes)

1. **Datos limpios.** Seguí la Preparación de la [versión larga](demo-version-larga.md#preparación-el-día-anterior-o-una-hora-antes) (paso 1: reset y seed). Sin esto no está la propuesta de trueque de Tomás.
2. **Despertá el buscador de libros.** Abrí https://mercadolibro-51uh.onrender.com/api/libro/google-books/isbn/9780141036144 y esperá hasta ver un texto que empieza con `{"googleBooksId"` (puede tardar 1 minuto).
3. **Ventana A, Chrome normal:** entrá a https://mercadolibro-demo.vercel.app con **lucia@mercadolibro.demo** / **Demo2026!**. Tenés que ver 70 pts y un 2 al lado de "Mis Intercambios".
4. **Ventana B, Chrome de incógnito** (Ctrl+Shift+N): misma dirección, entrá con **tomas@mercadolibro.demo** / **Demo2026!**. Tenés que ver 100 pts.
5. Poné una ventana a cada lado de la pantalla (tecla Windows + flecha izquierda o derecha).

**Por qué una normal y una de incógnito:** dos pestañas de la misma ventana comparten la sesión, y si entrás con Tomás en una, la otra también pasa a ser Tomás. Incógnito (o un segundo perfil de Chrome) guarda su propia sesión.

**La app no se actualiza sola:** cada vez que pasás a la otra ventana, apretá **F5** antes de mostrar algo.

## Parte 1 — El catálogo (1 min 30) · Ventana A, Lucía

**Qué contar:** "Los libros de toda la comunidad, con un semáforo que compara los puntos que pide el dueño con un valor de referencia según el estado del libro."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 1.1 | Menú izquierdo → **Catálogo**. Señalá las etiquetas de color de las tarjetas. | "Mostrando 15 libros". Verde = justo u oportunidad, amarillo = un poco caro, rojo = caro. |
| 1.2 | Clic en la categoría **Ciencia** (arriba del catálogo). Después clic en **Todas**. | Quedan Cosmos, Breve historia del tiempo y El hombre que confundió a su mujer con un sombrero. Vuelven los 15. |
| 1.3 | En el buscador escribí `Borges`. Después borralo. | Queda solo El Aleph. Vuelven los 15. |

## Parte 2 — Publicar un libro con su ISBN (2 min 30) · Ventana A, Lucía

**Qué contar:** "Para publicar alcanza con el ISBN: la app trae los datos de Google Books, sugiere la categoría y avisa si el precio es justo. Y no deja publicar datos incompletos."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 2.1 | Botón marrón **Publicar un Libro**. **Error a propósito:** sin completar nada, bajá y clic en **Publicar Libro**. | No publica. Aparecen en rojo "El ISBN es obligatorio", "La categoría es obligatoria" e "Ingresá el valor en puntos". |
| 2.2 | **Error a propósito:** en ISBN escribí `123` y clic en **Buscar**. | "Google Books requiere un ISBN de 10 o 13 dígitos (ej: 978-84-204-7183-9)." |
| 2.3 | Al lado de "Probar ejemplos:" clic en **Cien años de soledad**. Esperá hasta 10 segundos. | Tapa, título, autor y editorial en un recuadro violeta. Los puntos se completan solos (57) y Categoría dice Ficción; si está vacía, elegila. |
| 2.4 | **Error a propósito:** en Puntos solicitados escribí `0` y clic en **Publicar Libro**. | No publica: "Ingresá un número de puntos válido mayor a 0". |
| 2.5 | Cambiá los puntos a `120`, después a `60`. | La evaluación de precio pasa de rojo (Valor: Elevado) a verde (Valor: Justo). |
| 2.6 | Clic en **Publicar Libro**. | Cartel de confirmación y "Mostrando 16 libros". |

## Parte 3 — Pedir un libro por puntos (2 min) · Ventana A, Lucía

**Qué contar:** "No se puede pedir lo que no se puede pagar, y los puntos no pasan al dueño enseguida: quedan en garantía hasta que confirmo que recibí el libro."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 3.1 | **Error a propósito:** clic en **El Aleph** (80 pts). Lucía tiene 70. Cerrá con la X. | El botón **Solicitar (80 pts)** está gris y no se puede apretar: no le alcanzan los puntos. |
| 3.2 | Clic en el libro que acabás de publicar (buscá `soledad`). Cerrá con la X y borrá la búsqueda. | No hay botón Solicitar: es suyo, solo puede **Modificar Publicación** o **Eliminar**. |
| 3.3 | Clic en **Sapiens: De animales a dioses** (45 pts) → **Solicitar (45 pts)**. | Detalle: 70 disponibles, −45 en garantía, quedan 25, y el aviso "Garantía segura". |
| 3.4 | Clic en **Enviar Solicitud**. | Cartel "¡Solicitud enviada!..." y el saldo pasa de 70 a **25 pts**. |
| 3.5 | **Error a propósito:** volvé a abrir **Sapiens**. | Ya no se puede pedir de nuevo: dice "Publicación reservada o intercambiada." |

## Parte 4 — El dueño acepta y entrega (1 min 30) · Ventana B, Tomás

**Qué contar:** "Del otro lado está Tomás, el dueño de Sapiens. Le llegó el aviso."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 4.1 | Pasá a la ventana B y apretá **F5**. Clic en **Notificaciones**. | Aviso "Lucía Fernández solicitó tu libro Sapiens... por 45 puntos". |
| 4.2 | **Mis Intercambios** → pestaña **Recibidas** → **Aceptar Solicitud**. | Cartel "Has aceptado el intercambio...". |
| 4.3 | Pestaña **En Curso** → **Confirmar Entrega del Libro**. | Cartel "Has confirmado la entrega...". Su saldo sigue en 100: cobra cuando Lucía confirme. |

## Parte 5 — Recibir y calificar (2 min) · Ventana A, Lucía

**Qué contar:** "Cuando Lucía confirma que lo recibió, los puntos pasan a Tomás, los dos ganan un bono y ella puede dejar una reseña."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 5.1 | Pasá a la ventana A y apretá **F5**. **Mis Intercambios** → pestaña **En Curso** → **Confirmar Recepción (+10 pts)** en la tarjeta de Sapiens. | Cartel de intercambio completado. Saldo **35 pts** (25 + 10 de bono). Se abre sola la ventana para calificar a Tomás. |
| 5.2 | Clic en la cuarta estrella, escribí `Buen trato, el libro llegó bien` y clic en **Publicar Calificación**. | Cartel "¡Reseña publicada!..." y saldo **40 pts** (+5 por reseñar). |
| 5.3 | Ventana B: apretá **F5**. | Tomás tiene **155 pts**: 100 + los 45 de Lucía que estaban en garantía + 10 de bono. |

## Parte 6 — Trueque directo, libro por libro (2 min 30) · Ventana A y después B

**Qué contar:** "También se puede cambiar un libro por otro sin usar puntos. Tomás le ofreció a Lucía su El Hobbit a cambio de El principito. El trueque se cierra cuando los dos confirman que recibieron su libro."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 6.1 | Ventana A: **Mis Intercambios** → pestaña **Recibidas**. | Tarjeta **DIRECTO**: "Libro solicitado: El principito" y "Libro a cambio: El Hobbit", de Tomás. (Abajo está el pedido de Mateo por Clean Code: no lo toques.) |
| 6.2 | En la tarjeta DIRECTO clic en **Aceptar Solicitud**. | Cartel "Has aceptado el intercambio...". |
| 6.3 | Pestaña **En Curso** → en la tarjeta de El principito clic en **Confirmar Recepción de Libro (+5 pts)**. | "Tu recepción está confirmada (Esperando a la otra parte)". Todavía no se cierra: falta Tomás. |
| 6.4 | Ventana B: **F5** → **Mis Intercambios** → **En Curso** → **Confirmar Recepción de Libro (+5 pts)**. Si se abre la ventana para calificar, cerrala con la X. | Cartel "¡Intercambio completado con éxito!..." con el bono para los dos. |
| 6.5 | Ventana A: **F5** → **Mis Intercambios** → pestaña **Historial**. | El principito y Sapiens aparecen como **COMPLETADO**. |
| 6.6 | Clic en el nombre **Lucía** con su foto (arriba a la derecha) → pestaña **Movimientos**. | Cada movimiento de puntos con su saldo: la garantía de Sapiens (−45), los bonos por intercambio y el +5 por la reseña. Contalo como la trazabilidad de los puntos. Fin de la demo, o seguí con la Parte extra. |

## Parte extra (opcional) — Seguir un libro en el Tracker (1 min) · Ventana A, Lucía

Si la hacen, va al final y la demo queda en unos 13 minutos. Si no, se salta sin afectar nada.

**Qué contar:** "Si busco un libro que nadie tiene a mi precio, lo sigo en el Tracker con el máximo que quiero pagar, y la app me muestra quién lo tiene publicado."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| E.1 | Menú izquierdo → **Tracker de Libros**. | Pantalla "Tracker de Libros" con "No tenés libros en seguimiento actualmente". |
| E.2 | Clic en **Seguir nuevo libro**. | Formulario con título, autor, categoría, puntos máximos y estados físicos aceptables. |
| E.3 | En el título escribí `Aleph` y en puntos máximos `90`. El resto dejalo como está. Clic en **Guardar en Tracker**. | Cartel ""Aleph" se agregó a tu Tracker de libros seguidos." y una tarjeta con **Coincidencias encontradas (1)**: El Aleph, de Valentina, 80 pts. |
| E.4 | Clic en esa coincidencia. Cerrá con la X. | Se abre la ventana del libro El Aleph. |

Quedan afuera (están en la versión larga por si preguntan o sobra tiempo): registro de una cuenta nueva, Cadenas Circulares y el panel de administración con reportes.

## Si algo falla

| Situación | Qué hacer |
| --- | --- |
| No aparece lo que hizo el otro usuario | Apretá **F5** en esa ventana. |
| Al entrar en una ventana, la otra cambió de usuario | Las dos ventanas son del mismo tipo: una tiene que ser de incógnito. Cerrá la de incógnito, abrí una nueva y volvé a entrar. |
| La búsqueda por ISBN tarda o falla | Usá el ejemplo **1984**. Si también falla, completá puntos y categoría a mano y publicá igual. |
| En Recibidas no está la propuesta de Tomás | Los datos no están reseteados. Hacé el reset y seed (Preparación, paso 1) y volvé a entrar en las dos ventanas. |
| Hay que repetir la demo | Lo mismo: reset y seed de nuevo y volvé a entrar en las dos ventanas. |
