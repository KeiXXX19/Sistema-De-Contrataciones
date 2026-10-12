import React, { useState } from 'react';
import {
  X,
  Briefcase,
  Search,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Wrench,
  Hammer,
  Zap,
  Flame,
  Droplets,
  Laptop,
  Palette,
  TrendingUp,
  FileSpreadsheet,
  Truck,
  Package,
  Headphones,
} from 'lucide-react';

interface AreasTrabajoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectArea: (categoria: string) => void;
  onPublishArea?: (categoria: string) => void;
}

export interface AreaInfo {
  id: string;
  nombre: string;
  icono: React.ReactNode;
  color: string;
  bg: string;
  descripcion: string;
  oficios: string[];
  tarifaEstimada: string;
  modalidadesHabituales: string;
}

export const AREAS_DETALLADAS: AreaInfo[] = [
  {
    id: 'construccion',
    nombre: 'Construcción y Obras Civiles',
    icono: <Hammer size={24} />,
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.12)',
    descripcion: 'Maestros de obra, albañilería estructural, enchapadores de porcelanato, pintura de fachadas, drywall, cielos rasos y remodelación integral.',
    oficios: ['Maestro de obra certificado', 'Oficial de albañilería', 'Enchapador de pisos', 'Pintor de alturas', 'Instalador de drywall'],
    tarifaEstimada: '$80.000 - $180.000 COP / jornada',
    modalidadesHabituales: 'Presencial en sitio de obra',
  },
  {
    id: 'electricidad',
    nombre: 'Electricidad y Redes Técnicas',
    icono: <Zap size={24} />,
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.12)',
    descripcion: 'Instalaciones eléctricas industriales y residenciales con matrícula CONTE, acometidas trifásicas, tableros de distribución, iluminación LED y energía solar.',
    oficios: ['Electricista técnico CONTE', 'Instalador de paneles solares', 'Técnico de redes y cableado estructurado', 'Bobinador de motores'],
    tarifaEstimada: '$90.000 - $220.000 COP / jornada',
    modalidadesHabituales: 'Presencial con certificación RETIE',
  },
  {
    id: 'soldadura',
    nombre: 'Soldadura y Metalmecánica',
    icono: <Flame size={24} />,
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    descripcion: 'Soldadores calificados en procesos MIG, TIG y SMAW (arco manual), fabricación y montaje de estructuras metálicas, cerrajería industrial y cubiertas.',
    oficios: ['Soldador calificado 6G / TIG', 'Armador de estructuras pesadas', 'Cerrajería y ornamentación', 'Pailero industrial'],
    tarifaEstimada: '$100.000 - $250.000 COP / jornada',
    modalidadesHabituales: 'Presencial en taller u obra',
  },
  {
    id: 'plomeria',
    nombre: 'Plomería e Hidrosanitarios',
    icono: <Droplets size={24} />,
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.12)',
    descripcion: 'Redes de agua potable, desagües sanitarios, motobombas, redes contra incendio, instalación de baterías hidrosanitarias y detección técnica de fugas.',
    oficios: ['Técnico hidrosanitario', 'Geofonista (detección fugas)', 'Instalador de redes de gas', 'Mantenimiento de motobombas'],
    tarifaEstimada: '$70.000 - $160.000 COP / servicio o día',
    modalidadesHabituales: 'Presencial con pruebas de presión',
  },
  {
    id: 'tecnologia',
    nombre: 'Tecnología y Software',
    icono: <Laptop size={24} />,
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.12)',
    descripcion: 'Desarrollo web y backend con TypeScript, Node, React, Python, arquitectura de microservicios, APIs, pasarelas de pago, aplicaciones móviles y DevOps en la nube.',
    oficios: ['Full Stack Node / React', 'Desarrollador Python / IA', 'Ingeniero Cloud AWS / GCP', 'Desarrollador Móvil Flutter'],
    tarifaEstimada: '$3.500.000 - $12.000.000 COP / proyecto',
    modalidadesHabituales: '100% Remoto o Híbrido',
  },
  {
    id: 'diseno',
    nombre: 'Diseño y Multimedia',
    icono: <Palette size={24} />,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.12)',
    descripcion: 'Diseño de producto digital UI/UX en Figma, modelado y renders 3D para arquitectura, identidad corporativa y branding, edición de video comercial y animación.',
    oficios: ['Diseñador UI/UX', 'Modelador 3D Arquitectónico', 'Diseñador de Identidad Visual', 'Editor de Video / Motion'],
    tarifaEstimada: '$1.500.000 - $5.500.000 COP / entregable',
    modalidadesHabituales: 'Remoto con entregables vectoriales/Figma',
  },
  {
    id: 'marketing',
    nombre: 'Marketing y Ventas',
    icono: <TrendingUp size={24} />,
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.12)',
    descripcion: 'Gestión de campañas de pauta Meta & Google Ads, optimización de conversión, SEO técnico, automatizaciones de marketing y prospección comercial B2B.',
    oficios: ['Media Buyer Meta / Google Ads', 'Especialista en SEO y Contenido', 'Growth Hacker eCommerce', 'Consultor Comercial B2B'],
    tarifaEstimada: '$1.800.000 - $4.800.000 COP / mes o hito',
    modalidadesHabituales: 'Remoto con métricas de ROI',
  },
  {
    id: 'administracion',
    nombre: 'Administración y Finanzas',
    icono: <FileSpreadsheet size={24} />,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    descripcion: 'Contaduría Pública con tarjeta profesional, facturación electrónica y nómina DIAN, manejo de software contable (Siigo / World Office / SAP) y auditorías.',
    oficios: ['Contador Público titulado', 'Asistente de facturación electrónica', 'Auditor financiero y tributario', 'Asesor jurídico comercial'],
    tarifaEstimada: '$1.200.000 - $3.800.000 COP / servicio mensual',
    modalidadesHabituales: 'Híbrido o Remoto',
  },
  {
    id: 'logistica',
    nombre: 'Logística y Transporte',
    icono: <Truck size={24} />,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    descripcion: 'Transporte de carga seca y materiales de construcción, camiones turbo, furgones, mudanzas y fletes urbanos, operadores de maquinaria amarilla y montacargas.',
    oficios: ['Conductor de camión C2 / C3', 'Operador de montacargas y maquinaria', 'Coordinador de despachos y bodegas'],
    tarifaEstimada: '$150.000 - $600.000 COP / flete o jornada',
    modalidadesHabituales: 'Presencial / Rutas terrestres',
  },
  {
    id: 'materiales',
    nombre: 'Materiales y Suministros',
    icono: <Package size={24} />,
    color: '#14b8a6',
    bg: 'rgba(20, 184, 166, 0.12)',
    descripcion: 'Cotización y suministro de materiales de construcción (cemento, acero, agregados, tuberías) con proveedores aliados (Argos, Homecenter, distribuidores mayoristas).',
    oficios: ['Asesor comercial de ferretería pesada', 'Gestor de compras y suministros', 'Distribuidor de materiales'],
    tarifaEstimada: 'Presupuesto según volumen de obra',
    modalidadesHabituales: 'Despacho a pie de obra con remisión',
  },
  {
    id: 'atencion',
    nombre: 'Atención al Cliente y Call Center',
    icono: <Headphones size={24} />,
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.12)',
    descripcion: 'Representantes de servicio al cliente bilingües (Inglés C1 / B2), soporte técnico de primer nivel, atención omnicanal (chat, correo, llamadas) y retención.',
    oficios: ['Agente BPO Bilingüe (Inglés C1)', 'Especialista en Soporte Técnico Helpdesk', 'Agente de Ventas y Cobranzas'],
    tarifaEstimada: '$2.200.000 - $4.200.000 COP / mes',
    modalidadesHabituales: 'Híbrido o Remoto',
  },
];

