import React, { useState } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Trash2, 
  Edit3, 
  Maximize2, 
  Phone, 
  Building, 
  CheckCircle2, 
  Clock, 
  X,
  Flame,
  Droplets,
  Mountain,
  Route,
  Building2,
  ShieldCheck,
  ChevronRight,
  FileSpreadsheet,
  Search,
  Filter,
  Eye,
  Download,
  Loader2
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { RiskPoint, ThreatCategory, ThreatLevel } from '../types';
import { getThreatLevelBadge } from '../services/kmzParser';
import { exportPointsToKmzFile } from '../services/kmzExporter';

interface PointListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onEditPoint: (point: RiskPoint) => void;
  onAddNewPoint: () => void;
  onOpenExcel?: () => void;
}

export const PointListDrawer: React.FC<PointListDrawerProps> = ({
  isOpen,
  onClose,
  onEditPoint,
  onAddNewPoint,
  onOpenExcel,
}) => {
  const { 
    filteredRiskPoints, 
    riskPoints,
    selectedPoint, 
    setSelectedPoint, 
    setMapFlyTo, 
    deleteRiskPoint,
    deleteAllRiskPoints
  } = useData();
  const { user, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isExportingKmz, setIsExportingKmz] = useState(false);

  if (!isOpen) return null;

  const handleExportPointsKmz = async () => {
    if (!isAdmin) {
      alert('Acceso restringido: Solo los administradores pueden descargar respaldos KMZ.');
      return;
    }
    if (riskPoints.length === 0) {
      alert('No hay puntos registrados para exportar.');
      return;
    }
    try {
      setIsExportingKmz(true);
      await exportPointsToKmzFile(riskPoints);
    } catch (err: any) {
      console.error('Error al exportar puntos a KMZ:', err);
      alert('No se pudo generar el archivo KMZ de puntos: ' + (err?.message || 'Error'));
    } finally {
      setIsExportingKmz(false);
    }
  };

  const handleSelectPoint = (point: RiskPoint) => {
    setSelectedPoint(point);
    setMapFlyTo({ lat: point.coordinates.lat, lng: point.coordinates.lng, zoom: 16 });
  };

  const handleDeleteAll = async () => {
    if (!isAdmin) return;
    if (confirm(`¿Estás seguro de eliminar TODOS los ${riskPoints.length} puntos de riesgo registrados en la base de datos? Esta acción no se puede deshacer.`)) {
      setIsDeletingAll(true);
      try {
        await deleteAllRiskPoints();
      } finally {
        setIsDeletingAll(false);
      }
    }
  };

  const displayedPoints = filteredRiskPoints.filter(p => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.title || '').toLowerCase().includes(term) ||
      (p.sector || '').toLowerCase().includes(term) ||
      (p.householdHead || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="bg-emerald-900 text-white px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">Base de Datos de Puntos</h3>
            <p className="text-[11px] text-emerald-200/90 leading-tight">
              {filteredRiskPoints.length} puntos evaluados
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Top Action Bar: Add & Excel Export */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onAddNewPoint}
            className="flex-1 py-1.5 px-3 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5" />
            + Nuevo Punto
          </button>

          {isAdmin && onOpenExcel && (
            <button
              onClick={onOpenExcel}
              className="py-1.5 px-3 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98 border border-emerald-600/60 cursor-pointer"
              title="Descargar base de datos en archivo Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>Exportar Excel</span>
            </button>
          )}
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por sector (ej: Caravanchel), nombre o familia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
        {displayedPoints.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-400">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-slate-600">No hay puntos que coincidan con la búsqueda</p>
            <p className="text-[11px] mt-1">Prueba cambiando el término de búsqueda o agrega un nuevo punto sobre el mapa.</p>
          </div>
        ) : (
          displayedPoints.map((point) => {
            const badge = getThreatLevelBadge(point.riskLevel);
            const isSelected = selectedPoint?.id === point.id;

            const fire = point.hazardEvaluations?.incendio;
            const flood = point.hazardEvaluations?.inundacion;
            const land = point.hazardEvaluations?.remocion_masa;
            const iso = point.hazardEvaluations?.corte_ruta;
            const water = point.hazardEvaluations?.deficit_hidrico;

            return (
              <div
                key={point.id}
                onClick={() => handleSelectPoint(point)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-300/60 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/60 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="font-bold text-slate-900 text-xs truncate leading-tight">
                      {point.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(point.hasPmr || (point.pmrCount && point.pmrCount > 0)) && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-700 text-white border border-purple-800">
                        ♿ PMR ({point.pmrCount || 1})
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${badge.bg} border flex-shrink-0`}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1.5">
                  <span className="font-bold text-emerald-800">📍 {point.sector || 'Sin sector'}</span>
                  {point.householdHead && (
                    <>
                      <span>•</span>
                      <span className="text-slate-700">👤 {point.householdHead}</span>
                    </>
                  )}
                </div>

                {/* Mini Multi-Hazard Indicator Row */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {fire && fire !== 'no_aplica' && (
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${getThreatLevelBadge(fire).bg} border`}>
                      🔥 Incendio: {getThreatLevelBadge(fire).label}
                    </span>
                  )}
                  {flood && flood !== 'no_aplica' && (
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${getThreatLevelBadge(flood).bg} border`}>
                      🌊 Inundación: {getThreatLevelBadge(flood).label}
                    </span>
                  )}
                  {land && land !== 'no_aplica' && (
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${getThreatLevelBadge(land).bg} border`}>
                      ⛰️ Remoción: {getThreatLevelBadge(land).label}
                    </span>
                  )}
                  {iso && iso !== 'no_aplica' && (
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${getThreatLevelBadge(iso).bg} border`}>
                      🚧 Ruta: {getThreatLevelBadge(iso).label}
                    </span>
                  )}
                  {water && water !== 'no_aplica' && (
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${getThreatLevelBadge(water).bg} border`}>
                      💧 Agua: {getThreatLevelBadge(water).label}
                    </span>
                  )}
                </div>

                {point.description && (
                  <p className="text-slate-600 text-[11px] line-clamp-2 mb-2 leading-relaxed bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    {point.description}
                  </p>
                )}

                {point.actionsRequired && (
                  <div className="mb-2 p-1.5 bg-amber-50/80 border border-amber-200/60 rounded text-[10px] text-amber-900">
                    <strong className="font-semibold block">Mitigación:</strong>
                    <span className="line-clamp-2">{point.actionsRequired}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
                  <span>{new Date(point.updatedAt).toLocaleDateString('es-CL')}</span>
                  
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleSelectPoint(point)}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                      title="Centrar en el mapa"
                    >
                      <Maximize2 className="w-3 h-3 text-emerald-700" />
                    </button>
                    {isAdmin ? (
                      <button
                        onClick={() => onEditPoint(point)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                        title="Editar y calificar riesgos"
                      >
                        <Edit3 className="w-3 h-3 text-slate-700" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onEditPoint(point)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                        title="Ver detalle de evaluación en modo lectura"
                      >
                        <Eye className="w-3 h-3 text-slate-700" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar punto "${point.title}"?`)) {
                            deleteRiskPoint(point.id);
                          }
                        }}
                        className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-600"
                        title="Eliminar punto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-50 border-t border-slate-200 p-2.5 text-center text-xs text-slate-500 flex items-center justify-between px-4">
        {isAdmin && riskPoints.length > 0 ? (
          <button
            onClick={handleDeleteAll}
            disabled={isDeletingAll}
            className="text-red-600 hover:text-red-700 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
            title="Eliminar todos los puntos registrados en la base de datos"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeletingAll ? 'Eliminando...' : 'Eliminar Todos los Puntos'}</span>
          </button>
        ) : (
          <span>Base de datos sincronizada</span>
        )}
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPointsKmz}
              disabled={isExportingKmz || riskPoints.length === 0}
              className="text-emerald-700 hover:text-emerald-800 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Descargar todos los puntos de riesgo en formato KMZ para Google Earth"
            >
              {isExportingKmz ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>Descargar KMZ</span>
            </button>

            {onOpenExcel && (
              <button
                onClick={onOpenExcel}
                className="text-emerald-700 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Descargar en Excel
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
