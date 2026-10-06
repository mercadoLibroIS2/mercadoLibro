# MercadoLibro - Pruebas de DTO con Postman

## Objetivo y alcance

Verificar el contrato HTTP de los DTOs de solicitud y respuesta que la API expone actualmente, incluyendo deserialización JSON, validaciones declaradas, códigos HTTP, campos de respuesta, autenticación y errores de negocio accesibles. Las pruebas de aceptación se ejecutan contra una instancia local y una base de datos de prueba.

La colección `postman/MercadoLibro.postman_collection.json` automatiza los casos ejecutables. Está ordenada para crear un usuario QA nuevo en cada ejecución, capturar el JWT y reutilizarlo en las solicitudes protegidas. No usar una base con datos valiosos: cada ejecución agrega un usuario y un libro.

## Preparación y ejecución

1. Iniciar la aplicación con la base de datos de desarrollo local configurada y disponible en `http://localhost:8080`.
2. Importar la colección `postman/MercadoLibro.postman_collection.json` en Postman.
3. Ejecutar la colección completa con Collection Runner. El test de registro genera un usuario y email únicos; no hace falta ingresar credenciales manualmente.
4. Guardar el resultado de la ejecución y completar la tabla de evidencia de esta página.

Si el equipo usa otra URL local, cambiar la variable `baseUrl` de la colección. No ejecutar sobre producción ni reutilizar una base con datos relevantes.

## Matriz de casos ejecutables

| ID | DTO / área | Caso | Resultado esperado | Estado |
|---|---|---|---|---|
| API-01 | Disponibilidad | `GET /api/test/ping` | HTTP 200, `status=ok`, `message=pong` | Pendiente de ejecución |
| AUTH-01 | `UsuarioRequestDTO`, `AuthResponseDTO` | Registro válido | HTTP 201; ID, token, username, email, rol y puntos | Pendiente de ejecución |
| AUTH-02 | `UsuarioRequestDTO` | Nombre menor a 3, email inválido y contraseña menor a 8 | HTTP 400, `ValidationError` | Pendiente de ejecución |
| AUTH-03 | `UsuarioRequestDTO` | Nombre, email y contraseña vacíos | HTTP 400, `ValidationError` | Pendiente de ejecución |
| AUTH-04 | `UsuarioRequestDTO` | Email ya registrado | HTTP 409, `UsuarioYaExiste` | Pendiente de ejecución |
| AUTH-05 | `LoginRequestDTO`, `AuthResponseDTO` | Login por nombre | HTTP 200 y datos/token del usuario | Pendiente de ejecución |
| AUTH-06 | `LoginRequestDTO`, `AuthResponseDTO` | Login por email | HTTP 200 y datos/token del usuario | Pendiente de ejecución |
| AUTH-07 | `LoginRequestDTO` | Contraseña incorrecta | HTTP 401; no se entrega token | Pendiente de ejecución |
| AUTH-08 | `LoginRequestDTO` | Campos obligatorios vacíos | HTTP 400, `ValidationError` | Pendiente de ejecución |
| LIB-01 | `LibroRequestDTO`, `LibroResponseDTO` | Publicar libro con enums/categorías válidos y JWT | HTTP 201; valores serializados y propietario autenticado | Pendiente de ejecución |
| LIB-02 | `LibroRequestDTO` / seguridad | Publicar sin JWT | HTTP 401 o 403 | Pendiente de ejecución |
| AUTH-09 | `AuthResponseDTO` | Refrescar token válido | HTTP 200 y datos/token renovado | Pendiente de ejecución |
| AUTH-10 | Seguridad | Logout con JWT | HTTP 200 y cuerpo vacío | Pendiente de ejecución |

## DTOs sin endpoint HTTP disponible

Estos tipos están declarados en el código, pero sus controladores no exponen operaciones HTTP para recibirlos/devolverlos. No se cuentan como pruebas Postman ejecutables hasta que se implemente una ruta; enviar solicitudes inventadas produciría un 404 y no probaría el DTO.

| DTO | Situación |
|---|---|
| `ReseniaRequestDTO` | Sin endpoint que lo consuma. El endpoint existente `/api/resenia/auto` usa `ReseniaControllerDTO`. |
| `ReseniaControllerDTO` / `ReseniaResponseDTO` | Endpoint existente, pero el éxito requiere un intercambio ya creado. Actualmente no hay endpoint de intercambio para preparar ese fixture de forma reproducible; cubrir cuando exista una forma controlada de crear datos base. |
| `IntercambioRequestDTO` / `IntercambioResponseDTO` | `IntercambioController` no tiene operaciones. |
| `CadenaIntercambioRequestDTO` / `CadenaIntercambioResponseDTO` | `CadenaIntercambioController` no tiene operaciones. |
| `OfertaIntercambioRequestDTO` / `OfertaIntercambioResponseDTO` | `OfertaIntercambioController` no tiene operaciones. |
| `NotificacionRequestDTO` | `NotificacionController` no tiene operaciones. |
| `MovimientoPuntosRequestDTO` / `MovimientoPuntosResponseDTO` | `MovimientoPuntosController` no tiene operaciones. |
| `UsuarioResponseDTO` | `UsuarioController` no tiene operaciones. |

`LibroRequestDTO` actualmente no declara anotaciones de validación; la colección prueba su conversión/serialización y el flujo válido, pero no afirma reglas de obligatoriedad o rangos que no estén definidas en el DTO. `ReseniaControllerDTO` tampoco declara restricciones Bean Validation en sus campos.

## Evidencia de ejecución

Completar una fila por corrida del Collection Runner. Adjuntar o enlazar el reporte exportado/captura de Postman en Confluence.

| Corrida | Fecha/hora | Ejecutor | Ambiente / URL | Resultado (aprobados/fallidos) | Evidencia | Observaciones / defectos |
|---|---|---|---|---|---|---|
| 1 | Pendiente | Pendiente | Local / `http://localhost:8080` | Pendiente | Pendiente | Pendiente |

## Criterio de aceptación

- Todos los casos ejecutables pasan contra la versión local identificada.
- Los casos no ejecutables están explicitados como limitaciones, no como aprobados.
- Cada falla incluye request/response, versión o commit probado, fecha y evidencia adjunta.
- Registrar defectos observados por separado; una prueba fallida por una funcionalidad ausente no se marca como aprobada.