export function AreasTrabajoModal({
  isOpen,
  onClose,
  onSelectArea,
  onPublishArea,
}: AreasTrabajoModalProps) {
  if (!isOpen) return null;

  const [filtroTexto, setFiltroTexto] = useState('');

  const areasFiltradas = AREAS_DETALLADAS.filter((area) =>
    area.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
    area.descripcion.toLowerCase().includes(filtroTexto.toLowerCase()) ||
    area.oficios.some((o) => o.toLowerCase().includes(filtroTexto.toLowerCase()))
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card areas-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '920px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Cabecera */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="areas-modal-badge-icon">
              <Briefcase size={22} color="#0284c7" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                Áreas de Trabajo & Oficios Disponibles
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Catálogo integral de sectores y mano de obra con custodia TrustPay Escrow
              </p>
            </div>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            aria-label="Cerrar modal"
          >
            <X size={22} />
          </button>
        </div>

        {/* Mensaje de Enfoque Polivalente */}
        <div className="areas-poly-banner">
          <Users size={20} color="#0284c7" style={{ flexShrink: 0 }} />
          <div>
            <strong>Enfoque Polivalente: Tú decides cómo participar en cada área</strong>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#334155', lineHeight: 1.4 }}>
              Como usuario de TrustPay Escrow puedes publicar solicitudes de contratación en cualquiera de estos sectores (como cliente) y al mismo tiempo ofertar tu mano de obra o servicios profesionales (como contratista).
            </p>
          </div>
        </div>

        {/* Buscador de Área u Oficio */}
        <div className="areas-search-box" style={{ marginTop: '1rem' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar oficio o labor (ej. Electricista CONTE, Albañilería, React, Siigo, Soldador)..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
          />
          {filtroTexto && (
            <button
              className="btn-icon"
              onClick={() => setFiltroTexto('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Grid de Áreas de Trabajo */}
        <div className="areas-cards-grid" style={{ marginTop: '1.25rem' }}>
          {areasFiltradas.map((area) => (
            <div key={area.id} className="area-card-item">
              <div className="area-card-top">
                <div
                  className="area-icon-wrap"
                  style={{ color: area.color, background: area.bg }}
                >
                  {area.icono}
                </div>
                <div className="area-title-wrap">
                  <h4 className="area-name">{area.nombre}</h4>
                  <span className="area-modality">{area.modalidadesHabituales}</span>
                </div>
              </div>

              <p className="area-desc">{area.descripcion}</p>

              <div className="area-oficios-tags">
                {area.oficios.map((oficio, i) => (
                  <span key={i} className="oficio-tag">
                    {oficio}
                  </span>
                ))}
              </div>

              <div className="area-card-footer">
                <div className="area-tarifa-block">
                  <span className="tarifa-label">Tarifa de Referencia:</span>
                  <span className="tarifa-val">{area.tarifaEstimada}</span>
                </div>

                <div className="area-actions-row">
                  <button
                    className="btn btn-secondary area-explore-btn"
                    onClick={() => {
                      onClose();
                      onSelectArea(area.nombre);
                    }}
                    title={`Ver trabajos en ${area.nombre}`}
                  >
                    Ver Empleos
                  </button>

                  {onPublishArea && (
                    <button
                      className="btn btn-primary area-publish-btn"
                      onClick={() => {
                        onClose();
                        onPublishArea(area.nombre);
                      }}
                      title={`Publicar requerimiento en ${area.nombre}`}
                    >
                      Publicar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {areasFiltradas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            <p>No se encontraron áreas u oficios con el término "{filtroTexto}".</p>
            <button className="btn btn-secondary" onClick={() => setFiltroTexto('')}>
              Ver Todas las Áreas
            </button>
          </div>
        )}

        {/* Pie del Modal */}
        <div className="modal-actions" style={{ marginTop: '1.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar Catálogo
          </button>
        </div>
      </div>
    </div>
  );
}

export default AreasTrabajoModal;
