import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Laptop, 
  Apple, 
  Download, 
  CheckCircle2, 
  X, 
  Share2, 
  PlusSquare, 
  Monitor, 
  ArrowRight,
  ShieldCheck,
  WifiOff,
  Sparkles,
  FileCode,
  Layers
} from 'lucide-react';
import { downloadWindowsShortcut, downloadHtmlLauncher } from '../services/shortcutDownload';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [activeTab, setActiveTab] = useState<'desktop' | 'android' | 'ios'>('desktop');
  const [installSuccess, setInstallSuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Auto-detect OS for initial tab
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setActiveTab('ios');
    } else if (/android/i.test(userAgent)) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (!deferredPrompt) {
      alert('Para instalar en este dispositivo, sigue las instrucciones paso a paso indicadas abajo.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallSuccess(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const handleDownloadWindowsShortcut = () => {
    downloadWindowsShortcut();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 5000);
  };

  const handleDownloadHtmlLauncher = () => {
    downloadHtmlLauncher();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="install-pwa-modal"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[94vh]"
      >
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700/80 border border-emerald-400/40 flex items-center justify-center shadow-inner">
              <Download className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight leading-tight">
                Descargar Acceso Directo & App SIG
              </h3>
              <p className="text-xs text-emerald-200/90 leading-tight">
                Acceso directo en el escritorio y uso en terreno sin conexión
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Desktop Shortcut Download Banner (Highlighted like control-recepcion-y-despacho) */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/60 border-b border-emerald-200/80 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md flex-shrink-0">
                <Monitor className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <span className="font-bold text-emerald-950 text-sm block leading-tight">
                  Acceso Directo al Escritorio de Windows / PC
                </span>
                <span className="text-[11px] text-emerald-700 leading-tight block mt-0.5">
                  Descarga el archivo directo con vector municipal para abrir el SIG en 1 clic
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handleDownloadWindowsShortcut}
              className="w-full px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer border border-emerald-800"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Acceso (.URL)</span>
            </button>

            <button
              onClick={handleDownloadHtmlLauncher}
              className="w-full px-4 py-2.5 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-98 cursor-pointer border border-emerald-300"
            >
              <FileCode className="w-4 h-4 text-emerald-700" />
              <span>Lanzador con Vector (.HTML)</span>
            </button>
          </div>

          {downloadSuccess && (
            <div className="mt-2.5 p-2.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span>¡Acceso directo descargado! Arrástralo a tu Escritorio para abrirlo siempre en 1 clic.</span>
            </div>
          )}
        </div>

        {/* Direct PWA Action Banner (if native browser prompt available) */}
        {isInstallable && (
          <div className="bg-teal-50 border-b border-teal-200/80 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="font-bold text-teal-950 text-xs block">Instalación Nativa Disponible</span>
                <span className="text-[11px] text-teal-700">Instala como App nativa en tu navegador</span>
              </div>
            </div>
            <button
              onClick={handleNativeInstall}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar Directo</span>
            </button>
          </div>
        )}

        {installSuccess && (
          <div className="p-3 bg-emerald-100 border-b border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>¡Aplicación instalada con éxito en tu dispositivo!</span>
          </div>
        )}

        {/* Device Selection Tabs */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-center gap-1.5">
          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-white text-emerald-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-indigo-600" />
            <span>Computador PC</span>
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white text-emerald-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Android</span>
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white text-emerald-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Apple className="w-3.5 h-3.5 text-slate-800" />
            <span>iPhone / iPad</span>
          </button>
        </div>

        {/* Tab Content Instructions */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
          
          {activeTab === 'desktop' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-indigo-900 font-bold">
                <Monitor className="w-4 h-4 text-indigo-600" />
                <span>Instalación y Acceso Directo en PC / Windows (Chrome / Edge)</span>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Descarga el Acceso Directo</p>
                    <p className="text-slate-500 text-[11px]">
                      Usa el botón superior verde <strong>"Descargar Acceso (.URL)"</strong> para bajar el archivo a tu carpeta de Descargas o Escritorio.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Arrástralo a tu Escritorio</p>
                    <p className="text-slate-500 text-[11px]">
                      Mueve el archivo descargado directamente a tu Escritorio de Windows para tener acceso instantáneo en cualquier momento.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Instalación como App de Ventana (Opcional)</p>
                    <p className="text-slate-500 text-[11px]">
                      En la barra de direcciones de Chrome o Edge, haz clic en el ícono <strong>(⊕ Instalar aplicación)</strong> para que se ejecute en su propia ventana sin barras.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Instalación en Teléfonos Android (Google Chrome / Edge)</span>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Abre el menú de opciones</p>
                    <p className="text-slate-500 text-[11px]">
                      Toca los <strong>tres puntos verticales (⋮)</strong> en la esquina superior derecha del navegador Chrome.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Selecciona "Instalar aplicación" o "Agregar a pantalla principal"</p>
                    <p className="text-slate-500 text-[11px]">
                      Aparecerá el ícono del <strong>SIG Territorial</strong> en la lista.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Confirma y ¡Listo!</p>
                    <p className="text-slate-500 text-[11px]">
                      Se creará un acceso directo en tu pantalla de inicio que abre la aplicación en pantalla completa sin barra de navegación.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Apple className="w-4 h-4 text-slate-800" />
                <span>Instalación en iPhone / iPad (Safari)</span>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Toca el botón Compartir</p>
                    <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                      Presiona el ícono <Share2 className="w-3.5 h-3.5 text-blue-600 inline" /> (cuadrado con flecha hacia arriba) en la barra inferior de Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Selecciona "Agregar a pantalla de inicio"</p>
                    <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                      Desliza hacia abajo en el menú y toca <PlusSquare className="w-3.5 h-3.5 text-slate-700 inline" /> <strong>Agregar a pantalla de inicio</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Toca "Agregar"</p>
                    <p className="text-slate-500 text-[11px]">
                      En la esquina superior derecha toca <strong>Agregar</strong>. La aplicación quedará guardada como App independiente en tu iPhone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Offline & Performance Highlights */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 flex items-start gap-2">
              <WifiOff className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-950 block text-[11px]">Modo Terreno</span>
                <span className="text-[10px] text-emerald-700">Acceso rápido a mapas y datos guardados</span>
              </div>
            </div>
            <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-200 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-950 block text-[11px]">Seguridad SIG</span>
                <span className="text-[10px] text-indigo-700">Sincronización en la nube cifrada</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleDownloadWindowsShortcut}
            className="text-xs text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Acceso (.URL)</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
