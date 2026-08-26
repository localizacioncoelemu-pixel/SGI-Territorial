import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  X, 
  CheckCircle2, 
  Filter, 
  Flame, 
  Droplets, 
  Mountain, 
  Route, 
  Table, 
  Layers, 
  MapPin,
  Sparkles
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { exportPointsToExcel } from '../services/excelExport';
import { getThreatLevelBadge } from '../services/kmzParser';
import { ThreatLevel } from '../types';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { riskPoints, layers } = useData();
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Extract all distinct sectors
  const allSectors = useMemo(() => {
    const set = new Set<string>();
    riskPoints.forEach(p => {
      if (p.sector && p.sector.trim()) set.add(p.sector.trim());
    });
    layers.forEach(l => {
      if (l.sector && l.sector.trim()) set.add(l.sector.trim());
      l.geojson?.features?.forEach(f => {
        if (f.properties?.sector && typeof f.properties.sector === 'string') set.add(f.properties.sector.trim());
      });
    });
    return Array.from(set).filter(Boolean);
  }, [riskPoints, layers]);

  // Filtered points preview
  const filteredPoints = useMemo(() => {
    if (selectedSector === 'all') return riskPoints;
    return riskPoints.filter(p => (p.sector || '').toLowerCase() === selectedSector.toLowerCase());
  }, [riskPoints, selectedSector]);

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);
    setDownloadSuccess(null);
    try {
      const sectorsFilter = selectedSector === 'all' ? undefined : [selectedSector];
      const filename = exportPointsToExcel(riskPoints, {
        filteredSectors: sectorsFilter,
        filenamePrefix: selectedSector === 'all' ? 'SIG_Base_Datos_Todos_Sectores' : `SIG_Base_Datos_${selectedSector.replace(/\s+/g, '_')}`,
      });
      setDownloadSuccess(`¡Archivo "${filename}" descargado exitosamente!`);
    } catch (err: any) {
      console.error('Error generating Excel file:', err);
      alert('Error al generar la planilla Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="excel-export-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight leading-tight flex items-center gap-2">
                Descargar Base de Datos en Excel (.xlsx)
              </h3>
              <p className="text-xs text-emerald-200/90 leading-tight">
                Planilla estructurada con Sectores, Coordenadas y Niveles de Riesgo por Categoría
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {downloadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="font-bold">{downloadSuccess}</span>
              </div>
              <span className="text-[11px] text-emerald-700">Revisa tu carpeta de Descargas</span>
            </div>
          )}

          {/* Configuration Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <label className="block font-bold text-slate-900 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-700" />
                Filtrar por Sector a Exportar:
              </label>
              <p className="text-[11px] text-slate-500">
                Selecciona si deseas exportar todos los sectores o un sector específico (ej: Caravanchel)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedSector}
                onChange={(e) => {
                  setSelectedSector(e.target.value);
                  setDownloadSuccess(null);
                }}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all">📂 Todos los Sectores ({riskPoints.length} puntos totales)</option>
                {allSectors.map(sec => {
                  const count = riskPoints.filter(p => (p.sector || '').toLowerCase() === sec.toLowerCase()).length;
                  return (
                    <option key={sec} value={sec}>
                      📍 {sec} ({count} puntos evaluados)
                    </option>
                  );
                })}
              </select>

              <button
                onClick={handleExport}
                disabled={isExporting || filteredPoints.length === 0}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Generando...' : 'Descargar Excel Ahora'}</span>
              </button>
            </div>
          </div>

          {/* Database Columns Preview Specification */}
          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/60 space-y-2">
            <div className="font-bold text-emerald-950 flex items-center gap-2 text-xs">
              <Table className="w-4 h-4 text-emerald-700" />
              Estructura de Columnas Incluidas en la Planilla Excel:
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded font-semibold text-emerald-900">Sector / Localidad</span>
              <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded font-semibold text-emerald-900">Nombre del Punto / Vivienda</span>
              <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded font-semibold text-emerald-900">Latitud & Longitud</span>
              <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded font-semibold text-emerald-900">Elevación (msnm)</span>
              <span className="px-2 py-0.5 bg-red-50 border border-red-200 rounded font-semibold text-red-800">🔥 Riesgo Incendio Forestal</span>
              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded font-semibold text-blue-800">🌊 Riesgo Inundación</span>
              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded font-semibold text-amber-800">⛰️ Riesgo Remoción Masa</span>
              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded font-semibold text-emerald-800">🚧 Riesgo Corte Ruta / Aislamiento</span>
              <span className="px-2 py-0.5 bg-cyan-50 border border-cyan-200 rounded font-semibold text-cyan-800">💧 Riesgo Déficit Hídrico</span>
              <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded font-semibold text-emerald-900">Nivel de Riesgo Global</span>
              <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded font-semibold text-emerald-900">Estado de Mitigación</span>
              <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded font-semibold text-emerald-900">Diagnóstico & Acciones</span>
              <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded font-semibold text-emerald-900">Pestaña 2: Resumen Consolidado</span>
            </div>
          </div>

          {/* Live Data Table Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                Vista Previa de los Datos ({filteredPoints.length} registros listos para exportar)
              </span>
              <span className="text-[10px] text-slate-500">
                {selectedSector === 'all' ? 'Mostrando todos los sectores' : `Filtrado por: ${selectedSector}`}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="p-2.5">Sector</th>
                      <th className="p-2.5">Nombre / Vivienda</th>
                      <th className="p-2.5">Coordenadas</th>
                      <th className="p-2.5">Incendio</th>
                      <th className="p-2.5">Inundación</th>
                      <th className="p-2.5">Remoción</th>
                      <th className="p-2.5">Aislamiento</th>
                      <th className="p-2.5">Nivel Global</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredPoints.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          No hay puntos evaluados en este sector. Haz clic sobre el mapa para evaluar y agregar puntos.
                        </td>
                      </tr>
                    ) : (
                      filteredPoints.map((point) => {
                        const badge = getThreatLevelBadge(point.riskLevel);
                        const fireBadge = getThreatLevelBadge(point.hazardEvaluations?.incendio || (point.category === 'incendios' ? point.riskLevel : 'no_aplica'));
                        const floodBadge = getThreatLevelBadge(point.hazardEvaluations?.inundacion || (point.category === 'inundaciones' ? point.riskLevel : 'no_aplica'));
                        const landBadge = getThreatLevelBadge(point.hazardEvaluations?.remocion_masa || (point.category === 'remocion_masa' ? point.riskLevel : 'no_aplica'));
                        const isoBadge = getThreatLevelBadge(point.hazardEvaluations?.corte_ruta || (point.category === 'rutas_evacuacion' ? point.riskLevel : 'no_aplica'));

                        return (
                          <tr key={point.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900">{point.sector || 'Sin sector'}</td>
                            <td className="p-2.5 font-medium">{point.title}</td>
                            <td className="p-2.5 font-mono text-[10px]">
                              {point.coordinates.lat.toFixed(4)}, {point.coordinates.lng.toFixed(4)}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${fireBadge.bg} border`}>
                                {fireBadge.label}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${floodBadge.bg} border`}>
                                {floodBadge.label}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${landBadge.bg} border`}>
                                {landBadge.label}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${isoBadge.bg} border`}>
                                {isoBadge.label}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${badge.bg} border`}>
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Formato estándar compatible con Microsoft Excel, Google Sheets y LibreOffice
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || filteredPoints.length === 0}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Descargando...' : 'Descargar Planilla Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
