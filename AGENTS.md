# AGENTS.md — Sistema de Contrataciones (TrustPay Escrow)

Plataforma de contratación de servicios con pagos en custodia (escrow) tipo two-sided marketplace: clientes publican trabajos, prestadores ofertan y la plataforma retiene el dinero hasta aprobar la entrega. Es una demostración académica de Arquitectura Hexagonal (Ports & Adapters) con microservicios orientados a eventos (EDA).

## Stack y estructura

- TypeScript 5.5 (strict, module NodeNext) sobre Node 24; monorepo con **npm workspaces**.
- Vitest 2 (tests), React 18 + Vite 5 (frontend), amqplib 2 (adaptador RabbitMQ), Docker Compose (RabbitMQ 3 + PostgreSQL 16, aún sin usar desde el código).
- `packages/shared-kernel` — único paquete compartido: `Money` (centavos), `UniqueEntityID`, `AggregateRoot`, `InMemoryEventBroker`, `RabbitMQEventBroker`. Los servicios no se importan entre sí (solo `event-choreography` conoce a todos).
- `packages/event-choreography` — `MarketplaceEventCoordinator`: la saga por coreografía que sincroniza estados entre servicios.
- `services/*` — 6 servicios (`user`, `job`, `bidding`, `escrow`, `review`, `job-feed`), cada uno con las mismas 4 capas numeradas en un único `src/index.ts`: (1) Dominio, (2) Puertos, (3) Casos de uso, (4) Adaptadores.
- `services/job-feed-service` — read model (CQRS) del muro de trabajos; no es fuente de verdad.
- `apps/web` — frontend React que instancia todo en memoria con el broker in-memory y muestra la saga en vivo. Autenticación por email/contraseña + modo invitado de solo lectura (`LoginScreen.tsx`).
- Todo es in-memory: sin servidor HTTP ni persistencia. La sesión vive solo en estado de React (recargar la página la pierde).

## Comandos

```bash
npm test              # Vitest: 12 archivos / 51 tests — deben pasar todos
npm run test:watch    # Vitest en modo watch
npm run build         # Compila todo (tsc -b)
npm run dev           # Frontend Vite (apps/web)
docker compose up -d  # RabbitMQ (5672, panel 15672 guest/guest) + PostgreSQL (5432)
```

## Autenticación (user-service + apps/web)

- `PasswordHash` (VO del dominio): SHA-256 vía `crypto.subtle.digest` (async), mínimo 8 caracteres, factory `PasswordHash.fromPlain()`. Sin dependencias nuevas.
- `LoginUseCase`: busca por email, compara hash, `recordLogin()` y publica `user.logged_in`. Mensaje genérico "Credenciales inválidas" (no revela si falló el email o la contraseña).
- `LoginWithGoogleUseCase`: registra automáticamente (si no existe) o autentica al usuario por su email de Google, verifica su identidad (`user.verifyIdentity()`), registra login (`recordLogin()`) y emite los eventos correspondientes (`user.registered`, `user.verified`, `user.logged_in`). Rechaza si la cuenta está bloqueada.
- `password` es **opcional** en `RegisterUserDTO`/`User.create()` para no romper los tests legacy sin credenciales; `hasCredentials()` distingue usuarios legados.
- La contraseña es opcional en el seed del frontend: los usuarios demo sí la llevan. Credenciales demo: `founder@techventures.io` (CLIENT) / `contact@devstudio.dev` (PROVIDER) / `hkeiner663@gmail.com` (ADMIN, clave: `KhA/21GooG`) / `alarconkeiner048@gmail.com` (USER dual: Cliente y Prestador, clave: `KhA/21GooG`) / los demás usan `demo1234`.
- Modo invitado (`{ mode: 'GUEST' }`): ve marketplace, bóveda y consola de eventos, pero todo botón de acción está gated por `isClientActor`/`isProviderActor` (solo sesión AUTH); en su lugar se muestra un aviso de solo lectura.
- **React StrictMode monta los efectos dos veces**: la suscripción al broker y la semilla de usuarios usan guardas a nivel de módulo (`uiSuscritaAlBroker`, `semillaPromesa` memoizada, `manejadorEventosUI` con closure fresca) porque `InMemoryEventBroker` no tiene `unsubscribe`. Al añadir suscripciones nuevas en App.tsx, seguir ese patrón o aparecerán eventos duplicados.

## Convenciones

- **Español** en comentarios, mensajes de error, nombres y UI.
- Patrón hexagonal de 4 capas — archivo de referencia: `services/escrow-service/src/index.ts`.
- Eventos de dominio como clases que implementan `DomainEvent`; `eventName` en kebab-case con prefijo del agregado (`job.assigned`, `escrow.released`, `proposal.accepted`).
- Dinero siempre como `Money` (entero en centavos); `toDecimal()` solo al mapear DTOs.
- Repositorios in-memory implementan el `I*Repository` propio, con `clear()` para tests.
- Controllers devuelven `{ statusCode, data | error }`; no lanzan excepciones al llamador.
- Tras mutar un agregado: `repo.save()` → `broker.publishAll(agg.domainEvents)` → `agg.clearDomainEvents()`.

