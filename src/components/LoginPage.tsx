import React, { useState } from 'react';
import { 
  ShieldAlert, 
  LogIn, 
  Mail, 
  Lock, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  Smartphone, 
  Download, 
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MunicipalLogo } from './MunicipalLogo';
import { InstallPwaModal } from './InstallPwaModal';

export const LoginPage: React.FC = () => {
  const { loginWithEmail, loginDemo } = useAuth();
  
  const [email, setEmail] = useState('localizacioncoelemu@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginWithEmail(email.trim(), password);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Credenciales inválidas. Comprueba tu correo y contraseña, o utiliza el Acceso Rápido abajo.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intenta más tarde o utiliza Acceso Rápido.');
      } else {
        setError(err.message || 'Error al iniciar sesión. Puedes acceder con el botón directo de Administrador.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = (role: 'admin' | 'usuario') => {
    loginDemo(role);
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col justify-between text-slate-100 p-4 sm:p-6 overflow-y-auto select-none">
      
      {/* Top Header Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between py-2 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-xs">
            <Building2 className="w-5 h-5 text-slate-200" />
          </div>
          <div>
            <span className="font-bold text-sm sm:text-base tracking-wide uppercase text-white block">
              SIG Territorial Municipal
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Comuna de Coelemu • Plataforma Oficial
            </span>
          </div>
        </div>

        {/* Install PWA Button on Top Bar */}
        <button
          onClick={() => setInstallModalOpen(true)}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          title="Descargar e instalar aplicación en celular o PC"
        >
          <Smartphone className="w-4 h-4 text-slate-300" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        
        {/* Card */}
        <div className="bg-slate-900/95 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-slate-900 px-6 pt-7 pb-6 text-center border-b border-slate-800">
            <div className="flex justify-center mb-3">
              <MunicipalLogo size="lg" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              SISTEMA DE INFORMACIÓN GEOGRÁFICA
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Gestión Territorial, Sectores y Evaluación Multirriesgo
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            
            {error && (
              <div className="p-3 bg-red-950/70 border border-red-800/60 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Correo Electrónico Institucional
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@sig.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Contraseña de Acceso
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-100 hover:bg-white disabled:opacity-50 text-slate-950 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer mt-3"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Validando...' : 'Iniciar Sesión'}</span>
              </button>
            </form>

            {/* Quick Access Section */}
            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  Acceso Rápido / Demostración:
                </span>
                <span className="text-[10px] text-slate-500">Sin clave</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemo('admin')}
                  className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-all active:scale-98 cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-white font-bold text-xs mb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
                    <span>Admin SIG</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    Acceso total (KMZ, usuarios, capas)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemo('usuario')}
                  className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-all active:scale-98 cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold text-xs mb-0.5">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lector / Campo</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    Visualización de capas y terreno
                  </span>
                </button>
              </div>
            </div>

            {/* Install App Link */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setInstallModalOpen(true)}
                className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Instalar Aplicación en Celular o PC</span>
              </button>
            </div>

          </div>

          {/* Card Footer */}
          <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Base de Datos Conectada
            </span>
            <span className="font-mono text-[10px] text-slate-500">v2.4 PWA</span>
          </div>

        </div>

      </div>

      {/* Footer Disclaimer */}
      <div className="max-w-5xl w-full mx-auto text-center py-2 text-slate-500 text-[11px] border-t border-slate-900 pt-3">
        <span>Ilustre Municipalidad de Coelemu • Sistema de Información Geográfica & Diagnóstico Territorial.</span>
      </div>

      {/* Install PWA Modal */}
      <InstallPwaModal 
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />

    </div>
  );
};

