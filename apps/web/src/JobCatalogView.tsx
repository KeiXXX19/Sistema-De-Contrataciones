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

interface JobCatalogViewProps {
  queryFeedUseCase: QueryJobFeedUseCase;
  publishFeedUseCase: PublishToFeedUseCase;
  createJobUseCase: CreateJobUseCase;
  authUser: SessionUser | null;
  onSelectTrustPayJob?: (jobId: string) => void;
  onGoToClientPublish?: () => void;
}

const CIUDADES_COLOMBIA = [
  'Todas las ubicaciones',
  'Remoto (Colombia)',
  'Bogotá D.C.',
  'Medellín, Antioquia',
  'Cali, Valle del Cauca',
  'Barranquilla, Atlántico',
  'Bucaramanga, Santander',
];

const CATEGORIAS = [
  'Todas las áreas',
  'Tecnología y Software',
  'Diseño y Multimedia',
  'Marketing y Ventas',
  'Administración y Finanzas',
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
}: JobCatalogViewProps) {
  const [items, setItems] = useState<FeedItemResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [ciudadSel, setCiudadSel] = useState('Todas las ubicaciones');
  const [categoriaSel, setCategoriaSel] = useState('Todas las áreas');
  const [modalidadSel, setModalidadSel] = useState<JobModalidad | 'TODAS'>('TODAS');
  const [fuenteSel, setFuenteSel] = useState<JobSource | 'TODAS'>('TODAS');

  // Modal para publicar nuevo trabajo en TrustPay
  const [modalPublicar, setModalPublicar] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaCat, setNuevaCat] = useState('Tecnología y Software');
  const [nuevaMod, setNuevaMod] = useState<JobModalidad>('REMOTO');
  const [nuevaCiudad, setNuevaCiudad] = useState('Bogotá D.C.');
  const [nuevoPresupuesto, setNuevoPresupuesto] = useState(3500000);
  const [nuevaMoneda, setNuevaMoneda] = useState<'COP' | 'USD'>('COP');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [publicando, setPublicando] = useState(false);
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

  const handleCrearTrabajo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || (authUser.role !== 'CLIENT' && authUser.role !== 'USER')) {
      alert('Debes iniciar sesión para publicar un trabajo o servicio en TrustPay.');
      return;
    }

    setPublicando(true);
    setMensajeExito(null);
    try {
      // El presupuesto en Money se guarda en centavos (ej: 3,500,000 COP -> 350,000,000 centavos)
      await createJobUseCase.execute({
        title: nuevoTitulo,
        description: `${nuevaDesc}\n\nUbicación: ${nuevaCiudad} | Modalidad: ${nuevaMod}`,
        category: nuevaCat,
        clientId: authUser.id,
        budget: nuevoPresupuesto,
      });

      setMensajeExito('¡Trabajo publicado con éxito! Ya está disponible en el catálogo y protegido por TrustPay Escrow.');
      setNuevoTitulo('');
      setNuevaDesc('');
      setModalPublicar(false);
      await cargarTrabajos();
    } catch (err: any) {
      alert(err.message || 'Error al publicar el trabajo');
    } finally {
      setPublicando(false);
    }
  };

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
        <div className="catalog-hero-content">
          <div className="hero-badge">
            <Sparkles size={14} color="#67e8f9" />
            <span>Mercado Laboral & Servicios Colombia</span>
          </div>
          <h1 className="catalog-title">
            Encuentra Oportunidades y Servicios con <span className="highlight-text">Pagos Protegidos</span>
          </h1>
          <p className="catalog-subtitle">
            Explora las mejores ofertas laborales de Colombia sincronizadas con <strong>Computrabajo</strong>, <strong>elempleo</strong> y contrata servicios independientes con la seguridad de custodia en <strong>TrustPay Escrow</strong>.
          </p>
        </div>

        {/* Barra de Búsqueda Principal */}
        <div className="search-bar-container">
          <div className="search-input-box">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar por cargo, habilidad (ej. React, Contabilidad, Siigo) o empresa..."
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
                  alert('Inicia sesión para publicar un servicio o vacante.');
                  return;
                }
                if (authUser.role !== 'CLIENT' && authUser.role !== 'USER') {
                  alert('Inicia sesión como cliente o usuario para publicar trabajos en TrustPay.');
                  return;
                }
                setModalPublicar(true);
              }}
            >
              <PlusCircle size={16} /> Publicar Trabajo o Servicio
            </button>
          </div>
        </div>
      </div>

      {mensajeExito && (
        <div className="alert-success-banner">
          <CheckCircle2 size={18} color="#34d399" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Grid de Trabajos */}
      <div className="catalog-results-header">
        <h2>
          Catálogo de Ofertas Disponibles <span className="results-count">({items.length} vacantes)</span>
        </h2>
        <span className="results-badge">Mercado Laboral Colombiano</span>
      </div>

      {loading ? (
        <div className="catalog-loading">
          <div className="spinner"></div>
          <p>Consultando catálogo de oportunidades laborales en Colombia...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-catalog glass-card">
          <Briefcase size={40} color="var(--text-dim)" />
          <h3>No se encontraron vacantes con los filtros seleccionados</h3>
          <p>Prueba ampliando la búsqueda o seleccionando otra ciudad colombiana.</p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setBusqueda('');
              setCiudadSel('Todas las ubicaciones');
              setCategoriaSel('Todas las áreas');
              setModalidadSel('TODAS');
              setFuenteSel('TODAS');
            }}
          >
            Restablecer Filtros
          </button>
        </div>
      ) : (
        <div className="catalog-grid">
          {items.map((job) => {
            const fuenteInfo = getBadgeFuente(job.source);
            return (
              <div key={job.id} className="job-card glass-card">
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
                  </div>

                  <h3 className="job-card-title">{job.title}</h3>

                  <div className="job-company-row">
                    <Building2 size={14} color="var(--text-muted)" />
                    <span className="job-company-name">{job.companyName}</span>
                    <span className="bullet-sep">•</span>
                    <MapPin size={14} color="var(--accent-cyan)" />
                    <span className="job-location">{job.location}</span>
                  </div>
                </div>

                <p className="job-card-description">{job.description}</p>

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
                      {formatearDinero(job.budgetMin, job.currency)} - {formatearDinero(job.budgetMax, job.currency)}
                    </span>
                  </div>

                  <div className="job-action-block">
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
      {modalPublicar && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShieldCheck size={24} color="#10b981" />
                <h3 style={{ margin: 0 }}>Publicar Oferta o Servicio en TrustPay</h3>
              </div>
              <button
                className="btn-icon"
                onClick={() => setModalPublicar(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
              Tu publicación aparecerá en el catálogo general de Colombia y el presupuesto estará protegido por el sistema de pagos en custodia (Escrow).
            </p>

            <form onSubmit={handleCrearTrabajo} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Título del Trabajo / Servicio</label>
                <input
                  className="form-control"
                  placeholder="Ej: Desarrollo de App Móvil Flutter con Pasarela de Pago"
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  required
                  minLength={5}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Área de Trabajo</label>
                  <select
                    className="form-control"
                    value={nuevaCat}
                    onChange={(e) => setNuevaCat(e.target.value)}
                  >
                    {CATEGORIAS.filter((c) => c !== 'Todas las áreas').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Modalidad</label>
                  <select
                    className="form-control"
                    value={nuevaMod}
                    onChange={(e) => setNuevaMod(e.target.value as JobModalidad)}
                  >
                    <option value="REMOTO">Remoto</option>
                    <option value="HIBRIDO">Híbrido</option>
                    <option value="PRESENCIAL">Presencial</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Ciudad / Ubicación en Colombia</label>
                  <select
                    className="form-control"
                    value={nuevaCiudad}
                    onChange={(e) => setNuevaCiudad(e.target.value)}
                  >
                    {CIUDADES_COLOMBIA.filter((c) => c !== 'Todas las ubicaciones').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Presupuesto ({nuevaMoneda})</label>
                  <input
                    type="number"
                    className="form-control"
                    value={nuevoPresupuesto}
                    onChange={(e) => setNuevoPresupuesto(Number(e.target.value))}
                    min={50000}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción de los Requisitos y Alcance</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Detalla lo que necesitas, tecnologías requeridas, fechas estimadas..."
                  value={nuevaDesc}
                  onChange={(e) => setNuevaDesc(e.target.value)}
                  required
                  minLength={20}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalPublicar(false)}
                  disabled={publicando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={publicando}
                >
                  {publicando ? 'Publicando en Catálogo...' : 'Publicar con Custodia TrustPay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobCatalogView;
