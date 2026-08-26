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
  Laptop, 
  Download, 
  MapPin, 
  Layers, 
  Flame, 
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MunicipalLogo } from './MunicipalLogo';
import { InstallPwaModal } from './InstallPwaModal';

export const LoginPage: React.FC = () => {
  const { loginWithEmail, loginDemo } = useAuth();
  
  const [email, setEmail] = useState('localizacioncoelemu@gmail.com');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen w-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 flex flex-col justify-between text-slate-100 p-4 sm:p-6 overflow-y-auto select-none">
      
      {/* Top Header Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-white">
              SIG Territorial
            </span>
            <span className="block text-[11px] text-emerald-300 font-mono">
              Comuna de Coelemu & Sectores
            </span>
          </div>
        </div>

        {/* Install PWA Button on Top Bar */}
        <button
          onClick={() => setInstallModalOpen(true)}
          className="px-3.5 py-2 bg-emerald-700/80 hover:bg-emerald-600 border border-emerald-400/40 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
          title="Descargar e instalar aplicación en celular o PC"
        >
          <Smartphone className="w-4 h-4 text-emerald-200" />
          <span className="hidden sm:inline">Descargar App</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        
        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl shadow-2xl border border-emerald-500/30 overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-6 py-6 text-center border-b border-emerald-700/50">
            <div className="flex justify-center mb-3">
              <MunicipalLogo size="lg" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              SISTEMA DE INFORMACIÓN GEOGRÁFICA
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200 font-medium mt-1">
              Gestión Territorial, Sectores y Evaluación Multirriesgo
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            
            {error && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-2xl text-xs text-red-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@sig.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 transition-all active:scale-95 cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</span>
              </button>
            </form>

            {/* Quick Demo Access Section */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Acceso Rápido / Demostración:
                </span>
                <span className="text-[10px] text-slate-500">1 Clic</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemo('admin')}
                  className="p-2.5 bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-600/40 rounded-xl text-left transition-all active:scale-95 cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs mb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin SIG</span>
                  </div>
                  <span className="text-[10px] text-emerald-400/80 block leading-tight">
                    Acceso total (Edición, KMZ, Excel)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemo('usuario')}
                  className="p-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-left transition-all active:scale-95 cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold text-xs mb-0.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lector / Campo</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    Solo visualización y navegación
                  </span>
                </button>
              </div>
            </div>

            {/* Install App Link */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setInstallModalOpen(true)}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-900/40 to-teal-900/40 hover:from-emerald-900/60 hover:to-teal-900/60 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instalar Aplicación en Celular y Computador</span>
              </button>
            </div>

          </div>

          {/* Card Footer */}
          <div className="bg-slate-950/60 px-6 py-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Sincronización Firestore
            </span>
            <span className="font-mono text-[10px] text-slate-500">v2.4 PWA Offline</span>
          </div>

        </div>

      </div>

      {/* Footer Disclaimer */}
      <div className="max-w-6xl w-full mx-auto text-center py-2 text-slate-500 text-[11px]">
        <span>Sistema de Información Geográfica & Diagnóstico Territorial. Todos los derechos reservados.</span>
      </div>

      {/* Install PWA Modal */}
      <InstallPwaModal 
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />

    </div>
  );
};
