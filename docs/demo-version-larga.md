# Guión de demo — versión larga (25 min)

Versión corta (12 min, dos ventanas, sin cerrar sesión): [demo-12-minutos.md](demo-12-minutos.md).

## Antes de empezar

La demo dura unos 25 minutos y se hace entera en **una sola pestaña de Google Chrome**, entrando y saliendo con cuatro usuarios distintos. Seguí las partes en orden: cada una deja la app preparada para la siguiente.

**Qué necesitás:** una computadora con Google Chrome, conexión a internet y este guión abierto en otra pantalla (o impreso).

**Dirección de la app:** <https://mercadolibro-demo.vercel.app>

**Usuarios** (todos tienen la misma contraseña: `Demo2026!`, con D mayúscula y signo de exclamación al final):

| Persona | Email para entrar | Qué hace en la demo | Puntos al empezar |
| --- | --- | --- | --- |
| Lucía Fernández | `lucia@mercadolibro.demo` | La protagonista: publica, pide un libro, acepta y rechaza pedidos | 70 |
| Tomás Rivero | `tomas@mercadolibro.demo` | Dueño de "Sapiens"; acepta el pedido de Lucía | 100 |
| Mateo Gómez | `mateo@mercadolibro.demo` | Le compró "Clean Code" a Lucía; confirma que lo recibió y la califica | 40 (+60 apartados) |
| Valentina Sosa | `valentina@mercadolibro.demo` | Administradora: revisa el reporte de Lucía en la Parte 10; ya le vendió "Harry Potter" a Lucía | 150 |

**Cómo están las cosas al empezar:** Mateo le pidió "Clean Code" a Lucía pagando 60 puntos (pendiente). Tomás le propuso a Lucía cambiar su "El Hobbit" por "El principito" de ella (pendiente). Lucía ya le compró "Harry Potter" a Valentina (terminado).

### Preparación (el día anterior o una hora antes)

Se hace una sola vez. Hace falta la carpeta del repo en una compu con Node instalado y acceso al proyecto de Supabase.

1. **Dejar los datos como al principio.** En una terminal, dentro de la carpeta `frontend` del repo, corré `node scripts/reset-demo.mjs` y después `node scripts/seed-demo.mjs` (unos 30 segundos). Al final se ve una tabla con los saldos: Lucía 70, Tomás 100, Mateo 40 (60 reservados), Valentina 150.
2. **Hacer administradora a Valentina.** En Supabase → SQL Editor → New query, pegá `update public.usuario set rol = 'ADMINISTRADOR' where email = 'valentina@mercadolibro.demo';` y apretá Run. El reset no le quita el rol, así que alcanza con hacerlo una vez.
3. **Comprobar.** Entrá como Valentina en la app: en el menú de la izquierda tiene que aparecer **Administración**. Cerrá sesión.

### Checklist 10 minutos antes

1. **Abrí Chrome** en una ventana normal (no de incógnito) y cerrá cualquier otra pestaña de la app.
2. **Despertá el servidor de búsqueda de libros.** En la barra de direcciones pegá `https://mercadolibro-51uh.onrender.com/api/libro/google-books/isbn/9780141036144` y apretá Enter.
   - Si tarda, esperá: puede demorar hasta 1 minuto porque el servidor gratuito "duerme" cuando nadie lo usa.
   - Está listo cuando ves un texto largo que empieza con `{"googleBooksId"` y contiene `Nineteen Eighty Four`.
3. **Limpiá los datos viejos de la app** (solo si alguna vez la abriste en esta computadora).
   - Entrá a `https://mercadolibro-demo.vercel.app`.
   - Hacé clic en el ícono que está a la izquierda de la dirección (un candado o dos rayitas) → **Configuración del sitio** → botón **Borrar datos** → confirmá.
   - Volvé a la pestaña de la app y apretá F5 para recargar.
4. **Probá que todo ande:** entrá como Lucía (email y contraseña de la tabla) y esperá 5 segundos.
   - Tenés que ver "¡Te damos la bienvenida, Lucía Fernández!", **70 pts** arriba a la derecha y un circulito con el número **2** al lado de "Mis Intercambios" en el menú de la izquierda.
   - Si no ves eso, no arranques: andá a la sección "Plan B" al final.
