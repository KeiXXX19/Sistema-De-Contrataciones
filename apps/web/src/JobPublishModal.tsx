import React, { useState, useRef } from 'react';
import {
  X,
  ShieldCheck,
  Briefcase,
  FileText,
  Coins,
  MapPin,
  Calendar,
  Wrench,
  Image as ImageIcon,
  Eye,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  Clock,
  Users,
  Layers,
  Lock,
} from 'lucide-react';
import { CreateJobUseCase } from '@platform/job-service';
import { JobModalidad } from '@platform/job-feed-service';
import { SessionUser } from './LoginScreen';

interface JobPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  createJobUseCase: CreateJobUseCase;
  authUser: SessionUser | null;
  onJobPublished: () => Promise<void>;
}

export const CATEGORIAS_LABORALES = [
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

export const CIUDADES_COLOMBIA = [
  'Bogotá D.C.',
  'Medellín, Antioquia',
  'Cali, Valle del Cauca',
  'Barranquilla, Atlántico',
  'Bucaramanga, Santander',
  'Cartagena, Bolívar',
  'Pereira, Risaralda',
  'Manizales, Caldas',
  'Cúcuta, Norte de Santander',
  'Ibagué, Tolima',
  'Santa Marta, Magdalena',
  'Villavicencio, Meta',
  'Remoto (Colombia)',
];

type TipoPresupuesto = 'FIXED' | 'HOURLY' | 'DAILY' | 'NEGOTIABLE';

interface ArchivoAdjunto {
  name: string;
  type: string;
  size: number;
  url: string;
}

export function JobPublishModal({
  isOpen,
  onClose,
  createJobUseCase,
  authUser,
  onJobPublished,
}: JobPublishModalProps) {
  if (!isOpen) return null;

  // Paso actual del formulario: 1 a 5
  const [paso, setPaso] = useState<number>(1);

  // 1. Información General
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS_LABORALES[0]);
  const [especialidad, setEspecialidad] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // 2. Descripción & Alcance
  const [descripcion, setDescripcion] = useState('');
  const [alcancePrecio, setAlcancePrecio] = useState<'LABOR_ONLY' | 'ALL_INCLUSIVE'>('LABOR_ONLY');

  // 3. Presupuesto & Fechas
  const [tipoPresupuesto, setTipoPresupuesto] = useState<TipoPresupuesto>('FIXED');
  const [moneda, setMoneda] = useState<'COP' | 'USD'>('COP');
  const [montoPresupuesto, setMontoPresupuesto] = useState<number>(1800000);
  const [duracionEstimada, setDuracionEstimada] = useState('3 días');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaLimitePropuestas, setFechaLimitePropuestas] = useState('');

  // 4. Ubicación & Modalidad
  const [modalidad, setModalidad] = useState<JobModalidad>('PRESENCIAL');
  const [ciudad, setCiudad] = useState(CIUDADES_COLOMBIA[0]);
  const [direccion, setDireccion] = useState('');

  // 5. Requisitos & Mano de Obra
  const [personasNecesarias, setPersonasNecesarias] = useState<number>(1);
  const [nivelExperiencia, setNivelExperiencia] = useState('Técnico / Oficial con experiencia');
  const [herramientasRequeridas, setHerramientasRequeridas] = useState('');
  const [materialesSuministrados, setMaterialesSuministrados] = useState<'CLIENT' | 'PROVIDER' | 'NOT_APPLICABLE'>('CLIENT');
  const [certificaciones, setCertificaciones] = useState('');
  const [visitaPrevia, setVisitaPrevia] = useState(false);

  // Campos dinámicos por categoría
  const [catField1, setCatField1] = useState('');
  const [catField2, setCatField2] = useState('');

  // 6. Archivos y Evidencias
  const [archivos, setArchivos] = useState<ArchivoAdjunto[]>([]);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado de publicación y mensajes
  const [submitting, setSubmitting] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [publicadoExitoso, setPublicadoExitoso] = useState(false);

  // Manejo de carga de archivos
  const handleArchivosSeleccionados = (files: FileList | null) => {
    if (!files) return;
    setErrorArchivo(null);

    const nuevosArchivos: ArchivoAdjunto[] = [];
    const maxArchivos = 8;
    const maxImagenBytes = 5 * 1024 * 1024; // 5MB
    const maxPdfBytes = 10 * 1024 * 1024; // 10MB

    if (archivos.length + files.length > maxArchivos) {
      setErrorArchivo(`Puedes adjuntar un máximo de ${maxArchivos} archivos por publicación.`);
      return;
    }

    Array.from(files).forEach((file) => {
      const esImagen = file.type.startsWith('image/');
      const esPdf = file.type === 'application/pdf';

      if (!esImagen && !esPdf) {
        setErrorArchivo(`El archivo "${file.name}" no es válido. Solo se permiten imágenes (JPG, PNG, WEBP) o documentos PDF.`);
        return;
      }

      if (esImagen && file.size > maxImagenBytes) {
        setErrorArchivo(`La imagen "${file.name}" excede el límite máximo de 5MB.`);
        return;
      }

      if (esPdf && file.size > maxPdfBytes) {
        setErrorArchivo(`El documento PDF "${file.name}" excede el límite máximo de 10MB.`);
        return;
      }

      // Convertir a Data URI seguro para almacenamiento en memoria
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setArchivos((prev) => [
            ...prev,
            {
              name: file.name,
              type: file.type,
              size: file.size,
              url: e.target!.result as string,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleEliminarArchivo = (index: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
  };

  // Validaciones antes de avanzar de paso
  const validarPasoActual = (): boolean => {
    setErrorGlobal(null);
    if (paso === 1) {
      if (titulo.trim().length < 5) {
        setErrorGlobal('El título del trabajo debe tener al menos 5 caracteres.');
        return false;
      }
    }
    if (paso === 2) {
      if (descripcion.trim().length < 15) {
        setErrorGlobal('La descripción debe tener al menos 15 caracteres para explicar claramente el requerimiento.');
        return false;
      }
    }
    if (paso === 3) {
      if (montoPresupuesto <= 0) {
        setErrorGlobal('El monto del presupuesto debe ser mayor a 0.');
        return false;
      }
    }
    if (paso === 4) {
      if (modalidad === 'PRESENCIAL' && ciudad !== 'Remoto (Colombia)' && !direccion.trim()) {
        setErrorGlobal('Para trabajos presenciales, especifica una dirección, obra o sector de referencia.');
        return false;
      }
    }
    return true;
  };

  const avanzarPaso = () => {
    if (validarPasoActual()) {
      setPaso((prev) => Math.min(prev + 1, 6));
    }
  };

  const retrocederPaso = () => {
    setErrorGlobal(null);
    setPaso((prev) => Math.max(prev - 1, 1));
  };

  // Envío del Formulario
  const handlePublicarFinal = async () => {
    if (!authUser || (authUser.role !== 'CLIENT' && authUser.role !== 'USER')) {
      setErrorGlobal('Debes iniciar sesión con rol de Cliente o Usuario para publicar trabajos protegidos con Escrow.');
      return;
    }

    if (!validarPasoActual()) return;

    setSubmitting(true);
    setErrorGlobal(null);

    try {
      // Parsear tags
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Herramientas como lista
      const toolsList = herramientasRequeridas
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const certsList = certificaciones
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      // Campos dinámicos por categoría
      const categoryDetails: Record<string, any> = {
        especialidad: especialidad.trim() || undefined,
        visitaPrevia,
      };

      if (catField1.trim()) categoryDetails.especificacion1 = catField1.trim();
      if (catField2.trim()) categoryDetails.especificacion2 = catField2.trim();

      await createJobUseCase.execute({
        title: titulo.trim(),
        description: descripcion.trim(),
        category,
        clientId: authUser.id,
        budgetAmount: montoPresupuesto,
        budgetType: tipoPresupuesto,
        currency: moneda,
        estimatedDuration: duracionEstimada.trim(),
        modalidad,
        location: modalidad === 'REMOTO' ? 'Remoto (Colombia)' : ciudad,
        address: direccion.trim() || undefined,
        attachments: archivos,
        requirements: {
          workerCount: personasNecesarias,
          experienceLevel: nivelExperiencia.trim(),
          toolsRequired: toolsList.length > 0 ? toolsList : undefined,
          materialsIncludedBy: materialesSuministrados,
          certificationsRequired: certsList.length > 0 ? certsList : undefined,
          scopeType: alcancePrecio,
          proposalsDeadline: fechaLimitePropuestas || undefined,
          startDate: fechaInicio || undefined,
        },
        categoryDetails,
      });

      setPublicadoExitoso(true);
      await onJobPublished();
    } catch (err: any) {
      console.error('Error al publicar trabajo:', err);
      setErrorGlobal(err.message || 'Error al publicar el requerimiento en el sistema.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatearDinero = (monto: number, curr: string) => {
    if (curr === 'COP') return `$${monto.toLocaleString('es-CO')} COP`;
    return `$${monto.toLocaleString('en-US')} USD`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card job-publish-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Cabecera del Modal */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="publish-modal-badge-icon">
              <ShieldCheck size={22} color="#10b981" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                Publicar Requerimiento de Mano de Obra & Servicios
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Protegido por custodia neutral TrustPay Escrow
              </p>
            </div>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        {publicadoExitoso ? (
          /* Pantalla de Éxito */
          <div className="publish-success-view" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div className="success-icon-wrap" style={{ margin: '0 auto 1.25rem' }}>
              <CheckCircle2 size={54} color="#10b981" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-bright)' }}>
              ¡Requerimiento Publicado Exitosamente!
            </h2>
            <p style={{ maxWidth: '520px', margin: '0.5rem auto 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Tu oferta de trabajo ya está visible en el muro laboral con protección de custodia Escrow.
              Los prestadores calificados podrán enviar sus cotizaciones y propuestas técnicas.
            </p>
            <div className="success-summary-card">
              <div><strong>Título:</strong> {titulo}</div>
              <div><strong>Presupuesto:</strong> {formatearDinero(montoPresupuesto, moneda)} ({tipoPresupuesto})</div>
              <div><strong>Categoría:</strong> {categoria} · {modalidad}</div>
              <div><strong>Archivos Adjuntos:</strong> {archivos.length} archivos</div>
            </div>
            <div style={{ marginTop: '1.75rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                }}
              >
                Ver en el Muro de Empleos
              </button>
            </div>
          </div>
        ) : (
          /* Stepper y Formulario */
          <>
            {/* Stepper de Progreso */}
            <div className="publish-stepper-row">
              {[
                { n: 1, label: 'General' },
                { n: 2, label: 'Descripción' },
                { n: 3, label: 'Presupuesto' },
                { n: 4, label: 'Ubicación' },
                { n: 5, label: 'Requisitos' },
                { n: 6, label: 'Adjuntos & Preview' },
              ].map((s) => (
                <div
                  key={s.n}
                  className={`publish-step-pill ${paso === s.n ? 'active' : paso > s.n ? 'completed' : ''}`}
                  onClick={() => {
                    if (s.n < paso) setPaso(s.n);
                    else if (validarPasoActual()) setPaso(s.n);
                  }}
                >
                  <span className="step-num">{s.n}</span>
                  <span className="step-txt">{s.label}</span>
                </div>
              ))}
            </div>

            {errorGlobal && (
              <div className="alert-error-banner" style={{ margin: '1rem 0' }}>
                <AlertCircle size={16} color="#ef4444" />
                <span>{errorGlobal}</span>
              </div>
            )}

            {/* PASO 1: INFORMACIÓN GENERAL */}
            {paso === 1 && (
              <div className="publish-step-content" style={{ marginTop: '1.25rem' }}>
                <h4 className="publish-section-heading">1. Información General del Trabajo</h4>

                <div className="form-group">
                  <label className="form-label">
                    Título Claro del Trabajo o Servicio Solicitado <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Instalación de Redes Eléctricas Trifásicas y Tableros en Bodega"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    required
                    minLength={5}
                  />
                  <span className="form-help">Sé específico con la labor a realizar y el tipo de oficio.</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">
                      Área o Categoría Laboral <span className="req-star">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                    >
                      {CATEGORIAS_LABORALES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Especialidad / Subcategoría</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. Media tensión, Obra blanca, Drywall..."
                      value={especialidad}
                      onChange={(e) => setEspecialidad(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Palabras Clave / Tags (separados por coma)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Electricista, CONTE, Bodega, ARL, Cableado"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* PASO 2: DESCRIPCIÓN & ALCANCE */}
            {paso === 2 && (
              <div className="publish-step-content" style={{ marginTop: '1.25rem' }}>
                <h4 className="publish-section-heading">2. Descripción y Alcance del Trabajo</h4>

                <div className="form-group">
                  <label className="form-label">
                    Descripción Detallada del Requerimiento <span className="req-star">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows={6}
                    placeholder="Explica detalladamente:&#10;- ¿Cuál es la labor principal a desarrollar?&#10;- Condiciones actuales del lugar o infraestructura&#10;- Entregables o resultado esperado&#10;- Horarios de trabajo o restricciones de acceso"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    required
                    minLength={15}
                  />
                  <span className="form-help">Mínimo 15 caracteres. Entre más detalle brindes, cotizaciones más precisas recibirás.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Alcance del Trabajo</label>
                  <div className="scope-selection-grid">
                    <label className={`scope-card-option ${alcancePrecio === 'LABOR_ONLY' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="alcance"
                        checked={alcancePrecio === 'LABOR_ONLY'}
                        onChange={() => setAlcancePrecio('LABOR_ONLY')}
                        style={{ display: 'none' }}
                      />
                      <div className="scope-title">Solo Mano de Obra</div>
                      <div className="scope-desc">Tú como cliente provees todos los materiales y suministros necesarios.</div>
                    </label>

                    <label className={`scope-card-option ${alcancePrecio === 'ALL_INCLUSIVE' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="alcance"
                        checked={alcancePrecio === 'ALL_INCLUSIVE'}
                        onChange={() => setAlcancePrecio('ALL_INCLUSIVE')}
                        style={{ display: 'none' }}
                      />
                      <div className="scope-title">A Todo Costo (Mano de Obra + Materiales)</div>
                      <div className="scope-desc">El contratista debe incluir materiales, insumos y herramientas en su cotización.</div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3: PRESUPUESTO & FECHAS */}
            {paso === 3 && (
              <div className="publish-step-content" style={{ marginTop: '1.25rem' }}>
                <h4 className="publish-section-heading">3. Presupuesto y Modalidad de Pago</h4>

                <div className="form-group">
                  <label className="form-label">Tipo de Presupuesto</label>
                  <div className="budget-type-grid">
                    {[
                      { key: 'FIXED', label: 'Precio Fijo', desc: 'Pago total por entrega completa de la labor' },
                      { key: 'DAILY', label: 'Por Jornada (Día)', desc: 'Tarifa diaria pactada por día trabajado' },
                      { key: 'HOURLY', label: 'Por Hora', desc: 'Tarifa por horas dedicadas al servicio' },
                      { key: 'NEGOTIABLE', label: 'Negociable', desc: 'A convenir según cotizaciones de los postulantes' },
                    ].map((b) => (
                      <div
                        key={b.key}
                        className={`budget-type-card ${tipoPresupuesto === b.key ? 'active' : ''}`}
                        onClick={() => setTipoPresupuesto(b.key as TipoPresupuesto)}
                      >
                        <strong className="b-label">{b.label}</strong>
                        <span className="b-desc">{b.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Moneda</label>
                    <select
                      className="form-control"
                      value={moneda}
                      onChange={(e) => setMoneda(e.target.value as 'COP' | 'USD')}
                    >
                      <option value="COP">COP (Pesos Colombianos)</option>
                      <option value="USD">USD (Dólares Americanos)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Monto Presupuestado ({moneda}) <span className="req-star">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={montoPresupuesto}
                      onChange={(e) => setMontoPresupuesto(Number(e.target.value))}
                      min={10000}
                      step={50000}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Duración Estimada</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. 3 días, 2 semanas, 40 horas..."
                      value={duracionEstimada}
                      onChange={(e) => setDuracionEstimada(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fecha Límite para Recibir Propuestas</label>
                    <input
                      type="date"
                      className="form-control"
                      value={fechaLimitePropuestas}
                      onChange={(e) => setFechaLimitePropuestas(e.target.value)}
                    />
                  </div>
                </div>

                <div className="escrow-notice-box">
                  <Lock size={18} color="#10b981" />
                  <div>
                    <strong>Garantía TrustPay Escrow</strong>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      El dinero se retiene de forma neutral tras aceptar una propuesta. El contratista tiene la certeza de pago y tú conservas la potestad de aprobar el resultado antes de que los fondos sean liberados.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 4: UBICACIÓN & MODALIDAD */}
            {paso === 4 && (
              <div className="publish-step-content" style={{ marginTop: '1.25rem' }}>
                <h4 className="publish-section-heading">4. Modalidad y Ubicación del Trabajo</h4>

                <div className="form-group">
                  <label className="form-label">Modalidad de Ejecución</label>
                  <div className="modalidad-buttons-row">
                    {[
                      { val: 'PRESENCIAL', label: 'Presencial en Sitio de Obra / Instalación' },
                      { val: 'HIBRIDO', label: 'Híbrido (Visitas puntuales + trabajo remoto)' },
                      { val: 'REMOTO', label: '100% Remoto (Digital / Diseño / Software)' },
                    ].map((m) => (
                      <button
                        key={m.val}
                        type="button"
                        className={`btn-modality-pick ${modalidad === m.val ? 'active' : ''}`}
                        onClick={() => setModalidad(m.val as JobModalidad)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Ciudad / Departamento</label>
                    <select
                      className="form-control"
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                    >
                      {CIUDADES_COLOMBIA.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Dirección o Sector de Trabajo {modalidad === 'PRESENCIAL' && <span className="req-star">*</span>}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. Calle 26 # 68-35, Bodega Industrial / Barrio Chapinero"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha Estimada de Inicio</label>
                  <input
                    type="date"
                    className="form-control"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* PASO 5: REQUISITOS & CONDICIONES */}
            {paso === 5 && (
              <div className="publish-step-content" style={{ marginTop: '1.25rem' }}>
                <h4 className="publish-section-heading">5. Requisitos del Trabajador y Mano de Obra</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Número de Personas Necesarias</label>
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      max={50}
                      value={personasNecesarias}
                      onChange={(e) => setPersonasNecesarias(Math.max(1, Number(e.target.value)))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nivel de Experiencia Requerido</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. Oficial de primera, Técnico certificado, Más de 3 años..."
                      value={nivelExperiencia}
                      onChange={(e) => setNivelExperiencia(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Herramientas y Maquinaria Necesarias (separadas por coma)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Multímetro calibrado, Escalera dieléctrica, Taladro percutor, Soldador inversor"
                    value={herramientasRequeridas}
                    onChange={(e) => setHerramientasRequeridas(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Certificaciones y Permisos Exigidos (separados por coma)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Curso de Alturas Avanzado vigente, Matrícula CONTE, Tarjeta Profesional"
                    value={certificaciones}
                    onChange={(e) => setCertificaciones(e.target.value)}
                  />
                </div>

                {/* Campos Dinámicos contextuales según la categoría seleccionada */}
                <div className="category-dynamic-fields-card">
                  <div className="dyn-card-title">
                    <Wrench size={16} /> Especificaciones Específicas para {categoria}
                  </div>

                  {categoria.includes('Construcción') || categoria.includes('Electricidad') || categoria.includes('Soldadura') || categoria.includes('Plomería') ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Nivel de Riesgo ARL / EPP Exigido</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej. Riesgo IV o V, Casco con barbuquejo, Botas dieléctricas"
                          value={catField1}
                          onChange={(e) => setCatField1(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Condiciones del Sitio / Altura</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej. Trabajo en alturas > 1.5m, Espacio confinado"
                          value={catField2}
                          onChange={(e) => setCatField2(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : categoria.includes('Tecnología') ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Stack Tecnológico Requerido</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej. React, Node.js, TypeScript, PostgreSQL, Docker"
                          value={catField1}
                          onChange={(e) => setCatField1(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Entorno de Entrega</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej. Repositorio en GitHub, Pull Request, Despliegue en AWS"
                          value={catField2}
                          onChange={(e) => setCatField2(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : categoria.includes('Administración') || categoria.includes('Finanzas') ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Software Contable / ERP</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej. Siigo Nube, World Office, SAP Business One"
                          value={catField1}
                          onChange={(e) => setCatField1(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Requerimiento Tributario</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej. Firma de Contador DIAN, Declaración de Renta"
                          value={catField2}
                          onChange={(e) => setCatField2(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label className="form-label">Requerimientos Técnicos Adicionales</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Herramientas específicas o especificaciones del oficio"
                        value={catField1}
                        onChange={(e) => setCatField1(e.target.value)}
                      />
                    </div>
                  )}

                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input
                        type="checkbox"
                        checked={visitaPrevia}
                        onChange={(e) => setVisitaPrevia(e.target.checked)}
                      />
                      <span>¿Se requiere visita técnica previa al sitio antes de cotizar?</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 6: ARCHIVOS ADJUNTOS & VISTA PREVIA */}
            {paso === 6 && (
              <div className="publish-step-content" style={{ marginTop: '1.25rem' }}>
                <h4 className="publish-section-heading">6. Archivos, Fotografías y Previsualización</h4>

                {/* Zona de Carga de Archivos */}
                <div
                  className="upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={38} color="#0284c7" />
                  <div className="dropzone-text">
                    <strong>Haz clic aquí o arrastra fotos y planos para adjuntar</strong>
                    <span>Formatos permitidos: JPG, PNG, WEBP (hasta 5MB) y PDF (hasta 10MB)</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => handleArchivosSeleccionados(e.target.files)}
                  />
                </div>

                {errorArchivo && (
                  <div className="alert-error-banner" style={{ marginTop: '0.5rem' }}>
                    <AlertCircle size={15} color="#ef4444" />
                    <span>{errorArchivo}</span>
                  </div>
                )}

                {/* Lista de Archivos Adjuntos con Thumbnails y Borrado */}
                {archivos.length > 0 && (
                  <div className="attached-files-grid" style={{ marginTop: '1rem' }}>
                    {archivos.map((arch, idx) => (
                      <div key={idx} className="attached-file-chip">
                        {arch.type.startsWith('image/') ? (
                          <img src={arch.url} alt={arch.name} className="attached-thumb" />
                        ) : (
                          <div className="pdf-thumb-box">
                            <FileText size={22} color="#ef4444" />
                          </div>
                        )}
                        <div className="attached-info">
                          <span className="file-name" title={arch.name}>{arch.name}</span>
                          <span className="file-size">{(arch.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        <button
                          type="button"
                          className="btn-remove-attachment"
                          onClick={() => handleEliminarArchivo(idx)}
                          title="Eliminar archivo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Boceto de Previsualización de cómo se verá el anuncio */}
                <div className="preview-container-box" style={{ marginTop: '1.5rem' }}>
                  <div className="preview-box-header">
                    <Eye size={16} color="#0284c7" />
                    <span>Vista previa del anuncio en el catálogo de TrustPay Escrow</span>
                  </div>

                  <div className="job-card-mockup" style={{ margin: '0.75rem 0 0 0' }}>
                    {archivos.find((a) => a.type.startsWith('image/')) && (
                      <div className="mockup-img-banner">
                        <img
                          src={archivos.find((a) => a.type.startsWith('image/'))!.url}
                          alt="Foto del trabajo"
                          style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
                        />
                      </div>
                    )}
                    <div className="mockup-header">
                      <div>
                        <span className="mockup-badge-sector">{categoria} · {modalidad}</span>
                        <h4 className="mockup-job-title">{titulo || '[Título del trabajo]'}</h4>
                        <span className="mockup-client-name">
                          {authUser?.name || 'Cliente Verificado'} · {modalidad === 'REMOTO' ? 'Remoto' : ciudad}
                        </span>
                      </div>
                      <div className="mockup-badge-escrow">
                        <ShieldCheck size={14} /> Custodia Escrow Activa
                      </div>
                    </div>

                    <p className="mockup-desc">
                      {descripcion || '[Descripción del requerimiento y condiciones...]'}
                    </p>

                    <div className="mockup-footer">
                      <div className="mockup-price">
                        <span className="mockup-price-label">
                          Presupuesto ({tipoPresupuesto === 'DAILY' ? 'Por jornada' : tipoPresupuesto === 'HOURLY' ? 'Por hora' : 'Precio fijo'})
                        </span>
                        <span className="mockup-price-value">{formatearDinero(montoPresupuesto, moneda)}</span>
                      </div>
                      <div className="mockup-btn-placeholder">
                        Postular / Cotizar con Escrow
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones de Navegación del Modal */}
            <div className="modal-actions publish-modal-footer" style={{ marginTop: '1.75rem' }}>
              {paso > 1 ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={retrocederPaso}
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ArrowLeft size={16} /> Anterior
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancelar
                </button>
              )}

              {paso < 6 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={avanzarPaso}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}
                >
                  Siguiente <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePublicarFinal}
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', fontWeight: 700 }}
                >
                  {submitting ? (
                    <>
                      <div className="spinner-small"></div>
                      <span>Publicando en Catálogo...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Confirmar y Publicar Anuncio</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default JobPublishModal;
