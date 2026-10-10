# Plataforma de Intermediación con Escrow (Custodia de Pagos)

Sistema de contratación y pagos en custodia (*Two-Sided Marketplace*) construido bajo **Arquitectura Hexagonal (Ports & Adapters)** y **Microservicios Orientados a Eventos (EDA)**.

---

## 🏗️ Arquitectura del Sistema

```
                      [ API GATEWAY / REVERSE PROXY ]
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
   ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
   │ User & Auth   │         │     Job /     │         │   Bidding /   │
   │    Service    │         │  Publication  │         │   Proposal    │
   └───────┬───────┘         └───────┬───────┘         └───────┬───────┘
           │                         │                         │
           │         ┌───────────────┴───────────────┐         │
           │         ▼                               ▼         │
           │  ┌───────────────┐               ┌───────────────┐│
           │  │   Escrow /    │               │   Review &    ││
           │  │    Payment    │               │    Rating     ││
           │  └───────┬───────┘               └───────┬───────┘│
           │          │                               │        │
           └──────────┴──────────────┬────────────────┴────────┘
                                     │ Eventos de Dominio
                                     ▼
                        [ BROKER: RabbitMQ (Topic) ]
```

---

## 📦 Microservicios Implementados

| Microservicio | Responsabilidad | Puertos / Adaptadores |
|---|---|---|
| **`@platform/user-service`** | Perfiles (Cliente / Prestador), Roles, KYC / Verificación. | Repositorio In-Memory, Controlador HTTP, Eventos `user.registered`, `user.verified`. |
| **`@platform/job-service`** | Publicación de requerimientos, presupuestos, categorías y máquina de estados del trabajo. | Repositorio In-Memory, Controlador HTTP, Eventos `job.created`, `job.assigned`, `job.started`, `job.delivered`, `job.approved`. |
| **`@platform/bidding-service`** | Ofertas de prestadores, cotización monetaria, plazos y descarte automático de ofertas al aceptar una ganadora. | Repositorio In-Memory, Controlador HTTP, Eventos `proposal.submitted`, `proposal.accepted`, `proposal.rejected`. |
| **`@platform/escrow-service`** | Retención en custodia, pasarela de pagos mock/Stripe, cálculo matemático exacto de comisiones y liberación de fondos. | Repositorio In-Memory, Gateway de Pagos, Controlador HTTP, Eventos `escrow.created`, `escrow.deposited`, `escrow.released`. |
| **`@platform/review-service`** | Calificación mutua (1 a 5 estrellas) con comentarios y agregación de reputación media por usuario. | Repositorio In-Memory, Controlador HTTP, Eventos `review.submitted`. |
| **`@platform/shared-kernel`** | Value Objects puros (`Money` en centavos, `UniqueEntityID`), clase abstracta `AggregateRoot` y adaptador de RabbitMQ (`RabbitMQEventBroker`). | Reutilizado por todos los microservicios sin acoplamiento a infraestructura. |
| **`@platform/event-choreography`** | Orquestador de la saga de eventos que sincroniza de forma desacoplada las transiciones entre servicios. | Suscriptor de eventos de RabbitMQ / Bus de eventos. |

---

## 💰 Reglas de Comisiones y Modelo de Custodia (Escrow)

Para una oferta acordada de **$500.00 USD**:
* **Tarifa de Servicio al Cliente (3%):** $\$500 \times 0.03 = \$15.00$
  * **Total pagado por el Cliente:** **$\$515.00$**
* **Comisión de Plataforma al Prestador (10%):** $\$500 \times 0.10 = \$50.00$
  * **Neto liquidado al Prestador:** **$\$450.00$**
* **Ganancia Neta de la Plataforma:** $\$15.00 + \$50.00 =$ **$\$65.00$**

---

## 🔄 Ciclo de Vida del Trabajo y Coreografía de Eventos

1. **Cliente publica requerimiento:** `job.created` (Estado: `OPEN`).
2. **Prestador envía propuesta:** `proposal.submitted`.
3. **Cliente acepta propuesta:** `proposal.accepted`.
   * `JobService` pasa el trabajo a `ASSIGNED_PENDING_ESCROW` y emite `job.assigned`.
   * `EscrowService` escucha `job.assigned` y genera automáticamente el depósito en custodia (`PENDING_DEPOSIT`).
4. **Cliente deposita fondos:** El dinero queda retenido en `FUNDS_HELD` y emite `escrow.deposited`.
   * `JobService` escucha `escrow.deposited` y cambia el trabajo a `IN_PROGRESS` (el prestador puede trabajar seguro).
5. **Prestador entrega entregables:** `job.delivered` (Estado: `UNDER_REVIEW`).
6. **Cliente aprueba trabajo:** `job.approved` (Estado: `COMPLETED`).
   * `EscrowService` escucha `job.approved` y liquida automáticamente los fondos al prestador descontando la comisión (`RELEASED`).
7. **Calificaciones habilitadas:** Ambas partes emiten su reseña con `review.submitted` para calcular reputación.

---

## 🚀 Comandos Rápidos

### 1. Ejecutar las Pruebas Unitarias y E2E de la Saga
```bash
npm test
```

### 2. Compilar Todo el Proyecto TypeScript
```bash
npm run build
```

### 3. Levantar Infraestructura Local (RabbitMQ + PostgreSQL)
```bash
docker compose up -d
```
* **Panel de RabbitMQ:** [http://localhost:15672](http://localhost:15672) (Usuario: `guest`, Contraseña: `guest`).
* **PostgreSQL:** `localhost:5432` (Usuario: `postgres`, Contraseña: `postgrespassword`).
