# Pruebas E2E Playwright — P2: Publicaciones

## Objetivo

La suite `frontend/e2e/p2-publications.spec.ts` comprueba los flujos de catálogo y publicaciones:

- Listado, búsqueda, filtros y estado sin resultados.
- Validación y publicación de libros con campos obligatorios y opcionales.
- Edición y eliminación de publicaciones propias.
- Restricción de acciones para libros ajenos y protección de publicaciones reservadas.

## Ejecución

Desde `frontend`:

```bash
npm run test:e2e -- e2e/p2-publications.spec.ts
```

Playwright inicia Next.js en `http://127.0.0.1:3100`. Si el navegador Chromium no está instalado:

```bash
npx playwright install chromium
```

## Casos cubiertos

| ID | Caso | Verificaciones principales |
|---|---|---|
| P2-PUB-01 | Listado, búsqueda y filtros | Aparecen las diez publicaciones iniciales; el filtro por categoría y la búsqueda actualizan resultados; se puede recuperar el catálogo tras una búsqueda sin coincidencias. |
| P2-PUB-02 | Validación de publicación | Rechaza título/autor vacíos o con espacios, puntos ausentes, cero, negativos y fraccionarios; acepta el límite inferior de un punto. |
| P2-PUB-03 | Publicación completa | Recoge campos obligatorios y opcionales, recorta espacios en título y autor, muestra la nueva ficha y persiste sus datos en el estado local. |
| P2-PUB-04 | Edición propia | Precarga los valores actuales, guarda cambios y actualiza el libro existente sin duplicarlo. |
| P2-PUB-05 | Permisos en ficha | Un usuario que no es dueño no ve edición/eliminación; el dueño sí ve ambas acciones. |
| P2-PUB-06 | Eliminación propia | Requiere confirmación y quita la publicación del catálogo. |
| P2-PUB-07 | Publicación reservada | Impide eliminar un libro con un intercambio en curso y conserva su publicación. |

## Simulación y alcance

La autenticación y las consultas REST de Supabase se interceptan con Playwright; no se usan cuentas reales ni se modifican datos remotos. Los libros parten del catálogo de demostración y las operaciones se verifican en el estado del frontend almacenado en `localStorage`. Por ello, estos E2E validan la interfaz y las reglas del estado cliente, no la persistencia o autorización del backend.
