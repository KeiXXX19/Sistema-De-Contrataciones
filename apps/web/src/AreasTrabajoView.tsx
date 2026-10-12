import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Layers,
  Filter,
  X,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { AREAS_DETALLADAS, AreaInfo } from './AreasTrabajoModal';

interface AreasTrabajoViewProps {
  onSelectCategory: (categoria: string) => void;
  onPublishCategory?: (categoria: string) => void;
  onGoToCatalog?: () => void;
  onBackToHome?: () => void;
}

export function AreasTrabajoView({
  onSelectCategory,
  onPublishCategory,
  onGoToCatalog,
  onBackToHome,
}: AreasTrabajoViewProps) {
  const [filtroTexto, setFiltroTexto] = useState('');
  const [modalidadSel, setModalidadSel] = useState<string>('TODAS');

  const areasFiltradas = AREAS_DETALLADAS.filter((area) => {
    const coincideTexto =
      area.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      area.descripcion.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      area.oficios.some((o) => o.toLowerCase().includes(filtroTexto.toLowerCase()));

    const coincideModalidad =
      modalidadSel === 'TODAS' ||
      (modalidadSel === 'Remoto' && area.modalidadesHabituales.toLowerCase().includes('remoto')) ||
      (modalidadSel === 'Presencial' && area.modalidadesHabituales.toLowerCase().includes('presencial')) ||
      (modalidadSel === 'Híbrido' && area.modalidadesHabituales.toLowerCase().includes('híbrido'));

    return coincideTexto && coincideModalidad;
  });

  return (
    <div className="catalog-wrapper areas-view-wrapper">
      {/* Banner Hero de la Pestaña */}
      <div className="catalog-hero glass-card">
        {onBackToHome && (
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={onBackToHome}
            >
              ← Volver al Inicio
            </button>
            <span className="categoria-activa-pill">
              <Layers size={14} /> 11 Sectores Productivos Activos
            </span>
          </div>
        )}

        <div className="catalog-hero-content">
          <div className="hero-badge">
            <Layers size={14} color="var(--sky-600)" />
            <span>Catálogo Nacional de Oficios & Especialidades</span>
          </div>
          <h1 className="catalog-title">
            Áreas de Trabajo & <span className="highlight-text">Sectores Laborales</span>
          </h1>
          <p className="catalog-subtitle">
            Conoce los sectores de mano de obra y servicios especializados disponibles en <strong>TrustPay Escrow Colombia</strong>. Todos los trabajos cuentan con respaldo de custodia financiera neutral y resolución imparcial.
          </p>
        </div>

        {/* Declaración del Enfoque Polivalente */}
        <div className="areas-view-poly-banner">
          <div className="areas-view-poly-icon">
            <Users size={24} color="#7c3aed" />
          </div>
          <div className="areas-view-poly-text">
            <h4>Modelo Polivalente: 1 Cuenta para Contratar y Trabajar</h4>
            <p>
              En TrustPay no necesitas cuentas separadas. Puedes publicar requerimientos en cualquiera de estos sectores cuando requieras mano de obra o contratar especialistas, y al mismo tiempo ofertar tus propias habilidades o servicios en los proyectos afines a tu experiencia.
            </p>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="search-bar-container" style={{ marginTop: '1.25rem' }}>
          <div className="search-input-box" style={{ flex: 2 }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar por oficio, habilidad o labor (ej. Electricista CONTE, Albañilería, Python, Soldador, Siigo)..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="search-input"
            />
            {filtroTexto && (
              <button
                type="button"
                onClick={() => setFiltroTexto('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="search-select-box" style={{ flex: 1 }}>
            <Filter size={16} color="var(--accent-primary)" />
            <select
              value={modalidadSel}
              onChange={(e) => setModalidadSel(e.target.value)}
              className="filter-select"
            >
              <option value="TODAS">Todas las modalidades</option>
              <option value="Presencial">Presencial en sitio</option>
              <option value="Remoto">100% Remoto</option>
              <option value="Híbrido">Modalidad Híbrida</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cabecera de Resultados */}
      <div className="catalog-results-header">
        <h2>
          Sectores Productivos Verificados <span className="results-count">({areasFiltradas.length} de {AREAS_DETALLADAS.length})</span>
        </h2>
        <span className="results-badge">Cobertura Nacional Colombia</span>
      </div>

      {/* Grid Completo de Tarjetas de Áreas */}
      <div className="areas-full-page-grid">
        {areasFiltradas.map((area) => (
          <div key={area.id} className="area-view-card glass-card">
            <div className="area-view-card-header">
              <div
                className="area-view-icon"
                style={{ color: area.color, background: area.bg }}
              >
                {area.icono}
              </div>
              <div className="area-view-title-group">
                <h3 className="area-view-title">{area.nombre}</h3>
                <span className="area-view-modality-badge">{area.modalidadesHabituales}</span>
              </div>
            </div>

            <p className="area-view-description">{area.descripcion}</p>

            <div className="area-view-oficios-section">
              <span className="area-view-section-label">Oficios y Perfiles Destacados:</span>
              <div className="area-view-tags-wrap">
                {area.oficios.map((oficio, idx) => (
                  <span
                    key={idx}
                    className="area-view-tag"
                    onClick={() => onSelectCategory(area.nombre)}
                    title={`Ver empleos de ${oficio}`}
                  >
                    {oficio}
                  </span>
                ))}
              </div>
            </div>

            <div className="area-view-tarifa-box">
              <span className="area-view-tarifa-label">Tarifa de Referencia en Mercado:</span>
              <strong className="area-view-tarifa-val">{area.tarifaEstimada}</strong>
            </div>

            <div className="area-view-card-footer">
              <button
                type="button"
                className="btn btn-secondary area-view-btn-sec"
                onClick={() => onSelectCategory(area.nombre)}
              >
                <Briefcase size={15} /> Ver Ofertas de este Sector
              </button>
              {onPublishCategory && (
                <button
                  type="button"
                  className="btn btn-primary area-view-btn-pri"
                  onClick={() => onPublishCategory(area.nombre)}
                >
                  <PlusCircle size={15} /> Publicar Requerimiento
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
