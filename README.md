# 🛡️ TrustPay Escrow — Plataforma de Contratación con Pagos en Custodia

> **Marketplace Laboral y de Servicios con Custodia Financiera (Escrow), Arquitectura Hexagonal (Ports & Adapters), Microservicios Orientados a Eventos (EDA) y CQRS.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-green.svg?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff.svg?logo=vite)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-2.x-yellow.svg?logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-Academic%20MIT-lightgrey.svg)]()

---

## 📋 Tabla de Contenidos

1. [¿De qué va el Proyecto?](#-de-qu-va-el-proyecto)
2. [Evolución y Trabajo Realizado](#-evolucin-y-trabajo-realizado)
3. [Arquitectura del Sistema](#-arquitectura-del-sistema)
4. [Estructura del Repositorio (Monorepo)](#-estructura-del-repositorio-monorepo)
5. [Microservicios y Responsabilidades](#-microservicios-y-responsabilidades)
6. [Modelo Financiero y Reglas de Custodia (Escrow)](#-modelo-financiero-y-reglas-de-custodia-escrow)
7. [Coreografía de Eventos (Saga)](#-coreografa-de-eventos-saga)
8. [Puesta en Marcha y Comandos](#-puesta-en-marcha-y-comandos)
9. [Cómo Subir a tu Repositorio de GitHub](#-cmo-subir-a-tu-repositorio-de-github)

---

## 🎯 ¿De qué va el Proyecto?

**TrustPay Escrow** es una plataforma integral tipo *Two-Sided Marketplace* diseñada para resolver el problema fundamental de la desconfianza en la contratación de mano de obra, proyectos técnicos y servicios profesionales en Colombia y Latinoamérica:

* **Para quien Contrata (Clientes):** Publica requerimientos laborales o proyectos específicos sabiendo que su dinero **no se le entrega al prestador por adelantado**, sino que se retiene en una bóveda neutral de custodia (*Escrow*) hasta que el trabajo esté completado y aprobado a satisfacción.
* **Para quien Trabaja (Prestadores y Profesionales):** Postula sus cotizaciones sabiendo que el cliente **ya depositó y garantizó los fondos al 100%** antes de iniciar las labores, eliminando por completo el riesgo de impago o estafa al entregar.
* **Modelo Polivalente:** Los usuarios pueden actuar con identidad dual (contratar proyectos como clientes y ofertar sus propios oficios o servicios como prestadores según su conveniencia).

---

## 🛠️ Evolución y Trabajo Realizado

A lo largo del desarrollo se han implementado hitos clave:

1. **Núcleo de Dominio y Microservicios (Hexagonal + EDA):**
   - 6 microservicios autónomos (`user-service`, `job-service`, `bidding-service`, `escrow-service`, `review-service`, `job-feed-service`).
   - Paquete de kernel compartido (`packages/shared-kernel`) con `Money` exacto en centavos, `UniqueEntityID`, `AggregateRoot` y Brokers de eventos (In-Memory y RabbitMQ).
   - Saga coreografiada (`packages/event-choreography`) que mantiene consistencia eventual entre los servicios sin acoplamiento directo.

2. **Capa CQRS (Command Query Responsibility Segregation):**
   - Separación estricta entre el servicio transaccional de trabajos (`job-service`, modelo de escritura) y el servicio de muro/lectura optimizado (`job-feed-service`, read model) sincronizado por eventos de dominio.

3. **Módulo de Publicación Profesional de Trabajos:**
   - Asistente por pasos y secciones: Información general, descripción, archivos adjuntos (imágenes con previsualización/eliminación y PDFs validados), presupuestos dinámicos (fijo, por hora, jornada, negociable), fechas, ubicación departamental colombiana, modalidades de trabajo y requerimientos de seguridad/EPP.
   - Campos contextuales dinámicos según el sector seleccionado (Construcción, Tecnología, Mantenimiento, etc.).

4. **Vistas Especializadas y Navegación Homogénea:**
   - **Portada Principal (`LandingPage.tsx`):** Estilo portal de empleo tipo Computrabajo con carrusel multisectorial en tiempo real, buscador por cargo y ciudad, directorio de oficios y sección interactiva de funcionamiento del Escrow.
   - **Muro de Empleos (`JobCatalogView.tsx`):** Catálogo interactivo estilo LinkedIn Jobs con búsqueda instantánea, filtros por sector y modal detallado de postulación (`JobDetailModal.tsx`).
   - **Áreas de Trabajo (`AreasTrabajoView.tsx`):** Pestaña dedicada con los 11 sectores productivos de la economía colombiana, oficios destacados y filtros de modalidad.
   - **Tarifas y Garantía (`TarifasGarantiaView.tsx`):** Pestaña dedicada con la política transparente de comisiones (+3% cliente / −10% prestador), garantías de resolución y simulador interactivo de liquidación en vivo para COP y USD.
   - **Barra de Navegación Unificada:** Transición fluida y consistente en estilo, altura (68px) y botones entre la portada y las pestañas del sistema.

5. **Seguridad y Control de Acceso:**
   - Sistema de autenticación con hash SHA-256 (`crypto.subtle.digest`) para credenciales de acceso.
   - Integración simulada de Google OAuth (registro/login automático con verificación de identidad inmediata).
   - Modo Invitado (*Guest*) de solo lectura con avisos contextuales de seguridad.
   - Persistencia de sesión en el navegador (`sessionStorage`) para no cerrar la sesión al navegar al inicio.

6. **Calidad y Verificación:**
   - Suite completa de pruebas automatizadas con **Vitest**: **16 archivos de prueba y 122 tests pasando en verde (100% de éxito)**.
   - Compilación estricta con TypeScript 5.5 sin errores (`tsc -b`).

---

## 🏗️ Arquitectura del Sistema

El sistema implementa de forma rigurosa la **Arquitectura Hexagonal (Puertos y Adaptadores)** combinada con **Event-Driven Architecture (EDA)** y **CQRS**:

```
                              [ NAVEGADOR / FRONTEND REACT ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼ (Comandos / Mutaciones)                   ▼ (Consultas / Read Model)
             ┌────────────────────────┐                  ┌────────────────────────┐
             │       JOB-SERVICE      │                  │    JOB-FEED-SERVICE    │
             │   (Write Model - Aggr) │                  │  (Read Model - CQRS)   │
             └───────────┬────────────┘                  └───────────▲────────────┘
                         │                                           │
                         │ Publica DomainEvent                       │ Escucha DomainEvent
                         ▼                                           │
             ═════════════════════════════════════════════════════════════════════
                              EVENT BROKER (In-Memory / RabbitMQ)
             ═════════════════════════════════════════════════════════════════════
                 ▲               ▲                  ▲                  ▲
                 │               │                  │                  │
         ┌───────┴───────┐┌──────┴────────┐ ┌───────┴────────┐ ┌───────┴────────┐
         │  USER-SERVICE ││BIDDING-SERVICE│ │ ESCROW-SERVICE │ │ REVIEW-SERVICE │
         │(Auth & Perfil)││ (Propuestas)  │ │(Bóveda & Pagos)│ │ (Calificaciones)│
         └───────────────┘└───────────────┘ └────────────────┘ └────────────────┘
                 ▲                                  ▲                  ▲
                 │                                  │                  │
                 └────────────── MARKETPLACE SAGA ──┴──────────────────┘
                            (Event Choreography Coordinator)
```

### Las 4 Capas de cada Microservicio
Cada servicio en `services/*/src/index.ts` respeta la misma separación:
1. **Dominio:** Entidades, Agregados (`AggregateRoot`), Value Objects (`Money`, `JobStatus`), Reglas de Negocio invariantes y Eventos de Dominio (`DomainEvent`).
2. **Puertos:** Interfaces de repositorios (`IJobRepository`), pasarelas (`IPaymentGateway`) y publicadores de eventos (`IEventBroker`).
3. **Casos de Uso:** Implementación de flujos de negocio (`CreateJobUseCase`, `DepositEscrowUseCase`, etc.).
4. **Adaptadores:** Repositorios In-Memory, pasarelas simuladas de pago, controladores y manejadores de eventos.

---

## 📁 Estructura del Repositorio (Monorepo)

```bash
sistema-contrataciones/
├── apps/
│   └── web/                         # Frontend React 18 + Vite 5
│       ├── public/                  # Recursos e imágenes ilustrativas
│       ├── src/
│       │   ├── App.tsx              # Componente principal y enrutador de vistas
│       │   ├── LandingPage.tsx      # Portada estilo portal de empleo (Computrabajo)
│       │   ├── JobCatalogView.tsx   # Muro de empleos estilo LinkedIn Jobs
│       │   ├── AreasTrabajoView.tsx # Pestaña completa de 11 sectores productivos
│       │   ├── TarifasGarantiaView.tsx # Pestaña de política de comisiones y simulador
│       │   ├── JobPublishModal.tsx  # Asistente multi-sección de publicación
│       │   ├── JobDetailModal.tsx   # Modal detallado de requerimiento y postulación
│       │   ├── LoginScreen.tsx      # Pantalla de acceso, registro y Google Auth
│       │   ├── AdminPanel.tsx       # Panel administrativo de supervisión
│       │   ├── platform.ts          # Inicializador in-memory de microservicios
│       │   └── index.css            # Sistema de diseño, tokens y estilos
│       └── package.json
│
├── packages/
│   ├── shared-kernel/               # Núcleo compartido (Value Objects, Base Aggr, Broker)
│   └── event-choreography/          # Coordinador de la saga de eventos (Marketplace Coordinator)
│
├── services/
│   ├── user-service/                # Usuarios, roles, hash de contraseña y KYC
│   ├── job-service/                 # Publicación, ciclo de vida del trabajo y asignación
│   ├── bidding-service/             # Ofertas de prestadores, cotizaciones y plazos
│   ├── escrow-service/              # Bóveda de custodia, comisiones y liquidación
│   ├── review-service/              # Calificaciones de 1 a 5 estrellas y reputación
│   └── job-feed-service/            # Read Model optimizado para el muro de búsqueda
│
├── docker-compose.yml               # RabbitMQ 3 (5672/15672) + PostgreSQL 16 (5432)
├── tsconfig.json                    # TypeScript Project References (tsc -b)
├── vitest.config.ts                 # Configuración de pruebas
└── package.json                     # Workspaces raíz
```

---

## 💰 Modelo Financiero y Reglas de Custodia (Escrow)

El sistema aplica una regla matemática estricta calculada en **centavos** a través del Value Object `Money` para evitar errores de redondeo de punto flotante:

* **Tarifa de Servicio al Cliente:** **+3%** sobre el monto base acordado.
* **Comisión de Plataforma al Prestador:** **−10%** retenido al liquidar.
* **Sostenibilidad Total de la Plataforma:** **13%** del valor acordado.

### Ejemplo de Liquidación:
| Concepto | Monto en USD | Monto en COP (Aprox.) |
|---|---|---|
| **Monto Base Acordado del Trabajo** | **$500.00** | **$2,000,000 COP** |
| Tarifa de Plataforma al Cliente (+3%) | +$15.00 | +$60,000 COP |
| **Total Depositado por el Cliente en Custodia** | **$515.00** | **$2,060,000 COP** |
| Retención por Garantía al Prestador (−10%) | −$50.00 | −$200,000 COP |
| **Neto Transferido a la Cuenta del Prestador** | **$450.00** | **$1,800,000 COP** |
| **Ingreso Neto Plataforma (3% + 10%)** | **$65.00** | **$260,000 COP** |

---

## 🔄 Coreografía de Eventos (Saga)

La sincronización entre microservicios no utiliza llamadas HTTP directas ni bloqueantes; opera mediante **Event-Driven Architecture (EDA)**:

```
[1. Cliente publica] ──────► job.created ──────► JobFeedService indexa en el muro
                                   │
[2. Prestador cotiza] ────► proposal.submitted
                                   │
[3. Cliente acepta] ──────► proposal.accepted ─► job.assigned
                                                       │
                                 ┌─────────────────────┴─────────────────────┐
                                 ▼                                           ▼
                       JobService pasa a:                          EscrowService crea:
                   ASSIGNED_PENDING_ESCROW                       Contrato PENDING_DEPOSIT
                                 │                                           │
[4. Depósito Escrow] ────────────┼─────────────────────────────► escrow.deposited
                                 │                                           │
                                 ▼                                           ▼
                       JobService pasa a:                           Fondos retenidos en:
                           IN_PROGRESS                                  FUNDS_HELD
                                 │
[5. Entrega de labor] ────► job.delivered (Estado: UNDER_REVIEW)
                                 │
[6. Aprobación Cliente] ──► job.approved (Estado: COMPLETED)
                                 │
                                 ▼
                       EscrowService liquida:
                       escrow.released (Neto al prestador vía pasarela)
                                 │
[7. Calificación final] ──► review.submitted ──► Recálculo de reputación promedio
```

---

## 🚀 Puesta en Marcha y Comandos

### 1. Prerrequisitos
* **Node.js**: v20.x o superior (Recomendado Node 24).
* **npm**: v10.x o superior.
* **Git**: Instalado localmente.
* *(Opcional)* Docker y Docker Compose para servicios externos.

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Ejecutar las Pruebas Automatizadas
Ejecuta la suite completa de 122 pruebas unitarias y de integración:
```bash
npm test
```

Para mantener las pruebas en modo observador mientras desarrollas:
```bash
npm run test:watch
```

### 4. Compilar Todo el Proyecto
Compila todos los paquetes y microservicios mediante TypeScript Project References:
```bash
npm run build
```

### 5. Iniciar la Aplicación Web en Desarrollo
Levanta la aplicación en React con Vite:
```bash
npm run dev
```
Abre tu navegador en: [http://localhost:5173/](http://localhost:5173/)

### 6. Credenciales de Demostración Disponibles
* **Cliente Demo:** `founder@techventures.io` / Contraseña: `demo1234`
* **Prestador Demo:** `contact@devstudio.dev` / Contraseña: `demo1234`
* **Administrador:** `hkein663@gmail.com` / Contraseña: `KhA/21GooG`
* **Usuario Dual (Cliente y Prestador):** `alarconkeiner048@gmail.com` / Contraseña: `KhA/21GooG`
* **Acceso Rápido:** Puedes ingresar con **Google OAuth simulado** o como **Invitado (Modo Lectura)** directamente desde la pantalla de acceso.

---

## 🌐 Cómo Subir a tu Repositorio de GitHub

Para vincular este proyecto a tu cuenta personal de GitHub y mantener el control de versiones, sigue estos sencillos pasos:

### Paso 1: Crea un Repositorio Vacío en GitHub
1. Ingresa a tu cuenta en [GitHub](https://github.com/new).
2. Nombra tu repositorio (por ejemplo: `sistema-contrataciones` o `trustpay-escrow`).
3. **No marques** las opciones de "Add a README file", ".gitignore" ni "License" (ya que tu proyecto local ya los incluye).
4. Haz clic en **Create repository**.
5. Copia la URL de tu repositorio (HTTPS o SSH). Por ejemplo:
   `https://github.com/TU_USUARIO/sistema-contrataciones.git`

### Paso 2: Conectar y Subir desde tu Terminal Local
Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
# 1. Agregar el repositorio remoto de GitHub
git remote add origin https://github.com/TU_USUARIO/sistema-contrataciones.git

# 2. Asegurarse de estar en la rama principal
git branch -M master

# 3. Empujar todo el código y su historial a GitHub
git push -u origin master
```

¡Y listo! Tu código, historial de commits y esta documentación quedarán publicados en tu perfil de GitHub.
