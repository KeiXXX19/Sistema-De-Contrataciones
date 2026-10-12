import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  HardHat,
  ArrowRight,
  Sparkles,
  Building2,
  Award,
  Lock,
  ChevronRight,
  ExternalLink,
  Users,
  Eye,
  X,
  Hammer,
  Wrench,
  Layers,
  Laptop,
  Scale,
  Compass,
  Truck,
  Paintbrush,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { SessionUser } from './LoginScreen';
import { TarifasGarantiaModal } from './TarifasGarantiaModal';
import { AreasTrabajoModal } from './AreasTrabajoModal';

interface LandingPageProps {
  onSearch: (criteria: { query: string; location: string; category?: string }) => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onPublish: () => void;
  onEnterGuest: () => void;
  authUser?: SessionUser | null;
  onGoToDashboard?: () => void;
  onLogout?: () => void;
  onNavigateToAreas?: () => void;
  onNavigateToTarifas?: () => void;
}

const HERO_SLIDES = [
  {
    id: 'tecnologia',
    area: 'Tecnología & Software',
    descripcion: 'Desarrollo web, cloud, apps móviles y ciberseguridad',
    imagen: '/hero-tecnologia.jpg',
    etiqueta: '💻 Tecnología, Cloud & Software',
    pos: 'center center',
  },
  {
    id: 'creativo',
    area: 'Diseño Creativo & Multimedia',
    descripcion: 'UI/UX, branding, modelado 3D y marketing digital',
    imagen: '/hero-diseno-creativo.jpg',
    etiqueta: '🎨 Diseño Digital & Multimedia',
    pos: 'center center',
  },
  {
    id: 'ingenieria',
    area: 'Ingeniería, Arquitectura & Obras',
    descripcion: 'Planos técnicos, consultoría civil, remodelaciones e infraestructura',
    imagen: '/hero-ingenieria-construccion.jpg',
    etiqueta: '🏗️ Ingeniería, Arquitectura & Obras',
    pos: 'center 35%',
  },
  {
    id: 'consultoria',
    area: 'Consultoría Empresarial & Legal',
    descripcion: 'Estrategia corporativa, finanzas, asesoría legal y contratos',
    imagen: '/hero-consultoria-negocios.jpg',
    etiqueta: '📊 Consultoría Empresarial & Legal',
    pos: 'center center',
  },
];

const SECTORES_STRIP = [
  { id: 'construccion', nombre: 'CONSTRUCCIÓN', sub: 'Obras & Acabados', categoria: 'Construcción y Obras Civiles' },
  { id: 'tecnologia', nombre: 'TECNOLOGÍA', sub: 'Software & Cloud', categoria: 'Tecnología y Software' },
  { id: 'instalaciones', nombre: 'INSTALACIONES', sub: 'Redes & Energía', categoria: 'Electricidad y Redes Técnicas' },
  { id: 'consultoria', nombre: 'CONSULTORÍA', sub: 'Legal & Contable', categoria: 'Administración y Finanzas' },
  { id: 'diseno', nombre: 'DISEÑO', sub: 'Arquitectura & 3D', categoria: 'Diseño y Multimedia' },
  { id: 'logistica', nombre: 'LOGÍSTICA', sub: 'Transporte & Fletes', categoria: 'Logística y Transporte' },
  { id: 'metalmecanica', nombre: 'METALMECÁNICA', sub: 'Soldadura & Estructura', categoria: 'Soldadura y Metalmecánica' },
  { id: 'aliados', nombre: 'ARGOS · HOMECENTER', sub: 'Aliados Sector', categoria: 'Materiales y Suministros' },
];