5. **Salí:** clic en **Cerrar sesión** (texto rojo, abajo a la izquierda). Queda la pantalla "Iniciar Sesión" lista para empezar.

**Nunca durante la demo:** no abras otra pestaña ni otro navegador para cambiar de usuario, y no borres los datos del sitio. Todo se guarda en Supabase, pero dos pestañas con usuarios distintos se pisan la sesión y confunden al público.

## Cómo es la pantalla

Una vez que entrás con un usuario, la pantalla siempre tiene un menú a la izquierda y una barra arriba. El guión nombra cada botón tal como aparece acá.

| N° | Qué es | Para qué se usa |
| --- | --- | --- |
| 1 | Botón marrón **Publicar un Libro** | Abre el formulario para publicar un libro. |
| 2 | **Catálogo** | Muestra todos los libros publicados. |
| 3 | **Mis Intercambios** | Pedidos recibidos, enviados, en curso e historial. El circulito con número indica cuántos pedidos esperan respuesta. |
| 4 | **Tracker de Libros** | Libros que el usuario quiere conseguir. |
| 5 | **Cadenas Circulares** | Explicación del algoritmo de intercambios entre 3 o más personas. |
| 6 | **Notificaciones** | Avisos (pedidos nuevos, pedidos aceptados o rechazados). Aparece un circulito rojo si hay avisos sin leer. |
| 7 | **Cerrar sesión** (rojo) | Sale del usuario actual para entrar con otro. |
| 8 | Buscador "Buscar título, autor o género..." | Filtra el catálogo mientras escribís. |
| 9 | Saldo (por ejemplo "70 pts") | Puntos disponibles del usuario. **Miralo después de cada operación**: es la forma más rápida de mostrar que algo pasó. |
| 10 | Nombre del usuario con su foto | Abre su perfil: puntos, publicaciones, reseñas y movimientos. |
| 11 | **Filtros** | Abre filtros por estado del libro y puntos máximos. |
| 12 | Etiqueta de color de cada libro | El "semáforo": verde = precio justo u oportunidad, amarillo = un poco caro, rojo = caro. |

Cuando hacés una acción, abajo en el centro aparece durante 3 segundos un cartelito blanco con un tilde (en el guión le decimos "cartel de confirmación"). Leelo en voz alta: es la prueba de que la acción se guardó.

## Parte 1 — Crear una cuenta nueva y entrar como Lucía (3 min)

**Qué contar:** "Cualquiera puede registrarse y recibe 100 puntos de regalo para su primer intercambio. Los puntos reemplazan al dinero."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 1.1 | Arrancás en la pantalla **Iniciar Sesión**. | Un recuadro blanco con "MercadoLibro", los campos "Email o nombre de usuario" y "Contraseña" y el botón marrón "Ingresar a la plataforma". |
| 1.2 | Debajo del botón marrón, clic en el texto **Registrate acá**. | Cambia a la pantalla "Creá tu cuenta", con un aviso amarillo que dice "¡100 puntos virtuales de regalo!". |
| 1.3 | Clic en el campo **Nombre completo** y escribí `Sofía Demo`. | El texto aparece en el campo. |
| 1.4 | Clic en **Nombre de usuario** y escribí `sofiademo`. | — |
| 1.5 | Clic en **Email** y escribí `sofia1@mercadolibro.demo`. Si ya se usó en un ensayo, cambiá el número: `sofia2@...`, `sofia3@...`. | — |
| 1.6 | En **Contraseña** y en **Confirmar contraseña** escribí `Demo2026!`. | Se ven puntitos. |
| 1.7 | Clic en el botón marrón **Crear cuenta y recibir 100 pts**. Esperá hasta 5 segundos. | Dice "Creando cuenta..." y después aparece la pantalla de bienvenida con **SALDO EN TU BILLETERA 100 pts**. Abajo sale el cartel "¡Cuenta creada con éxito! Recibiste 100 puntos de bienvenida." |
| 1.8 | Clic en **Cerrar sesión** (rojo, abajo a la izquierda). | Cartel "Sesión cerrada." y vuelve la pantalla Iniciar Sesión. |
| 1.9 | Mostrá que la contraseña se valida: en el campo de email escribí `lucia@mercadolibro.demo`, en contraseña `incorrecta` y clic en **Ingresar a la plataforma**. | Aparece en rojo "Email o contraseña incorrectos". No entra. |
| 1.10 | Borrá la contraseña (clic en el campo, Ctrl+A y Suprimir), escribí `Demo2026!` y clic en **Ingresar a la plataforma**. Esperá 5 segundos. | Pantalla "¡Te damos la bienvenida, Lucía Fernández!" con **70 pts**. En el menú de la izquierda, "Mis Intercambios" tiene un circulito con el número **2**. |

