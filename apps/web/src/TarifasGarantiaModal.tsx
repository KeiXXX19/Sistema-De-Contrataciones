import React, { useState } from 'react';
import {
  X,
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
} from 'lucide-react';

interface TarifasGarantiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishClick?: () => void;
  onExploreClick?: () => void;
}

export function TarifasGarantiaModal({
  isOpen,
  onClose,
  onPublishClick,
  onExploreClick,
}: TarifasGarantiaModalProps) {
  if (!isOpen) return null;

  const [moneda, setMoneda] = useState<'COP' | 'USD'>('COP');
  const [montoSimulado, setMontoSimulado] = useState<number>(1500000);

  // Cálculos matemáticos en concordancia exacta con Escrow.calculateFees (+3% cliente, -10% prestador)
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card tarifas-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Cabecera */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="tarifas-badge-icon">
              <ShieldCheck size={24} color="#10b981" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                Tarifas Transparentes & Modelo Polivalente
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                TrustPay Escrow · Sistema de contratación bilateral con custodia neutral
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

        {/* 1. AFIRMACIÓN DE POLIVALENCIA */}
        <div className="polivalente-statement-card">
          <div className="polivalente-header">
            <Users size={20} color="#0284c7" />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0369a1' }}>
                En TrustPay Escrow todos somos polivalentes
              </h4>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#334155', lineHeight: 1.4 }}>
                No necesitas crear cuentas separadas. Con tu mismo usuario puedes <strong>contratar servicios o cuadrillas de mano de obra</strong> (actuando como Cliente) y al mismo tiempo <strong>postularte y generar ingresos con tus oficios y habilidades</strong> (actuando como Prestador).
              </p>
            </div>
          </div>

          <div className="polivalente-roles-grid">
            <div className="poly-role-box client-box">
              <div className="poly-role-title">
                <Briefcase size={15} /> Cuando actúas como CLIENTE
              </div>
              <p className="poly-role-desc">
                Publicas el requerimiento, fijas el presupuesto y seleccionas al mejor postulante. Tu dinero queda custodiado en la bóveda con un <strong>+3%</strong> de protección y solo se libera cuando apruebas la entrega.
              </p>
            </div>

            <div className="poly-role-box provider-box">
              <div className="poly-role-title">
                <ShieldCheck size={15} /> Cuando actúas como PRESTADOR
              </div>
              <p className="poly-role-desc">
                Envías tu cotización técnica y ejecutas la labor con la certeza de que el dinero ya fue inmovilizado al 100%. Recibes tu pago neto con un <strong>−10%</strong> de comisión al aprobarse la entrega.
              </p>
            </div>
          </div>
        </div>

        {/* 2. ESQUEMA DE COMISIONES TRANSPARENTE */}
        <div style={{ marginTop: '1.5rem' }}>
          <h4 className="detail-section-title">
            <Coins size={16} /> Esquema de Comisiones Transparente
          </h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '-0.3rem', marginBottom: '1rem' }}>
            Reglas matemáticas claras y sin letras pequeñas. La plataforma solo gana cuando ambas partes completan su acuerdo con satisfacción.
          </p>

          <div className="tarifas-triad-grid">
            {/* Cliente */}
            <div className="tarifa-card-box client-rate">
              <span className="tarifa-target-pill">CLIENTE / CONTRATANTE</span>
              <div className="tarifa-percent">+3%</div>
              <div className="tarifa-concept">Sobre el monto base en custodia</div>
              <ul className="tarifa-perks">
                <li><CheckCircle2 size={13} color="#10b981" /> Fondos congelados en bóveda segura</li>
                <li><CheckCircle2 size={13} color="#10b981" /> Cero anticipos entregados a ciegas</li>
                <li><CheckCircle2 size={13} color="#10b981" /> Derecho de inspección y aprobación previa</li>
              </ul>
            </div>

            {/* Prestador */}
            <div className="tarifa-card-box provider-rate">
              <span className="tarifa-target-pill">PRESTADOR / CONTRATISTA</span>
              <div className="tarifa-percent">−10%</div>
              <div className="tarifa-concept">Al liberar fondos con entrega aprobada</div>
              <ul className="tarifa-perks">
                <li><CheckCircle2 size={13} color="#0284c7" /> Certeza de fondos garantizados antes de iniciar</li>
                <li><CheckCircle2 size={13} color="#0284c7" /> Cero cuentas por cobrar o impagos</li>
                <li><CheckCircle2 size={13} color="#0284c7" /> Desembolso directo sin intermediarios usureros</li>
              </ul>
            </div>

            {/* Plataforma */}
            <div className="tarifa-card-box platform-rate">
              <span className="tarifa-target-pill">TRUSTPAY ESCROW</span>
              <div className="tarifa-percent">13% Total</div>
              <div className="tarifa-concept">Fondo neutral de custodia & arbitraje</div>
              <ul className="tarifa-perks">
                <li><CheckCircle2 size={13} color="#8b5cf6" /> Soporte legal y mediación de disputas</li>
                <li><CheckCircle2 size={13} color="#8b5cf6" /> Registro inmutable de eventos de dominio</li>
                <li><CheckCircle2 size={13} color="#8b5cf6" /> Mantenimiento de infraestructura segura</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 3. SIMULADOR INTERACTIVO DE COMISIONES EN VIVO */}
        <div className="simulador-section-wrap" style={{ marginTop: '1.75rem' }}>
          <div className="simulador-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Scale size={18} color="#0284c7" />
              <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                Simulador de Liquidación Escrow en Tiempo Real
              </h4>
            </div>
            <div className="simulador-currency-toggle">
              <button
                className={`curr-btn ${moneda === 'COP' ? 'active' : ''}`}
                onClick={() => {
                  setMoneda('COP');
                  setMontoSimulado(1500000);
                }}
              >
                COP
              </button>
              <button
                className={`curr-btn ${moneda === 'USD' ? 'active' : ''}`}
                onClick={() => {
                  setMoneda('USD');
                  setMontoSimulado(500);
                }}
              >
                USD
              </button>
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.3rem 0 0.75rem' }}>
            Ingresa un monto base acordado y observa exactamente cuánto paga el cliente y cuánto recibe neto el contratista:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Monto Base Acordado del Trabajo ({moneda}):</label>
              <input
                type="number"
                className="form-control"
                value={montoSimulado}
                min={moneda === 'COP' ? 50000 : 20}
                step={moneda === 'COP' ? 100000 : 25}
                onChange={(e) => setMontoSimulado(Math.max(1, Number(e.target.value)))}
                style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}
              />
            </div>

            <div className="simulador-quick-buttons">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.2rem' }}>
                Montos de ejemplo:
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {moneda === 'COP' ? (
                  <>
                    <button type="button" className="btn-quick-monto" onClick={() => setMontoSimulado(500000)}>$500k</button>
                    <button type="button" className="btn-quick-monto" onClick={() => setMontoSimulado(1800000)}>$1.8M</button>
                    <button type="button" className="btn-quick-monto" onClick={() => setMontoSimulado(3500000)}>$3.5M</button>
                    <button type="button" className="btn-quick-monto" onClick={() => setMontoSimulado(8000000)}>$8.0M</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn-quick-monto" onClick={() => setMontoSimulado(250)}>$250</button>
                    <button type="button" className="btn-quick-monto" onClick={() => setMontoSimulado(500)}>$500</button>
                    <button type="button" className="btn-quick-monto" onClick={() => setMontoSimulado(1200)}>$1,200</button>
                    <button type="button" className="btn-quick-monto" onClick={() => setMontoSimulado(3000)}>$3,000</button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Resultado de la Simulación */}
          <div className="simulador-results-grid" style={{ marginTop: '1rem' }}>
            <div className="sim-res-card sim-client">
              <span className="sim-res-title">CLIENTE DEPOSITA (+3%)</span>
              <div className="sim-res-val">{formatearMonto(totalCliente)}</div>
              <span className="sim-res-sub">Base {formatearMonto(montoSimulado)} + Custodia {formatearMonto(feeCliente)}</span>
            </div>

            <div className="sim-res-card sim-provider">
              <span className="sim-res-title">PRESTADOR RECIBE (−10%)</span>
              <div className="sim-res-val">{formatearMonto(netoPrestador)}</div>
              <span className="sim-res-sub">Base {formatearMonto(montoSimulado)} − Comisión {formatearMonto(feePrestador)}</span>
            </div>

            <div className="sim-res-card sim-profit">
              <span className="sim-res-title">FONDO DE CUSTODIA (13%)</span>
              <div className="sim-res-val">{formatearMonto(gananciaPlataforma)}</div>
              <span className="sim-res-sub">Arbitraje, pasarela y soporte</span>
            </div>
          </div>
        </div>

        {/* 4. GARANTÍA ESCROW PASO A PASO */}
        <div style={{ marginTop: '1.5rem' }}>
          <h4 className="detail-section-title">
            <Lock size={16} /> El Ciclo de Seguridad de TrustPay Escrow
          </h4>

          <div className="escrow-steps-horizontal">
            <div className="escrow-step-item">
              <span className="step-circle-num">1</span>
              <strong>Acuerdo</strong>
              <span>Cliente y prestador pactan alcance y precio.</span>
            </div>
            <ArrowRight size={14} color="#94a3b8" className="step-arrow" />
            <div className="escrow-step-item">
              <span className="step-circle-num">2</span>
              <strong>Depósito (+3%)</strong>
              <span>Cliente inmoviliza los fondos en la bóveda neutral.</span>
            </div>
            <ArrowRight size={14} color="#94a3b8" className="step-arrow" />
            <div className="escrow-step-item">
              <span className="step-circle-num">3</span>
              <strong>Ejecución</strong>
              <span>El prestador trabaja con la garantía de pago 100% asegurado.</span>
            </div>
            <ArrowRight size={14} color="#94a3b8" className="step-arrow" />
            <div className="escrow-step-item">
              <span className="step-circle-num">4</span>
              <strong>Aprobación (−10%)</strong>
              <span>El cliente aprueba y se desembolsa el dinero neto.</span>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="modal-actions" style={{ marginTop: '2rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Entendido, Cerrar
          </button>
          {onExploreClick && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                onClose();
                onExploreClick();
              }}
            >
              Explorar Empleos
            </button>
          )}
          {onPublishClick && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
              onClick={() => {
                onClose();
                onPublishClick();
              }}
            >
              <Briefcase size={16} /> Publicar Requerimiento con Escrow
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TarifasGarantiaModal;
