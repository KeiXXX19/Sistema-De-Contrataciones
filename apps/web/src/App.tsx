import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Briefcase,
  Send,
  Lock,
  CheckCircle2,
  Star,
  UserCheck,
  Layers,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Coins,
  LogOut,
  Eye,
  Compass,
} from 'lucide-react';

import { DomainEvent } from '@platform/shared-kernel';
import { JobResponseDTO, toJobResponseDTO } from '@platform/job-service';
import { ProposalResponseDTO } from '@platform/bidding-service';
import { EscrowResponseDTO, toEscrowResponseDTO } from '@platform/escrow-service';
import { ReputationSummaryDTO } from '@platform/review-service';
import { LoginScreen, SessionUser } from './LoginScreen';
import { LandingPage } from './LandingPage';
import { AdminPanel } from './AdminPanel';
import { JobCatalogView } from './JobCatalogView';
import { JobPublishModal } from './JobPublishModal';
import { TarifasGarantiaModal } from './TarifasGarantiaModal';
import { AreasTrabajoModal } from './AreasTrabajoModal';
import { AreasTrabajoView } from './AreasTrabajoView';
import { TarifasGarantiaView } from './TarifasGarantiaView';
import {
  broker,
  loginUserUseCase,
  registerUserUseCase,
  loginWithGoogleUseCase,
  createJobUseCase,
  queryJobFeedUseCase,
  publishToFeedUseCase,
  submitDeliverableUseCase,
  approveJobUseCase,
  acceptProposalUseCase,
  jobRepo,
  proposalRepo,
  submitProposalUseCase,
  escrowRepo,
  depositEscrowUseCase,
  submitReviewUseCase,
  getReputationUseCase,
  inicializarSemillas,
} from './platform';

// Estado a nivel de módulo para sobrevivir al doble montaje de React StrictMode en desarrollo
let manejadorEventosUI: ((ev: DomainEvent) => Promise<void>) | null = null;
let uiSuscritaAlBroker = false;

type Session = { mode: 'GUEST' } | { mode: 'AUTH'; user: SessionUser } | null;
const SESSION_STORAGE_KEY = 'trustpay_escrow_session_user';

function AvisoSoloLectura({ texto }: { texto: string }) {
  return (
    <div className="readonly-notice">
      <Eye size={16} />
      <span>{texto}</span>
    </div>
  );
}