Si en el paso 1.7 aparece "Ya existe una cuenta registrada con este correo", cambiá el número del email y volvé a hacer clic.

## Parte 2 — Recorrer el catálogo (3 min)

**Qué contar:** "El catálogo muestra los libros de toda la comunidad. Cada libro tiene un semáforo que compara los puntos que pide el dueño con un valor de referencia, calculado según el estado del libro."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 2.1 | En el menú de la izquierda, clic en **Catálogo**. | Título "Libros Disponibles" y el texto "Mostrando 15 libros". Tarjetas con la tapa del libro, título, autor, estado y puntos. |
| 2.2 | Señalá con el mouse las etiquetas de color de arriba a la derecha de cada tarjeta. | Verdes "Valor: Justo" u "Oportunidad" (por ejemplo El principito, 30 pts); amarillas "Valor: Levemente elevado" (Cosmos y Breve historia del tiempo, 75 pts); rojas "Valor: Elevado" (El señor de las moscas, 1984). |
| 2.3 | Mostrá las tarjetas Clean Code, El Hobbit y El principito. | Tienen encima un cartel blanco **EN INTERCAMBIO**: están reservadas por pedidos en curso. |
| 2.4 | Clic en el buscador de arriba ("Buscar título, autor o género...") y escribí `Borges`. | Dice "Mostrando 1 libros" y queda una sola tarjeta: **El Aleph** (Jorge Luis Borges, Nuevo, 80 pts). |
| 2.5 | Borrá lo que escribiste en el buscador. | Vuelven los 15 libros. |
| 2.6 | Clic en el botón **Filtros** (arriba a la derecha, debajo del saldo). En "Estado Físico" clic en **Nuevo**. | Quedan 3 libros en estado Nuevo: El Aleph, El laberinto de los espíritus y un Harry Potter de 90 pts. |
| 2.7 | Clic en **Limpiar filtros**. | Vuelven los 15 libros. |
| 2.8 | Clic en la tarjeta **Cosmos** (Carl Sagan). | Se abre una ventana con la tapa grande, "Estado: Muy bueno", ISBN 9780345539434, el comentario del dueño, **75 pts** con la etiqueta amarilla "Levemente elevado", el dueño (Tomas, 5.0 estrellas) y los botones "Solicitar (75 pts)" y "Trueque Directo". |
| 2.9 | Cerrá la ventana con la **X** de arriba a la derecha. | Volvés al catálogo. |

Los botones de categoría de arriba del catálogo (Ficción, Ciencia, etc.) ya funcionan: un clic en **Ciencia** deja Cosmos, Breve historia del tiempo y El hombre que confundió a su mujer con un sombrero. Volvé a **Todas** antes de seguir.

## Parte 3 — Publicar un libro buscando su ISBN (3 min)

