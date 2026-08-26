import React, { useState, useMemo, useRef } from 'react';
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
  Accessibility,
  Filter,
  CheckSquare,
  Square,
  RotateCcw,
  MapPin
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
  const { layers, riskPoints } = useData();
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement | null>(null);

  // Sector filter state: empty array means "All Sectors"
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [sectorSearchTerm, setSectorSearchTerm] = useState('');

  // Extract all unique sectors from riskPoints and layers
  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    riskPoints.forEach((p) => {
      if (p.sector && p.sector.trim()) {
        set.add(p.sector.trim());
      }
    });
    layers.forEach((l) => {
      if (l.sector && l.sector.trim() && l.sector !== 'Comunal / General') {
        set.add(l.sector.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [riskPoints, layers]);

  // Sector points count map
  const sectorCountMap = useMemo(() => {
    const map = new Map<string, number>();
    riskPoints.forEach((p) => {
      const sec = p.sector ? p.sector.trim() : 'Sin sector';
      map.set(sec, (map.get(sec) || 0) + 1);
    });
    return map;
  }, [riskPoints]);

  const toggleSector = (sector: string) => {
    setSelectedSectors((prev) => {
      if (prev.includes(sector)) {
        return prev.filter((s) => s !== sector);
      } else {
        return [...prev, sector];
      }
    });
  };

  const handleSelectAllSectors = () => {
    setSelectedSectors([...availableSectors]);
  };

  const handleClearSectorFilter = () => {
    setSelectedSectors([]);
  };

  // Filter points based on selected sectors
  const displayedPoints = useMemo(() => {
    if (selectedSectors.length === 0) return riskPoints;
    return riskPoints.filter((p) => {
      const sec = p.sector ? p.sector.trim() : 'Sin sector';
      return selectedSectors.includes(sec);
    });
  }, [riskPoints, selectedSectors]);

  // Filter layers based on selected sectors
  const displayedLayers = useMemo(() => {
    if (selectedSectors.length === 0) return layers;
    return layers.filter((l) => {
      if (!l.sector || l.sector === 'Comunal / General') return true;
      return selectedSectors.includes(l.sector.trim()) || 
             selectedSectors.some((s) => (l.name || '').toLowerCase().includes(s.toLowerCase()));
    });
  }, [layers, selectedSectors]);

  if (!isOpen) return null;

  const criticalPoints = displayedPoints.filter(p => p.riskLevel === 'critico');
  const highPoints = displayedPoints.filter(p => p.riskLevel === 'alto');
  const pmrPoints = displayedPoints.filter(p => p.hasPmr || (p.pmrCount && p.pmrCount > 0));
  const pmrTotal = displayedPoints.reduce((acc, p) => acc + (p.hasPmr ? (p.pmrCount || 1) : 0), 0);

  const handlePrint = () => {
    try {
      // 1. Generate & download actual PDF document with sector filtering
      generateTechnicalReportPdf(displayedPoints, displayedLayers, user, selectedSectors.length > 0 ? selectedSectors : undefined);
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
    exportPointsToExcel(displayedPoints, {
      filteredSectors: selectedSectors.length > 0 ? selectedSectors : undefined,
    });
  };

  const filteredAvailableSectors = availableSectors.filter(s => 
    s.toLowerCase().includes(sectorSearchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="export-report-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden"
      >
        
        {/* Modal Header */}
        <div className="bg-emerald-900 text-white px-5 py-3.5 flex items-center justify-between print:hidden flex-shrink-0">
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
              title="Descargar base de datos filtrada en planilla Excel (.xlsx)"
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

        {/* Sector Filter Control Panel (Interactive, print:hidden) */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 print:hidden flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-700" />
                Filtro Territorial por Sector(es):
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {selectedSectors.length === 0 ? (
                  <span className="text-emerald-800 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    Todos los Sectores ({availableSectors.length})
                  </span>
                ) : (
                  <span className="text-indigo-900 font-bold bg-indigo-100 px-2 py-0.5 rounded-md">
                    {selectedSectors.length} sector(es) seleccionado(s) • {displayedPoints.length} puntos incluidos
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={handleClearSectorFilter}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  selectedSectors.length === 0 
                    ? 'bg-emerald-700 text-white shadow-2xs' 
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Todos</span>
              </button>
              <button
                onClick={handleSelectAllSectors}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <CheckSquare className="w-3 h-3 text-emerald-600" />
                <span>Seleccionar Todos</span>
              </button>
            </div>
          </div>

          {/* Sector Selection Chips */}
          <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto pt-1">
            {availableSectors.map((sector) => {
              const isSelected = selectedSectors.includes(sector);
              const count = sectorCountMap.get(sector) || 0;
              return (
                <button
                  key={sector}
                  onClick={() => toggleSector(sector)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-2xs ring-1 ring-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <MapPin className={`w-3 h-3 ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`} />
                  <span>{sector}</span>
                  <span className={`text-[10px] font-mono px-1 rounded ${
                    isSelected ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
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
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                    {selectedSectors.length > 0 
                      ? `Sectores Acotados: ${selectedSectors.join(', ')}` 
                      : 'Alcance: Todos los Sectores Comunales'}
                  </span>
                </div>
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
              <span className="text-2xl font-black text-emerald-700 font-mono">{displayedPoints.length}</span>
              <span className="text-[10px] text-emerald-800 block mt-0.5">
                {selectedSectors.length > 0 ? `En ${selectedSectors.length} sector(es)` : 'En todos los sectores'}
              </span>
            </div>
          </div>

          {/* Section 1: Puntos Críticos y Acciones Urgentes */}
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center justify-between mb-2 pb-1 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>1. Catastro de Zonas y Puntos de Amenaza ({displayedPoints.length})</span>
              </div>
              {selectedSectors.length > 0 && (
                <span className="text-[10px] font-semibold text-emerald-700">
                  Filtro: {selectedSectors.join(', ')}
                </span>
              )}
            </h3>

            {displayedPoints.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                No hay puntos registrados en los sectores seleccionados.
              </div>
            ) : (
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
                    {displayedPoints.map((point) => {
                      const badge = getThreatLevelBadge(point.riskLevel);
                      return (
                        <tr key={point.id} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">
                            {point.title}
                            <span className="block text-[10px] font-normal text-slate-500">{point.threatType}</span>
                          </td>
                          <td className="p-2 text-slate-700 font-medium">{point.sector || 'Sin sector'}</td>
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
            )}
          </div>

          {/* Section 2: Resumen de Capas e Infraestructura */}
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
              <Route className="w-4 h-4 text-emerald-700" />
              2. Capas Geográficas e Infraestructura de Emergencia ({displayedLayers.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {displayedLayers.map((l) => (
                <div key={l.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                    <span>{l.name}</span>
                    <span className="text-[10px] text-emerald-700 uppercase">{l.threatType}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-1.5">{l.description}</p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Sector: {l.sector || 'Comunal'} • {l.featureCount} geometrías integradas
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
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs print:hidden flex-shrink-0">
          <span className="text-slate-500">
            {selectedSectors.length > 0 
              ? `Informe acotado a ${selectedSectors.length} sector(es).` 
              : 'Informe consolidado de todos los sectores.'}
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