export function App() {
  const [activeRole, setActiveRole] = useState<'CATALOG' | 'CLIENT' | 'PROVIDER' | 'AUDITOR' | 'AREAS' | 'TARIFAS'>('CATALOG');
  const [events, setEvents] = useState<DomainEvent[]>([]);

  // Sesión persistida en sessionStorage para sobrevivir a recargas y navegación
  const [session, setSession] = useState<Session>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const user = JSON.parse(raw);
        if (user && user.id && user.email) {
          return { mode: 'AUTH', user };
        }
      }
    } catch {}
    return null;
  });

  // Control explícito de pantalla: 'LANDING' | 'APP' | 'AUTH'
  const [currentView, setCurrentView] = useState<'LANDING' | 'APP' | 'AUTH'>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) return 'APP';
    } catch {}
    return 'LANDING';
  });

  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [landingSearchCriteria, setLandingSearchCriteria] = useState<{ query: string; location: string; category?: string }>({
    query: '',
    location: '',
  });

  // Versión de los datos del sistema: se incrementa con cada evento para que el panel admin recargue
  const [versionEventos, setVersionEventos] = useState(0);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showTarifasModal, setShowTarifasModal] = useState(false);
  const [showAreasModal, setShowAreasModal] = useState(false);

  const authUser = session?.mode === 'AUTH' ? session.user : null;
  const isClientActor = authUser !== null && (authUser.role === 'CLIENT' || authUser.role === 'USER');
  const isProviderActor = authUser !== null && (authUser.role === 'PROVIDER' || authUser.role === 'USER');

  // Estados del sistema
  const [clientUser, setClientUser] = useState<any>(null);
  const [providerUser, setProviderUser] = useState<any>(null);
  const [currentJob, setCurrentJob] = useState<JobResponseDTO | null>(null);
  const [proposals, setProposals] = useState<ProposalResponseDTO[]>([]);
  const [escrow, setEscrow] = useState<EscrowResponseDTO | null>(null);
  const [providerReputation, setProviderReputation] = useState<ReputationSummaryDTO | null>(null);

  // Formularios
  const [jobTitle, setJobTitle] = useState('Desarrollo de API de Pagos en Escrow');
  const [jobCategory, setJobCategory] = useState('Backend & Cloud');
  const [jobBudget, setJobBudget] = useState(500);
  const [jobDesc, setJobDesc] = useState('Construcción de microservicios con NestJS, RabbitMQ y PostgreSQL.');

  const [bidAmount, setBidAmount] = useState(480);
  const [bidDays, setBidDays] = useState(7);
  const [bidCover, setBidCover] = useState('Especialista en arquitecturas limpias y pasarelas de pago.');

  const [deliverableUrl, setDeliverableUrl] = useState('https://github.com/empresa/escrow-core/releases/tag/v1.0.0');
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewComment, setReviewComment] = useState('Excelente trabajo y entrega impecable.');

  // Mantener el manejador de eventos apuntando al render actual
  useEffect(() => {
    manejadorEventosUI = async (ev: DomainEvent) => {
      setEvents((prev) => [ev, ...prev]);
      setVersionEventos((v) => v + 1);
      await refreshState();
    };
  });

  // Suscribir logger de eventos en tiempo real (una sola vez)
  useEffect(() => {
    if (uiSuscritaAlBroker) return;
    uiSuscritaAlBroker = true;

    const manejadorEstable = async (ev: DomainEvent) => {
      if (manejadorEventosUI) await manejadorEventosUI(ev);
    };

    // Registrar escuchadores en el broker para actualizar UI
    const eventNames = [
      'user.registered',
      'user.verified',
      'user.logged_in',
      'user.blocked',
      'user.unblocked',
      'job.created',
      'proposal.submitted',
      'proposal.accepted',
      'job.assigned',
      'escrow.created',
      'escrow.deposited',
      'job.started',
      'job.delivered',
      'job.approved',
      'escrow.released',
      'escrow.dispute_opened',
      'escrow.dispute_resolved',
      'escrow.cancelled',
      'job.dispute_opened',
      'job.cancelled',
      'review.submitted',
    ];

    eventNames.forEach((name) => broker.subscribe(name, manejadorEstable));

    // Inicializar usuarios semilla (contraseña demo1234) una única vez
    inicializarSemillas().then(({ cliente, prestador }) => {
      setClientUser(cliente);
      setProviderUser(prestador);
      refreshState();
    });
  }, []);

  const refreshState = async () => {
    if (jobRepo) {
      const jobs = await jobRepo.findByStatus('OPEN');
      const inProg = await jobRepo.findByStatus('IN_PROGRESS');
      const assigned = await jobRepo.findByStatus('ASSIGNED_PENDING_ESCROW');
      const underRev = await jobRepo.findByStatus('UNDER_REVIEW');
      const comp = await jobRepo.findByStatus('COMPLETED');
      const allJobs = [...comp, ...underRev, ...inProg, ...assigned, ...jobs];

      if (allJobs.length > 0) {
        const j = allJobs[allJobs.length - 1];
        setCurrentJob(toJobResponseDTO(j));

        // Buscar propuestas
        const pList = await proposalRepo.findByJobId(j.id.toString());
        setProposals(
          pList.map((p) => ({
            id: p.id.toString(),
            jobId: p.jobId,
            providerId: p.providerId,
            proposedAmount: p.proposedAmount.toDecimal,
            currency: p.proposedAmount.currency,
            estimatedDays: p.estimatedDays,
            coverLetter: p.coverLetter,
            status: p.status,
          }))
        );

        // Buscar custodia
        const esc = await escrowRepo.findByJobId(j.id.toString());
        if (esc) {
          setEscrow(toEscrowResponseDTO(esc));
        }
      }
    }

    const reputationTargetId = currentJob?.assignedProviderId ?? providerUser?.id;
    if (reputationTargetId) {
      const rep = await getReputationUseCase.execute(reputationTargetId);
      setProviderReputation(rep);
    }
  };

  // Gestión de sesión y navegación
  const handleAuthenticated = (user: SessionUser) => {
    setSession({ mode: 'AUTH', user });
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } catch {}
    setShowAuthScreen(false);
    setCurrentView('APP');
    setActiveRole(user.role === 'PROVIDER' ? 'PROVIDER' : user.role === 'ADMIN' ? 'CATALOG' : 'CLIENT');
  };

  const handleGuest = () => {
    if (session?.mode !== 'AUTH') {
      setSession({ mode: 'GUEST' });
    }
    setShowAuthScreen(false);
    setCurrentView('APP');
    setActiveRole('CATALOG');
  };

  const handleLogout = () => {
    setSession(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    setShowAuthScreen(false);
    setCurrentView('LANDING');
  };

  const handleLandingSearch = (criteria: { query: string; location: string; category?: string }) => {
    setLandingSearchCriteria(criteria);
    // Si el usuario ya está autenticado, no lo degradamos a GUEST
    if (session?.mode !== 'AUTH') {
      setSession({ mode: 'GUEST' });
    }
    setShowAuthScreen(false);
    setCurrentView('APP');
    setActiveRole('CATALOG');
  };

  const handleLandingPublish = () => {
    if (session?.mode === 'AUTH' && (session.user.role === 'CLIENT' || session.user.role === 'USER')) {
      setActiveRole('CLIENT');
      setCurrentView('APP');
      setShowPublishModal(true);
    } else if (session?.mode === 'AUTH' && session.user.role === 'PROVIDER') {
      setActiveRole('PROVIDER');
      setCurrentView('APP');
    } else {
      setAuthInitialTab('login');
      setShowAuthScreen(true);
      setCurrentView('AUTH');
    }
  };

  // Vuelve a la portada conservando intacta la sesión autenticada del usuario
  const handleBackToLanding = () => {
    setCurrentView('LANDING');
    setShowAuthScreen(false);
  };

  const handleRequireAuthFromCatalog = () => {
    setAuthInitialTab('login');
    setShowAuthScreen(true);
    setCurrentView('AUTH');
  };

  // Acciones de Usuario
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isClientActor || !authUser) return;
    await createJobUseCase.execute({
      title: jobTitle,
      description: jobDesc,
      category: jobCategory,
      clientId: authUser.id,
      budgetAmount: Number(jobBudget),
    });
    await refreshState();
  };

  const handleSendProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentJob || !isProviderActor || !authUser) return;
    await submitProposalUseCase.execute({
      jobId: currentJob.id,
      providerId: authUser.id,
      proposedAmountDecimal: Number(bidAmount),
      estimatedDays: Number(bidDays),
      coverLetter: bidCover,
    });
    await refreshState();
  };

  const handleAcceptProposal = async (propId: string) => {
    if (!isClientActor) return;
    await acceptProposalUseCase.execute(propId);
    await refreshState();
  };

  const handleDepositEscrow = async () => {
    if (!escrow || !isClientActor) return;
    await depositEscrowUseCase.execute(escrow.id, 'pm_visa_corporate_999');
    await refreshState();
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentJob || !isProviderActor) return;
    await submitDeliverableUseCase.execute(
      currentJob.id,
      deliverableUrl,
      'Versión compilada y lista para validación de aceptación.'
    );
    await refreshState();
  };

  const handleApproveWork = async () => {
    if (!currentJob || !isClientActor) return;
    await approveJobUseCase.execute(currentJob.id);
    await refreshState();
  };

  const handleSubmitReview = async () => {
    if (!currentJob || !isClientActor || !authUser) return;
    await submitReviewUseCase.execute({
      jobId: currentJob.id,
      reviewerId: authUser.id,
      reviewedUserId: currentJob.assignedProviderId ?? providerUser.id,
      score: reviewScore,
      comment: reviewComment,
    });
    await refreshState();
  };

  // 1. Pantalla de Autenticación
  if (currentView === 'AUTH' || (session === null && showAuthScreen)) {
    return (
      <LoginScreen
        loginUseCase={loginUserUseCase}
        registerUseCase={registerUserUseCase}
        loginWithGoogleUseCase={loginWithGoogleUseCase}
        onAuthenticated={handleAuthenticated}
        onGuest={handleGuest}
        initialTab={authInitialTab}
        onBackToHome={handleBackToLanding}
      />
    );
  }

  // 2. Portada Principal (Landing Page)
  if (currentView === 'LANDING') {
    return (
      <LandingPage
        onSearch={handleLandingSearch}
        onOpenLogin={() => {
          setAuthInitialTab('login');
          setShowAuthScreen(true);
          setCurrentView('AUTH');
        }}
        onOpenRegister={() => {
          setAuthInitialTab('register');
          setShowAuthScreen(true);
          setCurrentView('AUTH');
        }}
        onPublish={handleLandingPublish}
        onEnterGuest={handleGuest}
        authUser={authUser}
        onGoToDashboard={() => setCurrentView('APP')}
        onLogout={handleLogout}
        onNavigateToAreas={() => {
          setActiveRole('AREAS');
          setCurrentView('APP');
        }}
        onNavigateToTarifas={() => {
          setActiveRole('TARIFAS');
          setCurrentView('APP');
        }}
      />
    );
  }

  // 3. Un administrador no opera el marketplace: entra directo al panel de administración
  if (session?.mode === 'AUTH' && session.user.role === 'ADMIN') {
    return <AdminPanel admin={session.user} version={versionEventos} onLogout={handleLogout} />;
  }

  return (
    <div className="app-container">
      {/* Navbar Superior Unificado: Idéntico al estilo y proporciones de la Portada Principal */}
      <header className="ct-navbar">
        <div className="ct-navbar-container">
          <div className="ct-brand-group">
            <div
              className="ct-logo"
              onClick={handleBackToLanding}
              role="button"
              tabIndex={0}
              title="Volver a la portada de inicio Computrabajo"
            >
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
                className="ct-link-btn"
                onClick={handleBackToLanding}
                title="Volver a la portada principal"
              >
                Inicio
              </button>

              <button
                className={`ct-link-btn ${activeRole === 'CATALOG' ? 'active' : ''}`}
                onClick={() => setActiveRole('CATALOG')}
                title="Muro de empleos y servicios"
              >
                Explorar Servicios
              </button>

              <button
                className={`ct-link-btn ${activeRole === 'AREAS' ? 'active' : ''}`}
                onClick={() => setActiveRole('AREAS')}
                title="Catálogo de áreas de trabajo y oficios"
              >
                Áreas de Trabajo
              </button>

              <button
                className="ct-link-btn"
                onClick={() => {
                  handleBackToLanding();
                  setTimeout(() => {
                    const elem = document.getElementById('seccion-como-funciona');
                    if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                  }, 120);
                }}
                title="Cómo funciona el pago en custodia Escrow"
              >
                ¿Cómo Funciona Escrow?
              </button>

              <button
                className={`ct-link-btn ${activeRole === 'TARIFAS' ? 'active' : ''}`}
                onClick={() => setActiveRole('TARIFAS')}
                title="Tarifas transparentes (+3% / -10%) y garantías"
              >
                Tarifas y Garantía
              </button>

              {/* Accesos de gestión para usuario autenticado */}
              {authUser && (authUser.role === 'CLIENT' || authUser.role === 'USER') && (
                <button
                  className={`ct-link-btn ${activeRole === 'CLIENT' ? 'active' : ''}`}
                  onClick={() => setActiveRole('CLIENT')}
                >
                  Mis Contrataciones
                </button>
              )}

              {authUser?.role === 'PROVIDER' && (
                <button
                  className={`ct-link-btn ${activeRole === 'PROVIDER' ? 'active' : ''}`}
                  onClick={() => setActiveRole('PROVIDER')}
                >
                  Mis Postulaciones
                </button>
              )}

              {authUser?.role === 'USER' && (
                <button
                  className={`ct-link-btn ${activeRole === 'PROVIDER' ? 'active' : ''}`}
                  onClick={() => setActiveRole(activeRole === 'PROVIDER' ? 'CLIENT' : 'PROVIDER')}
                  title="Alternar entre contratar y ofertar como prestador"
                >
                  {activeRole === 'PROVIDER' ? 'Modo Contratante' : 'Modo Prestador'}
                </button>
              )}
            </nav>
          </div>

          <div className="ct-auth-group">
            {authUser ? (
              <>
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

                <button
                  className="ct-btn-publish"
                  onClick={() => setShowPublishModal(true)}
                  title="Publicar nuevo requerimiento con custodia Escrow"
                >
                  Publicar Requerimiento
                </button>

                <button
                  type="button"
                  className="ct-btn-logout-mini"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <>
                <button
                  className="ct-btn-cv"
                  onClick={() => {
                    setAuthInitialTab('register');
                    setShowAuthScreen(true);
                    setCurrentView('AUTH');
                  }}
                >
                  Ofrecer Servicios
                </button>
                <button
                  className="ct-btn-login"
                  onClick={() => {
                    setAuthInitialTab('login');
                    setShowAuthScreen(true);
                    setCurrentView('AUTH');
                  }}
                >
                  Ingresar
                </button>
                <button
                  className="ct-btn-publish"
                  onClick={() => setShowPublishModal(true)}
                >
                  Publicar Requerimiento
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal: Catálogo, Áreas de Trabajo, Tarifas & Garantía o Workspace de la Saga */}
      {activeRole === 'CATALOG' ? (
        <JobCatalogView
          queryFeedUseCase={queryJobFeedUseCase}
          publishFeedUseCase={publishToFeedUseCase}
          createJobUseCase={createJobUseCase}
          authUser={authUser}
          onSelectTrustPayJob={() => setActiveRole('PROVIDER')}
          initialSearch={landingSearchCriteria.query}
          initialLocation={landingSearchCriteria.location}
          initialCategory={landingSearchCriteria.category}
          onBackToHome={handleBackToLanding}
          onRequireAuth={handleRequireAuthFromCatalog}
        />
      ) : activeRole === 'AREAS' ? (
        <AreasTrabajoView
          onSelectCategory={(cat) => {
            setLandingSearchCriteria({ query: '', location: '', category: cat });
            setActiveRole('CATALOG');
          }}
          onPublishCategory={(cat) => {
            setJobCategory(cat);
            setShowPublishModal(true);
          }}
          onGoToCatalog={() => setActiveRole('CATALOG')}
          onBackToHome={handleBackToLanding}
        />
      ) : activeRole === 'TARIFAS' ? (
        <TarifasGarantiaView
          onPublishClick={() => setShowPublishModal(true)}
          onExploreClick={() => setActiveRole('CATALOG')}
          onBackToHome={handleBackToLanding}
        />
      ) : (
        <main className="workspace-grid">
          <section className="left-panel">
          {/* Línea de Tiempo del Ciclo de Vida */}
          <div className="status-timeline">
            <div className={`step-item ${currentJob ? 'completed' : 'active'}`}>
              <div className="step-circle">1</div>
              <div className="step-label">Publicado</div>
            </div>
            <div
              className={`step-item ${
                currentJob?.status === 'ASSIGNED_PENDING_ESCROW' ||
                currentJob?.status === 'IN_PROGRESS' ||
                currentJob?.status === 'UNDER_REVIEW' ||
                currentJob?.status === 'COMPLETED'
                  ? 'completed'
                  : proposals.length > 0
                  ? 'active'
                  : ''
              }`}
            >
              <div className="step-circle">2</div>
              <div className="step-label">Ofertado</div>
            </div>
            <div
              className={`step-item ${
                escrow?.status === 'FUNDS_HELD' ||
                escrow?.status === 'RELEASED' ||
                currentJob?.status === 'IN_PROGRESS' ||
                currentJob?.status === 'UNDER_REVIEW' ||
                currentJob?.status === 'COMPLETED'
                  ? 'completed'
                  : currentJob?.status === 'ASSIGNED_PENDING_ESCROW'
                  ? 'active'
                  : ''
              }`}
            >
              <div className="step-circle">3</div>
              <div className="step-label">En Custodia</div>
            </div>
            <div
              className={`step-item ${
                currentJob?.status === 'UNDER_REVIEW' || currentJob?.status === 'COMPLETED'
                  ? 'completed'
                  : currentJob?.status === 'IN_PROGRESS'
                  ? 'active'
                  : ''
              }`}
            >
              <div className="step-circle">4</div>
              <div className="step-label">Entregado</div>
            </div>
            <div className={`step-item ${currentJob?.status === 'COMPLETED' ? 'completed' : ''}`}>
              <div className="step-circle">5</div>
              <div className="step-label">Liberado</div>
            </div>
          </div>

          {/* Bóveda Financiera de Escrow (Desglose en vivo) */}
          {escrow && (
            <div className="escrow-vault">
              <div className="vault-header">
                <div className="vault-title">
                  <Lock size={18} color="#818cf8" />
                  <span>PAGO EN CUSTODIA DE SEGURIDAD (ESCROW)</span>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background:
                      escrow.status === 'FUNDS_HELD'
                        ? 'var(--accent-emerald-light)'
                        : escrow.status === 'RELEASED'
                        ? 'var(--sky-100)'
                        : 'var(--accent-amber-light)',
                    color:
                      escrow.status === 'FUNDS_HELD'
                        ? '#065f46'
                        : escrow.status === 'RELEASED'
                        ? 'var(--sky-700)'
                        : '#92400e',
                  }}
                >
                  ESTADO: {escrow.status}
                </span>
              </div>

              <div className="vault-grid">
                <div className="vault-item">
                  <div className="vault-item-label">Monto Base Acordado</div>
                  <div className="vault-item-value">${escrow.baseAmount.toFixed(2)}</div>
                </div>
                <div className="vault-item highlight">
                  <div className="vault-item-label">Total Depositado (Cliente + 3%)</div>
                  <div className="vault-item-value">${escrow.totalClientPaid.toFixed(2)}</div>
                </div>
                <div className="vault-item">
                  <div className="vault-item-label">Neto al Prestador (-10%)</div>
                  <div className="vault-item-value">${escrow.netProviderPayout.toFixed(2)}</div>
                </div>
                <div className="vault-item profit">
                  <div className="vault-item-label">Ganancia Plataforma</div>
                  <div className="vault-item-value">${escrow.platformProfit.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA CLIENTE */}
          {activeRole === 'CLIENT' && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Mis Trabajos Publicados{isClientActor && authUser ? `: ${authUser.name}` : ''}
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  ID: {(isClientActor && authUser ? authUser.id : clientUser?.id)?.slice(0, 8)}
                </span>
              </div>

              {isClientActor && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.8rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
                    }}
                    onClick={() => setShowPublishModal(true)}
                  >
                    <Briefcase size={18} /> Publicar Nuevo Trabajo / Mano de Obra (Asistente Completo)
                  </button>
                </div>
              )}

              {!currentJob && !isClientActor && (
                <AvisoSoloLectura texto="Vista de solo lectura: inicia sesión para publicar requerimientos con pago protegido." />
              )}

              {!currentJob && isClientActor && (
                <form onSubmit={handleCreateJob}>
                  <div className="form-group">
                    <label className="form-label">Título del Trabajo / Requerimiento (Rápido)</label>
                    <input
                      className="form-control"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Categoría</label>
                      <input
                        className="form-control"
                        value={jobCategory}
                        onChange={(e) => setJobCategory(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Presupuesto Estimado ($ USD)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={jobBudget}
                        onChange={(e) => setJobBudget(Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Descripción Detallada</label>
                    <textarea
                      className="form-control"
                      value={jobDesc}
                      onChange={(e) => setJobDesc(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                    <Briefcase size={16} /> Publicación Rápida
                  </button>
                </form>
              )}

              {currentJob && (
                <div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{currentJob.title}</h3>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {currentJob.budgetType && (
                          <span className="budget-type-chip">{currentJob.budgetType}</span>
                        )}
                        <span className="badge-arch">{currentJob.status}</span>
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                      {currentJob.description}
                    </p>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.8rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                      <span><strong>Presupuesto:</strong> ${currentJob.budgetAmount} {currentJob.currency || 'USD'}</span>
                      <span><strong>Categoría:</strong> {currentJob.category}</span>
                      {currentJob.location && <span><strong>Ubicación:</strong> {currentJob.location}</span>}
                      {currentJob.requirements?.workerCount && (
                        <span><strong>Personal:</strong> {currentJob.requirements.workerCount} personas</span>
                      )}
                    </div>
                    {currentJob.attachments && currentJob.attachments.length > 0 && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {currentJob.attachments.map((att, i) => (
                          <span key={i} className="req-mini-pill attachments-pill">
                            {att.type.startsWith('image/') ? '📷' : '📄'} {att.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Propuestas recibidas */}
                  {currentJob.status === 'OPEN' && (
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                        Propuestas Recibidas ({proposals.length})
                      </h4>
                      {proposals.length === 0 ? (
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                          Esperando ofertas de postulantes y prestadores en Colombia...
                        </p>
                      ) : (
                        proposals.map((p) => (
                          <div
                            key={p.id}
                            style={{
                              background: 'rgba(10,13,20,0.6)',
                              padding: '1rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, color: '#f8fafc' }}>
                                Oferta: ${p.proposedAmount} USD (Entrega en {p.estimatedDays} días)
                              </div>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                "{p.coverLetter}"
                              </p>
                            </div>
                            {isClientActor ? (
                              <button
                                className="btn btn-success"
                                onClick={() => handleAcceptProposal(p.id)}
                              >
                                Aceptar Oferta
                              </button>
                            ) : (
                              <span className="badge-arch">Esperando al cliente</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Paso de Pago en Escrow */}
                  {currentJob.status === 'ASSIGNED_PENDING_ESCROW' && escrow && (
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                      <h4 style={{ color: '#c7d2fe', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Lock size={18} /> Pago Requerido para Iniciar
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#e0e7ff', margin: '0.5rem 0 1rem' }}>
                        Para que el prestador comience a trabajar con garantía, deposita los fondos en la custodia de Escrow. El dinero permanecerá protegido hasta que apruebes el resultado final.
                      </p>
                      {isClientActor ? (
                        <button className="btn btn-primary" onClick={handleDepositEscrow} style={{ width: '100%' }}>
                          Depositar ${escrow.totalClientPaid.toFixed(2)} USD en Garantía
                        </button>
                      ) : (
                        <p style={{ fontSize: '0.85rem', color: '#c7d2fe' }}>
                          Solo lectura: el cliente con sesión iniciada debe depositar los fondos en custodia.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Revisión del Entregable */}
                  {currentJob.status === 'UNDER_REVIEW' && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <h4 style={{ color: '#6ee7b7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle2 size={18} /> Entregable Listo para Revisión
                      </h4>
                      <div style={{ margin: '0.75rem 0', fontSize: '0.85rem' }}>
                        <strong>URL de Entrega: </strong>
                        <a href={currentJob.deliverableUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>
                          {currentJob.deliverableUrl} <ExternalLink size={14} style={{ display: 'inline' }} />
                        </a>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        {isClientActor ? (
                          <button className="btn btn-success" onClick={handleApproveWork} style={{ flex: 1 }}>
                            Aprobar y Liberar Fondos (${escrow?.netProviderPayout} USD al Prestador)
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: '#a7f3d0', alignSelf: 'center' }}>
                            Esperando la aprobación del cliente...
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Calificación Final */}
                  {currentJob.status === 'COMPLETED' && !isClientActor && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <AvisoSoloLectura texto="Solo lectura: el cliente con sesión iniciada puede calificar al prestador." />
                    </div>
                  )}
                  {currentJob.status === 'COMPLETED' && isClientActor && (
                    <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px' }}>
                      <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Star size={18} color="#f59e0b" /> Calificar al Prestador (Review & Rating Service)
                      </h4>
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`star-btn ${s <= reviewScore ? 'active' : ''}`}
                            onClick={() => setReviewScore(s)}
                          >
                            ⭐
                          </button>
                        ))}
                      </div>
                      <input
                        className="form-control"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Escribe tu opinión sobre el trabajo entregado..."
                        style={{ margin: '0.75rem 0' }}
                      />
                      <button className="btn btn-primary" onClick={handleSubmitReview}>
                        Enviar Calificación
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VISTA PRESTADOR */}
          {activeRole === 'PROVIDER' && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    Mis Ofertas y Postulaciones{isProviderActor && authUser ? `: ${authUser.name}` : ''}
                  </h2>
                  {(isProviderActor && authUser ? authUser.isVerified : providerUser?.isVerified) && (
                    <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle2 size={12} /> Identidad Verificada (KYC Aprobado)
                    </span>
                  )}
                </div>
                {providerReputation && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>
                      ⭐ {providerReputation.averageScore.toFixed(1)} / 5.0
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {providerReputation.totalReviews} reseñas completadas
                    </span>
                  </div>
                )}
              </div>

              {!currentJob && (
                <p style={{ color: 'var(--text-dim)' }}>
                  No hay trabajos activos para ofertar en este momento. Explora el <strong>Catálogo de Empleos</strong> para encontrar oportunidades.
                </p>
              )}

              {currentJob && currentJob.status === 'OPEN' && (
                <div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{currentJob.title}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                      {currentJob.description}
                    </p>
                    <span style={{ fontSize: '0.85rem', color: '#38bdf8', display: 'block', marginTop: '0.5rem' }}>
                      Presupuesto Cliente: ${currentJob.budgetAmount} USD
                    </span>
                  </div>

                  {isProviderActor ? (
                    <form onSubmit={handleSendProposal}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                        Enviar Oferta y Cotización al Cliente
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Tu Oferta ($ USD)</label>
                          <input
                            type="number"
                            className="form-control"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(Number(e.target.value))}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Días Estimados</label>
                          <input
                            type="number"
                            className="form-control"
                            value={bidDays}
                            onChange={(e) => setBidDays(Number(e.target.value))}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Carta de Presentación</label>
                        <textarea
                          className="form-control"
                          value={bidCover}
                          onChange={(e) => setBidCover(e.target.value)}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        <Send size={16} /> Postular Oferta (Bidding Service)
                      </button>
                    </form>
                  ) : (
                    <AvisoSoloLectura texto="Solo lectura: inicia sesión como prestador para enviar propuestas a este trabajo." />
                  )}
                </div>
              )}

              {/* Cuando el trabajo está asignado pero sin fondos en custodia */}
              {currentJob && currentJob.status === 'ASSIGNED_PENDING_ESCROW' && (
                <div className="status-alert warning">
                  <h4>⏳ Oferta Aceptada — Esperando Depósito de Custodia</h4>
                  <p>
                    Tu oferta fue seleccionada. <strong>No comiences a trabajar</strong> hasta que el cliente deposite los fondos en Escrow para garantizar tu pago al 100%.
                  </p>
                </div>
              )}

              {/* Cuando los fondos están asegurados y el trabajo está IN_PROGRESS */}
              {currentJob && currentJob.status === 'IN_PROGRESS' && (
                <div>
                  <div className="status-alert success" style={{ marginBottom: '1.5rem' }}>
                    <h4><ShieldCheck size={18} /> ¡Fondos Asegurados en Custodia!</h4>
                    <p>
                      El cliente ya depositó ${escrow?.totalClientPaid} USD en la bóveda de Escrow. Tienes garantizado el cobro neto de <strong>${escrow?.netProviderPayout} USD</strong> al entregar satisfactoriamente.
                    </p>
                  </div>

                  {isProviderActor ? (
                    <form onSubmit={handleSubmitDeliverable}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                        Subir Entregable para Revisión
                      </h4>
                      <div className="form-group">
                        <label className="form-label">Enlace al Entregable (GitHub / Drive / Demo)</label>
                        <input
                          className="form-control"
                          value={deliverableUrl}
                          onChange={(e) => setDeliverableUrl(e.target.value)}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        <CheckCircle2 size={16} /> Entregar Trabajo para Aprobación
                      </button>
                    </form>
                  ) : (
                    <AvisoSoloLectura texto="Solo lectura: el prestador asignado debe iniciar sesión para subir el entregable." />
                  )}
                </div>
              )}

              {/* Trabajo entregado y en revisión */}
              {currentJob && currentJob.status === 'UNDER_REVIEW' && (
                <div className="status-alert info">
                  <h4>🚀 Trabajo Entregado — En Revisión por el Cliente</h4>
                  <p>El cliente tiene un plazo de revisión para validar los entregables y liberar el pago.</p>
                </div>
              )}

              {/* Trabajo completado y fondos liquidados */}
              {currentJob && currentJob.status === 'COMPLETED' && escrow && (
                <div className="status-alert success">
                  <h4>🎉 ¡Pago Liquidado en tu Cuenta!</h4>
                  <p>
                    Se han transferido <strong>${escrow.netProviderPayout.toFixed(2)} USD</strong> a tu cuenta de Stripe Connect vinculada ({escrow.payoutTransactionId}).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* VISTA AUDITOR / BÓVEDA FINANCIERA */}
          {activeRole === 'AUDITOR' && (
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
                Transparencia Financiera del Árbitro de Pagos
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                El software actúa como puente y garante neutral. Las transacciones se dividen automáticamente entre el cliente, el prestador y la plataforma según el modelo de <em>Split Payments</em>.
              </p>

              {escrow ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <table className="fin-table">
                    <tbody>
                      <tr><td>ID de Contrato de Custodia:</td><td>{escrow.id}</td></tr>
                      <tr><td>Transacción de Depósito Cliente:</td><td>{escrow.paymentTransactionId || 'Pendiente'}</td></tr>
                      <tr><td>Transacción de Liquidación Prestador:</td><td>{escrow.payoutTransactionId || 'Pendiente'}</td></tr>
                      <tr><td>Comisión Retenida para la Plataforma:</td><td style={{ color: 'var(--accent-emerald)' }}>${escrow.platformProfit.toFixed(2)} USD</td></tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-dim)' }}>No hay contratos de custodia activos en este momento.</p>
              )}
            </div>
          )}
        </section>
      </main>
      )}

      {/* Modal Asistente Profesional de Publicación */}
      <JobPublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        createJobUseCase={createJobUseCase}
        authUser={authUser}
        onJobPublished={refreshState}
      />

      {/* Modal de Tarifas, Comisiones & Garantía Escrow */}
      <TarifasGarantiaModal
        isOpen={showTarifasModal}
        onClose={() => setShowTarifasModal(false)}
        onPublishClick={() => {
          setShowTarifasModal(false);
          setShowPublishModal(true);
        }}
        onExploreClick={() => {
          setShowTarifasModal(false);
          setActiveRole('CATALOG');
        }}
      />

      {/* Modal de Áreas de Trabajo y Oficios Polivalentes */}
      <AreasTrabajoModal
        isOpen={showAreasModal}
        onClose={() => setShowAreasModal(false)}
        onSelectArea={(cat) => {
          setShowAreasModal(false);
          setLandingSearchCriteria({ query: '', location: '', category: cat });
          setActiveRole('CATALOG');
        }}
        onPublishArea={() => {
          setShowAreasModal(false);
          setShowPublishModal(true);
        }}
      />
    </div>
  );
}
export default App;
