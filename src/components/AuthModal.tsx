import React, { useState } from 'react';
import { 
  LogIn, 
  UserPlus, 
  X, 
  ShieldAlert, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  Sparkles,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, loginDemo } = useAuth();
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('localizacioncoelemu@gmail.com');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!displayName.trim()) {
          setError('Ingresa tu nombre completo.');
          setLoading(false);
          return;
        }
        await registerWithEmail(email, password, displayName, role);
      } else {
        await loginWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Credenciales inválidas. Comprueba tu correo y contraseña.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está registrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError(err.message || 'Error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (selectedRole: UserRole) => {
    loginDemo(selectedRole);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="auth-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col"
      >
        
        {/* Modal Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight leading-tight">
                {isRegister ? 'Registro de Usuario' : 'Autenticación SIG Territorial'}
              </h3>
              <p className="text-xs text-emerald-200/90 leading-tight">
                Acceso y Sincronización en la Nube
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Demo Mode Quick Access */}
        <div className="bg-emerald-50/80 border-b border-emerald-200/80 p-4">
          <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-xs mb-2">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <span>Acceso Rápido Directo (Sin contraseña):</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin SIG</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('usuario')}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Inspector Campo</span>
            </button>
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block font-bold text-slate-800 mb-1">Nombre Completo</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez - Encargado de Emergencias"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-800 mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="usuario@coelemu.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block font-bold text-slate-800 mb-1">Rol Inicial Solicitado</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="usuario">Usuario (Campo / Prevención)</option>
                <option value="admin">Administrador (Gestor SIG)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
          >
            {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span>{loading ? 'Procesando...' : (isRegister ? 'Crear Cuenta' : 'Iniciar Sesión')}</span>
          </button>

          <div className="pt-2 text-center text-xs text-slate-500">
            {isRegister ? (
              <p>
                ¿Ya tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="font-bold text-emerald-700 hover:underline"
                >
                  Inicia sesión aquí
                </button>
              </p>
            ) : (
              <p>
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="font-bold text-emerald-700 hover:underline"
                >
                  Regístrate como nuevo usuario
                </button>
              </p>
            )}
          </div>

        </form>

      </div>
    </div>
  );
};
