import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Building2,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  Filter,
  PlusCircle,
  SlidersHorizontal,
  ArrowUpRight,
  Sparkles,
  Layers,
  CheckCircle2,
  X,
  Coins,
  Eye,
  Users,
  Image as ImageIcon,
} from 'lucide-react';
import {
  QueryJobFeedUseCase,
  PublishToFeedUseCase,
  FeedItemResponseDTO,
  JobModalidad,
  JobSource,
} from '@platform/job-feed-service';
import { CreateJobUseCase } from '@platform/job-service';
import { SessionUser } from './LoginScreen';
import { JobPublishModal } from './JobPublishModal';
import { JobDetailModal } from './JobDetailModal';

interface JobCatalogViewProps {
  queryFeedUseCase: QueryJobFeedUseCase;
  publishFeedUseCase: PublishToFeedUseCase;
  createJobUseCase: CreateJobUseCase;
  authUser: SessionUser | null;
  onSelectTrustPayJob?: (jobId: string) => void;
  onGoToClientPublish?: () => void;
  initialSearch?: string;
  initialLocation?: string;
  initialCategory?: string;
  onBackToHome?: () => void;
  onRequireAuth?: () => void;
}

const CIUDADES_COLOMBIA = [
  'Todas las ubicaciones',
  'Bogotá D.C.',
  'Medellín, Antioquia',
  'Cali, Valle del Cauca',
  'Barranquilla, Atlántico',
  'Bucaramanga, Santander',
  'Cartagena, Bolívar',
  'Pereira, Risaralda',
  'Remoto (Colombia)',
];

const CATEGORIAS = [
  'Todas las áreas',
  'Construcción y Obras Civiles',
  'Electricidad y Redes Técnicas',
  'Soldadura y Metalmecánica',
  'Plomería e Hidrosanitarios',
  'Tecnología y Software',
  'Diseño y Multimedia',
  'Marketing y Ventas',
  'Administración y Finanzas',
  'Logística y Transporte',
  'Materiales y Suministros',
  'Atención al Cliente y Call Center',
];

const MODALIDADES: { label: string; value: JobModalidad | 'TODAS' }[] = [
  { label: 'Cualquier modalidad', value: 'TODAS' },
  { label: 'Remoto', value: 'REMOTO' },
  { label: 'Híbrido', value: 'HIBRIDO' },
  { label: 'Presencial', value: 'PRESENCIAL' },
];

const FUENTES: { label: string; value: JobSource | 'TODAS'; color: string }[] = [
  { label: 'Todas las fuentes', value: 'TODAS', color: '#94a3b8' },
  { label: 'TrustPay Escrow', value: 'TRUSTPAY', color: '#10b981' },
  { label: 'Computrabajo', value: 'COMPUTRABAJO', color: '#0ea5e9' },
  { label: 'elempleo', value: 'ELEMPLEO', color: '#6366f1' },
  { label: 'Magneto', value: 'MAGNETO', color: '#a855f7' },
  { label: 'LinkedIn', value: 'LINKEDIN', color: '#38bdf8' },
];

function formatearDinero(monto: number, moneda: string) {
  if (moneda === 'COP') {
    return `$${monto.toLocaleString('es-CO')} COP`;
  }
  return `$${monto.toLocaleString('en-US')} USD`;
}

