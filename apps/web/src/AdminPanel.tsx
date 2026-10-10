import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  Lock,
  CreditCard,
  Scale,
  ScrollText,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  EyeOff,
  Ban,
  Unlock,
  RefreshCw,
  Wallet,
  TrendingUp,
  UserX,
  Gavel,
  Server,
  Percent,
} from 'lucide-react';

import { UserResponseDTO } from '@platform/user-service';
import { EscrowResponseDTO, EscrowStatus } from '@platform/escrow-service';
import { JobResponseDTO } from '@platform/job-service';
import { AuditEntryResponseDTO, AuditEntityType } from '@platform/audit-service';

import { SessionUser } from './LoginScreen';
import {
  listUsersUseCase,
  blockUserUseCase,
  unblockUserUseCase,
  listEscrowsUseCase,
  cancelEscrowUseCase,
  resolveEscrowDisputeUseCase,
  listJobsUseCase,
  queryAuditLogUseCase,
} from './platform';

type SeccionAdmin =
  | 'dashboard'
  | 'usuarios'
  | 'transacciones'
  | 'escrow'
  | 'pagos'
  | 'disputas'
  | 'auditoria'
  | 'reportes'
  | 'configuracion';

interface AdminPanelProps {
  admin: SessionUser;
  version: number;
  onLogout: () => void;
}

interface AccionCritica {
  titulo: string;
  mensaje: string;
  detalle?: string;
  requiereMotivo?: boolean;
  etiquetaConfirmar: string;
  peligro?: boolean;
  onConfirm: (motivo: string) => Promise<void>;
}