**Qué contar:** "Para publicar alcanza con el ISBN, el código que tiene todo libro atrás. La app busca título, autor y editorial en Google Books, y mientras escribís los puntos te avisa si el precio es justo."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 3.1 | Clic en el botón marrón **Publicar un Libro** (arriba a la izquierda). | Pantalla "Publicar un Libro" con los campos ISBN del libro, Estado físico, Puntos solicitados y Descripción. |
| 3.2 | Debajo del campo ISBN, al lado de "Probar ejemplos:", clic en el botón violeta chiquito **Cien años de soledad**. Esperá hasta 10 segundos. | El ISBN se completa solo (978-84-204-7183-9) y aparece un recuadro violeta con la tapa, **Cien años de soledad**, Gabriel García Márquez, Alfaguara y "Los datos se guardarán junto con la publicación." El campo de puntos se completa solo con 57. |
| 3.3 | En **Estado físico** (una lista desplegable que dice "Muy bueno"), clic y elegí **Como nuevo**. Fijate que en Categoría diga Ficción (la sugiere Google Books); si está vacía, elegila: es obligatoria. | La lista muestra "Como nuevo". |
| 3.4 | Clic en el campo **Puntos solicitados**, borrá el número y escribí `120`. | A la derecha, "EVALUACIÓN DE PRECIO" se pone en rojo: **Valor: Elevado**, con un valor de referencia de 75 pts. |
| 3.5 | Borrá el 120 y escribí `60`. | Pasa a verde: **Valor: Justo**. |
| 3.6 | En **Descripción y estado (opcional)** escribí `Edición de la RAE, tapa dura`. | — |
| 3.7 | Bajá con la rueda del mouse y clic en el botón marrón **Publicar Libro**. | Dice "Guardando..." un segundo, vuelve al catálogo y sale el cartel "Cien años de soledad se publicó y guardó en Supabase." El contador dice "Mostrando 16 libros" y el libro nuevo está entre las tarjetas (si no lo ves, escribí `soledad` en el buscador). |
| 3.8 | Clic en esa tarjeta nueva. | Se abre la ventana del libro. Como es de Lucía, en vez de "Solicitar" muestra los botones **Modificar Publicación** y **Eliminar**. |
| 3.9 | Clic en **Modificar Publicación**. Cambiá los puntos de 60 a `55` y clic en **Guardar cambios**. | Cartel "Publicación actualizada en Supabase." y la tarjeta muestra 55 pts. |
| 3.10 | (Opcional, solo si sobra tiempo) Abrí de nuevo la tarjeta → **Eliminar** → el botón cambia a **¿Confirmar?** → clic de nuevo. | Cartel "Publicación eliminada de Supabase." y el libro desaparece del catálogo (vuelven a ser 15). |

Si en el paso 3.2 tarda más de 10 segundos o aparece un error, hacé clic en el ejemplo **1984**. Si también falla, escribí los puntos igual y publicá: el libro queda guardado aunque sin título.

## Parte 4 — Seguir un libro en el Tracker (1 min)

**Qué contar:** "Si buscás un libro, lo agregás al Tracker con el máximo de puntos que querés pagar, y la app te muestra quién lo tiene publicado."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 4.1 | En el menú de la izquierda, clic en **Tracker de Libros**. | Pantalla "Tracker de Libros" con el mensaje "No tenés libros en seguimiento actualmente". |
| 4.2 | Clic en el botón **Seguir nuevo libro**. | Se abre un formulario con Título del libro, Autor, Categoría, Puntos Máximos y Estados físicos aceptables. |
| 4.3 | En **Título del libro** escribí `Aleph`. En **Puntos Máximos** escribí `90`. El resto dejalo como está. | — |
| 4.4 | Clic en **Guardar en Tracker**. | Cartel "Aleph se agregó a tu Tracker de libros seguidos." Aparece una tarjeta "Aleph" que dice **Coincidencias encontradas (1)**: El Aleph, Nuevo, de Valentina, 80 pts. |
| 4.5 | (Opcional) Clic en esa coincidencia. | Se abre la ventana del libro El Aleph. Cerrala con la X. |

## Parte 5 — Lucía pide "Sapiens" por puntos (2 min)

