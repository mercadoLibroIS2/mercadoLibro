# Test suite de Postman

## Objetivo y alcance

La colección `postman/MercadoLibro.postman_collection.json` verifica los contratos HTTP que existen en el backend Java actual: disponibilidad, autenticación JWT, perfil, puntos, notificaciones y publicaciones. Los casos se ejecutan contra una instancia local y una base de datos descartable.

La ejecución crea un usuario QA único, conserva su token en variables de colección y crea una publicación con el ISBN `9788437604572`. Al final edita y elimina esa publicación y cierra la sesión. No ejecutar contra producción ni contra una base con datos relevantes.

## Preparación y ejecución

1. Iniciar el backend con la base de datos local configurada y disponible en `http://localhost:8086` (puerto predeterminado del backend).
2. Importar `postman/MercadoLibro.postman_collection.json` en Postman.
3. Ejecutar la colección completa con Collection Runner, respetando el orden de las carpetas.
4. Cambiar `baseUrl` si la API escucha en otra URL. No es necesario completar manualmente usuario, email ni token.

La publicación usa un ISBN conocido por el servicio de importación y por las pruebas del repositorio. Si el entorno no puede consultar el proveedor bibliográfico y el libro no existe en la base, ese caso puede fallar con `LibroNoExiste`; la suite no convierte esa respuesta en un aprobado.

## Matriz de casos ejecutables

| ID | Área / contrato | Caso | Resultado esperado |
| --- | --- | --- | --- |
| API-01 | Disponibilidad | `GET /api/test/ping` | HTTP 200 y `{status: "ok", message: "pong"}` |
| AUTH-01 | `UsuarioRequestDTO`, `AuthResponseDTO` | Registro válido | HTTP 201, identidad, token, rol y puntos |
| AUTH-02 | `UsuarioRequestDTO` | Nombre/email/contraseña inválidos | HTTP 400, `ValidationError` |
| AUTH-03 | `UsuarioRequestDTO` | Email duplicado | HTTP 409, `UsuarioYaExiste` |
| AUTH-04 | `LoginRequestDTO`, `AuthResponseDTO` | Login por nombre | HTTP 200 y token |
| AUTH-05 | `LoginRequestDTO`, `AuthResponseDTO` | Login por email | HTTP 200 y email del usuario |
| AUTH-06 | `LoginRequestDTO` | Contraseña incorrecta | HTTP 401 sin token |
| AUTH-07 | `AuthResponseDTO` | Refrescar token válido | HTTP 200, token e identidad |
| USER-01 | `PerfilResponseDTO` | Consultar `/api/usuario/me` | HTTP 200, identidad y saldos |
| PTS-01 | `SaldoPuntosResponseDTO` | Consultar saldo | HTTP 200 y los tres saldos |
| PTS-02 | `MovimientoPuntosResponseDTO` | Consultar historial | HTTP 200 y lista |
| NOTIF-01 | `Page<NotificacionResponseDTO>` | Listar no leídas | HTTP 200 y `content` como lista |
| NOTIF-02 | Notificaciones | Contar no leídas | HTTP 200 y número |
| PUB-01 | `PublicacionRequestDTO`, `PublicacionResponseDTO` | Publicar con datos válidos | HTTP 201, ID compuesto y campos calculados |
| PUB-02 | `PublicacionRequestDTO` | Campos obligatorios inválidos | HTTP 400, `ValidationError` |
| PUB-03 | Seguridad | Publicar sin JWT | HTTP 401 o 403 |
| PUB-04 | Publicaciones | Listar disponibles sin JWT | HTTP 200 y lista |
| PUB-05 | Publicaciones | Listar propias | HTTP 200 e incluye la publicación QA |
| PUB-06 | `PublicacionIdParams` | Consultar detalle | HTTP 200 e ID compuesto |
| PUB-07 | Publicaciones | Editar publicación propia | HTTP 204 |
| PUB-08 | Publicaciones | Eliminar publicación propia | HTTP 204 |
| AUTH-08 | Seguridad | Logout con JWT | HTTP 200 y cuerpo vacío |

## DTOs y flujos fuera de esta colección

No se inventan solicitudes para DTOs cuyos datos base no pueden prepararse de forma reproducible con la API actual. Quedan como pendientes hasta disponer de fixtures o endpoints de soporte:

| Área | Motivo |
| --- | --- |
| `IntercambioRequestDTO` / `IntercambioResponseDTO` | Crear un intercambio requiere dos publicaciones pertenecientes a usuarios distintos y luego una secuencia de estados; la colección actual solo crea un usuario. |
| `CompraRequestDTO` / `CompraResponseDTO` | Requiere una publicación vendedora y un flujo de pago/envío/entrega con actores y estados adicionales. |
| `ReseniaRequestDTO` / `ReseniaResponseDTO` | El servicio exige un intercambio completado; no hay un fixture HTTP aislado para prepararlo. |
| `CadenaIntercambioRequestDTO` / `CadenaIntercambioResponseDTO` | El endpoint existe, pero sus operaciones de aceptar/rechazar requieren participantes y permisos que no se generan en esta corrida. |
| `Notificacion` marcar/archivar | El listado y el conteo son reproducibles; marcar una notificación requiere conocer un ID generado por un evento de negocio. |
| `GoogleBookVolumeDTO` | Las búsquedas dependen de un proveedor externo y no son necesarias para validar el flujo local de publicación. |

`LibroRequestDTO` no es el contrato usado para publicar actualmente; `LibroResponseDTO` sí se conserva en la respuesta de libros seguidos, pero ese flujo no crea datos nuevos y queda fuera de esta corrida. `OfertaIntercambio*` y `NotificacionRequestDTO` tampoco tienen operaciones ejecutables en sus controladores actuales. No se mantienen casos contra rutas antiguas.

## Variables y aislamiento

La colección usa estas variables:

- `baseUrl`: URL de la API.
- `testUsername`, `testEmail`, `testPassword`: credenciales efímeras del usuario QA.
- `token`, `userId`: datos capturados al registrar o autenticar.
- `publicationIsbn`, `publicationOwner`, `publicationTime`: identificador compuesto capturado al publicar.

Cada corrida agrega un usuario y una publicación. El caso de eliminación usa el identificador compuesto devuelto por la API; no borra publicaciones ajenas.

## Evidencia y criterio de aceptación

Guardar el resultado exportado del Collection Runner con fecha, URL, versión/commit y observaciones. Una corrida es aceptada cuando todos los casos ejecutables pasan; los flujos declarados fuera de alcance se registran como limitaciones y no como aprobados.

| Corrida | Fecha/hora | Versión/commit | URL | Aprobados/fallidos | Evidencia | Observaciones |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Pendiente | Pendiente | Local / `http://localhost:8086` | Pendiente | Pendiente | Pendiente |
