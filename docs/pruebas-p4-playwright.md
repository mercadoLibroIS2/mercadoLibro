# Pruebas E2E Playwright — P4: Intercambios

## Alcance

La suite `frontend/e2e/p4-exchanges.spec.ts` llama a la API real de Spring Boot usando cuentas únicas, publicaciones creadas para cada escenario y los JWT devueltos por el registro. No simula operaciones ni limpia la base de datos. Cubre propuestas, compensación de valor, reservas de puntos, listados enviados/recibidos, aceptación, cancelación, reintento, confirmación y estados del ciclo de vida.

La API calcula la compensación como la diferencia absoluta entre los valores de referencia calculados de las dos publicaciones. Al completar el intercambio se pagan los puntos reservados y se acredita el bono implementado por el backend.

## Requisitos de datos

- Ejecutar contra una **base de datos exclusiva de pruebas**: cada ejecución registra varias cuentas y crea publicaciones persistentes.
- El backend debe estar activo y tener en su catálogo dos libros con distinto valor de referencia. Por defecto se usan ISBN `978-84-376-0457-2` y `978-987-566-646-7`.
- Para otros libros, configurar `P4_ISBN_MENOR` y `P4_ISBN_MAYOR`; sus valores de referencia con estado `NUEVO` deben ser distintos y la diferencia no debe superar los 500 puntos iniciales.
- Para ejecutar también el caso de saldo insuficiente, configurar `P4_ISBN_SALDO_INSUFICIENTE` con un libro cuyo valor de referencia supere en más de 500 puntos al ISBN menor. Si no se configura, solo ese caso queda omitido.
- No se ejecuta `reset-and-init-schema` ni se requiere exponer credenciales de base de datos a Playwright.

## Ejecución

Desde `frontend`, con una URL configurada explícitamente para una base de datos exclusiva de pruebas:

```bash
P4_API_URL=http://localhost:8086 npm run test:e2e:p4
```

Sin `P4_API_URL`, Playwright se detiene antes de iniciar las pruebas. La suite crea usuarios y publicaciones persistentes; no uses la URL de desarrollo o producción. Todos los casos se encuentran en `frontend/e2e/p4-exchanges.spec.ts`.

## Casos cubiertos

| ID | Caso | Verificaciones principales |
|---|---|---|
| P4-INT-01 | Propuesta con compensación a cargo del proponente | Calcula la diferencia, reserva al proponer y aparece como pendiente en enviados y recibidos. |
| P4-INT-02 | Compensación a cargo del receptor | No reserva al proponer; al aceptar, el receptor retiene la diferencia de su saldo disponible. |
| P4-INT-03 | Aceptación y finalización | Pasa por aceptación, primera confirmación y completado; verifica saldo, pago, bonos e historial de movimientos de ambos participantes. |
| P4-INT-04 | Cancelación pendiente y nuevo intento | Libera la reserva, registra el movimiento de liberación y permite proponer nuevamente el mismo par de publicaciones. |
| P4-INT-05 | Cancelación después de aceptar | Libera la reserva del deudor, devuelve las publicaciones a disponibilidad y permite crear una nueva propuesta. |
| P4-INT-06 | Diferencia de valor cero | Crea y acepta el intercambio sin reservar puntos. |
| P4-INT-07 | Autorización y transición inválida | Rechaza la aceptación por el proponente y el intento de aceptar un intercambio ya aceptado. |
| P4-INT-08 | Listados y estados | Los dos participantes reciben el estado pendiente, aceptado y cancelado en sus listados. |
| P4-INT-09 | Autenticación y propuesta propia | Rechaza crear intercambios sin JWT, proponer entre publicaciones propias y consultar listados sin autenticar. |
| P4-INT-10 | Publicación no disponible y cancelación repetida | Impide proponer sobre libros reservados y rechaza cancelar por segunda vez. |
| P4-INT-11 | DTO incompleto | Rechaza una propuesta a la que le falta un campo obligatorio sin modificar el saldo ni crear un intercambio. |
| P4-INT-12 | Saldo insuficiente | Con un fixture adicional de alto valor, rechaza reservar una compensación superior a los puntos disponibles y verifica que no haya mutación parcial. |

Los endpoints de listados (`/api/intercambios/enviados` y `/recibidos`) incluyen propuestas en distintos estados; la suite comprueba los estados pendientes, aceptados, cancelados y completados dentro de esas respuestas. No cubre intercambios en cadena ni compras, que corresponden a otros alcances.
