import { AggregateRoot } from '@platform/shared-kernel';
// Evento que emite el Feed Service al recibir una nueva publicación vía bus
export class JobFeedItemProjectedEvent {
    aggregateId;
    payload;
    eventId = generateUUID();
    eventName = 'jobfeed.item_projected';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
function generateUUID() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
export class JobFeedItem extends AggregateRoot {
    constructor(props, id) {
        super(props, id);
    }
    static create(props, id) {
        if (!props.title || props.title.trim().length < 5) {
            throw new Error('El título debe tener al menos 5 caracteres');
        }
        if (props.budgetMin < 0 || props.budgetMax < props.budgetMin) {
            throw new Error('El rango de presupuesto no es válido');
        }
        const item = new JobFeedItem({ ...props }, id);
        item.addDomainEvent(new JobFeedItemProjectedEvent(item.id.toString(), {
            feedItemId: item.id.toString(),
            jobId: props.jobId,
            title: props.title,
            category: props.category,
            modalidad: props.modalidad,
            location: props.location ?? 'Remoto (Colombia)',
            source: props.source ?? 'TRUSTPAY',
        }));
        return item;
    }
    get jobId() { return this.props.jobId; }
    get title() { return this.props.title; }
    get description() { return this.props.description; }
    get category() { return this.props.category; }
    get modalidad() { return this.props.modalidad; }
    get clientId() { return this.props.clientId; }
    get clientName() { return this.props.clientName; }
    get budgetMin() { return this.props.budgetMin; }
    get budgetMax() { return this.props.budgetMax; }
    get currency() { return this.props.currency; }
    get tags() { return this.props.tags; }
    get isOpen() { return this.props.isOpen; }
    get publishedAt() { return this.props.publishedAt; }
    get location() { return this.props.location ?? 'Remoto (Colombia)'; }
    get source() { return this.props.source ?? 'TRUSTPAY'; }
    get companyName() { return this.props.companyName ?? this.props.clientName; }
    get sourceUrl() { return this.props.sourceUrl; }
    markClosed() {
        this.props.isOpen = false;
    }
    markOpen() {
        this.props.isOpen = true;
    }
}
// ==========================================
// 3. CASOS DE USO
// ==========================================
export class PublishToFeedUseCase {
    feedRepo;
    eventBroker;
    constructor(feedRepo, eventBroker) {
        this.feedRepo = feedRepo;
        this.eventBroker = eventBroker;
    }
    async execute(dto) {
        const existing = await this.feedRepo.findByJobId(dto.jobId);
        if (existing)
            throw new Error(`El trabajo ${dto.jobId} ya está publicado en el feed`);
        const item = JobFeedItem.create({
            jobId: dto.jobId,
            title: dto.title,
            description: dto.description,
            category: dto.category,
            modalidad: dto.modalidad,
            clientId: dto.clientId,
            clientName: dto.clientName,
            budgetMin: dto.budgetMin,
            budgetMax: dto.budgetMax,
            currency: dto.currency ?? 'COP',
            tags: dto.tags ?? [],
            isOpen: true,
            publishedAt: new Date(),
            location: dto.location ?? 'Remoto (Colombia)',
            source: dto.source ?? 'TRUSTPAY',
            companyName: dto.companyName ?? dto.clientName,
            sourceUrl: dto.sourceUrl,
        });
        await this.feedRepo.save(item);
        await this.eventBroker.publishAll(item.domainEvents);
        item.clearDomainEvents();
        return this.toDTO(item);
    }
    toDTO(item) {
        return {
            id: item.id.toString(),
            jobId: item.jobId,
            title: item.title,
            description: item.description,
            category: item.category,
            modalidad: item.modalidad,
            clientId: item.clientId,
            clientName: item.clientName,
            budgetMin: item.budgetMin,
            budgetMax: item.budgetMax,
            currency: item.currency,
            tags: item.tags,
            isOpen: item.isOpen,
            publishedAt: item.publishedAt,
            location: item.location,
            source: item.source,
            companyName: item.companyName,
            sourceUrl: item.sourceUrl,
        };
    }
}
export class QueryJobFeedUseCase {
    feedRepo;
    constructor(feedRepo) {
        this.feedRepo = feedRepo;
    }
    async execute(filter = {}) {
        const items = await this.feedRepo.query(filter);
        return items.map((item) => ({
            id: item.id.toString(),
            jobId: item.jobId,
            title: item.title,
            description: item.description,
            category: item.category,
            modalidad: item.modalidad,
            clientId: item.clientId,
            clientName: item.clientName,
            budgetMin: item.budgetMin,
            budgetMax: item.budgetMax,
            currency: item.currency,
            tags: item.tags,
            isOpen: item.isOpen,
            publishedAt: item.publishedAt,
            location: item.location,
            source: item.source,
            companyName: item.companyName,
            sourceUrl: item.sourceUrl,
        }));
    }
}
export class CloseFeedItemUseCase {
    feedRepo;
    constructor(feedRepo) {
        this.feedRepo = feedRepo;
    }
    async execute(jobId) {
        await this.feedRepo.markClosed(jobId);
    }
}
// ==========================================
// 4. PROYECTOR CQRS (EVENT SUBSCRIBER)
// ==========================================
export class JobFeedProjector {
    broker;
    publishUseCase;
    closeUseCase;
    constructor(broker, publishUseCase, closeUseCase) {
        this.broker = broker;
        this.publishUseCase = publishUseCase;
        this.closeUseCase = closeUseCase;
    }
    setupSubscriptions() {
        this.broker.subscribe('job.created', async (event) => {
            const p = event.payload;
            if (!p || !p.jobId)
                return;
            try {
                await this.publishUseCase.execute({
                    jobId: p.jobId,
                    title: p.title,
                    description: p.description || `Publicación activa en TrustPay en la categoría ${p.category || 'General'}.`,
                    category: p.category || 'Tecnología y Software',
                    modalidad: p.modalidad || 'REMOTO',
                    clientId: p.clientId,
                    clientName: p.clientName || 'Cliente TrustPay',
                    companyName: p.clientName || 'Cliente TrustPay',
                    budgetMin: p.budget || 500,
                    budgetMax: p.budget || 500,
                    currency: p.currency || 'USD',
                    tags: ['Escrow Protegido', 'TrustPay'],
                    location: p.location || 'Remoto (Colombia)',
                    source: 'TRUSTPAY',
                });
            }
            catch {
                // Idempotencia si el feed ya lo proyectó
            }
        });
        this.broker.subscribe('job.completed', async (event) => {
            const p = event.payload;
            if (p?.jobId) {
                await this.closeUseCase.execute(p.jobId);
            }
        });
        this.broker.subscribe('job.cancelled', async (event) => {
            const p = event.payload;
            if (p?.jobId) {
                await this.closeUseCase.execute(p.jobId);
            }
        });
    }
}
// ==========================================
// 5. ADAPTADORES EN MEMORIA
// ==========================================
export class InMemoryJobFeedRepository {
    items = new Map();
    async save(item) {
        this.items.set(item.id.toString(), item);
    }
    async findById(id) {
        return this.items.get(id) ?? null;
    }
    async findByJobId(jobId) {
        for (const item of this.items.values()) {
            if (item.jobId === jobId)
                return item;
        }
        return null;
    }
    async query(filter) {
        let results = Array.from(this.items.values());
        if (filter.onlyOpen !== false) {
            results = results.filter((i) => i.isOpen);
        }
        if (filter.category) {
            results = results.filter((i) => i.category.toLowerCase().includes(filter.category.toLowerCase()));
        }
        if (filter.modalidad) {
            results = results.filter((i) => i.modalidad === filter.modalidad);
        }
        if (filter.location) {
            const loc = filter.location.toLowerCase();
            results = results.filter((i) => i.location.toLowerCase().includes(loc));
        }
        if (filter.source) {
            results = results.filter((i) => i.source === filter.source);
        }
        if (filter.budgetMin !== undefined) {
            results = results.filter((i) => i.budgetMax >= filter.budgetMin);
        }
        if (filter.budgetMax !== undefined) {
            results = results.filter((i) => i.budgetMin <= filter.budgetMax);
        }
        if (filter.searchText) {
            const q = filter.searchText.toLowerCase();
            results = results.filter((i) => i.title.toLowerCase().includes(q) ||
                i.description.toLowerCase().includes(q) ||
                i.location.toLowerCase().includes(q) ||
                i.companyName.toLowerCase().includes(q) ||
                i.tags.some((t) => t.toLowerCase().includes(q)));
        }
        // Ordenar por más reciente
        return results.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    }
    async markClosed(jobId) {
        const item = await this.findByJobId(jobId);
        if (item) {
            item.markClosed();
            await this.save(item);
        }
    }
    clear() {
        this.items.clear();
    }
}
// ==========================================
// 6. CATÁLOGO INICIAL DEL MERCADO COLOMBIANO
// ==========================================
export const VACANTES_COLOMBIA_DEMO = [
    {
        jobId: 'comp-co-001',
        title: 'Desarrollador Full Stack Node.js / React Senior',
        description: 'Empresa de tecnología en expansión busca desarrollador Full Stack con más de 3 años de experiencia en Node.js, TypeScript y React. Diseño de arquitecturas limpias y APIs seguras.',
        category: 'Tecnología y Software',
        modalidad: 'REMOTO',
        clientId: 'empresa-sofka',
        clientName: 'Talento Tech Colombia',
        companyName: 'Sofka Technologies',
        budgetMin: 8500000,
        budgetMax: 12000000,
        currency: 'COP',
        tags: ['React', 'Node.js', 'TypeScript', 'Remoto'],
        location: 'Medellín, Antioquia (Remoto)',
        source: 'COMPUTRABAJO',
        sourceUrl: 'https://co.computrabajo.com',
    },
    {
        jobId: 'comp-co-002',
        title: 'Diseñador UI/UX & Producto Digital',
        description: 'Diseño de experiencias web y móviles en Figma, creación de sistemas de diseño escalables y prototipado enfocado en el usuario final.',
        category: 'Diseño y Multimedia',
        modalidad: 'HIBRIDO',
        clientId: 'empresa-fintech-bogota',
        clientName: 'Innovación Bancaria',
        companyName: 'Fintech Hub Bogotá',
        budgetMin: 5500000,
        budgetMax: 7800000,
        currency: 'COP',
        tags: ['Figma', 'UI/UX', 'Design Systems', 'Híbrido'],
        location: 'Bogotá D.C. — Chapinero',
        source: 'ELEMPLEO',
        sourceUrl: 'https://www.elempleo.com/co',
    },
    {
        jobId: 'comp-co-003',
        title: 'Especialista en Marketing Digital y Pauta Meta / Google Ads',
        description: 'Gestión de campañas de captación B2B y eCommerce, optimización de ROI, análisis de métricas en GA4 y diseño de embudos de conversión.',
        category: 'Marketing y Ventas',
        modalidad: 'REMOTO',
        clientId: 'empresa-agencia-growth',
        clientName: 'Growth Partners',
        companyName: 'Agencia Digital Caribe',
        budgetMin: 3800000,
        budgetMax: 5200000,
        currency: 'COP',
        tags: ['Google Ads', 'Meta Ads', 'SEO', 'Analytics'],
        location: 'Barranquilla, Atlántico (Remoto)',
        source: 'MAGNETO',
        sourceUrl: 'https://www.magneto365.com/co',
    },
    {
        jobId: 'comp-co-004',
        title: 'Asistente Contable y Facturación Electrónica DIAN',
        description: 'Manejo de software contable (Siigo / World Office), conciliaciones bancarias, nómina electrónica y cumplimiento de obligaciones tributarias en Colombia.',
        category: 'Administración y Finanzas',
        modalidad: 'PRESENCIAL',
        clientId: 'empresa-contadores-valle',
        clientName: 'Asesorías Financieras del Valle',
        companyName: 'Consultores Contables Cali',
        budgetMin: 2200000,
        budgetMax: 3000000,
        currency: 'COP',
        tags: ['Siigo', 'Facturación DIAN', 'Impuestos', 'Contabilidad'],
        location: 'Cali, Valle del Cauca',
        source: 'COMPUTRABAJO',
        sourceUrl: 'https://co.computrabajo.com',
    },
    {
        jobId: 'comp-co-005',
        title: 'Desarrollador Python / Backend FastAPI & Soluciones IA',
        description: 'Integración de modelos LLM con OpenAI y LangChain, construcción de pipelines de datos y microservicios desplegados en Docker y AWS.',
        category: 'Tecnología y Software',
        modalidad: 'REMOTO',
        clientId: 'empresa-nexus-ai',
        clientName: 'Nexus AI Colombia',
        companyName: 'Nexus Labs Bogotá',
        budgetMin: 9000000,
        budgetMax: 14000000,
        currency: 'COP',
        tags: ['Python', 'FastAPI', 'IA', 'Docker'],
        location: 'Remoto (Colombia)',
        source: 'LINKEDIN',
        sourceUrl: 'https://co.linkedin.com/jobs',
    },
    {
        jobId: 'comp-co-006',
        title: 'Representante de Servicio al Cliente Bilingüe (Inglés C1)',
        description: 'Atención a usuarios internacionales vía chat y llamadas. Bonos por desempeño, plan de carrera y estabilidad laboral garantizada.',
        category: 'Atención al Cliente y Call Center',
        modalidad: 'HIBRIDO',
        clientId: 'empresa-bpo-global',
        clientName: 'BPO Americas',
        companyName: 'Teleperformance Colombia',
        budgetMin: 3200000,
        budgetMax: 4500000,
        currency: 'COP',
        tags: ['Bilingüe', 'Customer Support', 'Inglés C1'],
        location: 'Bucaramanga, Santander',
        source: 'COMPUTRABAJO',
        sourceUrl: 'https://co.computrabajo.com',
    },
    {
        jobId: 'tp-co-007',
        title: 'Desarrollo de Pasarela de Pagos PSE y Wompi (Custodia Escrow)',
        description: 'Proyecto directo en TrustPay: Integración de pasarela de pagos colombiana (PSE, Wompi, Nequi) en tienda virtual existente. Pago garantizado en custodia TrustPay Escrow.',
        category: 'Tecnología y Software',
        modalidad: 'REMOTO',
        clientId: 'founder-techventures',
        clientName: 'Tech Ventures Inc',
        companyName: 'Tech Ventures Inc (TrustPay)',
        budgetMin: 4500000,
        budgetMax: 6000000,
        currency: 'COP',
        tags: ['PSE', 'Wompi', 'Nequi', 'TrustPay Escrow'],
        location: 'Bogotá D.C. (Remoto)',
        source: 'TRUSTPAY',
    },
];
