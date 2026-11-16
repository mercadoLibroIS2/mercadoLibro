# Pruebas E2E Playwright — P2: Publicaciones

## Objetivo

Verificar los flujos de catálogo y publicaciones implementados actualmente en el frontend:

- Listado de publicaciones disponibles.
- Búsqueda, filtro por categoría y recuperación del estado sin resultados.
- Validación y creación de publicaciones.
- Visualización del detalle.
- Edición y eliminación de publicaciones propias.
- Restricción de acciones sobre publicaciones ajenas o reservadas.

La suite está implementada en [`frontend/e2e/p2-publications.spec.ts`](../frontend/e2e/p2-publications.spec.ts). Intercepta las solicitudes REST del frontend y usa `SEED_BOOKS` como fixture; no modifica una base real.

## Ejecución

Desde `frontend`:

```bash
npm install
npm run test:e2e:p2
```

La configuración [`frontend/playwright.p2.config.ts`](../frontend/playwright.p2.config.ts) inicia automáticamente Next.js en `http://localhost:3000`. Si falta Chromium:

```bash
npx playwright install chromium
```

También se puede usar otra URL del frontend con `P2_APP_URL`.

## Casos cubiertos

| ID | Funcionalidad | Caso | Verificaciones principales |
|---|---|---|---|
| P2-PUB-01 | Catálogo | Listado, búsqueda y filtros | Carga las publicaciones de `SEED_BOOKS`, filtra por categoría, muestra el estado sin coincidencias y permite restablecer los filtros. |
| P2-PUB-02 | Publicación | Validaciones de `PublicacionRequestDTO` | Exige ISBN y puntos; rechaza cero, negativos y fracciones; acepta un valor entero positivo. |
| P2-PUB-03 | Publicación | Creación completa | Envía ISBN, estado físico, puntos y comentario; incorpora la publicación al catálogo y muestra su detalle. |
| P2-PUB-04 | Publicación propia | Edición | Precarga el ISBN y los puntos actuales, envía `PUT /api/publicaciones/editar` y actualiza la publicación sin duplicarla. |
| P2-PUB-05 | Autorización de interfaz | Publicación ajena | Oculta modificar/eliminar para un libro de otro usuario y mantiene visible solicitar intercambio. |
| P2-PUB-06 | Publicación propia | Eliminación confirmada | Requiere una segunda confirmación, envía `DELETE /api/publicaciones/eliminar` y quita el libro del catálogo. |
| P2-PUB-07 | Regla de negocio | Publicación reservada | Impide eliminar una publicación con disponibilidad `RESERVADO` y conserva la ficha con el mensaje RF04. |

## Contrato REST simulado

La fixture intercepta estas rutas:

- `POST /api/auth/login` y `GET /api/usuario/me` para establecer un usuario autenticado.
- `GET /api/publicaciones/disponibles` para cargar el catálogo.
- `POST /api/publicaciones/publicar` con `isbn`, `estadoFisico`, `valorPuntosSolicitado` y `comentario`.
- `PUT /api/publicaciones/editar` y `DELETE /api/publicaciones/eliminar`, usando `isbn`, `emailPropietario` y `horaPublicacion` como identificador compuesto.
- `POST /api/auth/logout` para cerrar la sesión de la fixture.

Las respuestas de publicación siguen `PublicacionResponseDTO` y su `publicacionId` compuesto. Los códigos simulados son HTTP 200 para consultas/login/logout y HTTP 204 para editar/eliminar.

## Alcance y limitaciones

- Estas pruebas validan la interfaz, el store y la conversión entre el modelo de la UI y el contrato REST; no verifican persistencia, JWT real, autorización del backend ni Google Books.
- El catálogo inicial proviene de `SEED_BOOKS`; no depende de publicaciones existentes en una base externa.
- La creación, edición y eliminación modifican una base en memoria de la prueba. No prueban transacciones ni concurrencia.
- La restricción de publicación reservada se prepara en el estado local con `availability: "RESERVADO"`; no crea un intercambio real.
- La suite no cubre compras, intercambios, seguimiento de libros ni cadenas, que pertenecen a los planes P3-P6.

Los reportes y artefactos generados por Playwright quedan en `test-results/` y `playwright-report/`, excluidos de Git.