**Qué contar:** "Cuando pido un libro, mis puntos no se pierden ni pasan al dueño enseguida: quedan apartados en garantía hasta que confirmo que recibí el libro."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 5.1 | Menú izquierdo → **Catálogo**. Buscá la tarjeta **Sapiens: De animales a dioses** (Yuval Noah Harari, 45 pts) y hacé clic. Si no la ves, escribí `Sapiens` en el buscador. | Ventana del libro con la etiqueta verde "Valor: Justo", dueño Tomas y el botón marrón **Solicitar (45 pts)**. |
| 5.2 | Clic en **Solicitar (45 pts)**. | Se abre la ventana "Iniciar Solicitud de Trueque" con la opción **Por Puntos** marcada y el detalle: "Tus puntos disponibles: 70 pts", "Puntos a reservar en garantía: - 45 pts", "Saldo disponible resultante: 25 pts" y el aviso "Garantía segura". |
| 5.3 | Leé en voz alta el aviso de garantía y clic en el botón marrón **Enviar Solicitud**. | Cartel "¡Solicitud enviada! Se reservaron 45 puntos de tu saldo." El saldo de arriba a la derecha pasa de 70 a **25 pts**. |
| 5.4 | Si quedó abierta la ventana del libro, cerrala con la X. Mostrá en el catálogo la tarjeta de Sapiens. | Ahora tiene el cartel **EN INTERCAMBIO**. |
| 5.5 | Menú izquierdo → **Mis Intercambios**. Arriba hay pestañas: clic en **Enviadas**. | Una tarjeta **POR PUNTOS · PENDIENTE**: libro solicitado Sapiens, "45 Puntos en Garantía", solicitante Lucía Fernández. |

**No hagas clic** en "Cancelar Solicitud": si se cancela, Tomás no tiene nada que aceptar en la Parte 7.

## Parte 6 — Lucía responde los pedidos que recibió (3 min)

**Qué contar:** "Hay dos formas de intercambiar: por puntos, o un trueque directo libro por libro. El dueño decide si acepta o rechaza; si rechaza, todo vuelve a como estaba."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 6.1 | Seguimos en **Mis Intercambios**. Clic en la pestaña **Recibidas** (tiene un circulito con el 2). | Dos tarjetas. La primera dice **DIRECTO**: "Libro solicitado: El principito" y "Libro a cambio: El Hobbit, ofrecido por Tomas". La segunda dice **POR PUNTOS**: "Libro solicitado: Clean Code", "60 Puntos en Garantía", "Solicitante: Mateo". Cada una tiene los botones "Rechazar" y "Aceptar Solicitud". |
| 6.2 | En la tarjeta **DIRECTO** (la de Tomás), clic en **Rechazar** (botón blanco). No pide confirmación. | Cartel "Solicitud rechazada. Puntos y libros liberados." La tarjeta desaparece de Recibidas. |
| 6.3 | En la tarjeta **POR PUNTOS** (la de Mateo), clic en el botón marrón **Aceptar Solicitud**. | Cartel "Has aceptado el intercambio. El libro queda bloqueado para entrega." Recibidas queda vacía. |
| 6.4 | Clic en la pestaña **En Curso**. | Tarjeta de Clean Code con la etiqueta **EN CURSO** y el botón **Confirmar Entrega del Libro**. |
| 6.5 | Clic en **Confirmar Entrega del Libro**. Contalo así: "Lucía ya le dio el libro a Mateo". | Cartel "Has confirmado la entrega. Esperando confirmación de recepción del comprador." En la tarjeta aparece "Entrega registrada (Esperando recepción del comprador)". |
| 6.6 | Clic en **Catálogo** y mostrá El principito y El Hobbit. | Ya no tienen el cartel "EN INTERCAMBIO": al rechazar el trueque, los dos libros volvieron a estar disponibles. |
| 6.7 | Clic en el nombre **Lucía** con su foto (arriba a la derecha). | Su perfil: **PUNTOS DISPONIBLES 25**, **EN GARANTÍA 45** (los apartados para Sapiens). |
| 6.8 | Clic en **Cerrar sesión** (rojo, abajo a la izquierda). | Vuelve la pantalla Iniciar Sesión. |

## Parte 7 — Entrar como Tomás y aceptar el pedido de Lucía (2 min)

