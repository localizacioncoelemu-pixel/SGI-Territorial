import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Layers, 
  MapPin, 
  Users, 
  FileText, 
  LogIn, 
  LogOut, 
  UploadCloud, 
  RefreshCw, 
  Smartphone, 
  Laptop, 
  Menu, 
  X,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { MunicipalLogo } from './MunicipalLogo';

interface NavbarProps {
  onOpenLayers: () => void;
  onOpenPoints: () => void;
  onOpenAddPoint: () => void;
  onOpenUsers: () => void;
  onOpenReport: () => void;
  onOpenExcel: () => void;
  onOpenAuth: () => void;
  onOpenInstallApp?: () => void;
  activeViewTab: 'map' | 'layers' | 'points';
  setActiveViewTab: (tab: 'map' | 'layers' | 'points') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLayers,
  onOpenPoints,
  onOpenAddPoint,
  onOpenUsers,
  onOpenReport,
  onOpenExcel,
  onOpenAuth,
  onOpenInstallApp,
  activeViewTab,
  setActiveViewTab,
}) => {
  const { user, isAdmin, logout, loginDemo } = useAuth();
  const { isSyncing, isOnline, filterState, setFilterState, filteredRiskPoints, layers } = useData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const criticalCount = filteredRiskPoints.filter(p => p.riskLevel === 'critico' || p.riskLevel === 'alto').length;

  return (
    <header id="main-header" className="bg-emerald-900 text-white shadow-md z-30 flex-shrink-0 select-none">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Official Municipal Logo & Branding */}
          <div 
            id="brand-logo-button"
            className="flex items-center cursor-pointer hover:opacity-95 transition-opacity" 
            onClick={() => setActiveViewTab('map')}
          >
            <MunicipalLogo size="md" />
          </div>

          {/* Desktop Navigation Links / Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              id="btn-nav-map"
              onClick={() => setActiveViewTab('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeViewTab === 'map'
                  ? 'bg-emerald-800 text-emerald-100 shadow-sm border border-emerald-600/60'
                  : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Visor Territorial
            </button>

            <button
              id="btn-nav-layers"
              onClick={onOpenLayers}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-emerald-200 hover:bg-emerald-800/60 hover:text-white transition-colors"
            >
              <Layers className="w-4 h-4" />
              Capas KMZ ({layers.length})
            </button>

            <button
              id="btn-nav-points"
              onClick={onOpenPoints}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-emerald-200 hover:bg-emerald-800/60 hover:text-white transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Puntos de Riesgo ({filteredRiskPoints.length})
            </button>

            {/* Admin-only Add Point button */}
            {isAdmin && (
              <button
                id="btn-nav-add-point"
                onClick={onOpenAddPoint}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ml-1"
              >
                <MapPin className="w-4 h-4" />
                + Nuevo Punto
              </button>
            )}

            {/* Admin-only Excel download */}
            {isAdmin && (
              <button
                id="btn-nav-excel"
                onClick={onOpenExcel}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-800/90 text-emerald-100 hover:bg-emerald-700 flex items-center gap-1.5 transition-colors border border-emerald-600/50"
                title="Descargar base de datos de sectores y puntos en Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                <span>Excel Base Datos</span>
              </button>
            )}

            <button
              id="btn-nav-report"
              onClick={onOpenReport}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-emerald-200 hover:bg-emerald-800/60 hover:text-white transition-colors"
              title="Generar Informe Territorial / Situación de Sectores"
            >
              <FileText className="w-4 h-4" />
              Informe
            </button>

            {/* Install PWA Button */}
            {onOpenInstallApp && (
              <button
                id="btn-nav-install-app"
                onClick={onOpenInstallApp}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-800/90 hover:bg-teal-700 text-teal-100 flex items-center gap-1.5 transition-all border border-teal-500/50 shadow-xs cursor-pointer"
                title="Descargar e instalar aplicación en celular o PC"
              >
                <Smartphone className="w-3.5 h-3.5 text-teal-300" />
                <span>Descargar App</span>
              </button>
            )}

            {isAdmin && (
              <button
                id="btn-nav-users"
                onClick={onOpenUsers}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-emerald-800/80 text-emerald-100 hover:bg-emerald-700/80 transition-colors border border-emerald-600/40"
              >
                <Users className="w-4 h-4 text-emerald-300" />
                Usuarios
              </button>
            )}
          </nav>

          {/* Right Section: Sync Status, Critical Alert & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Sync Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-700/50 text-[11px] text-emerald-200">
              <div className={`w-2 h-2 rounded-full ${isOnline ? (isSyncing ? 'bg-amber-400 animate-spin' : 'bg-emerald-400') : 'bg-red-400'}`} />
              <span>{isOnline ? (isSyncing ? 'Sincronizando...' : 'Firebase Activo') : 'Sin Conexión'}</span>
            </div>

            {/* Critical Alert Quick Toggle */}
            <button
              id="btn-toggle-critical"
              onClick={() => setFilterState(prev => ({ ...prev, onlyCritical: !prev.onlyCritical }))}
              className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                filterState.onlyCritical
                  ? 'bg-red-600 text-white ring-2 ring-red-400 animate-pulse'
                  : 'bg-emerald-800 text-emerald-200 hover:bg-emerald-700 hover:text-white border border-emerald-600/40'
              }`}
              title="Filtrar sólo amenazas críticas y altas"
            >
              <Flame className={`w-3.5 h-3.5 ${filterState.onlyCritical ? 'text-white' : 'text-red-400'}`} />
              <span className="hidden sm:inline">Críticos:</span>
              <span className="font-mono bg-black/20 px-1.5 py-0.2 rounded-full text-[10px]">{criticalCount}</span>
            </button>

            {/* User Profile / Auth Control */}
            {user ? (
              <div className="relative">
                <button
                  id="btn-user-menu"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 border border-emerald-600/50 text-xs font-medium text-white transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-[10px] text-white">
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="text-left hidden xl:block">
                    <p className="text-xs font-semibold text-white truncate max-w-[110px] leading-tight">
                      {user.displayName}
                    </p>
                    <span className="text-[10px] text-emerald-300 capitalize font-mono leading-none">
                      {user.role === 'admin' ? 'Admin' : 'Usuario'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-300" />
                </button>

                {userMenuOpen && (
                  <div 
                    id="user-dropdown"
                    className="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                      <p className="font-bold text-slate-900 truncate">{user.displayName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        Rol: {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                      </span>
                    </div>

                    {onOpenInstallApp && (
                      <button
                        onClick={onOpenInstallApp}
                        className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-teal-700 font-semibold"
                      >
                        <Smartphone className="w-4 h-4 text-teal-600" />
                        Instalar / Descargar App
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={onOpenUsers}
                        className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-700"
                      >
                        <Users className="w-4 h-4 text-emerald-600" />
                        Gestión de Usuarios
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={onOpenLayers}
                        className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-700"
                      >
                        <UploadCloud className="w-4 h-4 text-emerald-600" />
                        Cargar Capas KMZ
                      </button>
                    )}

                    <button
                      onClick={onOpenReport}
                      className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-700"
                    >
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Generar Informe Territorial
                    </button>

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      id="btn-logout"
                      onClick={logout}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="btn-login-header"
                onClick={onOpenAuth}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm transition-all"
              >
                <LogIn className="w-4 h-4" />
                Ingresar
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              id="btn-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg bg-emerald-800 text-emerald-100 hover:bg-emerald-700"
              aria-label="Abrir Menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div id="mobile-menu-drawer" className="md:hidden bg-emerald-950 border-t border-emerald-800 px-4 py-3 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2 pb-2">
            <button
              onClick={() => { setActiveViewTab('map'); setMobileMenuOpen(false); }}
              className="p-2.5 rounded-lg bg-emerald-800/80 text-white font-medium flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-emerald-300" />
              Visor Mapa
            </button>
            <button
              onClick={() => { onOpenLayers(); setMobileMenuOpen(false); }}
              className="p-2.5 rounded-lg bg-emerald-800/80 text-white font-medium flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-emerald-300" />
              Capas KMZ ({layers.length})
            </button>
            <button
              onClick={() => { onOpenPoints(); setMobileMenuOpen(false); }}
              className="p-2.5 rounded-lg bg-emerald-800/80 text-white font-medium flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Puntos de Riesgo
            </button>
            {isAdmin && (
              <button
                onClick={() => { onOpenAddPoint(); setMobileMenuOpen(false); }}
                className="p-2.5 rounded-lg bg-emerald-600 text-white font-semibold flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                + Agregar Punto
              </button>
            )}
            {onOpenInstallApp && (
              <button
                onClick={() => { onOpenInstallApp(); setMobileMenuOpen(false); }}
                className="p-2.5 rounded-lg bg-teal-800 text-teal-100 font-bold flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4 text-teal-300" />
                Descargar App
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-emerald-800/60 text-emerald-300">
            {isAdmin && (
              <button
                onClick={() => { onOpenExcel(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 text-emerald-200 py-1 hover:text-white font-semibold"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                Descargar Excel
              </button>
            )}

            <button
              onClick={() => { onOpenReport(); setMobileMenuOpen(false); }}
              className="flex items-center gap-1.5 text-emerald-200 py-1 hover:text-white"
            >
              <FileText className="w-4 h-4" />
              Generar Informe
            </button>

            {isAdmin && (
              <button
                onClick={() => { onOpenUsers(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 text-emerald-200 py-1 hover:text-white"
              >
                <Users className="w-4 h-4" />
                Gestión Usuarios
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
