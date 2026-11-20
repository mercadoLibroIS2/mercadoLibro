# Pruebas E2E Playwright — P5: Catálogo, Google Books y cadenas

## Alcance

La suite está en `frontend/e2e/p5-catalog-chains.spec.ts` y prueba la
implementación actual en dos capas:

1. **Frontend determinista**, con Next.js y respuestas mockeadas en el límite
   REST. No depende de Google Books ni de datos persistentes del backend.
2. **Contratos REST de cadenas**, opcionales y ejecutados contra el backend
   real cuando se define `P5_API_URL`.

El catálogo usa `SEED_BOOKS`. Para la UI se preparan cadenas con `generateInitialChains`
y un servidor REST simulado conserva aceptaciones y recepciones entre sesiones. En la
aplicación con sesión real, las cadenas y su estado provienen del backend; `localStorage`
conserva una copia de la respuesta para la interfaz.

## Requisitos

### Pruebas de frontend

No es necesario iniciar manualmente el backend. Desde `frontend`:

```bash
npm run test:e2e:p5
```

La configuración levanta Next.js en `http://127.0.0.1:3101`. Se puede
personalizar con `P5_APP_URL`.

### Pruebas REST de cadenas

Para ejecutar también los dos casos de contrato contra Spring Boot:

1. Iniciar el backend en `http://127.0.0.1:8086`.
2. Ejecutar:

```bash
P5_API_URL=http://127.0.0.1:8086 npm run test:e2e:p5
```

Los casos crean usuarios con emails únicos, por lo que no necesitan datos
semilla. Si `P5_API_URL` no está definido, esos dos casos quedan omitidos y
la capa frontend sigue ejecutándose.

## Cobertura

| Área | Escenarios |
|---|---|
| Catálogo | Listado completo; búsqueda por título, autor e ISBN; filtros por categoría, disponibilidad y puntos; limpieza de filtros; estado sin resultados; ficha con metadatos y publicación reservada; autocomplete desde dos caracteres y exclusión de publicaciones no disponibles. |
| Seguimiento | Alta de un libro con título, autor, tope de puntos, condición y nota; detección de una publicación coincidente; consulta de la lista y baja del seguimiento. Cubre HU 4.2, HU 4.3 y parte de HU 4.4. |
| Google Books | ISBN válido en el formulario de publicación, autocompletado de título/autor/categoría/metadatos y sugerencia de puntos; ISBN con formato inválido; ISBN sin resultados (404); error del proveedor (503) mostrado al usuario. |
| Cadenas en UI | Ciclo de tres participantes con libros distintos; relación entrega/recibe cerrada; visibilidad restringida a participantes; aceptación hasta intercambio en curso; recepción individual y finalización solo tras recibir todos; rechazo persistente hasta `CANCELADA`; ausencia de ciclo cuando falta una publicación disponible. |
| Cadenas REST | Creación `POST /api/cadenaIntercambio` con estado `PROPUESTA`; aceptación de una cadena manual sin libros hasta `EN_CURSO`, sin finalización automática; rechazo mediante `PATCH .../rechazar`; listado autenticado. |

## Mock de Google Books

Los casos de navegador interceptan específicamente
`GET /api/libro/google-books/isbn/{isbn}`. Esto evita depender de cuotas,
latencia o disponibilidad de Google/Open Library, pero conserva el contrato
que consume `apiFindGoogleBookByIsbn`. También se prueban explícitamente las
respuestas 404 y 503; no se convierten en éxitos silenciosos.

## Limitaciones conocidas

- La suite de interfaz simula el servidor. La detección real, la consolidación de duplicados
  persistidos, los bloqueos hasta commit y las aceptaciones/recepciones concurrentes de tres y
  cuatro usuarios se verifican en `CadenasPostgresConcurrencyTest`, con una base PostgreSQL
  exclusiva y desechable.
- El tracker aplica los criterios guardados a las publicaciones disponibles
  en la store; la generación automática de notificaciones para una nueva
  publicación no está expuesta como flujo REST reproducible y queda fuera de
  esta suite.
- Los casos REST no prueban la disponibilidad de un proveedor externo de
  Google Books; esa dependencia se cubre mediante mocks en la UI. La
  integración externa se prueba de forma aislada en el backend.
- La ejecución contra una base H2 compartida puede dejar usuarios y cadenas
  creados por los casos REST. Los identificadores y emails son únicos para
  evitar colisiones.

## Concurrencia real en PostgreSQL

`CadenasPostgresConcurrencyTest` se habilita con `CHAIN_TEST_POSTGRES_URL`. El test usa
`create-drop`: la base debe ser exclusiva de pruebas. Preparar los dominios PostgreSQL
`estado_intercambio`, `tipo_movimiento` y `tipo_notificacion` como `VARCHAR(50)` antes de
iniciar; Hibernate crea el resto del modelo.

```bash
cd ingenieriaSoftware2
CHAIN_TEST_POSTGRES_URL=jdbc:postgresql://localhost:55439/chain_test \
CHAIN_TEST_POSTGRES_USER=postgres \
CHAIN_TEST_POSTGRES_PASSWORD=chain_test \
./mvnw -Dtest=CadenasPostgresConcurrencyTest test
```

Comprueba que una segunda instancia espera el commit de la primera detección, que ambas
ven el mismo ID, que no se pierden confirmaciones concurrentes, que aceptar reserva sin
bonificar, que recibir completa con un único bono de +50 por persona y que los duplicados
anteriores se consolidan sin perder aceptaciones.