export function LandingPage({
  onSearch,
  onOpenLogin,
  onOpenRegister,
  onPublish,
  onEnterGuest,
  authUser,
  onGoToDashboard,
  onLogout,
  onNavigateToAreas,
  onNavigateToTarifas,
}: LandingPageProps) {
  const [servicioBusqueda, setServicioBusqueda] = useState('');
  const [lugarBusqueda, setLugarBusqueda] = useState('');
  const [activeTab, setActiveTab] = useState<'AREAS' | 'TARIFAS' | 'LOCALIZACION'>('AREAS');
  const [showTarifasModal, setShowTarifasModal] = useState(false);
  const [showAreasModal, setShowAreasModal] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [sectorIluminado, setSectorIluminado] = useState<string | null>(null);
  const [cookiesAccepted, setCookiesAccepted] = useState(false);

  const handleExplorar = () => {
    if (authUser && onGoToDashboard) {
      onGoToDashboard();
    } else {
      onEnterGuest();
    }
  };

  // Transición automática entre las diferentes áreas de trabajo cada 5 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleBuscar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearch({
      query: servicioBusqueda.trim(),
      location: lugarBusqueda.trim(),
    });
  };

  const handleBuscarUbicacionRapida = (ciudad: string) => {
    onSearch({
      query: '',
      location: ciudad,
    });
  };

  const handleBuscarAreaRapida = (area: string) => {
    onSearch({
      query: area,
      location: '',
      category: area,
    });
  };

  const handleSectorClick = (sector: (typeof SECTORES_STRIP)[0]) => {
    setSectorIluminado(sector.id);
    setTimeout(() => {
      onSearch({
        query: '',
        location: '',
        category: sector.categoria,
      });
      setSectorIluminado(null);
    }, 240);
  };

  return (
    <div className="computrabajo-landing">
      {/* 1. NAVBAR SUPERIOR ESTILO COMPUTRABAJO ADAPTADO A SERVICIOS Y CONTRATACIONES */}
      <header className="ct-navbar">
        <div className="ct-navbar-container">
          <div className="ct-brand-group">
            <div className="ct-logo" onClick={handleExplorar} role="button" tabIndex={0}>
              <div className="ct-logo-icon">
                <ShieldCheck size={26} color="#0284c7" />
              </div>
              <div className="ct-logo-text">
                <span className="ct-brand-primary">TrustPay</span>
                <span className="ct-brand-accent">Escrow</span>
              </div>
            </div>

            <nav className="ct-nav-links">
              <button
                className="ct-link-btn active"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                title="Portada principal de inicio"
              >
                Inicio
              </button>
              <button
                className="ct-link-btn"
                onClick={handleExplorar}
                title="Muro de ofertas y catálogo de servicios"
              >
                Explorar Servicios
              </button>
              <button
                className="ct-link-btn"
                onClick={() => {
                  if (onNavigateToAreas) {
                    onNavigateToAreas();
                  } else {
                    setShowAreasModal(true);
                  }
                }}
                title="Catálogo de áreas laborales y oficios"
              >
                Áreas de Trabajo
              </button>
              <button
                className="ct-link-btn"
                onClick={() => {
                  const elem = document.getElementById('seccion-como-funciona');
                  if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                }}
                title="Conoce cómo el sistema de custodia retiene y libera los fondos"
              >
                ¿Cómo Funciona Escrow?
              </button>
              <button
                className="ct-link-btn"
                onClick={() => {
                  if (onNavigateToTarifas) {
                    onNavigateToTarifas();
                  } else {
                    setShowTarifasModal(true);
                  }
                }}
                title="Tarifas transparentes (+3% / -10%) y garantía de satisfacción"
              >
                Tarifas y Garantía
              </button>
            </nav>
          </div>

          <div className="ct-auth-group">
            {authUser ? (
              <>
                <button
                  type="button"
                  className="ct-btn-panel"
                  onClick={onGoToDashboard}
                  title="Ir a tu espacio de trabajo y muro de empleos"
                >
                  <Briefcase size={15} />
                  <span>Mi Panel / Muro</span>
                </button>
                <div className="ct-user-pill-header" title={`Sesión activa: ${authUser.email}`}>
                  <ShieldCheck size={14} color="#0284c7" />
                  <span className="ct-user-name-text">{authUser.name}</span>
                  <span className="ct-user-role-badge">
                    {authUser.role === 'ADMIN'
                      ? 'Admin'
                      : authUser.role === 'USER'
                      ? 'Usuario'
                      : authUser.role === 'CLIENT'
                      ? 'Cliente'
                      : 'Prestador'}
                  </span>
                </div>
                <button className="ct-btn-publish" onClick={onPublish}>
                  Publicar Requerimiento
                </button>
                {onLogout && (
                  <button
                    type="button"
                    className="ct-btn-logout-mini"
                    onClick={onLogout}
                    title="Cerrar sesión"
                  >
                    <LogOut size={15} />
                  </button>
                )}
              </>
            ) : (
              <>
                <button className="ct-btn-cv" onClick={onOpenRegister}>
                  Ofrecer Servicios
                </button>
                <button className="ct-btn-login" onClick={onOpenLogin}>
                  Ingresar
                </button>
                <button className="ct-btn-publish" onClick={onPublish}>
                  Publicar Requerimiento
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO PRINCIPAL CON IMÁGENES Y TRANSICIONES MULTISECTORIALES */}
      <section className="ct-hero-section">
        {/* Fondo interactivo con transiciones de diferentes áreas de trabajo y animación Ken-Burns */}
        <div className="ct-hero-motion-bg">
          {HERO_SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className={`ct-motion-slide ${activeSlide === idx ? 'visible' : ''}`}
              style={{
                backgroundImage: `url('${slide.imagen}')`,
                backgroundPosition: slide.pos || 'center center',
              }}
            />
          ))}
          <div className="ct-motion-overlay" />
        </div>

        {/* Indicadores y selector directo de áreas de trabajo con badge del sector activo */}
        <div className="ct-slide-controls">
          <div className="ct-slide-area-pill">
            <span className="ct-pulse-dot" />
            <span className="ct-slide-area-label">{HERO_SLIDES[activeSlide].etiqueta}</span>
          </div>
          <div className="ct-slide-dots">
            {HERO_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                className={`ct-dot ${activeSlide === idx ? 'active' : ''}`}
                onClick={() => setActiveSlide(idx)}
                title={`Cambiar a: ${slide.area}`}
                aria-label={`Ver ${slide.area}`}
              />
            ))}
          </div>
        </div>

        <div className="ct-hero-content">
          <div className="ct-hero-text">
            <span className="ct-hero-badge">
              <ShieldCheck size={15} /> Plataforma de Intermediación con Pagos en Custodia (Escrow)
            </span>
            <h1 className="ct-hero-title">¡Contrata servicios y proyectos con total seguridad!</h1>
            <p className="ct-hero-subtitle">
              Conecta clientes y prestadores en las principales áreas del trabajo en Colombia. El dinero permanece <strong>protegido en custodia neutral</strong> y solo se libera cuando apruebas el trabajo realizado.
            </p>
          </div>

          {/* BUSCADOR DUAL FLOTANTE ADAPTADO A SERVICIOS Y OFICIOS */}
          <form className="ct-search-bar" onSubmit={handleBuscar}>
            <div className="ct-input-field">
              <Briefcase size={20} className="ct-field-icon" />
              <input
                type="text"
                placeholder="¿Qué servicio o profesional necesitas? (ej. Maestro de obra, Desarrollador, Electricista...)"
                value={servicioBusqueda}
                onChange={(e) => setServicioBusqueda(e.target.value)}
              />
            </div>

            <div className="ct-input-divider" />

            <div className="ct-input-field">
              <MapPin size={20} className="ct-field-icon" />
              <input
                type="text"
                placeholder="Ciudad o región (ej. Bogotá, Medellín, Cali, Barranquilla...)"
                value={lugarBusqueda}
                onChange={(e) => setLugarBusqueda(e.target.value)}
              />
            </div>

            <button type="submit" className="ct-search-submit">
              <Search size={18} />
              <span>Buscar Servicios</span>
            </button>
          </form>

          {/* Badges flotantes que destacan el modelo Escrow */}
          <div className="ct-hero-floating-badges">
            <div className="ct-floating-tag">
              <Lock size={16} className="text-sky-400" />
              <span>Bóveda Escrow: Fondos retenidos hasta tu visto bueno</span>
            </div>
            <div className="ct-floating-tag">
              <Award size={16} className="text-amber-400" />
              <span>Prestadores con Calificación y Reputación Verificada</span>
            </div>
            <div className="ct-floating-tag">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Garantía de Entrega y Resolución de Disputas</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CINTA DE EMPRESAS Y SECTORES CONTRATANTES */}
      <section className="ct-companies-strip">
        <p className="ct-companies-title">
          Clientes y empresas contratando servicios en los sectores productivos más importantes:
        </p>

        <div className="ct-companies-logos">
          {SECTORES_STRIP.map((sector) => (
            <button
              key={sector.id}
              type="button"
              className={`ct-company-card ${sectorIluminado === sector.id ? 'iluminado' : ''}`}
              onClick={() => handleSectorClick(sector)}
              title={`Explorar ofertas de trabajo en ${sector.nombre}`}
              aria-label={`Ver catálogo de ofertas en ${sector.nombre} (${sector.sub})`}
            >
              <span className="ct-brand-bold">{sector.nombre}</span>
              <span className="ct-brand-sub">{sector.sub}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 4. SECCIÓN CÓMO FUNCIONA EL MARKETPLACE DE CONTRATACIÓN CON ESCROW */}
      <section className="ct-recruitment-section" id="seccion-como-funciona">
        <div className="ct-pill-badge-wrap">
          <button className="ct-pill-outline" onClick={onPublish}>
            ¿Cómo funciona la custodia?
          </button>
        </div>

        <div className="ct-recruitment-card">
          <h2 className="ct-recruitment-title">
            ¿Necesitas contratar o prestar un servicio? <strong>El flujo seguro de TrustPay Escrow</strong>
          </h2>

          <div className="ct-steps-container">
            {/* Paso 1 */}
            <div className="ct-step-item step-purple">
              <div className="ct-step-number">1</div>
              <div className="ct-step-body">
                <span className="ct-step-label">1. PUBLICA TU REQUERIMIENTO</span>
                <p className="ct-step-desc">
                  El cliente detalla la necesidad, define el alcance, tiempo límite y fija su presupuesto en pesos colombianos o USD.
                </p>
              </div>
            </div>

            {/* Flecha conectora curva 1 */}
            <div className="ct-step-arrow">
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none">
                <path
                  d="M2 18C14 2 34 2 46 16"
                  stroke="#7c3aed"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="4 4"
                />
                <polyline points="40,16 46,16 46,10" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Paso 2 */}
            <div className="ct-step-item step-teal">
              <div className="ct-step-number">2</div>
              <div className="ct-step-body">
                <span className="ct-step-label">2. RECIBE COTIZACIONES Y ELIGE</span>
                <p className="ct-step-desc">
                  Prestadores calificados envían sus propuestas económicas y plazos. El cliente compara reputaciones y acepta la mejor oferta.
                </p>
              </div>
            </div>

            {/* Flecha conectora curva 2 */}
            <div className="ct-step-arrow">
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none">
                <path
                  d="M2 18C14 2 34 2 46 16"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="4 4"
                />
                <polyline points="40,16 46,16 46,10" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Paso 3 */}
            <div className="ct-step-item step-blue">
              <div className="ct-step-number">3</div>
              <div className="ct-step-body">
                <span className="ct-step-label">3. PAGO EN CUSTODIA Y ENTREGA</span>
                <p className="ct-step-desc">
                  El cliente deposita los fondos en custodia neutral (+3%). El prestador trabaja con garantía y el dinero solo se libera (−10%) al aprobar la entrega.
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.55rem 1.35rem', gap: '0.45rem', display: 'inline-flex', alignItems: 'center', borderRadius: '10px' }}
              onClick={() => {
                if (onNavigateToTarifas) onNavigateToTarifas();
                else setShowTarifasModal(true);
              }}
            >
              <ShieldCheck size={16} color="#0284c7" />
              Ver Pestaña Completa de Tarifas, Comisiones (+3% / -10%) y Simulador
            </button>
          </div>
        </div>

        {/* Banner "Garantía para Clientes y Prestadores" */}
        <div className="ct-promo-banner">
          <div className="ct-promo-content">
            <span className="ct-promo-tag">Garantía Escrow</span>
            <h3 className="ct-promo-heading">Cero anticipos a ciegas, cero servicios impagos</h3>
            <p className="ct-promo-text">
              Resolvemos el dilema de desconfianza entre ambas partes: el prestador no inicia a ciegas porque el dinero ya está congelado en la bóveda, y el cliente no arriesga su presupuesto porque la liberación exige su aprobación previa.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="ct-promo-btn" onClick={onEnterGuest}>
                Ver Requerimientos Activos
              </button>
              <button
                className="ct-btn-cv"
                style={{ background: '#0f172a' }}
                onClick={onPublish}
              >
                Publicar un Proyecto
              </button>
            </div>
          </div>

          <div className="ct-promo-visual">
            <img
              src="/hero-consultoria-negocios.jpg"
              alt="Profesionales y contratistas certificados en múltiples áreas de trabajo"
              className="ct-promo-img"
            />
          </div>
        </div>
      </section>

      {/* 5. SECCIÓN DIRECTORIO DE CONTRATACIÓN SEGÚN ÁREAS Y CIUDADES */}
      <section className="ct-directory-section">
        <div className="ct-directory-cta-wrap">
          <button className="ct-btn-cta-large" onClick={onPublish}>
            Publica tu primer requerimiento de servicio
          </button>
        </div>

        <div className="ct-directory-header">
          <h2 className="ct-directory-title">Directorio de Contratación y Servicios según:</h2>
          <div className="ct-directory-tabs">
            <button
              className={`ct-dir-tab ${activeTab === 'AREAS' ? 'active' : ''}`}
              onClick={() => setActiveTab('AREAS')}
            >
              <Briefcase size={16} /> Áreas de Trabajo Principales
            </button>
            <button
              className={`ct-dir-tab ${activeTab === 'TARIFAS' ? 'active' : ''}`}
              onClick={() => setActiveTab('TARIFAS')}
            >
              <ShieldCheck size={16} /> Tarifas, Comisiones & Garantía Escrow
            </button>
            <button
              className={`ct-dir-tab ${activeTab === 'LOCALIZACION' ? 'active' : ''}`}
              onClick={() => setActiveTab('LOCALIZACION')}
            >
              <MapPin size={16} /> Ciudades y Regiones
            </button>
          </div>
        </div>

        {/* Tab 1: Áreas de Trabajo Principales */}
        {activeTab === 'AREAS' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', padding: '0.85rem 1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 600 }}>
                Explora los oficios más solicitados o navega a la vista detallada por sector:
              </span>
              <button
                type="button"
                className="ct-btn-simulador-modal"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
                onClick={() => {
                  if (onNavigateToAreas) onNavigateToAreas();
                  else setShowAreasModal(true);
                }}
              >
                <Layers size={15} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
                Abrir Pestaña Completa de Áreas de Trabajo
              </button>
            </div>
            <div className="ct-directory-grid">
              <div className="ct-dir-col">
                <span className="ct-col-title">Construcción, Obras & Acabados</span>
                <ul className="ct-col-list">
                  <li onClick={() => handleBuscarAreaRapida('Construcción y Obras Civiles')}>Maestros de Obra y Cuadrillas</li>
                  <li onClick={() => handleBuscarAreaRapida('Albañilería y Pegue')}>Oficiales de Albañilería y Muros</li>
                  <li onClick={() => handleBuscarAreaRapida('Enchapador y Pisos')}>Enchapado de Porcelanato y Cerámica</li>
                  <li onClick={() => handleBuscarAreaRapida('Pintura y Fachadas')}>Pintura de Fachadas e Impermeabilización</li>
                  <li onClick={() => handleBuscarAreaRapida('Carpintería y Drywall')}>Instalación de Drywall y Cielos Rasos</li>
                </ul>

                <span className="ct-col-title" style={{ marginTop: '1.5rem' }}>
                  Metalmecánica & Soldadura
                </span>
                <ul className="ct-col-list">
                  <li onClick={() => handleBuscarAreaRapida('Soldador MIG/TIG')}>Soldadores Calificados 6G / MIG / TIG</li>
                  <li onClick={() => handleBuscarAreaRapida('Montador de Estructuras')}>Montaje de Estructuras Metálicas</li>
                  <li onClick={() => handleBuscarAreaRapida('Cerrajería Industrial')}>Cerrajería y Carpintería Metálica</li>
                </ul>
              </div>

              <div className="ct-dir-col">
                <span className="ct-col-title">Tecnología, Software & Cloud</span>
                <ul className="ct-col-list">
                  <li onClick={() => handleBuscarAreaRapida('Desarrollo Full Stack')}>Desarrolladores Web y Full Stack</li>
                  <li onClick={() => handleBuscarAreaRapida('Arquitectura Cloud')}>Arquitectura Cloud (AWS, GCP, Azure)</li>
                  <li onClick={() => handleBuscarAreaRapida('Integración Pasarelas')}>Integración de Pasarelas y APIs Escrow</li>
                  <li onClick={() => handleBuscarAreaRapida('Aplicaciones Móviles')}>Desarrollo de Apps Móviles iOS / Android</li>
                  <li onClick={() => handleBuscarAreaRapida('Ciberseguridad y Redes')}>Seguridad Informática y Redes Corporativas</li>
                </ul>

                <span className="ct-col-title" style={{ marginTop: '1.5rem' }}>
                  Diseño & Arquitectura
                </span>
                <ul className="ct-col-list">
                  <li onClick={() => handleBuscarAreaRapida('Planos Arquitectónicos')}>Diseño Arquitectónico y Planos</li>
                  <li onClick={() => handleBuscarAreaRapida('Render 3D y Modelado')}>Modelado 3D y Renders de Proyecto</li>
                  <li onClick={() => handleBuscarAreaRapida('Diseño UX/UI')}>Diseño de Interfaces y UX/UI Digital</li>
                </ul>
              </div>

              <div className="ct-dir-col">
                <span className="ct-col-title">Instalaciones & Servicios Técnicos</span>
                <ul className="ct-col-list">
                  <li onClick={() => handleBuscarAreaRapida('Electricista CONTE')}>Electricistas Certificados con Matrícula CONTE</li>
                  <li onClick={() => handleBuscarAreaRapida('Plomería e Hidrosanitarios')}>Técnicos Hidrosanitarios y Redes de Agua</li>
                  <li onClick={() => handleBuscarAreaRapida('Redes de Gas')}>Técnicos Instaladores de Redes de Gas</li>
                  <li onClick={() => handleBuscarAreaRapida('Climatización HVAC')}>Mantenimiento de Aire Acondicionado y Clima</li>
                  <li onClick={() => handleBuscarAreaRapida('Sistemas de Seguridad')}>Instalación de Cámaras y Alarmas CCTV</li>
                </ul>

                <span className="ct-col-title" style={{ marginTop: '1.5rem' }}>
                  Logística & Transporte
                </span>
                <ul className="ct-col-list">
                  <li onClick={() => handleBuscarAreaRapida('Transporte de Carga')}>Transporte de Carga y Materiales</li>
                  <li onClick={() => handleBuscarAreaRapida('Acarreos y Fletes')}>Acarreos y Mudanzas Urbanas</li>
                  <li onClick={() => handleBuscarAreaRapida('Operador de Maquinaria')}>Operadores de Maquinaria Pesada</li>
                </ul>
              </div>

              <div className="ct-dir-col">
                <span className="ct-col-title">Consultoría, Legal & Finanzas</span>
                <ul className="ct-col-list">
                  <li onClick={() => handleBuscarAreaRapida('Contabilidad y DIAN')}>Contaduría Pública y Facturación DIAN</li>
                  <li onClick={() => handleBuscarAreaRapida('Asesoría Jurídica')}>Asesoría Legal Contractual y Laboral</li>
                  <li onClick={() => handleBuscarAreaRapida('Auditoría Financiera')}>Auditoría de Proyectos y Revisoría</li>
                  <li onClick={() => handleBuscarAreaRapida('Seguridad y Salud SST')}>Coordinadores de Alturas y Seguridad SST</li>
                  <li onClick={() => handleBuscarAreaRapida('Topografía')}>Topógrafos con Estación Total y Drones</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Tab: Tarifas, Comisiones & Garantía Escrow (Afirmación Transparente y Polivalencia) */}
        {activeTab === 'TARIFAS' && (
          <div className="ct-tarifas-panel">
            <div className="ct-tarifas-banner">
              <div className="ct-tarifas-banner-icon">
                <ShieldCheck size={32} color="#0284c7" />
              </div>
              <div className="ct-tarifas-banner-info">
                <h3>Esquema de Comisiones Transparente & Bóveda Escrow</h3>
                <p>
                  Reglas matemáticas claras sin cobros ocultos ni intermediarios abusivos. Todos los depósitos permanecen retenidos de forma segura en la bóveda de custodia hasta que el cliente aprueba la entrega.
                </p>
              </div>
              <button
                type="button"
                className="ct-btn-simulador-modal"
                onClick={() => {
                  if (onNavigateToTarifas) onNavigateToTarifas();
                  else setShowTarifasModal(true);
                }}
              >
                Abrir Pestaña Completa & Simulador
              </button>
            </div>

            <div className="ct-tarifas-grid-cards">
              <div className="ct-tarifa-card cliente">
                <div className="ct-tarifa-badge">ROL CLIENTE / EMPLEADOR</div>
                <div className="ct-tarifa-header">
                  <span className="ct-tarifa-pct">+3%</span>
                  <span className="ct-tarifa-sub">sobre el monto base en custodia</span>
                </div>
                <ul className="ct-tarifa-bullets">
                  <li><strong>Protección del 100%:</strong> Tu dinero no se entrega al prestador por adelantado.</li>
                  <li><strong>Garantía de cumplimiento:</strong> Revisas el trabajo y liberas cuando estés 100% conforme.</li>
                  <li><strong>Resolución imparcial:</strong> Apertura de disputas con mediación justa si hay incumplimiento.</li>
                </ul>
              </div>

              <div className="ct-tarifa-card prestador">
                <div className="ct-tarifa-badge">ROL PRESTADOR / PROFESIONAL</div>
                <div className="ct-tarifa-header">
                  <span className="ct-tarifa-pct">-10%</span>
                  <span className="ct-tarifa-sub">al liberar fondos con entrega aprobada</span>
                </div>
                <ul className="ct-tarifa-bullets">
                  <li><strong>Cero riesgo de impago:</strong> Trabajas sabiendo que los fondos ya están depositados en bóveda.</li>
                  <li><strong>Cobro solo por éxito:</strong> No pagas membresías ni cobros anticipados por postularte.</li>
                  <li><strong>Historial verificable:</strong> Cada entrega completada construye tu reputación en la plataforma.</li>
                </ul>
              </div>

              <div className="ct-tarifa-card polivalente">
                <div className="ct-tarifa-badge highlight">MODELO POLIVALENTE</div>
                <div className="ct-tarifa-header">
                  <span className="ct-tarifa-pct">1 Cuenta</span>
                  <span className="ct-tarifa-sub">Contrata & Oferta según tu necesidad</span>
                </div>
                <ul className="ct-tarifa-bullets">
                  <li><strong>Somos polivalentes:</strong> Puedes contratar especialistas para tu empresa o proyecto personal.</li>
                  <li><strong>Oferta tus habilidades:</strong> Al mismo tiempo, postúlate con tus conocimientos en el marketplace.</li>
                  <li><strong>Transparencia total:</strong> Mismas reglas y custodia para ambas direcciones de trabajo.</li>
                </ul>
              </div>
            </div>

            <div className="ct-tarifas-boveda-strip">
              <Lock size={20} color="#10b981" />
              <span>
                <strong>Fondos retenidos en bóveda segura:</strong> El dinero se custodia matemáticamente en centavos mediante contratos de garantía y solo se libera con la confirmación explícita del cliente.
              </span>
              <button
                type="button"
                className="ct-btn-link-action"
                onClick={() => {
                  if (onNavigateToTarifas) onNavigateToTarifas();
                  else setShowTarifasModal(true);
                }}
              >
                Ver Pestaña Completa y Simulador de Liquidación <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Localización en Colombia */}
        {activeTab === 'LOCALIZACION' && (
          <div className="ct-directory-grid">
            <div className="ct-dir-col">
              <span className="ct-col-title">Contratación en Bogotá, D.C.</span>
              <ul className="ct-col-list">
                <li onClick={() => handleBuscarUbicacionRapida('Bogotá D.C.')}>Proyectos en Bogotá, D.C.</li>
                <li onClick={() => handleBuscarUbicacionRapida('Bogotá Chapinero')}>Servicios en Chapinero</li>
                <li onClick={() => handleBuscarUbicacionRapida('Bogotá Usaquén')}>Servicios en Usaquén</li>
                <li onClick={() => handleBuscarUbicacionRapida('Bogotá Suba')}>Contratistas en Suba</li>
                <li onClick={() => handleBuscarUbicacionRapida('Bogotá Fontibón')}>Servicios en Fontibón</li>
              </ul>

              <span className="ct-col-title" style={{ marginTop: '1.5rem' }}>
                Región Atlántico & Caribe
              </span>
              <ul className="ct-col-list">
                <li onClick={() => handleBuscarUbicacionRapida('Barranquilla')}>Contratación en Barranquilla</li>
                <li onClick={() => handleBuscarUbicacionRapida('Soledad')}>Servicios en Soledad</li>
                <li onClick={() => handleBuscarUbicacionRapida('Cartagena de Indias')}>Proyectos en Cartagena de Indias</li>
              </ul>
            </div>

            <div className="ct-dir-col">
              <span className="ct-col-title">Antioquia & Medellín</span>
              <ul className="ct-col-list">
                <li onClick={() => handleBuscarUbicacionRapida('Medellín')}>Proyectos en Medellín</li>
                <li onClick={() => handleBuscarUbicacionRapida('Itagüí')}>Servicios en Itagüí</li>
                <li onClick={() => handleBuscarUbicacionRapida('Rionegro')}>Obras en Rionegro (Oriente)</li>
                <li onClick={() => handleBuscarUbicacionRapida('Envigado')}>Contratistas en Envigado</li>
                <li onClick={() => handleBuscarUbicacionRapida('Bello')}>Servicios en Bello</li>
              </ul>

              <span className="ct-col-title" style={{ marginTop: '1.5rem' }}>
                Santanderes
              </span>
              <ul className="ct-col-list">
                <li onClick={() => handleBuscarUbicacionRapida('Bucaramanga')}>Servicios en Bucaramanga</li>
                <li onClick={() => handleBuscarUbicacionRapida('Floridablanca')}>Contratistas en Floridablanca</li>
                <li onClick={() => handleBuscarUbicacionRapida('Barrancabermeja')}>Proyectos en Barrancabermeja</li>
              </ul>
            </div>

            <div className="ct-dir-col">
              <span className="ct-col-title">Valle del Cauca & Suroccidente</span>
              <ul className="ct-col-list">
                <li onClick={() => handleBuscarUbicacionRapida('Cali')}>Contratación en Cali</li>
                <li onClick={() => handleBuscarUbicacionRapida('Palmira')}>Servicios en Palmira</li>
                <li onClick={() => handleBuscarUbicacionRapida('Yumbo')}>Obras Industriales en Yumbo</li>
                <li onClick={() => handleBuscarUbicacionRapida('Buenaventura')}>Logística en Buenaventura</li>
              </ul>

              <span className="ct-col-title" style={{ marginTop: '1.5rem' }}>
                Eje Cafetero
              </span>
              <ul className="ct-col-list">
                <li onClick={() => handleBuscarUbicacionRapida('Pereira')}>Servicios en Pereira</li>
                <li onClick={() => handleBuscarUbicacionRapida('Manizales')}>Contratistas en Manizales</li>
                <li onClick={() => handleBuscarUbicacionRapida('Armenia')}>Proyectos en Armenia</li>
              </ul>
            </div>

            <div className="ct-dir-col">
              <span className="ct-col-title">Cundinamarca (Sabana)</span>
              <ul className="ct-col-list">
                <li onClick={() => handleBuscarUbicacionRapida('Chía')}>Servicios en Chía</li>
                <li onClick={() => handleBuscarUbicacionRapida('Funza')}>Proyectos en Funza</li>
                <li onClick={() => handleBuscarUbicacionRapida('Mosquera')}>Contratistas en Mosquera</li>
                <li onClick={() => handleBuscarUbicacionRapida('Soacha')}>Obras en Soacha</li>
                <li onClick={() => handleBuscarUbicacionRapida('Facatativá')}>Servicios en Facatativá</li>
              </ul>

              <span className="ct-col-title" style={{ marginTop: '1.5rem' }}>
                Remoto & Nacional
              </span>
              <ul className="ct-col-list">
                <li onClick={() => handleBuscarUbicacionRapida('Remoto (Colombia)')}>Servicios Remotos Nacionales</li>
                <li onClick={() => handleBuscarUbicacionRapida('Villavicencio')}>Proyectos en Villavicencio</li>
                <li onClick={() => handleBuscarUbicacionRapida('Ibagué')}>Servicios en Ibagué</li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* 6. RESPALDO Y CONFIANZA INSTITUCIONAL */}
      <section className="ct-institutional-strip">
        <div className="ct-institutional-content">
          <div className="ct-gov-logos">
            <div className="ct-gov-badge">
              <span className="ct-gov-circle">🛡️</span>
              <div className="ct-gov-names">
                <strong>Custodia Escrow Segura</strong>
                <span>Fondos Congelados Neutralmente</span>
              </div>
            </div>

            <div className="ct-gov-badge">
              <div className="ct-gov-shield">🇨🇴</div>
              <div className="ct-gov-names">
                <strong>Cobertura en Colombia</strong>
                <span>Moneda Local COP & Pagos Digitales</span>
              </div>
            </div>

            <div className="ct-gov-badge">
              <span className="ct-gov-sic">SIC</span>
              <div className="ct-gov-names">
                <strong>Arbitraje y Disputas</strong>
                <span>Protección al Contratante y Prestador</span>
              </div>
            </div>
          </div>

          <p className="ct-gov-legal-text">
            Plataforma two-sided marketplace diseñada bajo Arquitectura Hexagonal con microservicios orientados a eventos (EDA). Cada transacción cuenta con contrato digital y liberación condicionada a satisfacción.
          </p>
        </div>
      </section>

      {/* 7. FOOTER COMPLETO DE LA PLATAFORMA */}
      <footer className="ct-footer">
        <div className="ct-footer-container">
          <div className="ct-footer-col">
            <h4 className="ct-footer-heading">Para Clientes y Empresas</h4>
            <ul className="ct-footer-links">
              <li onClick={onPublish}>Publicar requerimiento de servicio</li>
              <li onClick={onEnterGuest}>Explorar perfiles y cotizaciones</li>
              <li onClick={onEnterGuest}>Garantía de reembolso si no hay entrega</li>
              <li onClick={() => { if (onNavigateToTarifas) onNavigateToTarifas(); else onOpenLogin(); }}>
                Comisión cliente transparente (+3%)
              </li>
            </ul>
          </div>

          <div className="ct-footer-col">
            <h4 className="ct-footer-heading">Para Prestadores y Contratistas</h4>
            <ul className="ct-footer-links">
              <li onClick={onOpenRegister}>Crear perfil y ofrecer servicios</li>
              <li onClick={onEnterGuest}>Ver proyectos y contratos disponibles</li>
              <li onClick={onOpenLogin}>Seguridad de cobro: fondos garantizados</li>
              <li onClick={() => { if (onNavigateToTarifas) onNavigateToTarifas(); else onOpenLogin(); }}>
                Comisión prestador al liberar (−10%)
              </li>
            </ul>
          </div>

          <div className="ct-footer-col">
            <h4 className="ct-footer-heading">Mecanismo Escrow</h4>
            <ul className="ct-footer-links">
              <li onClick={() => { if (onNavigateToTarifas) onNavigateToTarifas(); }}>
                Retención neutral de dinero en bóveda
              </li>
              <li onClick={() => { if (onNavigateToTarifas) onNavigateToTarifas(); }}>
                Aprobación obligatoria del cliente
              </li>
              <li onClick={() => { if (onNavigateToTarifas) onNavigateToTarifas(); }}>
                Protocolo de resolución de disputas
              </li>
              <li onClick={() => { if (onNavigateToTarifas) onNavigateToTarifas(); }}>
                Simulador de liquidaciones (+3% / -10%)
              </li>
            </ul>
          </div>

          <div className="ct-footer-col">
            <h4 className="ct-footer-heading">TrustPay Escrow</h4>
            <p className="ct-footer-about">
              El puente digital que conecta a clientes y prestadores de diversas áreas laborales, garantizando pagos seguros sin intermediarios abusivos.
            </p>
            <div className="ct-footer-badge">
              <ShieldCheck size={16} /> <span>100% Pagos en Custodia Escrow</span>
            </div>
          </div>
        </div>

        <div className="ct-footer-bottom">
          <p>© 2026 TrustPay Escrow Colombia · Marketplace Two-Sided de Prestación de Servicios con Arquitectura Hexagonal.</p>
        </div>
      </footer>

      {/* 8. BARRA DE COOKIES INFERIOR */}
      {!cookiesAccepted && (
        <aside className="ct-cookie-bar" aria-label="Aviso de cookies">
          <p className="ct-cookie-text">
            Utilizamos cookies técnicas para gestionar tu sesión y almacenar tus preferencias de contratación y búsqueda en el marketplace. Para más información, consulta nuestros Términos de Servicio y Privacidad.
          </p>
          <button
            type="button"
            className="ct-cookie-btn"
            onClick={() => setCookiesAccepted(true)}
          >
            Acepto
          </button>
        </aside>
      )}

      {/* 9. MODALES DE ÁREAS DE TRABAJO Y TARIFAS/GARANTÍA ESCROW */}
      <TarifasGarantiaModal
        isOpen={showTarifasModal}
        onClose={() => setShowTarifasModal(false)}
        onPublishClick={onPublish}
        onExploreClick={handleExplorar}
      />
      <AreasTrabajoModal
        isOpen={showAreasModal}
        onClose={() => setShowAreasModal(false)}
        onSelectArea={(cat) => handleBuscarAreaRapida(cat)}
        onPublishArea={onPublish}
      />
    </div>
  );
}
