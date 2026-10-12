import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Coins,
  CheckCircle2,
  Users,
  Briefcase,
  HelpCircle,
  Sparkles,
  Layers,
  Scale,
  PlusCircle,
  Calculator,
} from 'lucide-react';

interface TarifasGarantiaViewProps {
  onPublishClick?: () => void;
  onExploreClick?: () => void;
  onBackToHome?: () => void;
}

export function TarifasGarantiaView({
  onPublishClick,
  onExploreClick,
  onBackToHome,
}: TarifasGarantiaViewProps) {
  const [moneda, setMoneda] = useState<'COP' | 'USD'>('COP');
  const [montoSimulado, setMontoSimulado] = useState<number>(1500000);

  // Fórmulas matemáticas en centavos idénticas a Escrow.calculateFees (+3% cliente, -10% prestador)
  const feeCliente = Math.round(montoSimulado * 0.03);
  const totalCliente = montoSimulado + feeCliente;
  const feePrestador = Math.round(montoSimulado * 0.10);
  const netoPrestador = montoSimulado - feePrestador;
  const gananciaPlataforma = feeCliente + feePrestador;

  const formatearMonto = (monto: number) => {
    if (moneda === 'COP') {
      return `$${monto.toLocaleString('es-CO')} COP`;
    }
    return `$${monto.toLocaleString('en-US')} USD`;
  };

  const PRESETS_COP = [
    { label: '$500 mil', val: 500000 },
    { label: '$1.5 Millones', val: 1500000 },
    { label: '$3 Millones', val: 3000000 },
    { label: '$6 Millones', val: 6000000 },
    { label: '$12 Millones', val: 12000000 },
  ];

  const PRESETS_USD = [
    { label: '$150 USD', val: 150 },
    { label: '$500 USD', val: 500 },
    { label: '$1,000 USD', val: 1000 },
    { label: '$2,500 USD', val: 2500 },
    { label: '$5,000 USD', val: 5000 },
  ];

  return (
    <div className="catalog-wrapper tarifas-view-wrapper">
      {/* Banner Hero */}
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
              <ShieldCheck size={14} /> Esquema Transparente Verificado
            </span>
          </div>
        )}

        <div className="catalog-hero-content">
          <div className="hero-badge">
            <ShieldCheck size={14} color="var(--sky-600)" />
            <span>Transparencia Financiera & Bóveda Escrow</span>
          </div>
          <h1 className="catalog-title">
            Tarifas, Comisiones & <span className="highlight-text">Garantía Escrow</span>
          </h1>
          <p className="catalog-subtitle">
            Sin cobros ocultos ni sorpresas. Descubre cómo opera el modelo de custodia neutral, por qué los fondos están 100% protegidos hasta la entrega y calcula la liquidación exacta de cualquier contrato.
          </p>
        </div>

        {/* Declaración de Polivalencia */}
        <div className="polivalente-statement-card" style={{ marginTop: '1.25rem' }}>
          <div className="polivalente-icon-wrap">
            <Users size={26} color="#7c3aed" />
          </div>
          <div className="polivalente-content">
            <h3>Somos Polivalentes: Contratas y Ofertas con la Misma Cuenta</h3>
            <p>
              En TrustPay la relación es simétrica y transparente. Cualquier usuario registrado puede publicar requerimientos para su empresa u hogar (rol Cliente) y al mismo tiempo ofertar en proyectos afines a sus competencias profesionales (rol Prestador), bajo las mismas garantías matemáticas.
            </p>
            <div className="polivalente-features-grid">
              <div className="poly-feature">
                <CheckCircle2 size={16} color="#10b981" />
                <span><strong>Misma Bóveda:</strong> Custodia financiera segura en ambas direcciones.</span>
              </div>
              <div className="poly-feature">
                <CheckCircle2 size={16} color="#10b981" />
                <span><strong>Sin Membresías:</strong> Solo pagas o descuentas cuando hay un contrato activo.</span>
              </div>
              <div className="poly-feature">
                <CheckCircle2 size={16} color="#10b981" />
                <span><strong>Reputación Única:</strong> Construyes historial como contratante y prestador.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de 3 Pilares del Esquema */}
      <div className="tarifas-triplet-grid" style={{ marginTop: '1.5rem' }}>
        <div className="tarifa-col-card cliente glass-card">
          <div className="tarifa-col-header">
            <span className="tarifa-col-tag">Cliente / Empleador</span>
            <span className="tarifa-col-num">+3%</span>
          </div>
          <h4 className="tarifa-col-title">Sobre el Monto Base en Custodia</h4>
          <p className="tarifa-col-desc">
            Se abona al momento de iniciar el contrato. Tus fondos permanecen congelados en la bóveda de custodia y no se entregan al prestador hasta tu visto bueno.
          </p>
          <ul className="tarifa-col-list">
            <li>Protección del 100% de tu dinero durante la ejecución.</li>
            <li>Garantía de cumplimiento antes de cualquier desembolso.</li>
            <li>Derecho a solicitar correcciones y revisiones sin costo.</li>
            <li>Resolución imparcial de disputas si hay incumplimiento.</li>
          </ul>
        </div>

        <div className="tarifa-col-card prestador glass-card">
          <div className="tarifa-col-header">
            <span className="tarifa-col-tag">Prestador / Profesional</span>
            <span className="tarifa-col-num">-10%</span>
          </div>
          <h4 className="tarifa-col-title">Al Liberar Fondos con Entrega Aprobada</h4>
          <p className="tarifa-col-desc">
            Se descuenta automáticamente al completarse la entrega con éxito. No pagas nada por postularte ni por tener cuenta activa en la plataforma.
          </p>
          <ul className="tarifa-col-list">
            <li>Cero riesgo de impago: los fondos ya existen en la bóveda.</li>
            <li>Cobro solo por éxito: trabajas sobre dinero garantizado.</li>
            <li>Protección contra clientes abusivos o cancelaciones arbitrarias.</li>
            <li>Calificación verificada que sube tu ranking profesional.</li>
          </ul>
        </div>

        <div className="tarifa-col-card plataforma glass-card">
          <div className="tarifa-col-header">
            <span className="tarifa-col-tag">Plataforma TrustPay</span>
            <span className="tarifa-col-num">13%</span>
          </div>
          <h4 className="tarifa-col-title">Margen Total de Sostenibilidad</h4>
          <p className="tarifa-col-desc">
            La suma de la comisión cliente (+3%) y prestador (-10%) sostiene la infraestructura tecnológica, validación de identidades y arbitraje legal.
          </p>
          <ul className="tarifa-col-list">
            <li>Seguridad criptográfica y registros inmutables de auditoría.</li>
            <li>Equipo de soporte y mediación neutral de controversias.</li>
            <li>Verificación de antecedentes e identidad de contratistas.</li>
            <li>Desarrollo continuo de herramientas de contratación ágil.</li>
          </ul>
        </div>
      </div>

      {/* Simulador Interactivo de Liquidación en Tiempo Real */}
      <div className="simulador-section-wrap glass-card" style={{ marginTop: '1.5rem' }}>
        <div className="simulador-header">
          <div className="simulador-title-group">
            <h3>
              <Calculator size={20} color="#0284c7" />
              Simulador Interactivo de Liquidación Escrow
            </h3>
            <p>Ajusta el monto del proyecto y observa en vivo los centavos exactos para cada participante:</p>
          </div>
          <div className="moneda-toggle" style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              className={`preset-btn ${moneda === 'COP' ? 'active' : ''}`}
              onClick={() => {
                setMoneda('COP');
                setMontoSimulado(1500000);
              }}
            >
              🇨🇴 Pesos (COP)
            </button>
            <button
              type="button"
              className={`preset-btn ${moneda === 'USD' ? 'active' : ''}`}
              onClick={() => {
                setMoneda('USD');
                setMontoSimulado(500);
              }}
            >
              🇺🇸 Dólares (USD)
            </button>
          </div>
        </div>

        {/* Slider e Input */}
        <div className="simulador-slider-row">
          <input
            type="range"
            min={moneda === 'COP' ? 100000 : 50}
            max={moneda === 'COP' ? 20000000 : 8000}
            step={moneda === 'COP' ? 50000 : 25}
            value={montoSimulado}
            onChange={(e) => setMontoSimulado(Number(e.target.value))}
            className="simulador-range"
          />
          <div className="simulador-input-group">
            <span className="input-currency">{moneda}</span>
            <input
              type="number"
              value={montoSimulado}
              onChange={(e) => setMontoSimulado(Math.max(0, Number(e.target.value)))}
              className="simulador-number-input"
            />
          </div>
        </div>

        {/* Presets Rápidos */}
        <div className="simulador-presets">
          <span className="preset-label">Montos sugeridos:</span>
          {(moneda === 'COP' ? PRESETS_COP : PRESETS_USD).map((p) => (
            <button
              key={p.val}
              type="button"
              className={`preset-btn ${montoSimulado === p.val ? 'active' : ''}`}
              onClick={() => setMontoSimulado(p.val)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Desglose en Vivo de 3 Columnas */}
        <div className="desglose-live-box">
          <div className="desglose-col">
            <span className="desglose-label">Cliente Paga (Total en Bóveda)</span>
            <span className="desglose-val cliente">{formatearMonto(totalCliente)}</span>
            <span className="desglose-calc">
              Base acordada: {formatearMonto(montoSimulado)} + Comisión (+3%): {formatearMonto(feeCliente)}
            </span>
          </div>

          <div className="desglose-col center">
            <span className="desglose-label">Prestador Recibe (Neto Transferido)</span>
            <span className="desglose-val prestador">{formatearMonto(netoPrestador)}</span>
            <span className="desglose-calc">
              Base acordada: {formatearMonto(montoSimulado)} − Comisión (-10%): {formatearMonto(feePrestador)}
            </span>
          </div>

          <div className="desglose-col">
            <span className="desglose-label">Retención Plataforma (Ganancia)</span>
            <span className="desglose-val plataforma">{formatearMonto(gananciaPlataforma)}</span>
            <span className="desglose-calc">
              Cliente (+3%): {formatearMonto(feeCliente)} + Prestador (-10%): {formatearMonto(feePrestador)}
            </span>
          </div>
        </div>
      </div>

      {/* Franja de Garantía de Seguridad de Fondos */}
      <div className="boveda-security-guarantee glass-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <Lock size={28} color="#10b981" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 0.2rem', fontSize: '1rem', fontWeight: 800 }}>
              Bóveda Inmutable: Fondos Retenidos hasta la Aprobación Explícita
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#047857', lineHeight: 1.45 }}>
              Ningún prestador puede cobrar anticipadamente y ningún cliente puede recuperar el dinero sin justificación una vez iniciado el trabajo. El contrato de custodia se bloquea bajo el estado <strong>FUNDS_HELD</strong> y se libera únicamente a <strong>RELEASED</strong> cuando ambas partes están de acuerdo con el entregable.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {onExploreClick && (
            <button type="button" className="btn btn-secondary" onClick={onExploreClick}>
              <Briefcase size={15} /> Ver Muro de Empleos
            </button>
          )}
          {onPublishClick && (
            <button type="button" className="btn btn-primary" onClick={onPublishClick}>
              <PlusCircle size={15} /> Publicar Requerimiento
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
