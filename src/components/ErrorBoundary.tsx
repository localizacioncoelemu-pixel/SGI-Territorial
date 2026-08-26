import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    // Clear potentially corrupted local caches if any
    try {
      localStorage.removeItem('sig_cached_layers');
      localStorage.removeItem('sig_cached_points');
      localStorage.removeItem('sig_demo_user');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleTryRecover = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-slate-900 text-white p-6 font-sans select-none">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-inner">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white tracking-tight">
                SIG Territorial - Recuperación de Interfaz
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                El sistema detectó una excepción de visualización o caché temporal y ha prevenido la pantalla en blanco.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950/80 border border-slate-700/80 p-3.5 rounded-xl text-left font-mono text-[11px] text-red-300 max-h-32 overflow-y-auto">
                <span className="font-bold text-red-400 block mb-0.5">Error técnico:</span>
                {this.state.error.toString()}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleTryRecover}
                className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reintentar Carga</span>
              </button>

              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restaurar y Recargar</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              SIG Territorial Personal &bull; Gestor Geográfico & Sectores
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