// ============================================================
// HELPERS DE FORMATO Y PRESENTACIÓN
// ============================================================
const dinero = (monto: number | undefined): string =>
  monto === undefined || monto === null ? '—' : `$${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fecha = (d: Date | string | undefined): string => {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};

const enmascarar = (valor: string | undefined, visible: boolean): string => {
  if (!valor) return '—';
  if (visible) return valor;
  if (valor.length <= 8) return `${valor.slice(0, 2)}••••`;
  return `${valor.slice(0, 6)}••••${valor.slice(-4)}`;
};

const claseEstadoEscrow = (estado: EscrowStatus): string => {
  switch (estado) {
    case 'PENDING_DEPOSIT': return 'ambar';
    case 'FUNDS_HELD': return 'esmeralda';
    case 'RELEASED': return 'indigo';
    case 'REFUNDED': return 'rosa';
    case 'DISPUTED': return 'rosa';
    case 'CANCELLED': return 'gris';
    default: return 'cian';
  }
};

const claseEstadoJob = (estado: string): string => {
  switch (estado) {
    case 'OPEN': return 'cian';
    case 'ASSIGNED_PENDING_ESCROW': return 'ambar';
    case 'IN_PROGRESS': return 'esmeralda';
    case 'UNDER_REVIEW': return 'indigo';
    case 'COMPLETED': return 'esmeralda';
    case 'CANCELLED': return 'gris';
    case 'IN_DISPUTE': return 'rosa';
    default: return 'gris';
  }
};

const etiquetaRol = (rol: string): string =>
  rol === 'CLIENT' ? 'Cliente' : rol === 'PROVIDER' ? 'Prestador' : rol === 'ADMIN' ? 'Administrador' : rol === 'USER' ? 'Usuario' : rol;

const sumar = (lista: EscrowResponseDTO[], selector: (e: EscrowResponseDTO) => number): number =>
  lista.reduce((total, item) => total + selector(item), 0);

// ============================================================
// MODAL DE CONFIRMACIÓN PARA OPERACIONES CRÍTICAS
// ============================================================
function ModalConfirmacion({
  accion,
  onCerrar,
}: {
  accion: AccionCritica;
  onCerrar: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [ejecutando, setEjecutando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const motivoValido = !accion.requiereMotivo || motivo.trim().length >= 10;

  const confirmar = async () => {
    setEjecutando(true);
    setError(null);
    try {
      await accion.onConfirm(motivo.trim());
      onCerrar();
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al ejecutar la operación');
    } finally {
      setEjecutando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <AlertTriangle size={22} color={accion.peligro ? '#f43f5e' : '#f59e0b'} />
          <h3>{accion.titulo}</h3>
        </div>
        <p className="modal-mensaje">{accion.mensaje}</p>
        {accion.detalle && <div className="modal-detalle">{accion.detalle}</div>}
        {accion.requiereMotivo && (
          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">
              Motivo de la decisión administrativa (mínimo 10 caracteres, queda registrado en auditoría)
            </label>
            <textarea
              className="form-control"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describe el fundamento de esta operación..."
            />
          </div>
        )}
        {error && (
          <div className="auth-error" style={{ marginTop: '0.75rem' }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCerrar} disabled={ejecutando}>
            Cancelar
          </button>
          <button
            className={`btn ${accion.peligro ? 'btn-danger' : 'btn-primary'}`}
            onClick={confirmar}
            disabled={ejecutando || !motivoValido}
          >
            {ejecutando ? 'Ejecutando...' : accion.etiquetaConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PANEL DE ADMINISTRACIÓN
// ============================================================
export function AdminPanel({ admin, version, onLogout }: AdminPanelProps) {
  const [seccion, setSeccion] = useState<SeccionAdmin>('dashboard');

  // Datos del sistema
  const [usuarios, setUsuarios] = useState<UserResponseDTO[]>([]);
  const [escrows, setEscrows] = useState<EscrowResponseDTO[]>([]);
  const [jobs, setJobs] = useState<JobResponseDTO[]>([]);
  const [cargando, setCargando] = useState(false);

  // Detalles y acciones
  const [accionPendiente, setAccionPendiente] = useState<AccionCritica | null>(null);
  const [usuarioDetalle, setUsuarioDetalle] = useState<string | null>(null);
  const [historialUsuario, setHistorialUsuario] = useState<AuditEntryResponseDTO[]>([]);
  const [transaccionDetalle, setTransaccionDetalle] = useState<string | null>(null);
  const [trazabilidadTransaccion, setTrazabilidadTransaccion] = useState<AuditEntryResponseDTO[]>([]);
  const [ultimaActividad, setUltimaActividad] = useState<AuditEntryResponseDTO[]>([]);

  // Filtros por sección
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [filtroRol, setFiltroRol] = useState('TODOS');
  const [filtroEstadoUsuario, setFiltroEstadoUsuario] = useState('TODOS');
  const [filtroEscrow, setFiltroEscrow] = useState<'TODAS' | EscrowStatus>('TODAS');
  const [idsVisibles, setIdsVisibles] = useState(false);

  // Filtros de auditoría
  const [filtroEntidad, setFiltroEntidad] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroLimite, setFiltroLimite] = useState(100);
  const [registrosAuditoria, setRegistrosAuditoria] = useState<AuditEntryResponseDTO[]>([]);

  // Filtros de reportes
  const [reporteDesde, setReporteDesde] = useState('');
  const [reporteHasta, setReporteHasta] = useState('');

  const mapaUsuarios = useMemo(() => {
    const mapa = new Map<string, UserResponseDTO>();
    usuarios.forEach((u) => mapa.set(u.id, u));
    return mapa;
  }, [usuarios]);

  const mapaJobs = useMemo(() => {
    const mapa = new Map<string, JobResponseDTO>();
    jobs.forEach((j) => mapa.set(j.id, j));
    return mapa;
  }, [jobs]);

  const nombreUsuario = (id: string | undefined): string => {
    if (!id) return '—';
    const u = mapaUsuarios.get(id);
    return u ? `${u.name} (${etiquetaRol(u.role)})` : id.slice(0, 12);
  };

  const cargarDatos = async () => {
    setCargando(true);
    const [us, esc, jbs, actividad] = await Promise.all([
      listUsersUseCase.execute(),
      listEscrowsUseCase.execute(),
      listJobsUseCase.execute(),
      queryAuditLogUseCase.execute({ limit: 8 }),
    ]);
    setUsuarios(us);
    setEscrows(esc);
    setJobs(jbs);
    setUltimaActividad(actividad);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [version]);

  // Historial de operaciones de un usuario (como actor o afectado)
  useEffect(() => {
    if (!usuarioDetalle) return;
    (async () => {
      const [comoActor, comoAfectado] = await Promise.all([
        queryAuditLogUseCase.execute({ actorId: usuarioDetalle, limit: 200 }),
        queryAuditLogUseCase.execute({ aggregateId: usuarioDetalle, limit: 200 }),
      ]);
      const vistos = new Set<string>();
      const combinados = [...comoActor, ...comoAfectado].filter((e) => {
        if (vistos.has(e.id)) return false;
        vistos.add(e.id);
        return true;
      });
      combinados.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
      setHistorialUsuario(combinados);
    })();
  }, [usuarioDetalle, version]);

  // Trazabilidad de una transacción (eventos del trabajo y de la custodia)
  useEffect(() => {
    if (!transaccionDetalle) return;
    const escrow = escrows.find((e) => e.id === transaccionDetalle);
    if (!escrow) return;
    (async () => {
      const [eventosJob, eventosEscrow] = await Promise.all([
        queryAuditLogUseCase.execute({ aggregateId: escrow.jobId, limit: 200 }),
        queryAuditLogUseCase.execute({ aggregateId: escrow.id, limit: 200 }),
      ]);
      const vistos = new Set<string>();
      const combinados = [...eventosJob, ...eventosEscrow].filter((e) => {
        if (vistos.has(e.id)) return false;
        vistos.add(e.id);
        return true;
      });
      combinados.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
      setTrazabilidadTransaccion(combinados);
    })();
  }, [transaccionDetalle, version]);

  // Consulta del registro de auditoría con filtros
  const consultarAuditoria = async () => {
    const filtro: Parameters<typeof queryAuditLogUseCase.execute>[0] = {
      limit: filtroLimite,
    };
    if (filtroEntidad) filtro.entityType = filtroEntidad as AuditEntityType;
    if (filtroEvento.trim()) filtro.eventName = filtroEvento.trim();
    if (filtroDesde) filtro.from = new Date(`${filtroDesde}T00:00:00`);
    if (filtroHasta) filtro.to = new Date(`${filtroHasta}T23:59:59`);
    const resultado = await queryAuditLogUseCase.execute(filtro);
    setRegistrosAuditoria(resultado);
  };

  useEffect(() => {
    consultarAuditoria();
  }, [version, seccion]);

  // ============================================================
  // ACCIONES ADMINISTRATIVAS (con confirmación)
  // ============================================================
  const abrirConfirmacionBloqueo = (usuario: UserResponseDTO) => {
    setAccionPendiente({
      titulo: 'Bloquear cuenta de usuario',
      mensaje: `El usuario ${usuario.name} no podrá iniciar sesión ni operar en la plataforma hasta ser desbloqueado.`,
      detalle: `Cuenta: ${usuario.email} · Rol: ${etiquetaRol(usuario.role)}`,
      requiereMotivo: true,
      etiquetaConfirmar: 'Bloquear Cuenta',
      peligro: true,
      onConfirm: async (motivo) => {
        await blockUserUseCase.execute({ userId: usuario.id, adminId: admin.id, reason: motivo });
        await cargarDatos();
      },
    });
  };

  const abrirConfirmacionDesbloqueo = (usuario: UserResponseDTO) => {
    setAccionPendiente({
      titulo: 'Desbloquear cuenta de usuario',
      mensaje: `Se restituye el acceso de ${usuario.name} a la plataforma.`,
      detalle: `Cuenta: ${usuario.email}`,
      etiquetaConfirmar: 'Desbloquear Cuenta',
      onConfirm: async () => {
        await unblockUserUseCase.execute({ userId: usuario.id, adminId: admin.id });
        await cargarDatos();
      },
    });
  };

  const abrirConfirmacionCancelacion = (escrow: EscrowResponseDTO) => {
    const trabajo = mapaJobs.get(escrow.jobId);
    setAccionPendiente({
      titulo: 'Cancelar contrato de custodia',
      mensaje:
        'Se cancelará la custodia sin haber cobrado al cliente. El trabajo volverá automáticamente al estado OPEN para recibir nuevas propuestas (saga compensatoria).',
      detalle: `Trabajo: ${trabajo?.title ?? escrow.jobId} · Monto base: ${dinero(escrow.baseAmount)}`,
      requiereMotivo: true,
      etiquetaConfirmar: 'Cancelar Custodia',
      peligro: true,
      onConfirm: async (motivo) => {
        await cancelEscrowUseCase.execute({ escrowId: escrow.id, adminId: admin.id, reason: motivo });
        await cargarDatos();
      },
    });
  };

  const abrirConfirmacionResolucion = (escrow: EscrowResponseDTO, resolucion: 'RELEASED_TO_PROVIDER' | 'REFUNDED_TO_CLIENT') => {
    const aFavorPrestador = resolucion === 'RELEASED_TO_PROVIDER';
    const trabajo = mapaJobs.get(escrow.jobId);
    setAccionPendiente({
      titulo: aFavorPrestador ? 'Resolver disputa a favor del prestador' : 'Resolver disputa a favor del cliente',
      mensaje: aFavorPrestador
        ? `Se liberarán ${dinero(escrow.netProviderPayout)} al prestador (retención de plataforma: ${dinero(escrow.providerCommission)}). El trabajo se marcará como COMPLETED automáticamente.`
        : `Se reembolsará el total de ${dinero(escrow.totalClientPaid)} al cliente. El trabajo se cancelará definitivamente.`,
      detalle: `Trabajo: ${trabajo?.title ?? escrow.jobId} · Fondos en disputa: ${dinero(escrow.totalClientPaid)}`,
      etiquetaConfirmar: aFavorPrestador ? 'Liberar al Prestador' : 'Reembolsar al Cliente',
      peligro: !aFavorPrestador,
      onConfirm: async () => {
        await resolveEscrowDisputeUseCase.execute({
          escrowId: escrow.id,
          adminId: admin.id,
          resolution: resolucion,
        });
        await cargarDatos();
      },
    });
  };

  // ============================================================
  // MÉTRICAS DERIVADAS (DASHBOARD Y REPORTES)
  // ============================================================
  const metricas = useMemo(() => {
    const retenidas = escrows.filter((e) => e.status === 'FUNDS_HELD' || e.status === 'DISPUTED');
    const liberadas = escrows.filter((e) => e.status === 'RELEASED');
    const reembolsadas = escrows.filter((e) => e.status === 'REFUNDED');
    const canceladas = escrows.filter((e) => e.status === 'CANCELLED');
    const pendientes = escrows.filter((e) => e.status === 'PENDING_DEPOSIT');
    const disputadas = escrows.filter((e) => e.status === 'DISPUTED');
    const depositadas = escrows.filter((e) => e.paymentTransactionId);

    return {
      usuariosTotal: usuarios.length,
      clientes: usuarios.filter((u) => u.role === 'CLIENT').length,
      prestadores: usuarios.filter((u) => u.role === 'PROVIDER').length,
      administradores: usuarios.filter((u) => u.role === 'ADMIN').length,
      bloqueados: usuarios.filter((u) => u.isBlocked).length,
      transaccionesTotal: escrows.length,
      transaccionesCompletadas: liberadas.length,
      transaccionesEnCurso: retenidas.length,
      transaccionesPendientes: pendientes.length,
      canceladas: canceladas.length,
      disputasAbiertas: disputadas.length,
      disputasResueltas: escrows.filter((e) => e.disputeResolution).length,
      fondosRetenidos: sumar(retenidas, (e) => e.totalClientPaid),
      pagosLiberados: sumar(liberadas, (e) => e.netProviderPayout),
      reembolsos: sumar(reembolsadas, (e) => e.totalClientPaid),
      valorProcesado: sumar(depositadas, (e) => e.totalClientPaid),
      ingresosPlataforma: sumar(liberadas, (e) => e.platformProfit),
      comisionesEnCustodia: sumar(retenidas, (e) => e.platformProfit),
      trabajosTotal: jobs.length,
      trabajosCompletados: jobs.filter((j) => j.status === 'COMPLETED').length,
    };
  }, [usuarios, escrows, jobs]);

  // ============================================================
  // FILTRADOS POR SECCIÓN
  // ============================================================
  const usuariosFiltrados = useMemo(() => {
    const termino = busquedaUsuario.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (termino && !u.name.toLowerCase().includes(termino) && !u.email.toLowerCase().includes(termino)) return false;
      if (filtroRol !== 'TODOS' && u.role !== filtroRol) return false;
      if (filtroEstadoUsuario === 'ACTIVOS' && u.isBlocked) return false;
      if (filtroEstadoUsuario === 'BLOQUEADOS' && !u.isBlocked) return false;
      if (filtroEstadoUsuario === 'VERIFICADOS' && !u.isVerified) return false;
      return true;
    });
  }, [usuarios, busquedaUsuario, filtroRol, filtroEstadoUsuario]);

  const escrowsFiltrados = useMemo(
    () => (filtroEscrow === 'TODAS' ? escrows : escrows.filter((e) => e.status === filtroEscrow)),
    [escrows, filtroEscrow]
  );

  const disputasAbiertas = useMemo(() => escrows.filter((e) => e.status === 'DISPUTED'), [escrows]);
  const disputasResueltas = useMemo(() => escrows.filter((e) => e.disputeResolution), [escrows]);

  const movimientosFinancieros = useMemo(() => {
    interface Movimiento {
      id: string;
      tipo: 'Depósito' | 'Liquidación a Prestador' | 'Reembolso a Cliente' | 'Comisión de Plataforma';
      monto: number;
      fecha: Date;
      txId?: string;
      jobId: string;
      contraparte: string;
    }
    const movimientos: Movimiento[] = [];
    escrows.forEach((e) => {
      const trabajo = mapaJobs.get(e.jobId);
      const etiquetaTrabajo = trabajo?.title ?? e.jobId;
      if (e.paymentTransactionId) {
        movimientos.push({
          id: `${e.id}-dep`,
          tipo: 'Depósito',
          monto: e.totalClientPaid,
          fecha: e.updatedAt,
          txId: e.paymentTransactionId,
          jobId: etiquetaTrabajo,
          contraparte: `Cliente: ${nombreUsuario(e.clientId)}`,
        });
      }
      if (e.payoutTransactionId) {
        movimientos.push({
          id: `${e.id}-pay`,
          tipo: 'Liquidación a Prestador',
          monto: e.netProviderPayout,
          fecha: e.updatedAt,
          txId: e.payoutTransactionId,
          jobId: etiquetaTrabajo,
          contraparte: `Prestador: ${nombreUsuario(e.providerId)}`,
        });
        movimientos.push({
          id: `${e.id}-fee`,
          tipo: 'Comisión de Plataforma',
          monto: e.platformProfit,
          fecha: e.updatedAt,
          txId: e.payoutTransactionId,
          jobId: etiquetaTrabajo,
          contraparte: 'TrustPay Escrow',
        });
      }
      if (e.refundTransactionId) {
        movimientos.push({
          id: `${e.id}-ref`,
          tipo: 'Reembolso a Cliente',
          monto: e.totalClientPaid,
          fecha: e.updatedAt,
          txId: e.refundTransactionId,
          jobId: etiquetaTrabajo,
          contraparte: `Cliente: ${nombreUsuario(e.clientId)}`,
        });
      }
    });
    movimientos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    return movimientos;
  }, [escrows, mapaJobs, usuarios]);

  const reporteEscrows = useMemo(() => {
    const desde = reporteDesde ? new Date(`${reporteDesde}T00:00:00`).getTime() : 0;
    const hasta = reporteHasta ? new Date(`${reporteHasta}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
    return escrows.filter(
      (e) => e.createdAt.getTime() >= desde && e.createdAt.getTime() <= hasta
    );
  }, [escrows, reporteDesde, reporteHasta]);

  const actividadUsuarios = useMemo(() => {
    const conteo = new Map<string, number>();
    registrosAuditoria.forEach((r) => {
      if (!r.actorId) return;
      conteo.set(r.actorId, (conteo.get(r.actorId) ?? 0) + 1);
    });
    return Array.from(conteo.entries())
      .map(([actorId, total]) => ({ actorId, total, nombre: nombreUsuario(actorId) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [registrosAuditoria, usuarios]);

  // ============================================================
  // NAVEGACIÓN
  // ============================================================
  const secciones: Array<{ id: SeccionAdmin; etiqueta: string; icono: React.ReactNode }> = [
    { id: 'dashboard', etiqueta: 'Dashboard', icono: <LayoutDashboard size={17} /> },
    { id: 'usuarios', etiqueta: 'Usuarios', icono: <Users size={17} /> },
    { id: 'transacciones', etiqueta: 'Transacciones', icono: <ArrowLeftRight size={17} /> },
    { id: 'escrow', etiqueta: 'Escrow', icono: <Lock size={17} /> },
    { id: 'pagos', etiqueta: 'Pagos', icono: <CreditCard size={17} /> },
    { id: 'disputas', etiqueta: 'Disputas', icono: <Scale size={17} /> },
    { id: 'auditoria', etiqueta: 'Auditoría', icono: <ScrollText size={17} /> },
    { id: 'reportes', etiqueta: 'Reportes', icono: <BarChart3 size={17} /> },
    { id: 'configuracion', etiqueta: 'Configuración', icono: <Settings size={17} /> },
  ];

  const renderSeccion = () => {
    switch (seccion) {
      case 'dashboard':
        return (
          <div>
            <h2 className="admin-section-title">Dashboard Operativo</h2>
            <p className="admin-section-sub">Indicadores en tiempo real de la plataforma financiera.</p>

            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon cian"><Users size={20} /></div>
                <div className="kpi-body">
                  <span className="kpi-value">{metricas.usuariosTotal}</span>
                  <span className="kpi-label">Usuarios registrados</span>
                  <span className="kpi-detail">{metricas.clientes} clientes · {metricas.prestadores} prestadores</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon indigo"><ArrowLeftRight size={20} /></div>
                <div className="kpi-body">
                  <span className="kpi-value">{metricas.transaccionesTotal}</span>
                  <span className="kpi-label">Transacciones totales</span>
                  <span className="kpi-detail">{metricas.transaccionesCompletadas} completadas · {metricas.transaccionesPendientes} pendientes</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon esmeralda"><Lock size={20} /></div>
                <div className="kpi-body">
                  <span className="kpi-value">{dinero(metricas.fondosRetenidos)}</span>
                  <span className="kpi-label">Fondos retenidos en escrow</span>
                  <span className="kpi-detail">{metricas.transaccionesEnCurso} custodias activas</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon esmeralda"><TrendingUp size={20} /></div>
                <div className="kpi-body">
                  <span className="kpi-value">{dinero(metricas.pagosLiberados)}</span>
                  <span className="kpi-label">Pagos liberados a prestadores</span>
                  <span className="kpi-detail">{metricas.transaccionesCompletadas} liquidaciones</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon rosa"><RefreshCw size={20} /></div>
                <div className="kpi-body">
                  <span className="kpi-value">{dinero(metricas.reembolsos)}</span>
                  <span className="kpi-label">Reembolsos a clientes</span>
                  <span className="kpi-detail">{metricas.canceladas} transacciones canceladas</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon ambar"><Scale size={20} /></div>
                <div className="kpi-body">
                  <span className="kpi-value">{metricas.disputasAbiertas}</span>
                  <span className="kpi-label">Disputas abiertas</span>
                  <span className="kpi-detail">{metricas.disputasResueltas} resueltas históricamente</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon cian"><Wallet size={20} /></div>
                <div className="kpi-body">
                  <span className="kpi-value">{dinero(metricas.valorProcesado)}</span>
                  <span className="kpi-label">Valor total procesado</span>
                  <span className="kpi-detail">Depósitos efectivamente cobrados</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon indigo"><Percent size={20} /></div>
                <div className="kpi-body">
                  <span className="kpi-value">{dinero(metricas.ingresosPlataforma)}</span>
                  <span className="kpi-label">Ingresos de la plataforma</span>
                  <span className="kpi-detail">+{dinero(metricas.comisionesEnCustodia)} en custodia</span>
                </div>
              </div>
            </div>

            <div className="admin-card" style={{ marginTop: '1.25rem' }}>
              <h3 className="admin-card-title">
                <RefreshCw size={16} /> Última actividad del sistema
              </h3>
              {ultimaActividad.length === 0 ? (
                <p className="admin-empty">Sin actividad registrada aún. La auditoría proyecta los eventos del broker en tiempo real.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Evento</th>
                      <th>Actor</th>
                      <th>Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimaActividad.map((r) => (
                      <tr key={r.id}>
                        <td className="mono">{fecha(r.occurredAt)}</td>
                        <td><span className="mono evento-nombre">{r.eventName}</span></td>
                        <td>{r.actorId ? nombreUsuario(r.actorId) : 'Sistema'}</td>
                        <td>{r.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );

      case 'usuarios':
        return (
          <div>
            <h2 className="admin-section-title">Gestión de Usuarios</h2>
            <p className="admin-section-sub">Consulta, búsqueda y moderación de cuentas de la plataforma.</p>

            <div className="admin-filters">
              <div className="admin-filter-busqueda">
                <Search size={15} />
                <input
                  className="form-control"
                  placeholder="Buscar por nombre o correo electrónico..."
                  value={busquedaUsuario}
                  onChange={(e) => setBusquedaUsuario(e.target.value)}
                />
              </div>
              <select className="form-control admin-filter-select" value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
                <option value="TODOS">Todos los roles</option>
                <option value="CLIENT">Clientes</option>
                <option value="PROVIDER">Prestadores</option>
                <option value="ADMIN">Administradores</option>
              </select>
              <select className="form-control admin-filter-select" value={filtroEstadoUsuario} onChange={(e) => setFiltroEstadoUsuario(e.target.value)}>
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVOS">Activos</option>
                <option value="BLOQUEADOS">Bloqueados</option>
                <option value="VERIFICADOS">Verificados</option>
              </select>
            </div>

            <div className="admin-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Verificado</th>
                    <th>Estado</th>
                    <th>Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.id} className={usuarioDetalle === u.id ? 'fila-seleccionada' : ''}>
                      <td>
                        <strong>{u.name}</strong>
                        <div className="mono subtexto">{enmascarar(u.id, idsVisibles)}</div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`estado-badge ${u.role === 'ADMIN' ? 'indigo' : u.role === 'CLIENT' ? 'cian' : 'ambar'}`}>
                          {etiquetaRol(u.role)}
                        </span>
                      </td>
                      <td>{u.isVerified ? <CheckCircle2 size={16} color="#34d399" /> : <XCircle size={16} color="#64748b" />}</td>
                      <td>
                        <span className={`estado-badge ${u.isBlocked ? 'rosa' : 'esmeralda'}`}>
                          {u.isBlocked ? 'Bloqueado' : 'Activo'}
                        </span>
                      </td>
                      <td className="subtexto">{fecha(u.createdAt)}</td>
                      <td>
                        <div className="acciones-tabla">
                          <button className="btn-tabla" title="Ver historial de operaciones" onClick={() => setUsuarioDetalle(usuarioDetalle === u.id ? null : u.id)}>
                            <Eye size={14} /> Historial
                          </button>
                          {u.isBlocked ? (
                            <button className="btn-tabla exito" onClick={() => abrirConfirmacionDesbloqueo(u)} disabled={u.id === admin.id}>
                              <Unlock size={14} /> Desbloquear
                            </button>
                          ) : (
                            <button className="btn-tabla peligro" onClick={() => abrirConfirmacionBloqueo(u)} disabled={u.id === admin.id}>
                              <Ban size={14} /> Bloquear
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {usuariosFiltrados.length === 0 && <p className="admin-empty">No hay usuarios que coincidan con los filtros.</p>}
            </div>

            {usuarioDetalle && (
              <div className="admin-card" style={{ marginTop: '1rem' }}>
                <h3 className="admin-card-title">
                  <ScrollText size={16} /> Historial de operaciones · {nombreUsuario(usuarioDetalle)}
                </h3>
                {historialUsuario.length === 0 ? (
                  <p className="admin-empty">El usuario no tiene operaciones registradas en auditoría.</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Evento</th>
                        <th>Entidad</th>
                        <th>Descripción</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialUsuario.map((r) => (
                        <tr key={r.id}>
                          <td className="mono">{fecha(r.occurredAt)}</td>
                          <td><span className="mono evento-nombre">{r.eventName}</span></td>
                          <td><span className="estado-badge gris">{r.entityType}</span></td>
                          <td>{r.description}</td>
                          <td>{r.amount !== undefined ? dinero(r.amount) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        );

      case 'transacciones':
        return (
          <div>
            <h2 className="admin-section-title">Gestión de Transacciones</h2>
            <p className="admin-section-sub">
              Cada transacción une un trabajo, su oferta aceptada y el contrato de custodia. Seleccione una fila para ver el detalle y la trazabilidad.
            </p>

            <div className="admin-card">
              <table className="admin-table tabla-clickeable">
                <thead>
                  <tr>
                    <th>ID Custodia</th>
                    <th>Trabajo</th>
                    <th>Comprador</th>
                    <th>Vendedor</th>
                    <th>Valor base</th>
                    <th>Total pagado</th>
                    <th>Fecha</th>
                    <th>Escrow</th>
                    <th>Trabajo</th>
                  </tr>
                </thead>
                <tbody>
                  {escrows.map((e) => {
                    const trabajo = mapaJobs.get(e.jobId);
                    return (
                      <tr
                        key={e.id}
                        className={transaccionDetalle === e.id ? 'fila-seleccionada' : ''}
                        onClick={() => setTransaccionDetalle(transaccionDetalle === e.id ? null : e.id)}
                      >
                        <td className="mono">{enmascarar(e.id, idsVisibles)}</td>
                        <td><strong>{trabajo?.title ?? '—'}</strong></td>
                        <td>{nombreUsuario(e.clientId)}</td>
                        <td>{nombreUsuario(e.providerId)}</td>
                        <td>{dinero(e.baseAmount)}</td>
                        <td>{dinero(e.totalClientPaid)}</td>
                        <td className="subtexto">{fecha(e.createdAt)}</td>
                        <td><span className={`estado-badge ${claseEstadoEscrow(e.status)}`}>{e.status}</span></td>
                        <td>
                          {trabajo && (
                            <span className={`estado-badge ${claseEstadoJob(trabajo.status)}`}>{trabajo.status}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {escrows.length === 0 && <p className="admin-empty">Aún no hay transacciones en la plataforma.</p>}
            </div>

            {transaccionDetalle && (
              <DetalleTransaccion
                escrow={escrows.find((e) => e.id === transaccionDetalle)!}
                trabajo={mapaJobs.get(escrows.find((e) => e.id === transaccionDetalle)!.jobId)}
                trazabilidad={trazabilidadTransaccion}
                idsVisibles={idsVisibles}
                nombreUsuario={nombreUsuario}
                onVerDisputa={() => setSeccion('disputas')}
              />
            )}
          </div>
        );

      case 'escrow':
        return (
          <div>
            <h2 className="admin-section-title">Módulo Escrow</h2>
            <p className="admin-section-sub">
              Custodias de fondos por estado. La cancelación aplica solo a custodias sin depósito (nunca se cobró al cliente).
            </p>

            <div className="resumen-grid">
              <div className="resumen-item ambar">
                <span className="resumen-cifra">{escrows.filter((e) => e.status === 'PENDING_DEPOSIT').length}</span>
                <span className="resumen-etiqueta">Pendientes de depósito</span>
              </div>
              <div className="resumen-item esmeralda">
                <span className="resumen-cifra">{escrows.filter((e) => e.status === 'FUNDS_HELD').length}</span>
                <span className="resumen-etiqueta">Fondos retenidos</span>
              </div>
              <div className="resumen-item rosa">
                <span className="resumen-cifra">{disputasAbiertas.length}</span>
                <span className="resumen-etiqueta">Requieren intervención</span>
              </div>
              <div className="resumen-item indigo">
                <span className="resumen-cifra">{escrows.filter((e) => e.status === 'RELEASED').length}</span>
                <span className="resumen-etiqueta">Liberadas</span>
              </div>
              <div className="resumen-item rosa">
                <span className="resumen-cifra">{escrows.filter((e) => e.status === 'REFUNDED').length}</span>
                <span className="resumen-etiqueta">Reembolsadas</span>
              </div>
              <div className="resumen-item gris">
                <span className="resumen-cifra">{escrows.filter((e) => e.status === 'CANCELLED').length}</span>
                <span className="resumen-etiqueta">Canceladas</span>
              </div>
            </div>

            <div className="admin-filters">
              <div className="tabs-estado">
                {(['TODAS', 'PENDING_DEPOSIT', 'FUNDS_HELD', 'DISPUTED', 'RELEASED', 'REFUNDED', 'CANCELLED'] as const).map((estado) => (
                  <button
                    key={estado}
                    className={`tab-estado ${filtroEscrow === estado ? 'activo' : ''}`}
                    onClick={() => setFiltroEscrow(estado)}
                  >
                    {estado === 'TODAS' ? 'Todas' : estado}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Trabajo</th>
                    <th>Cliente</th>
                    <th>Prestador</th>
                    <th>Base</th>
                    <th>Neto prestador</th>
                    <th>Comisión</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {escrowsFiltrados.map((e) => (
                    <tr key={e.id}>
                      <td className="mono">{enmascarar(e.id, idsVisibles)}</td>
                      <td><strong>{mapaJobs.get(e.jobId)?.title ?? e.jobId.slice(0, 12)}</strong></td>
                      <td>{nombreUsuario(e.clientId)}</td>
                      <td>{nombreUsuario(e.providerId)}</td>
                      <td>{dinero(e.baseAmount)}</td>
                      <td>{dinero(e.netProviderPayout)}</td>
                      <td>{dinero(e.platformProfit)}</td>
                      <td><span className={`estado-badge ${claseEstadoEscrow(e.status)}`}>{e.status}</span></td>
                      <td>
                        {e.status === 'PENDING_DEPOSIT' ? (
                          <button className="btn-tabla peligro" onClick={() => abrirConfirmacionCancelacion(e)}>
                            <XCircle size={14} /> Cancelar
                          </button>
                        ) : e.status === 'DISPUTED' ? (
                          <button className="btn-tabla" onClick={() => setSeccion('disputas')}>
                            <Gavel size={14} /> Resolver
                          </button>
                        ) : (
                          <span className="subtexto">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {escrowsFiltrados.length === 0 && <p className="admin-empty">No hay custodias en este estado.</p>}
            </div>
          </div>
        );

      case 'pagos':
        return (
          <div>
            <h2 className="admin-section-title">Pagos y Movimientos Financieros</h2>
            <p className="admin-section-sub">
              Depósitos, liquidaciones, reembolsos y comisiones de la plataforma. Los identificadores se muestran enmascarados para proteger datos sensibles.
            </p>

            <div className="admin-filters">
              <label className="filtro-check">
                <input
                  type="checkbox"
                  checked={idsVisibles}
                  onChange={(e) => setIdsVisibles(e.target.checked)}
                />
                {idsVisibles ? <EyeOff size={15} /> : <Eye size={15} />}
                {idsVisibles ? 'Ocultar identificadores' : 'Mostrar identificadores completos'}
              </label>
            </div>

            <div className="admin-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo de movimiento</th>
                    <th>Contraparte</th>
                    <th>Trabajo</th>
                    <th>Identificador</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosFinancieros.map((m) => (
                    <tr key={m.id}>
                      <td className="mono">{fecha(m.fecha)}</td>
                      <td>
                        <span
                          className={`estado-badge ${
                            m.tipo === 'Depósito'
                              ? 'esmeralda'
                              : m.tipo === 'Liquidación a Prestador'
                              ? 'indigo'
                              : m.tipo === 'Reembolso a Cliente'
                              ? 'rosa'
                              : 'ambar'
                          }`}
                        >
                          {m.tipo}
                        </span>
                      </td>
                      <td>{m.contraparte}</td>
                      <td>{m.jobId}</td>
                      <td className="mono">{enmascarar(m.txId, idsVisibles)}</td>
                      <td><strong>{dinero(m.monto)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {movimientosFinancieros.length === 0 && (
                <p className="admin-empty">Sin movimientos financieros registrados.</p>
              )}
            </div>
          </div>
        );

      case 'disputas':
        return (
          <div>
            <h2 className="admin-section-title">Disputas y Reclamos</h2>
            <p className="admin-section-sub">
              Las disputas son abiertas por clientes o prestadores con fondos retenidos. La decisión administrativa libera o reembolsa los fondos y resuelve el trabajo automáticamente.
            </p>

            <h3 className="admin-subtitulo">Disputas abiertas ({disputasAbiertas.length})</h3>
            {disputasAbiertas.length === 0 ? (
              <div className="admin-card">
                <p className="admin-empty">
                  No hay disputas abiertas. Los participantes pueden abrir una disputa desde el marketplace cuando un trabajo está en progreso o bajo revisión.
                </p>
              </div>
            ) : (
              disputasAbiertas.map((e) => {
                const trabajo = mapaJobs.get(e.jobId);
                return (
                  <div key={e.id} className="tarjeta-disputa">
                    <div className="disputa-cabecera">
                      <div>
                        <strong>{trabajo?.title ?? 'Trabajo eliminado'}</strong>
                        <div className="subtexto">
                          Disputa abierta {fecha(e.disputeOpenedAt)} por {nombreUsuario(e.disputeOpenedBy)}
                        </div>
                      </div>
                      <span className="estado-badge rosa">EN DISPUTA</span>
                    </div>

                    <div className="disputa-motivo">
                      <strong>Motivo del reclamo:</strong> {e.disputeReason ?? 'No especificado'}
                    </div>

                    <div className="disputa-datos">
                      <div>
                        <span className="disputa-dato-label">Fondos retenidos</span>
                        <span className="disputa-dato-valor">{dinero(e.totalClientPaid)}</span>
                      </div>
                      <div>
                        <span className="disputa-dato-label">Neto al prestador</span>
                        <span className="disputa-dato-valor">{dinero(e.netProviderPayout)}</span>
                      </div>
                      <div>
                        <span className="disputa-dato-label">Estado del trabajo</span>
                        <span className="disputa-dato-valor">{trabajo?.status ?? '—'}</span>
                      </div>
                      <div>
                        <span className="disputa-dato-label">Comprador / Vendedor</span>
                        <span className="disputa-dato-valor">{nombreUsuario(e.clientId)} → {nombreUsuario(e.providerId)}</span>
                      </div>
                    </div>

                    <div className="disputa-acciones">
                      <button className="btn btn-success" onClick={() => abrirConfirmacionResolucion(e, 'RELEASED_TO_PROVIDER')}>
                        <CheckCircle2 size={15} /> Resolver a favor del prestador ({dinero(e.netProviderPayout)})
                      </button>
                      <button className="btn btn-danger" onClick={() => abrirConfirmacionResolucion(e, 'REFUNDED_TO_CLIENT')}>
                        <RefreshCw size={15} /> Reembolsar al cliente ({dinero(e.totalClientPaid)})
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            <h3 className="admin-subtitulo" style={{ marginTop: '1.5rem' }}>
              Decisiones registradas ({disputasResueltas.length})
            </h3>
            <div className="admin-card">
              {disputasResueltas.length === 0 ? (
                <p className="admin-empty">Aún no hay disputas resueltas.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Trabajo</th>
                      <th>Decisión</th>
                      <th>Resuelta por</th>
                      <th>Monto</th>
                      <th>Estado final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disputasResueltas.map((e) => (
                      <tr key={e.id}>
                        <td><strong>{mapaJobs.get(e.jobId)?.title ?? e.jobId.slice(0, 12)}</strong></td>
                        <td>
                          <span className={`estado-badge ${e.disputeResolution === 'RELEASED_TO_PROVIDER' ? 'esmeralda' : 'rosa'}`}>
                            {e.disputeResolution === 'RELEASED_TO_PROVIDER' ? 'Liberado al prestador' : 'Reembolsado al cliente'}
                          </span>
                        </td>
                        <td>{nombreUsuario(e.disputeResolvedBy)}</td>
                        <td>
                          {dinero(
                            e.disputeResolution === 'RELEASED_TO_PROVIDER' ? e.netProviderPayout : e.totalClientPaid
                          )}
                        </td>
                        <td><span className={`estado-badge ${claseEstadoEscrow(e.status)}`}>{e.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );

      case 'auditoria':
        return (
          <div>
            <h2 className="admin-section-title">Auditoría y Actividad</h2>
            <p className="admin-section-sub">
              Registro inmutable de solo consulta: cada evento del broker se proyecta como una entrada con actor, entidades afectadas y resultado.
            </p>

            <div className="admin-filters">
              <select className="form-control admin-filter-select" value={filtroEntidad} onChange={(e) => setFiltroEntidad(e.target.value)}>
                <option value="">Todas las entidades</option>
                <option value="USUARIO">Usuario</option>
                <option value="TRABAJO">Trabajo</option>
                <option value="PROPUESTA">Propuesta</option>
                <option value="CUSTODIA">Custodia</option>
                <option value="RESEÑA">Reseña</option>
              </select>
              <input
                className="form-control admin-filter-select"
                placeholder="Nombre de evento (ej: escrow.released)"
                value={filtroEvento}
                onChange={(e) => setFiltroEvento(e.target.value)}
              />
              <input type="date" className="form-control admin-filter-select" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} />
              <input type="date" className="form-control admin-filter-select" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} />
              <select className="form-control admin-filter-select" value={filtroLimite} onChange={(e) => setFiltroLimite(Number(e.target.value))}>
                <option value={50}>Últimos 50</option>
                <option value={100}>Últimos 100</option>
                <option value={250}>Últimos 250</option>
                <option value={1000}>Todos</option>
              </select>
              <button className="btn btn-primary" onClick={consultarAuditoria}>
                <Search size={15} /> Consultar
              </button>
            </div>

            <div className="admin-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Evento</th>
                    <th>Entidad</th>
                    <th>Actor</th>
                    <th>Descripción</th>
                    <th>Ids afectados</th>
                    <th>Monto</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosAuditoria.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{fecha(r.occurredAt)}</td>
                      <td><span className="mono evento-nombre">{r.eventName}</span></td>
                      <td><span className="estado-badge gris">{r.entityType}</span></td>
                      <td>{r.actorId ? nombreUsuario(r.actorId) : 'Sistema'}</td>
                      <td>{r.description}</td>
                      <td className="mono subtexto">{r.affectedIds.map((id) => enmascarar(id, idsVisibles)).join(', ') || '—'}</td>
                      <td>{r.amount !== undefined ? dinero(r.amount) : '—'}</td>
                      <td>
                        <span className={`estado-badge ${r.result === 'EXITOSA' ? 'esmeralda' : 'rosa'}`}>{r.result}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {registrosAuditoria.length === 0 && <p className="admin-empty">No hay entradas que coincidan con los filtros.</p>}
            </div>
          </div>
        );

      case 'reportes':
        return (
          <ReportesSeccion
            escrows={reporteEscrows}
            jobs={jobs}
            usuarios={usuarios}
            actividadUsuarios={actividadUsuarios}
            desde={reporteDesde}
            hasta={reporteHasta}
            onDesde={setReporteDesde}
            onHasta={setReporteHasta}
          />
        );

      case 'configuracion':
        return (
          <div>
            <h2 className="admin-section-title">Configuración de la Plataforma</h2>
            <p className="admin-section-sub">Parámetros del modelo de negocio e infraestructura desplegada (solo consulta).</p>

            <div className="config-grid">
              <div className="admin-card">
                <h3 className="admin-card-title"><Percent size={16} /> Modelo de comisiones (take-rate)</h3>
                <div className="config-fila"><span>Tarifa de servicio al cliente</span><strong>3% sobre el monto base</strong></div>
                <div className="config-fila"><span>Retención al prestador</span><strong>10% sobre el monto base</strong></div>
                <div className="config-fila"><span>Moneda base</span><strong>USD</strong></div>
                <div className="config-fila"><span>Ejemplo ($500 de base)</span><strong>Cliente paga $515 · Prestador recibe $450 · Plataforma $65</strong></div>
              </div>

              <div className="admin-card">
                <h3 className="admin-card-title"><Server size={16} /> Microservicios desplegados</h3>
                {[
                  'user-service — registro, verificación y sesiones',
                  'job-service — publicación y ciclo de vida de trabajos',
                  'bidding-service — ofertas y adjudicación',
                  'escrow-service — custodia, pagos y disputas',
                  'review-service — calificaciones y reputación',
                  'job-feed-service — muro de trabajos (CQRS)',
                  'audit-service — registro de auditoría (CQRS)',
                  'event-choreography — saga por coreografía',
                ].map((s) => (
                  <div key={s} className="config-fila">
                    <span className="mono">{s}</span>
                    <span className="estado-badge esmeralda">OPERATIVO</span>
                  </div>
                ))}
              </div>

              <div className="admin-card">
                <h3 className="admin-card-title"><ShieldCheck size={16} /> Seguridad y control de acceso</h3>
                <div className="config-fila"><span>Sesión actual</span><strong>{admin.name} ({admin.email})</strong></div>
                <div className="config-fila"><span>Rol</span><span className="estado-badge indigo">ADMINISTRADOR</span></div>
                <div className="config-fila"><span>Operaciones críticas</span><strong>Requieren confirmación con motivo</strong></div>
                <div className="config-fila"><span>Registro de auditoría</span><span className="estado-badge esmeralda">ACTIVO</span></div>
                <div className="config-fila"><span>Política de contraseñas</span><strong>Mínimo 8 caracteres, hash scrypt</strong></div>
              </div>

              <div className="admin-card">
                <h3 className="admin-card-title"><UserX size={16} /> Moderación de cuentas</h3>
                <div className="config-fila"><span>Usuarios bloqueados</span><strong>{metricas.bloqueados}</strong></div>
                <div className="config-fila"><span>Auto-bloqueo del administrador</span><strong>No permitido</strong></div>
                <div className="config-fila"><span>Cuentas verificadas (KYC)</span><strong>{usuarios.filter((u) => u.isVerified).length} de {usuarios.length}</strong></div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="admin-container">
      <header className="navbar admin-navbar">
        <div className="brand">
          <div className="brand-icon admin-brand-icon">
            <ShieldCheck size={24} />
          </div>
          <div>
            <span>TrustPay</span>
            <span style={{ color: 'var(--accent-cyan)', marginLeft: '4px' }}>Escrow</span>
          </div>
          <span className="badge-arch">Panel de Administración</span>
        </div>
        <div className="session-info">
          <span className="session-pill">
            <ShieldCheck size={13} /> {admin.name} · Administrador
          </span>
          {cargando && (
            <span className="estado-badge cian" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <RefreshCw size={12} className="girando" /> actualizando
            </span>
          )}
          <button className="btn btn-secondary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }} onClick={onLogout}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          {secciones.map((s) => (
            <button
              key={s.id}
              className={`admin-nav-btn ${seccion === s.id ? 'activo' : ''}`}
              onClick={() => setSeccion(s.id)}
            >
              {s.icono}
              <span>{s.etiqueta}</span>
              {s.id === 'disputas' && disputasAbiertas.length > 0 && (
                <span className="nav-contador">{disputasAbiertas.length}</span>
              )}
              {s.id === 'usuarios' && metricas.bloqueados > 0 && (
                <span className="nav-contador ambar">{metricas.bloqueados}</span>
              )}
            </button>
          ))}
          <div className="admin-sidebar-pie">
            <span className="estado-badge esmeralda">BROKER ONLINE</span>
            <span className="subtexto">Auditoría proyectando eventos</span>
          </div>
        </aside>

        <main className="admin-contenido">{renderSeccion()}</main>
      </div>

      {accionPendiente && <ModalConfirmacion accion={accionPendiente} onCerrar={() => setAccionPendiente(null)} />}
    </div>
  );
}

// ============================================================
// DETALLE DE TRANSACCIÓN CON TRAZABILIDAD
// ============================================================
function DetalleTransaccion({
  escrow,
  trabajo,
  trazabilidad,
  idsVisibles,
  nombreUsuario,
  onVerDisputa,
}: {
  escrow: EscrowResponseDTO;
  trabajo?: JobResponseDTO;
  trazabilidad: AuditEntryResponseDTO[];
  idsVisibles: boolean;
  nombreUsuario: (id: string | undefined) => string;
  onVerDisputa: () => void;
}) {
  return (
    <div className="admin-card" style={{ marginTop: '1rem' }}>
      <h3 className="admin-card-title">
        <ArrowLeftRight size={16} /> Detalle de la transacción · {trabajo?.title ?? '—'}
      </h3>

      <div className="detalle-grid">
        <div className="detalle-fila"><span>ID de custodia</span><strong className="mono">{enmascarar(escrow.id, idsVisibles)}</strong></div>
        <div className="detalle-fila"><span>Comprador (cliente)</span><strong>{nombreUsuario(escrow.clientId)}</strong></div>
        <div className="detalle-fila"><span>Vendedor (prestador)</span><strong>{nombreUsuario(escrow.providerId)}</strong></div>
        <div className="detalle-fila"><span>Fecha de creación</span><strong>{fecha(escrow.createdAt)}</strong></div>
        <div className="detalle-fila"><span>Estado de custodia</span><span className={`estado-badge ${claseEstadoEscrow(escrow.status)}`}>{escrow.status}</span></div>
        <div className="detalle-fila"><span>Estado del trabajo</span>{trabajo && <span className={`estado-badge ${claseEstadoJob(trabajo.status)}`}>{trabajo.status}</span>}</div>
      </div>

      <h4 className="admin-subtitulo" style={{ margin: '1.25rem 0 0.5rem' }}>Desglose económico (split payments)</h4>
      <div className="detalle-grid">
        <div className="detalle-fila"><span>Monto base acordado</span><strong>{dinero(escrow.baseAmount)}</strong></div>
        <div className="detalle-fila"><span>Tarifa al cliente (3%)</span><strong>{dinero(escrow.clientFee)}</strong></div>
        <div className="detalle-fila"><span>Total pagado por el cliente</span><strong>{dinero(escrow.totalClientPaid)}</strong></div>
        <div className="detalle-fila"><span>Comisión al prestador (10%)</span><strong>{dinero(escrow.providerCommission)}</strong></div>
        <div className="detalle-fila"><span>Neto liquidado al prestador</span><strong>{dinero(escrow.netProviderPayout)}</strong></div>
        <div className="detalle-fila"><span>Ganancia de la plataforma</span><strong>{dinero(escrow.platformProfit)}</strong></div>
      </div>

      <h4 className="admin-subtitulo" style={{ margin: '1.25rem 0 0.5rem' }}>Identificadores de pasarela (enmascarados)</h4>
      <div className="detalle-grid">
        <div className="detalle-fila"><span>Transacción de depósito</span><strong className="mono">{enmascarar(escrow.paymentTransactionId, idsVisibles)}</strong></div>
        <div className="detalle-fila"><span>Transferencia de liquidación</span><strong className="mono">{enmascarar(escrow.payoutTransactionId, idsVisibles)}</strong></div>
        <div className="detalle-fila"><span>Reembolso</span><strong className="mono">{enmascarar(escrow.refundTransactionId, idsVisibles)}</strong></div>
      </div>

      {escrow.disputeReason && (
        <div className="tarjeta-disputa" style={{ marginTop: '1rem' }}>
          <div className="disputa-cabecera">
            <div>
              <strong>Disputa sobre esta transacción</strong>
              <div className="subtexto">
                Abierta {fecha(escrow.disputeOpenedAt)} por {nombreUsuario(escrow.disputeOpenedBy)}
              </div>
            </div>
            <button className="btn-tabla" onClick={onVerDisputa}>
              <Gavel size={14} /> Ir a resolver
            </button>
          </div>
          <div className="disputa-motivo">
            <strong>Motivo:</strong> {escrow.disputeReason}
          </div>
        </div>
      )}

      <h4 className="admin-subtitulo" style={{ margin: '1.25rem 0 0.5rem' }}>Trazabilidad de eventos</h4>
      {trazabilidad.length === 0 ? (
        <p className="admin-empty">Sin eventos registrados para esta transacción.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Evento</th>
              <th>Actor</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {trazabilidad.map((r, idx) => (
              <tr key={r.id}>
                <td className="subtexto">{idx + 1}</td>
                <td className="mono">{fecha(r.occurredAt)}</td>
                <td><span className="mono evento-nombre">{r.eventName}</span></td>
                <td>{r.actorId ? nombreUsuario(r.actorId) : 'Sistema'}</td>
                <td>{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ============================================================
// REPORTES Y ESTADÍSTICAS
// ============================================================
function ReportesSeccion({
  escrows,
  jobs,
  usuarios,
  actividadUsuarios,
  desde,
  hasta,
  onDesde,
  onHasta,
}: {
  escrows: EscrowResponseDTO[];
  jobs: JobResponseDTO[];
  usuarios: UserResponseDTO[];
  actividadUsuarios: Array<{ actorId: string; total: number; nombre: string }>;
  desde: string;
  hasta: string;
  onDesde: (v: string) => void;
  onHasta: (v: string) => void;
}) {
  const resumen = useMemo(() => {
    const liberadas = escrows.filter((e) => e.status === 'RELEASED');
    const retenidas = escrows.filter((e) => e.status === 'FUNDS_HELD' || e.status === 'DISPUTED');
    const reembolsadas = escrows.filter((e) => e.status === 'REFUNDED');
    const canceladas = escrows.filter((e) => e.status === 'CANCELLED');
    const depositadas = escrows.filter((e) => e.paymentTransactionId);
    return {
      total: escrows.length,
      valorProcesado: sumar(depositadas, (e) => e.totalClientPaid),
      retenido: sumar(retenidas, (e) => e.totalClientPaid),
      liberado: sumar(liberadas, (e) => e.netProviderPayout),
      reembolsado: sumar(reembolsadas, (e) => e.totalClientPaid),
      comisiones: sumar(liberadas, (e) => e.platformProfit),
      canceladas: canceladas.length,
      disputas: escrows.filter((e) => e.status === 'DISPUTED').length,
      disputasResueltas: escrows.filter((e) => e.disputeResolution).length,
    };
  }, [escrows]);

  const porEstado = useMemo(() => {
    const estados: EscrowStatus[] = ['PENDING_DEPOSIT', 'FUNDS_HELD', 'DISPUTED', 'RELEASED', 'REFUNDED', 'CANCELLED'];
    return estados.map((estado) => ({
      estado,
      total: escrows.filter((e) => e.status === estado).length,
    }));
  }, [escrows]);

  const maximoEstado = Math.max(1, ...porEstado.map((p) => p.total));
  const maximoActividad = Math.max(1, ...actividadUsuarios.map((a) => a.total));

  return (
    <div>
      <h2 className="admin-section-title">Reportes y Estadísticas</h2>
      <p className="admin-section-sub">Volumen y valores agregados con filtros por fecha y estado.</p>

      <div className="admin-filters">
        <label className="form-label" style={{ margin: 0 }}>Desde</label>
        <input type="date" className="form-control admin-filter-select" value={desde} onChange={(e) => onDesde(e.target.value)} />
        <label className="form-label" style={{ margin: 0 }}>Hasta</label>
        <input type="date" className="form-control admin-filter-select" value={hasta} onChange={(e) => onHasta(e.target.value)} />
        {(desde || hasta) && (
          <button className="btn btn-secondary" onClick={() => { onDesde(''); onHasta(''); }}>
            Limpiar fechas
          </button>
        )}
      </div>

      <div className="resumen-grid">
        <div className="resumen-item cian">
          <span className="resumen-cifra">{resumen.total}</span>
          <span className="resumen-etiqueta">Transacciones en el período</span>
        </div>
        <div className="resumen-item esmeralda">
          <span className="resumen-cifra">{dinero(resumen.valorProcesado)}</span>
          <span className="resumen-etiqueta">Valor total procesado</span>
        </div>
        <div className="resumen-item ambar">
          <span className="resumen-cifra">{dinero(resumen.retenido)}</span>
          <span className="resumen-etiqueta">Fondos actualmente retenidos</span>
        </div>
        <div className="resumen-item indigo">
          <span className="resumen-cifra">{dinero(resumen.liberado)}</span>
          <span className="resumen-etiqueta">Fondos liberados a prestadores</span>
        </div>
        <div className="resumen-item rosa">
          <span className="resumen-cifra">{dinero(resumen.reembolsado)}</span>
          <span className="resumen-etiqueta">Reembolsos otorgados</span>
        </div>
        <div className="resumen-item gris">
          <span className="resumen-cifra">{resumen.canceladas}</span>
          <span className="resumen-etiqueta">Cancelaciones</span>
        </div>
        <div className="resumen-item rosa">
          <span className="resumen-cifra">{resumen.disputas}</span>
          <span className="resumen-etiqueta">Disputas abiertas</span>
        </div>
        <div className="resumen-item esmeralda">
          <span className="resumen-cifra">{dinero(resumen.comisiones)}</span>
          <span className="resumen-etiqueta">Comisiones realizadas</span>
        </div>
      </div>

      <div className="reportes-graficos">
        <div className="admin-card">
          <h3 className="admin-card-title"><BarChart3 size={16} /> Transacciones por estado</h3>
          <div className="grafico-barras">
            {porEstado.map((p) => (
              <div key={p.estado} className="grafico-fila">
                <span className="grafico-etiqueta mono">{p.estado}</span>
                <div className="grafico-pista">
                  <div
                    className={`grafico-barra ${claseEstadoEscrow(p.estado)}`}
                    style={{ width: `${(p.total / maximoEstado) * 100}%` }}
                  />
                </div>
                <span className="grafico-valor">{p.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <h3 className="admin-card-title"><Users size={16} /> Actividad de usuarios (top 5)</h3>
          {actividadUsuarios.length === 0 ? (
            <p className="admin-empty">Sin actividad registrada en el período de consulta.</p>
          ) : (
            <div className="grafico-barras">
              {actividadUsuarios.map((a) => (
                <div key={a.actorId} className="grafico-fila">
                  <span className="grafico-etiqueta">{a.nombre}</span>
                  <div className="grafico-pista">
                    <div className="grafico-barra cian" style={{ width: `${(a.total / maximoActividad) * 100}%` }} />
                  </div>
                  <span className="grafico-valor">{a.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: '1rem' }}>
        <h3 className="admin-card-title">Resumen operativo del período</h3>
        <div className="detalle-grid">
          <div className="detalle-fila"><span>Usuarios en la plataforma</span><strong>{usuarios.length}</strong></div>
          <div className="detalle-fila"><span>Trabajos publicados</span><strong>{jobs.length}</strong></div>
          <div className="detalle-fila"><span>Trabajos completados</span><strong>{jobs.filter((j) => j.status === 'COMPLETED').length}</strong></div>
          <div className="detalle-fila"><span>Disputas resueltas</span><strong>{resumen.disputasResueltas}</strong></div>
          <div className="detalle-fila"><span>Tasa de finalización</span><strong>{escrows.length > 0 ? `${((resumen.total - resumen.canceladas) / resumen.total * 100).toFixed(1)}%` : '—'}</strong></div>
          <div className="detalle-fila"><span>Ticket promedio (base)</span><strong>{escrows.length > 0 ? dinero(sumar(escrows, (e) => e.baseAmount) / escrows.length) : '—'}</strong></div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