**Qué contar:** "Ahora somos Tomás, el dueño de Sapiens. Le llegaron avisos de lo que hizo Lucía."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 7.1 | En Iniciar Sesión escribí el email `tomas@mercadolibro.demo` y la contraseña `Demo2026!`. Clic en **Ingresar a la plataforma** y esperá 5 segundos. | "¡Te damos la bienvenida, Tomás Rivero!" con **100 pts**. En el menú, "Notificaciones" tiene un circulito rojo con el **2**. |
| 7.2 | Clic en **Notificaciones** (abajo a la izquierda). | Dos avisos marcados "Nueva": **Solicitud rechazada** ("Tu propuesta de intercambio con Lucía Fernández no fue aceptada.") y **Nueva solicitud de intercambio por puntos** ("Lucía Fernández solicitó tu libro "Sapiens: De animales a dioses" por 45 puntos."). |
| 7.3 | Menú izquierdo → **Mis Intercambios** → pestaña **Recibidas**. | Una tarjeta **POR PUNTOS · PENDIENTE**: Sapiens, "45 Puntos en Garantía", solicitante Lucia. |
| 7.4 | Clic en **Aceptar Solicitud**. | Cartel "Has aceptado el intercambio. El libro queda bloqueado para entrega." |
| 7.5 | Pestaña **En Curso** → clic en **Confirmar Entrega del Libro** ("Tomás ya le dio el libro a Lucía"). | Cartel "Has confirmado la entrega. Esperando confirmación de recepción del comprador." |
| 7.6 | Pestaña **Historial**. | El trueque que Lucía rechazó aparece como **RECHAZADO**. |
| 7.7 | Clic en **Cerrar sesión**. | Vuelve la pantalla Iniciar Sesión. |

El saldo de Tomás sigue en 100: los 45 puntos de Lucía recién le llegan cuando ella confirme que recibió el libro (Parte 9).

## Parte 8 — Entrar como Mateo, confirmar que recibió el libro y calificar (2 min)

**Qué contar:** "Mateo ya tiene Clean Code en la mano. Cuando confirma que lo recibió, los puntos pasan a Lucía y los dos ganan un bono. Después puede dejar una reseña."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 8.1 | Entrá con `mateo@mercadolibro.demo` / `Demo2026!` y esperá 5 segundos. | Bienvenida a Mateo con **40 pts** (tiene otros 60 apartados en garantía por Clean Code). "Notificaciones" con un circulito rojo. |
| 8.2 | Clic en **Notificaciones**. | Aviso **¡Intercambio aceptado!**: "Lucía Fernández aceptó tu solicitud de intercambio. Podés coordinar la entrega y confirmar recepción." |
| 8.3 | Menú izquierdo → **Mis Intercambios** → pestaña **En Curso**. | Tarjeta de Clean Code con el botón **Confirmar Recepción (+10 pts)**. |
| 8.4 | Clic en **Confirmar Recepción (+10 pts)**. | Cartel "¡Intercambio completado con éxito! Recibieron un bono de +10 puntos cada uno." El saldo pasa a **50 pts**. Se abre sola la ventana **Calificar a Lucia**, con las 5 estrellas ya marcadas ("Excelente experiencia (5/5)"). |
| 8.5 | Clic en el cuadro **Comentario sobre el trueque** y escribí `Llegó impecable, súper recomendable`. El comentario es obligatorio. | — |
| 8.6 | Clic en **Publicar Calificación**. | Cartel "¡Reseña publicada! Ganaste +5 puntos por colaborar con la comunidad." El saldo pasa a **55 pts**. |
| 8.7 | Pestaña **Historial**. | Clean Code como **COMPLETADO**, con la leyenda "Calificado". |
| 8.8 | Clic en **Cerrar sesión**. | Vuelve la pantalla Iniciar Sesión. |

Si en 8.4 se cerró la ventana de calificación sin querer, en **Historial** está el botón **Calificar (+5 pts)** para abrirla de nuevo.

## Parte 9 — Volver a Lucía, cerrar su compra y mostrar el perfil (3 min)