export function JobCatalogView({
  queryFeedUseCase,
  createJobUseCase,
  authUser,
  onSelectTrustPayJob,
  initialSearch = '',
  initialLocation = '',
  initialCategory = '',
  onBackToHome,
  onRequireAuth,
}: JobCatalogViewProps) {
  const [items, setItems] = useState<FeedItemResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [avisoRol, setAvisoRol] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState(initialSearch);
  const [ciudadSel, setCiudadSel] = useState(
    initialLocation && CIUDADES_COLOMBIA.includes(initialLocation) ? initialLocation : 'Todas las ubicaciones'
  );
  const [categoriaSel, setCategoriaSel] = useState(
    initialCategory && CATEGORIAS.includes(initialCategory) ? initialCategory : 'Todas las áreas'
  );
  const [modalidadSel, setModalidadSel] = useState<JobModalidad | 'TODAS'>('TODAS');
  const [fuenteSel, setFuenteSel] = useState<JobSource | 'TODAS'>('TODAS');

  // Sincronizar filtros cuando cambian desde la portada (al hacer clic en los botones de sectores)
  useEffect(() => {
    if (initialCategory) {
      setCategoriaSel(initialCategory);
    }
    if (initialSearch !== undefined) {
      setBusqueda(initialSearch);
    }
    if (initialLocation && CIUDADES_COLOMBIA.includes(initialLocation)) {
      setCiudadSel(initialLocation);
    }
  }, [initialCategory, initialSearch, initialLocation]);

  // Modal para publicar nuevo trabajo en TrustPay
  const [modalPublicar, setModalPublicar] = useState(false);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<FeedItemResponseDTO | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const cargarTrabajos = async () => {
    try {
      setLoading(true);
      const filtros: any = {};
      if (busqueda.trim()) filtros.searchText = busqueda.trim();
      if (categoriaSel !== 'Todas las áreas') filtros.category = categoriaSel;
      if (modalidadSel !== 'TODAS') filtros.modalidad = modalidadSel;
      if (ciudadSel !== 'Todas las ubicaciones') filtros.location = ciudadSel;
      if (fuenteSel !== 'TODAS') filtros.source = fuenteSel;

      const datos = await queryFeedUseCase.execute(filtros);
      setItems(datos);
    } catch (err) {
      console.error('Error al cargar catálogo de trabajos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTrabajos();
  }, [busqueda, ciudadSel, categoriaSel, modalidadSel, fuenteSel]);

  const getBadgeFuente = (source: JobSource) => {
    switch (source) {
      case 'TRUSTPAY':
        return { label: 'TrustPay Escrow', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' };
      case 'COMPUTRABAJO':
        return { label: 'Computrabajo Colombia', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.3)' };
      case 'ELEMPLEO':
        return { label: 'elempleo.com', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.12)', border: 'rgba(129, 140, 248, 0.3)' };
      case 'MAGNETO':
        return { label: 'Magneto Empleos', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.12)', border: 'rgba(192, 132, 252, 0.3)' };
      case 'LINKEDIN':
        return { label: 'LinkedIn Colombia', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)', border: 'rgba(96, 165, 250, 0.3)' };
      default:
        return { label: source, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  return (
    <div className="catalog-wrapper">
      {/* Banner Hero */}
      <div className="catalog-hero glass-card">
        {onBackToHome && (
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={onBackToHome}
            >
              ← Volver al Inicio
            </button>
            {categoriaSel !== 'Todas las áreas' && (
              <span className="categoria-activa-pill">
                Sector seleccionado: <strong>{categoriaSel}</strong>
              </span>
            )}
          </div>
        )}
        <div className="catalog-hero-content">
          <div className="hero-badge">
            <ShieldCheck size={14} color="var(--sky-600)" />
            <span>Marketplace de Servicios & Contrataciones con Escrow</span>
          </div>
          <h1 className="catalog-title">
            Requerimientos y Proyectos con <span className="highlight-text">Pagos en Custodia</span>
          </h1>
          <p className="catalog-subtitle">
            Publica requerimientos de servicios o postula tus cotizaciones con el respaldo de la bóveda neutral de <strong>TrustPay Escrow</strong>. Garantía de pago para contratistas y aprobación previa para clientes.
          </p>
        </div>

        {/* Barra de Búsqueda Principal */}
        <div className="search-bar-container">
          <div className="search-input-box">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar servicio, oficio o especialidad (ej. Obra civil, Desarrollo Web, Electricista CONTE, DIAN)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="search-select-box">
            <MapPin size={16} color="var(--accent-cyan)" />
            <select
              value={ciudadSel}
              onChange={(e) => setCiudadSel(e.target.value)}
              className="filter-select"
            >
              {CIUDADES_COLOMBIA.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="search-select-box">
            <Briefcase size={16} color="var(--accent-primary)" />
            <select
              value={categoriaSel}
              onChange={(e) => setCategoriaSel(e.target.value)}
              className="filter-select"
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Barra de Filtros Rápidos (Pills) */}
        <div className="filters-row">
          <div className="filter-group">
            <span className="filter-group-label">Modalidad:</span>
            {MODALIDADES.map((m) => (
              <button
                key={m.value}
                className={`pill-filter ${modalidadSel === m.value ? 'active' : ''}`}
                onClick={() => setModalidadSel(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <span className="filter-group-label">Fuente:</span>
            {FUENTES.map((f) => (
              <button
                key={f.value}
                className={`pill-filter ${fuenteSel === f.value ? 'active' : ''}`}
                style={fuenteSel === f.value ? { borderColor: f.color } : {}}
                onClick={() => setFuenteSel(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Botón para publicar trabajo si es cliente */}
          <div style={{ marginLeft: 'auto' }}>
            <button
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
              onClick={() => {
                if (!authUser) {
                  if (onRequireAuth) {
                    onRequireAuth();
                  } else {
                    setAvisoRol('Inicia sesión para publicar un servicio o vacante.');
                  }
                  return;
                }
                if (authUser.role !== 'CLIENT' && authUser.role !== 'USER') {
                  setAvisoRol('Tu rol actual es Prestador. Como usuario polivalente puedes publicar cambiando a modo Cliente en la barra superior.');
                  return;
                }
                setModalPublicar(true);
              }}
            >
              <PlusCircle size={16} /> Publicar Requerimiento de Servicio
            </button>
          </div>
        </div>
      </div>

      {avisoRol && (
        <div className="alert-warning-banner" style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.85rem 1.25rem', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', color: '#92400e', fontSize: '0.88rem' }}>
          <span>{avisoRol}</span>
          <button
            type="button"
            onClick={() => setAvisoRol(null)}
            style={{ background: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {mensajeExito && (
        <div className="alert-success-banner">
          <CheckCircle2 size={18} color="#34d399" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Grid de Trabajos */}
      <div className="catalog-results-header">
        <h2>
          Catálogo de Requerimientos y Servicios Activos <span className="results-count">({items.length} disponibles)</span>
        </h2>
        <span className="results-badge">Contratación con Pagos en Escrow</span>
      </div>

      {loading ? (
        <div className="catalog-loading">
          <div className="spinner"></div>
          <p>Consultando requerimientos y servicios en Colombia...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-catalog-container">
          <div className="empty-catalog glass-card">
            <div className="empty-catalog-icon-wrap">
              <Briefcase size={38} color="#0284c7" />
            </div>
            <h3>Catálogo de Ofertas de Trabajo</h3>
            <div className="empty-catalog-sector-tag">
              Sector: <strong>{categoriaSel !== 'Todas las áreas' ? categoriaSel : 'Todas las áreas'}</strong>
            </div>
            <p className="empty-catalog-desc">
              Este espacio está listo para listar las publicaciones y ofertas de trabajo verificadas. Actualmente se mantiene vacío para definir la estructura y diseño final de las ofertas.
            </p>
            <div className="empty-catalog-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!authUser) {
                    if (onRequireAuth) {
                      onRequireAuth();
                    } else {
                      setAvisoRol('Inicia sesión para publicar un servicio o vacante.');
                    }
                    return;
                  }
                  if (authUser.role !== 'CLIENT' && authUser.role !== 'USER') {
                    setAvisoRol('Tu rol actual es Prestador. Como usuario polivalente puedes publicar cambiando a modo Cliente en la barra superior.');
                    return;
                  }
                  setModalPublicar(true);
                }}
              >
                <PlusCircle size={16} /> Publicar Nuevo Requerimiento
              </button>
              {categoriaSel !== 'Todas las áreas' && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setCategoriaSel('Todas las áreas')}
                >
                  Ver Todas las Áreas
                </button>
              )}
              {onBackToHome && (
                <button className="btn btn-secondary" onClick={onBackToHome}>
                  Volver al Inicio
                </button>
              )}
            </div>
          </div>

          {/* Boceto estructural de muestra para visualizar cómo se verán las ofertas publicadas */}
          <div className="catalog-preview-mockup-section">
            <div className="preview-mockup-title">
              <Sparkles size={16} color="#0284c7" />
              <span>Boceto de cómo se verán las ofertas cuando se publiquen:</span>
            </div>
            <div className="job-card-mockup">
              <div className="mockup-header">
                <div>
                  <span className="mockup-badge-sector">{categoriaSel !== 'Todas las áreas' ? categoriaSel : 'Construcción / Tecnología / Servicios'}</span>
                  <h4 className="mockup-job-title">[Título del Requerimiento o Servicio Solicitado]</h4>
                  <span className="mockup-client-name">Empresa o Cliente Verificado · Bogotá / Remoto</span>
                </div>
                <div className="mockup-badge-escrow">
                  <ShieldCheck size={14} /> Custodia Escrow Activa
                </div>
              </div>
              <p className="mockup-desc">
                Descripción detallada del requerimiento, entregables esperados, requerimientos técnicos y condiciones de pago en custodia neutral...
              </p>
              <div className="mockup-footer">
                <div className="mockup-price">
                  <span className="mockup-price-label">Presupuesto Protegido</span>
                  <span className="mockup-price-value">$3,500,000 COP</span>
                </div>
                <div className="mockup-btn-placeholder">
                  Enviar Propuesta / Cotizar
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="catalog-grid">
          {items.map((job) => {
            const fuenteInfo = getBadgeFuente(job.source);
            const images = (job.attachments || []).filter((a) => a.type.startsWith('image/'));

            return (
              <div key={job.id} className="job-card glass-card">
                {images.length > 0 && (
                  <div
                    className="job-card-image-preview"
                    onClick={() => setSelectedJobForDetail(job)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img src={images[0].url} alt={job.title} className="card-top-thumbnail" />
                    {images.length > 1 && (
                      <span className="card-image-count-tag">
                        <ImageIcon size={12} /> {images.length} fotos
                      </span>
                    )}
                  </div>
                )}

                <div className="job-card-header">
                  <div className="job-header-top">
                    <span
                      className="source-badge"
                      style={{
                        color: fuenteInfo.color,
                        background: fuenteInfo.bg,
                        borderColor: fuenteInfo.border,
                      }}
                    >
                      {job.source === 'TRUSTPAY' && <ShieldCheck size={12} style={{ marginRight: '4px' }} />}
                      {fuenteInfo.label}
                    </span>

                    <span className="modality-badge">
                      {job.modalidad}
                    </span>

                    {job.budgetType && (
                      <span className="budget-type-chip">
                        {job.budgetType === 'DAILY'
                          ? 'Tarifa Diaria'
                          : job.budgetType === 'HOURLY'
                          ? 'Tarifa por Hora'
                          : job.budgetType === 'NEGOTIABLE'
                          ? 'Negociable'
                          : 'Precio Fijo'}
                      </span>
                    )}
                  </div>

                  <h3
                    className="job-card-title"
                    onClick={() => setSelectedJobForDetail(job)}
                    style={{ cursor: 'pointer' }}
                    title="Ver ficha completa y requisitos"
                  >
                    {job.title}
                  </h3>

                  <div className="job-company-row">
                    <Building2 size={14} color="var(--text-muted)" />
                    <span className="job-company-name">{job.companyName}</span>
                    <span className="bullet-sep">•</span>
                    <MapPin size={14} color="var(--accent-cyan)" />
                    <span className="job-location">{job.location}</span>
                  </div>
                </div>

                <p className="job-card-description">{job.description}</p>

                {/* Requisitos clave destacados en la tarjeta */}
                {(job.requirements || (job.attachments && job.attachments.length > 0)) && (
                  <div className="card-requirements-row">
                    {job.requirements?.workerCount && (
                      <span className="req-mini-pill">
                        <Users size={12} /> {job.requirements.workerCount} vacante{job.requirements.workerCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {job.requirements?.materialsIncludedBy && (
                      <span className="req-mini-pill">
                        {job.requirements.materialsIncludedBy === 'CLIENT' ? 'Materiales Cliente' : 'A todo costo'}
                      </span>
                    )}
                    {job.attachments && job.attachments.length > 0 && (
                      <span className="req-mini-pill attachments-pill">
                        📎 {job.attachments.length} adjunto{job.attachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}

                {job.tags && job.tags.length > 0 && (
                  <div className="job-tags-container">
                    {job.tags.map((t) => (
                      <span key={t} className="job-tag">#{t}</span>
                    ))}
                  </div>
                )}

                <div className="job-card-footer">
                  <div className="job-salary-block">
                    <span className="salary-label">Rango Salarial / Presupuesto</span>
                    <span className="salary-amount">
                      {formatearDinero(job.budgetMin, job.currency)}
                      {job.budgetMax > job.budgetMin && ` - ${formatearDinero(job.budgetMax, job.currency)}`}
                    </span>
                  </div>

                  <div className="job-action-block">
                    <button
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                      onClick={() => setSelectedJobForDetail(job)}
                    >
                      <Eye size={14} /> Ficha Completa
                    </button>

                    {job.source === 'TRUSTPAY' ? (
                      <button
                        className="btn btn-success"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                        onClick={() => {
                          if (onSelectTrustPayJob) onSelectTrustPayJob(job.jobId);
                        }}
                      >
                        <ShieldCheck size={15} /> Postular con Escrow
                      </button>
                    ) : (
                      <a
                        href={job.sourceUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', textDecoration: 'none' }}
                      >
                        <span>Ver en {fuenteInfo.label.split(' ')[0]}</span>
                        <ArrowUpRight size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Publicar Trabajo en TrustPay */}
      <JobPublishModal
        isOpen={modalPublicar}
        onClose={() => setModalPublicar(false)}
        createJobUseCase={createJobUseCase}
        authUser={authUser}
        onJobPublished={cargarTrabajos}
      />

      {/* Modal para Ver Detalle Completo del Trabajo */}
      <JobDetailModal
        job={selectedJobForDetail}
        onClose={() => setSelectedJobForDetail(null)}
        onApplyEscrow={onSelectTrustPayJob}
        isProviderActor={authUser?.role === 'PROVIDER' || authUser?.role === 'USER'}
      />
    </div>
  );
}

export default JobCatalogView;