## Reglas de dominio / trampas conocidas

- **Comisiones**: cliente paga +3%, prestador recibe −10% (ej. base $500 → cliente $515, prestador $450, plataforma $65). Cálculo exacto en centavos en `Escrow.calculateFees` — no reimplementar.
- **Máquinas de estado estrictas**: `Job` (OPEN → ASSIGNED_PENDING_ESCROW → IN_PROGRESS → UNDER_REVIEW → COMPLETED) y `Escrow` (PENDING_DEPOSIT → FUNDS_HELD → RELEASED) lanzan error en transiciones inválidas. No relajar guardas: la saga depende de ellas.
- **Bug latente** en `services/job-service/src/index.ts:5`: el fallback de `generateUUID` llama a `globalThis.generateUUID()` (inexistente); debería ser `globalThis.crypto.randomUUID()`. No falla en Node ≥ 19, pero es incorrecto.
- **Código muerto**: la saga escucha `escrow.deposit_failed`, pero nadie emite ese evento (no existe la clase ni el caso de uso). `revertToOpen()` es inalcanzable hoy.
- **Tests duplicados**: hay `.js` y `.d.ts` compilados dentro de `src/` y `tests/` mezclados con el fuente. Vitest ejecuta `.ts` y `.js`: los "51 tests" incluyen duplicados contados dos veces (user-service y job-feed-service ya están limpios; bidding, job, escrow, review y event-choreography aún no).
- **Artefactos `.js` obsoletos ensombrecen el fuente**: si existe `src/index.js` junto a `src/index.ts`, la importación `../src/index.js` resuelve al `.js` viejo y los tests fallan con errores como "X is not a constructor" tras editar el `.ts`. Síntoma claro: el código nuevo "no existe" para la suite. Limpiar los `.js`/`.d.ts` de `src/` y `tests/` del servicio afectado (preguntar antes, ver Forma de trabajar).
- **user-service se consume desde `dist/`**: su `package.json` apunta a `dist/index.js`, así que tras editar `src/index.ts` hay que recompilar (`npx tsc -p tsconfig.json` dentro del servicio) o Vite seguirá sirviendo la versión vieja al frontend.
- **Git mal inicializado**: la raíz del repositorio detectada es `C:\Users\hkein` (home del usuario), no esta carpeta. Sin commits ni `.gitignore`.
- Estados definidos sin flujo completo: `DRAFT`, `IN_DISPUTE`, `DISPUTED`, `SPLIT_SETTLED`, `CANCELLED`, `PAYMENT_FAILED`.
- El frontend solo soporta un trabajo activo a la vez (toma el último job de la lista).
- `README.md` documenta 5 servicios; el sexto (`job-feed-service`) no aparece.

## Límites

- Sin servidor HTTP: los controllers son métodos, no endpoints REST. La autenticación es in-memory (hash en el `User` del repositorio); no hay tokens ni sesiones persistentes.
- RabbitMQ/PostgreSQL del docker-compose no están conectados a ningún servicio aún.
- `MockEscrowPaymentGateway` simula Stripe; no integrar una pasarela real sin ampliar `IPaymentGateway`.

## Forma de trabajar

- Planificar antes de tocar código cuando el cambio cruce más de un servicio o afecte la saga. Cambios pequeños y enfocados; al terminar, explicar qué cambió y cómo verificarlo.
- ✅ Siempre: seguir las 4 capas hexagonales; español en todo; `Money` para dinero; emitir eventos al mutar agregados; `npm test` tras cada cambio; mantener este archivo actualizado al descubrir nuevas trampas o convenciones.
- ⚠ Pregunta antes: dependencias nuevas, archivos nuevos fuera de la estructura existente, cambios en el formato de eventos/payloads (rompen la saga), modificar las tasas de comisión, limpiar artefactos compilados de `src/`.
- ❌ Nunca: tocar `Escrow.calculateFees` o `Money` sin tests que cubran el caso; relajar las guardas de la máquina de estados; publicar eventos fuera del patrón save→publishAll→clear; commitear `dist/` ni `.js` generados en `src/`.

## Verificación

- `npm test` → 0 fallos.
- `npm run build` → sin errores.
- Cambios de UI: `npm run dev` y recorrer el flujo completo iniciando sesión (publicar → ofertar → aceptar → depositar → entregar → aprobar → calificar) comprobando la consola de eventos del broker. Probar también: login demo, registro de cuenta nueva, modo invitado y cierre de sesión.
- Cambios en user-service: recompilar `dist/` y verificar que el frontend ve los cambios.
- Cambios en la saga: la E2E `packages/event-choreography/tests/marketplace-saga-e2e.test.ts` es la referencia del flujo completo.