**Qué contar:** "Volvemos a Lucía. Cobró los 60 puntos de Clean Code, Tomás le aceptó el pedido y ahora confirma que recibió Sapiens."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 9.1 | Entrá con `lucia@mercadolibro.demo` / `Demo2026!` y esperá 5 segundos. | Saldo **95 pts**. Explicalo: tenía 25, cobró 60 por Clean Code y ganó 10 de bono. |
| 9.2 | Clic en **Notificaciones**. | Aviso **¡Intercambio aceptado!**: "Tomás Rivero aceptó tu solicitud de intercambio..." |
| 9.3 | Menú izquierdo → **Mis Intercambios** → pestaña **En Curso**. | Tarjeta de Sapiens con el botón **Confirmar Recepción (+10 pts)**. |
| 9.4 | Clic en **Confirmar Recepción (+10 pts)**. | Cartel de intercambio completado. Saldo **105 pts**: los 45 apartados pasan a Tomás y Lucía gana 10 de bono. Se abre la ventana **Calificar a Tomas**. |
| 9.5 | Clic en la cuarta estrella (para mostrar que se puede cambiar), escribí `Buen trato, el libro tenía el lomo un poco gastado` y clic en **Publicar Calificación**. | Cartel "¡Reseña publicada!...". Saldo **110 pts**. |
| 9.6 | Pestaña **Historial**. | Cuatro tarjetas: Sapiens (COMPLETADO, "Calificado"), El principito (RECHAZADO), Clean Code (COMPLETADO) y Harry Potter, comprado antes a Valentina (COMPLETADO). Estas dos últimas tienen el botón "Calificar (+5 pts)": no hace falta usarlo. |
| 9.7 | Clic en el nombre **Lucía** (arriba a la derecha). | Perfil con **PUNTOS DISPONIBLES 110** y **EN GARANTÍA 0**. |
| 9.8 | En el perfil, clic en la pestaña **Reseñas**. | La reseña de Mateo Gómez: 5 estrellas, libro Clean Code y su comentario. |
| 9.9 | Clic en la pestaña **Movimientos**. | La lista de cada movimiento de puntos con su saldo: reserva de garantía (−45), puntos recibidos (+60), bonos de intercambio (+10), transferencia a Tomás y bono por reseña (+5). |
| 9.10 | Menú izquierdo → **Cadenas Circulares**. | Texto que explica el algoritmo de cadenas entre 3 o más personas y el mensaje "No hay cadenas activas en este momento". Contalo como funcionalidad en desarrollo: todavía no detecta cadenas entre usuarios reales. |
| 9.11 | Clic en **Cerrar sesión**. | Vuelve la pantalla Iniciar Sesión. Seguí con la Parte 10. |

**Resumen de saldos al terminar:** Lucía 110 · Tomás 155 (100 + 45 + 10 de bono) · Mateo 55 · Valentina 150.

## Parte 10 — Reportar una publicación y resolverlo como administradora (4 min)

**Qué contar:** "Si algo sale mal, cualquier usuario puede reportar una publicación, a otro usuario o un intercambio. Un administrador revisa el reporte, decide qué hacer y la plataforma le avisa a quien reportó."

