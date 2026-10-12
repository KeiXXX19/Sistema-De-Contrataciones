import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, LogIn, UserPlus, Eye, AlertCircle } from 'lucide-react';
import { LoginUseCase, RegisterUserUseCase, LoginWithGoogleUseCase } from '@platform/user-service';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'CLIENT' | 'PROVIDER' | 'ADMIN' | 'USER';
  isVerified: boolean;
}

interface LoginScreenProps {
  loginUseCase: LoginUseCase;
  registerUseCase: RegisterUserUseCase;
  loginWithGoogleUseCase?: LoginWithGoogleUseCase;
  onAuthenticated: (user: SessionUser) => void;
  onGuest: () => void;
  initialTab?: 'login' | 'register';
  onBackToHome?: () => void;
}

const DEMO_PASSWORD = 'demo1234';
const GOOGLE_CLIENT_ID = '515308354904-2jvsfpijgovcumogaind2qu35uprqde3.apps.googleusercontent.com';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function LoginScreen({
  loginUseCase,
  registerUseCase,
  loginWithGoogleUseCase,
  onAuthenticated,
  onGuest,
  initialTab = 'login',
  onBackToHome,
}: LoginScreenProps) {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'CLIENT' | 'PROVIDER'>('CLIENT');

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const abrirSesion = (user: { id: string; name: string; email: string; role: string; isVerified: boolean }) => {
    onAuthenticated({
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role as 'CLIENT' | 'PROVIDER' | 'ADMIN' | 'USER'),
      isVerified: user.isVerified,
    });
  };

  const procesarLoginGoogle = async (googleData: { name: string; email: string }) => {
    if (!loginWithGoogleUseCase) {
      throw new Error('El servicio de autenticación con Google no está disponible');
    }
    const user = await loginWithGoogleUseCase.execute({
      name: googleData.name,
      email: googleData.email,
      role: tab === 'register' ? regRole : undefined,
    });
    abrirSesion(user);
  };

  // Inicializar Google Identity Services (GIS)
  useEffect(() => {
    const intentarInicializarGIS = () => {
      const g = (window as any).google;
      if (g?.accounts?.id && googleBtnContainerRef.current) {
        try {
          g.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response: any) => {
              if (!response?.credential) return;
              const payload = parseJwt(response.credential);
              if (!payload?.email) {
                setError('No se pudo obtener el correo de la cuenta de Google');
                return;
              }
              setLoading(true);
              setError(null);
              try {
                await procesarLoginGoogle({
                  name: payload.name || payload.email.split('@')[0],
                  email: payload.email,
                });
              } catch (err: any) {
                setError(err.message || 'Error al autenticar con Google');
              } finally {
                setLoading(false);
              }
            },
          });

          googleBtnContainerRef.current.innerHTML = '';
          g.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            text: tab === 'register' ? 'signup_with' : 'signin_with',
            shape: 'rectangular',
            width: 360,
            logo_alignment: 'left',
          });

          setGoogleReady(true);
        } catch (e) {
          console.warn('Error al configurar Google Sign-In:', e);
        }
      }
    };

    intentarInicializarGIS();
    const interval = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        intentarInicializarGIS();
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [tab, regRole, loginWithGoogleUseCase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await loginUseCase.execute({ email: loginEmail, password: loginPassword });
      abrirSesion(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerUseCase.execute({
        name: regName,
        email: regEmail,
        role: regRole,
        password: regPassword,
      });
      const user = await loginUseCase.execute({ email: regEmail, password: regPassword });
      abrirSesion(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Acceso rápido con cuenta Google de prueba (útil si hay bloqueadores de popups o sin conexión a Google)
  const handleGooglePrueba = async () => {
    setError(null);
    setLoading(true);
    try {
      const emailTest = tab === 'register' && regEmail ? regEmail : 'hkeiner663@gmail.com';
      const nameTest = tab === 'register' && regName ? regName : 'Keiner (Admin Principal)';
      await procesarLoginGoogle({ name: nameTest, email: emailTest });
    } catch (err: any) {
      setError(err.message || 'Error con cuenta Google de prueba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card glass-card">
        {onBackToHome && (
          <button
            type="button"
            onClick={onBackToHome}
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              color: 'var(--sky-600)',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginBottom: '0.5rem',
            }}
          >
            ← Volver a la página de inicio
          </button>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div className="brand" style={{ fontSize: '1.5rem' }}>
            <div className="brand-icon">
              <ShieldCheck size={26} />
            </div>
            <div>
              <span>TrustPay</span>
              <span style={{ color: 'var(--sky-500)', marginLeft: '4px' }}>Escrow</span>
            </div>
          </div>
          <span className="badge-arch">Hexagonal + EDA</span>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
            Plataforma de contrataciones con custodia de pagos. Inicia sesión para participar en el
            mercado o entra como invitado para observarlo en tiempo real.
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setTab('login');
              setError(null);
            }}
          >
            <LogIn size={16} /> Iniciar Sesión
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setTab('register');
              setError(null);
            }}
          >
            <UserPlus size={16} /> Crear Cuenta
          </button>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Sección de autenticación con Google */}
        <div className="google-auth-container">
          <label className="google-auth-label">
            {tab === 'login' ? 'Acceso rápido con tu cuenta Google' : 'Regístrate al instante con Google'}
          </label>

          {tab === 'register' && (
            <div className="form-group" style={{ marginBottom: '0.75rem', width: '100%' }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Rol para tu cuenta de Google:</label>
              <select
                className="form-control"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                value={regRole}
                onChange={(e) => setRegRole(e.target.value as 'CLIENT' | 'PROVIDER')}
              >
                <option value="CLIENT">Cliente — publicar trabajos y contratar</option>
                <option value="PROVIDER">Prestador — ofertar y ejecutar proyectos</option>
              </select>
            </div>
          )}

          {/* Botón oficial de Google Identity Services */}
          <div
            ref={googleBtnContainerRef}
            className="google-btn-slot"
            style={{ minHeight: '40px', display: 'flex', justifyContent: 'center' }}
          />

          {/* Botón de acceso directo con Google (Fallback y pruebas inmediatas) */}
          {!googleReady && (
            <button
              type="button"
              className="btn btn-google"
              onClick={handleGooglePrueba}
              disabled={loading}
            >
              <GoogleIcon />
              <span>{loading ? 'Conectando...' : 'Continuar con Google'}</span>
            </button>
          )}
        </div>

        <div className="auth-divider">
          <span>o con credenciales locales</span>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <input
                type="email"
                className="form-control"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                className="form-control"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              <LogIn size={16} /> {loading ? 'Verificando credenciales...' : 'Entrar con correo'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Nombre Completo / Empresa</label>
              <input
                className="form-control"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                minLength={2}
                placeholder="Ej: Innovatech SRL"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <input
                type="email"
                className="form-control"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                placeholder="tu@correo.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña (mínimo 8 caracteres)</label>
              <input
                type="password"
                className="form-control"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Quiero participar como</label>
              <select
                className="form-control"
                value={regRole}
                onChange={(e) => setRegRole(e.target.value as 'CLIENT' | 'PROVIDER')}
              >
                <option value="CLIENT">Cliente — publicar trabajos y contratar</option>
                <option value="PROVIDER">Prestador — ofertar y ejecutar proyectos</option>
              </select>
            </div>
            <button type="submit" className="btn btn-success" style={{ width: '100%' }} disabled={loading}>
              <UserPlus size={16} /> {loading ? 'Creando cuenta...' : 'Crear Cuenta y Entrar'}
            </button>
          </form>
        )}

        <div className="auth-divider">
          <span>o</span>
        </div>

        <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={onGuest}>
          <Eye size={16} /> Entrar como Invitado (solo lectura)
        </button>
      </div>
    </div>
  );
}

export default LoginScreen;
