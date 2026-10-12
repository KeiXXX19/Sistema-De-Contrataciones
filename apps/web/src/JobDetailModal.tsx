import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  MapPin,
  Building2,
  Calendar,
  Clock,
  Coins,
  FileText,
  Image as ImageIcon,
  Wrench,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Briefcase,
  Layers,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { FeedItemResponseDTO } from '@platform/job-feed-service';

interface JobDetailModalProps {
  job: FeedItemResponseDTO | null;
  onClose: () => void;
  onApplyEscrow?: (jobId: string) => void;
  isProviderActor?: boolean;
}

export function JobDetailModal({
  job,
  onClose,
  onApplyEscrow,
  isProviderActor = false,
}: JobDetailModalProps) {
  if (!job) return null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const images = (job.attachments || []).filter((a) => a.type.startsWith('image/'));
  const docs = (job.attachments || []).filter((a) => a.type === 'application/pdf' || !a.type.startsWith('image/'));

  const formatearDinero = (monto: number, moneda: string) => {
    if (moneda === 'COP') {
      return `$${monto.toLocaleString('es-CO')} COP`;
    }
    return `$${monto.toLocaleString('en-US')} USD`;
  };

  const getTipoPresupuestoLabel = (tipo?: string) => {
    switch (tipo) {
      case 'HOURLY':
        return 'Tarifa por Hora';
      case 'DAILY':
        return 'Tarifa por Jornada (Día)';
      case 'NEGOTIABLE':
        return 'Presupuesto Negociable';
      case 'FIXED':
      default:
        return 'Precio Fijo por Proyecto';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card job-detail-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Cabecera del Detalle */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span
              className="source-badge"
              style={{
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                fontSize: '0.8rem',
              }}
            >
              <ShieldCheck size={14} style={{ marginRight: '4px' }} />
              {job.source === 'TRUSTPAY' ? 'TrustPay Escrow Protegido' : job.source}
            </span>
            <span className="modality-badge" style={{ fontSize: '0.8rem' }}>
              {job.modalidad}
            </span>
            <span className="category-pill-badge" style={{ fontSize: '0.8rem' }}>
              {job.category}
            </span>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Título y Entidad Contratante */}
        <div style={{ marginTop: '0.75rem' }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-bright)', lineHeight: 1.3 }}>
            {job.title}
          </h2>
          <div className="job-company-row" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            <Building2 size={16} color="var(--text-muted)" />
            <span className="job-company-name" style={{ fontWeight: 600 }}>{job.companyName}</span>
            <span className="bullet-sep">•</span>
            <MapPin size={16} color="var(--accent-cyan)" />
            <span className="job-location">{job.location}</span>
            {job.address && (
              <>
                <span className="bullet-sep">•</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Dir: {job.address}</span>
              </>
            )}
          </div>
        </div>

        {/* Galería de Imágenes si existen */}
        {images.length > 0 && (
          <div className="job-detail-gallery-section" style={{ marginTop: '1.25rem' }}>
            <div className="gallery-main-viewport">
              <img
                src={images[activeImageIndex].url}
                alt={images[activeImageIndex].name}
                className="gallery-main-img"
              />
              {images.length > 1 && (
                <div className="gallery-nav-buttons">
                  <button
                    className="gallery-nav-btn prev"
                    onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    title="Imagen anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    className="gallery-nav-btn next"
                    onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                    title="Imagen siguiente"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
              <span className="gallery-counter">
                {activeImageIndex + 1} / {images.length}
              </span>
            </div>

            {images.length > 1 && (
              <div className="gallery-thumbs-row">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    className={`gallery-thumb-btn ${idx === activeImageIndex ? 'active' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    <img src={img.url} alt={img.name} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resumen Financiero y de Custodia */}
        <div className="job-detail-budget-banner" style={{ marginTop: '1.25rem' }}>
          <div className="budget-banner-left">
            <span className="budget-type-tag">{getTipoPresupuestoLabel(job.budgetType)}</span>
            <div className="budget-amount-display">
              {formatearDinero(job.budgetMin, job.currency)}
              {job.budgetMax > job.budgetMin && ` - ${formatearDinero(job.budgetMax, job.currency)}`}
            </div>
            {job.estimatedDuration && (
              <div className="budget-duration-hint">
                <Clock size={13} /> Duración estimada: <strong>{job.estimatedDuration}</strong>
              </div>
            )}
          </div>

          <div className="budget-banner-right">
            <div className="escrow-guarantee-badge">
              <Lock size={16} color="#10b981" />
              <div>
                <strong>Bóveda Escrow Activa</strong>
                <span>El pago se retiene en custodia y solo se libera tras tu aprobación del entregable.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Descripción y Alcance */}
        <div style={{ marginTop: '1.5rem' }}>
          <h4 className="detail-section-title">
            <FileText size={16} /> Descripción del Servicio / Trabajo
          </h4>
          <div className="job-detail-description-text" style={{ whiteSpace: 'pre-wrap' }}>
            {job.description}
          </div>
        </div>

        {/* Requisitos y Mano de Obra */}
        {job.requirements && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 className="detail-section-title">
              <Wrench size={16} /> Requisitos y Condiciones de Ejecución
            </h4>
            <div className="requirements-summary-grid">
              {job.requirements.workerCount && (
                <div className="req-card">
                  <Users size={16} color="var(--accent-primary)" />
                  <div>
                    <span className="req-label">Personal Requerido</span>
                    <strong className="req-val">{job.requirements.workerCount} persona(s)</strong>
                  </div>
                </div>
              )}

              {job.requirements.experienceLevel && (
                <div className="req-card">
                  <CheckCircle2 size={16} color="var(--accent-emerald)" />
                  <div>
                    <span className="req-label">Experiencia Requerida</span>
                    <strong className="req-val">{job.requirements.experienceLevel}</strong>
                  </div>
                </div>
              )}

              {job.requirements.materialsIncludedBy && (
                <div className="req-card">
                  <Layers size={16} color="var(--accent-amber)" />
                  <div>
                    <span className="req-label">Suministro de Materiales</span>
                    <strong className="req-val">
                      {job.requirements.materialsIncludedBy === 'CLIENT'
                        ? 'Suministrados por el Cliente'
                        : job.requirements.materialsIncludedBy === 'PROVIDER'
                        ? 'A todo costo (por el Contratista)'
                        : 'No aplica / Solo mano de obra'}
                    </strong>
                  </div>
                </div>
              )}

              {job.requirements.proposalsDeadline && (
                <div className="req-card">
                  <Calendar size={16} color="var(--sky-500)" />
                  <div>
                    <span className="req-label">Recepción de Propuestas</span>
                    <strong className="req-val">Hasta el {job.requirements.proposalsDeadline}</strong>
                  </div>
                </div>
              )}
            </div>

            {job.requirements.toolsRequired && job.requirements.toolsRequired.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <span className="detail-sublabel">Herramientas y Maquinaria Necesarias:</span>
                <div className="tools-pills-row">
                  {job.requirements.toolsRequired.map((herramienta, i) => (
                    <span key={i} className="tool-pill">
                      🔧 {herramienta}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.requirements.certificationsRequired && job.requirements.certificationsRequired.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <span className="detail-sublabel">Certificaciones y Permisos Exigidos:</span>
                <div className="tools-pills-row">
                  {job.requirements.certificationsRequired.map((cert, i) => (
                    <span key={i} className="cert-pill">
                      📜 {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Campos Dinámicos Específicos de la Categoría */}
        {job.categoryDetails && Object.keys(job.categoryDetails).length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 className="detail-section-title">
              <Briefcase size={16} /> Especificaciones Técnicas del Sector
            </h4>
            <div className="category-details-chips">
              {Object.entries(job.categoryDetails).map(([clave, valor]) => {
                if (valor === undefined || valor === null || valor === '') return null;
                return (
                  <div key={clave} className="cat-detail-chip">
                    <span className="cat-detail-key">{clave.replace(/([A-Z])/g, ' $1').toUpperCase()}:</span>
                    <span className="cat-detail-val">{typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : String(valor)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Documentos Adjuntos (PDFs) */}
        {docs.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 className="detail-section-title">
              <FileText size={16} /> Planos y Documentos Adjuntos ({docs.length})
            </h4>
            <div className="docs-list-grid">
              {docs.map((doc, i) => (
                <div key={i} className="doc-card-item">
                  <div className="doc-icon-wrap">
                    <FileText size={20} color="#ef4444" />
                  </div>
                  <div className="doc-info">
                    <strong className="doc-name">{doc.name}</strong>
                    <span className="doc-meta">
                      {(doc.size / 1024 / 1024).toFixed(2)} MB · {doc.type.split('/')[1]?.toUpperCase() || 'DOCUMENTO'}
                    </span>
                  </div>
                  <a
                    href={doc.url}
                    download={doc.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary doc-download-btn"
                    title="Ver o descargar documento"
                  >
                    Ver Documento
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags del Trabajo */}
        {job.tags && job.tags.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <div className="job-tags-container">
              {job.tags.map((t) => (
                <span key={t} className="job-tag">#{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Transparencia de Escrow & Acciones */}
        <div className="modal-actions job-detail-footer" style={{ marginTop: '2rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar Detalle
          </button>

          {job.source === 'TRUSTPAY' ? (
            <button
              type="button"
              className="btn btn-success"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
              onClick={() => {
                onClose();
                if (onApplyEscrow) onApplyEscrow(job.jobId);
              }}
            >
              <ShieldCheck size={18} />
              {isProviderActor ? 'Postular mi Propuesta con Custodia Escrow' : 'Cotizar / Postular'}
            </button>
          ) : (
            <a
              href={job.sourceUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <span>Ver en {job.source}</span>
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobDetailModal;