| Paso | Qué hacer | Qué tenés que ver |
| --- | --- | --- |
| 10.1 | Entrá con **lucia@mercadolibro.demo** / **Demo2026!**. Menú izquierdo → **Catálogo** → clic en la tarjeta **El señor de las moscas** (William Golding, de Mateo, 50 pts). | Ventana del libro. Abajo de los botones hay un texto gris chico con una banderita: **Reportar publicación**. |
| 10.2 | Clic en **Reportar publicación**. | Ventana "Reportar publicación" con tres motivos: Publicación engañosa o con datos falsos, Intento de fraude y Otro motivo. |
| 10.3 | Elegí **Publicación engañosa o con datos falsos**. En **¿Qué pasó?** escribí `Dice que solo tiene anotaciones, pero le faltan páginas.` (pide al menos 10 letras). | — |
| 10.4 | Clic en **Enviar reporte**. | Cartel "Reporte enviado. Un administrador lo va a revisar y te avisamos por notificación." |
| 10.5 | Clic en **Cerrar sesión**. Entrá con **valentina@mercadolibro.demo** / **Demo2026!**. | En el menú de la izquierda aparece **Administración** (los usuarios comunes no lo ven) y "Notificaciones" tiene un circulito rojo: le avisó el reporte nuevo. |
| 10.6 | Clic en **Administración**. | "Panel de administración" con cuatro pestañas: **Reportes (1)**, Intercambios estancados, Reportes generales y Cuentas suspendidas. |
| 10.7 | Mostrá la tarjeta del reporte. | "PUBLICACIÓN", el motivo, "Lucía reportó a Mateo" con el ISBN, el texto que escribió Lucía y la etiqueta **Abierto**. |
| 10.8 | En la lista **Acción** elegí **Dar de baja la publicación**. En el cuadro de resolución escribí `Revisamos la publicación y la dimos de baja.` Clic en **Resolver**. | Cartel "Reporte cerrado y notificado." El reporte sale de la lista de abiertos. |
| 10.9 | Pestaña **Reportes generales**. | Tarjetas con usuarios, publicaciones disponibles, puntos en circulación y reputación promedio; intercambios por estado, categorías con más publicaciones y usuarios más activos. Contalo como el tablero para seguir la salud de la plataforma. |
| 10.10 | Pestaña **Intercambios estancados**. | Intercambios aceptados que llevan días sin movimiento, para que el administrador los cancele y devuelva los puntos. Puede estar vacío: en la demo todos los intercambios se cerraron. |
| 10.11 | Menú izquierdo → **Catálogo**. Buscá `moscas`. | El señor de las moscas ya no aparece: se dio de baja. |
| 10.12 | Clic en **Cerrar sesión**. | Fin de la demo. |

Si sobra tiempo, entrá de nuevo como Lucía y abrí **Notificaciones**: tiene el aviso de que su reporte se resolvió, con la respuesta de Valentina.

No uses **Suspender al usuario reportado** en la demo: Mateo no podría publicar ni pedir libros hasta que alguien lo reactive desde **Cuentas suspendidas**.

## Plan B y limitaciones conocidas

| Situación | Qué pasa | Qué hacer |
| --- | --- | --- |
| El backend de Render está "dormido" | El plan gratis apaga el servicio tras 15 min sin uso; la primera búsqueda por ISBN tarda ~1 min. | Abrir la URL de salud del backend 3–5 min antes de empezar y esperar a que devuelva JSON. |
| Google Books sin cuota (HTTP 429) | La cuota diaria de la API key se agota y se renueva a medianoche hora del Pacífico. | No hace falta nada: el frontend cae automáticamente a Open Library y muestra título, autor y editorial igual. Usar los ejemplos "Cien años de soledad" o "1984". Si la categoría no se completa sola, elegirla a mano. |
| Valentina no ve **Administración** en el menú | Su cuenta no tiene el rol de administradora. | Correr el paso 2 de la Preparación en el SQL Editor de Supabase y volver a entrar con Valentina. |
| Al enviar el reporte sale un error de reporte repetido | Quedó un reporte de un ensayo anterior. | Resetear los datos (paso 1 de la Preparación): el reset borra los reportes de los usuarios de demo. |
| "Cadenas Circulares" está vacío | Las cadenas solo se generan entre los usuarios de prueba locales, no entre usuarios reales. | Presentar la pantalla como explicación del algoritmo (RF46). |
| Aparece un "Harry Potter and the Philosopher's Stone" de 90 pts | Es una publicación de prueba anterior de otra cuenta. | Ignorarla, o borrarla desde esa cuenta antes de la demo. |
| Hay que repetir la demo | Los intercambios ya quedaron completados y la publicación de Mateo, dada de baja. | Repetir el paso 1 de la Preparación (reset y seed, unos 30 segundos). Registrar al usuario nuevo con otro email (sofia2@mercadolibro.demo). |
