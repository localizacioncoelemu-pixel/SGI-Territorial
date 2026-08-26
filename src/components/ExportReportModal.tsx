import React, { useRef } from 'react';
import { 
  Printer, 
  Download, 
  FileText, 
  X, 
  ShieldAlert, 
  AlertTriangle, 
  Flame, 
  Droplets, 
  Route, 
  CheckCircle2,
  FileSpreadsheet,
  Accessibility
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { getThreatLevelBadge } from '../services/kmzParser';
import { exportPointsToExcel } from '../services/excelExport';
import { generateTechnicalReportPdf } from '../services/pdfReportGenerator';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({ isOpen, onClose }) => {
  const { layers, riskPoints, exportComunaGeoJSON } = useData();
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const criticalPoints = riskPoints.filter(p => p.riskLevel === 'critico');
  const highPoints = riskPoints.filter(p => p.riskLevel === 'alto');
  const pmrPoints = riskPoints.filter(p => p.hasPmr || (p.pmrCount && p.pmrCount > 0));
  const pmrTotal = riskPoints.reduce((acc, p) => acc + (p.hasPmr ? (p.pmrCount || 1) : 0), 0);

  const handlePrint = () => {
    try {
      // 1. Generate & download actual PDF document
      generateTechnicalReportPdf(riskPoints, layers, user);
      // 2. Also trigger browser print dialog
      setTimeout(() => {
        window.print();
      }, 500);
    } catch (e) {
      console.warn('PDF Generator fallback to print:', e);
      window.print();
    }
  };

  const handleDownloadExcel = () => {
    exportPointsToExcel(riskPoints);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="export-report-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        
        {/* Modal Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight leading-tight">
                Informe Técnico Territorial & Análisis de Sectores
              </h3>
              <p className="text-xs text-emerald-200/90 leading-tight">
                Dossier consolidado de capas geográficas, puntos y sectores georreferenciados
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-emerald-500/50 shadow-xs cursor-pointer"
              title="Descargar base de datos completa en planilla Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>Descargar Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Generar y descargar documento PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 text-xs">
          
          {/* Document Header */}
          <div className="border-b-2 border-emerald-800 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-800 flex items-center justify-center text-white font-black text-xl shadow-inner">
                SIG
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-emerald-950 uppercase tracking-tight">
                  SIG Territorial Personal
                </h1>
                <h2 className="text-sm font-bold text-emerald-800">
                  Gestión y Análisis Geográfico de Sectores & KMZ
                </h2>
                <p className="text-slate-500 text-[11px] mt-0.5 font-medium">
                  Sistema de Información Geográfica y Registro de Terreno
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-600">
              <div className="font-bold text-slate-900">Fecha de Emisión:</div>
              <div>{new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div className="text-slate-400 mt-1">Generado por: {user?.displayName || 'Usuario SIG'}</div>
            </div>
          </div>

          {/* Metric Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <span className="text-[11px] font-bold text-red-800 uppercase block">Puntos Críticos</span>
              <span className="text-2xl font-black text-red-600 font-mono">{criticalPoints.length}</span>
              <span className="text-[10px] text-red-700 block mt-0.5">Atención urgente requerida</span>
            </div>

            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <span className="text-[11px] font-bold text-orange-800 uppercase block">Riesgo Alto</span>
              <span className="text-2xl font-black text-orange-600 font-mono">{highPoints.length}</span>
              <span className="text-[10px] text-orange-700 block mt-0.5">En monitoreo preventivo</span>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <span className="text-[11px] font-bold text-purple-800 uppercase block">Personas PMR</span>
              <span className="text-2xl font-black text-purple-700 font-mono">{pmrTotal}</span>
              <span className="text-[10px] text-purple-800 block mt-0.5">Movilidad reducida ({pmrPoints.length} puntos)</span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-800 uppercase block">Total Puntos SIG</span>
              <span className="text-2xl font-black text-emerald-700 font-mono">{riskPoints.length}</span>
              <span className="text-[10px] text-emerald-800 block mt-0.5">Georreferenciados en sectores</span>
            </div>
          </div>

          {/* Section 1: Puntos Críticos y Acciones Urgentes */}
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              1. Catastro de Zonas y Puntos de Amenaza Crítica
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-300">
                    <th className="p-2">Identificador / Familia</th>
                    <th className="p-2">Sector</th>
                    <th className="p-2">Nivel</th>
                    <th className="p-2">PMR</th>
                    <th className="p-2">Acción Requerida</th>
                    <th className="p-2">Responsable / Contacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {riskPoints.map((point) => {
                    const badge = getThreatLevelBadge(point.riskLevel);
                    return (
                      <tr key={point.id} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-900">
                          {point.title}
                          <span className="block text-[10px] font-normal text-slate-500">{point.threatType}</span>
                        </td>
                        <td className="p-2 text-slate-700">{point.sector}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg} border`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-2 text-[11px]">
                          {point.hasPmr ? (
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                              Sí ({point.pmrCount || 1})
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="p-2 text-slate-700 max-w-xs">{point.actionsRequired || point.description}</td>
                        <td className="p-2 text-slate-600 font-medium">
                          {point.responsibleEntity || 'Municipalidad'}
                          {point.contactPhone && <span className="block text-emerald-800 font-bold">{point.contactPhone}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Resumen de Capas e Infraestructura */}
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
              <Route className="w-4 h-4 text-emerald-700" />
              2. Capas Geográficas e Infraestructura de Emergencia
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {layers.map((l) => (
                <div key={l.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                    <span>{l.name}</span>
                    <span className="text-[10px] text-emerald-700 uppercase">{l.threatType}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-1.5">{l.description}</p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Archivo: {l.filename} • {l.featureCount} geometrías integradas
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Signature / Validation Footer */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
            <div>
              <div className="w-40 border-b border-slate-400 mx-auto mb-1.5 h-10"></div>
              <span className="font-bold block text-slate-800">Especialista SIG / Terreno</span>
              <span>Análisis y Georreferenciación</span>
            </div>
            <div>
              <div className="w-40 border-b border-slate-400 mx-auto mb-1.5 h-10"></div>
              <span className="font-bold block text-slate-800">Responsable Técnico</span>
              <span>Gestión Territorial</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs print:hidden">
          <span className="text-slate-500">
            Documento consolidado de capas geográficas y sectores territoriales.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

