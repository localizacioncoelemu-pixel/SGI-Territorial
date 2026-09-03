import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, 
  AlertTriangle, 
  X, 
  Save, 
  LocateFixed, 
  Flame, 
  Droplets, 
  Mountain, 
  Route, 
  ShieldAlert, 
  Phone, 
  Home, 
  Users, 
  CheckCircle2,
  Accessibility,
  Waves,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { RiskPoint, ThreatCategory, ThreatLevel, PointStatus, HazardEvaluation } from '../types';
import { getCategoryLabel } from '../services/kmzParser';

interface PointManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords?: { lat: number; lng: number } | null;
  editingPoint?: RiskPoint | null;
  defaultSector?: string;
  defaultTitle?: string;
}

const HAZARD_LEVEL_OPTIONS: { id: ThreatLevel; label: string; bg: string; text: string; activeBg: string }[] = [
  { id: 'no_aplica', label: 'No Aplica', bg: 'bg-slate-100', text: 'text-slate-500', activeBg: 'bg-slate-300 text-slate-900 ring-2 ring-slate-400 font-bold' },
  { id: 'bajo', label: 'Bajo', bg: 'bg-emerald-50', text: 'text-emerald-700', activeBg: 'bg-emerald-600 text-white ring-2 ring-emerald-400 font-bold shadow-xs' },
  { id: 'medio', label: 'Medio', bg: 'bg-amber-50', text: 'text-amber-700', activeBg: 'bg-amber-500 text-white ring-2 ring-amber-400 font-bold shadow-xs' },
  { id: 'alto', label: 'Alto', bg: 'bg-orange-50', text: 'text-orange-700', activeBg: 'bg-orange-600 text-white ring-2 ring-orange-400 font-bold shadow-xs' },
  { id: 'critico', label: 'Crítico', bg: 'bg-red-50', text: 'text-red-700', activeBg: 'bg-red-600 text-white ring-2 ring-red-400 font-bold shadow-xs' },
];

export const PointManagerModal: React.FC<PointManagerModalProps> = ({
  isOpen,
  onClose,
  initialCoords,
  editingPoint,
  defaultSector,
  defaultTitle,
}) => {
  const { addRiskPoint, updateRiskPoint, deleteRiskPoint, setMapFlyTo, layers, riskPoints, filterState } = useData();
  const { user, isAdmin } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const [title, setTitle] = useState('');
  const [sector, setSector] = useState('Caravanchel');
  const [category, setCategory] = useState<ThreatCategory>('sectores');
  const [riskLevel, setRiskLevel] = useState<ThreatLevel>('alto');
  const [status, setStatus] = useState<PointStatus>('activo');
  const [lat, setLat] = useState<string>('-36.4883');
  const [lng, setLng] = useState<string>('-72.7031');
  const [elevation, setElevation] = useState<string>('50');
  const [description, setDescription] = useState('');
  const [actionsRequired, setActionsRequired] = useState('');
  const [householdHead, setHouseholdHead] = useState('');
  const [residentsCount, setResidentsCount] = useState<string>('');
  const [responsibleEntity, setResponsibleEntity] = useState('Personal / Terreno');
  const [contactPhone, setContactPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // PMR (Personas con Movilidad Reducida) state
  const [hasPmr, setHasPmr] = useState(false);
  const [pmrCount, setPmrCount] = useState<string>('1');
  const [pmrDetails, setPmrDetails] = useState<string>('');

  // Multi-Hazard Specific Evaluations
  const [hazardEvaluations, setHazardEvaluations] = useState<HazardEvaluation>({
    incendio: 'no_aplica',
    inundacion: 'no_aplica',
    remocion_masa: 'no_aplica',
    corte_ruta: 'no_aplica',
    deficit_hidrico: 'no_aplica',
  });

  // Extract all distinct sectors available across layers and points
  const existingSectors = useMemo(() => {
    const set = new Set<string>();
    layers.forEach(l => {
      if (l.sector && l.sector.trim()) set.add(l.sector.trim());
      l.geojson?.features?.forEach(f => {
        if (f.properties?.sector && typeof f.properties.sector === 'string') set.add(f.properties.sector.trim());
      });
    });
    riskPoints.forEach(p => {
      if (p.sector && p.sector.trim()) set.add(p.sector.trim());
    });
    return Array.from(set).filter(Boolean);
  }, [layers, riskPoints]);

  // Determine active sector default based on filter selection
  const selectedFilterSectors = filterState.selectedSectors;
  const isReadOnly = Boolean(editingPoint && !isAdmin);

  // Populate form on open
  useEffect(() => {
    if (editingPoint) {
      setTitle(editingPoint.title || '');
      setSector(editingPoint.sector || defaultSector || 'Caravanchel');
      setCategory(editingPoint.category || 'sectores');
      setRiskLevel(editingPoint.riskLevel || 'medio');
      setStatus(editingPoint.status || 'activo');
      setLat(editingPoint.coordinates?.lat ? editingPoint.coordinates.lat.toFixed(6) : '-36.4883');
      setLng(editingPoint.coordinates?.lng ? editingPoint.coordinates.lng.toFixed(6) : '-72.7031');
      setElevation(editingPoint.elevation ? editingPoint.elevation.toString() : '');
      setDescription(editingPoint.description || '');
      setActionsRequired(editingPoint.actionsRequired || '');
      setHouseholdHead(editingPoint.householdHead || '');
      setResidentsCount(editingPoint.residentsCount ? editingPoint.residentsCount.toString() : '');
      setResponsibleEntity(editingPoint.responsibleEntity || 'Personal / Terreno');
      setContactPhone(editingPoint.contactPhone || '');
      setHasPmr(Boolean(editingPoint.hasPmr || (editingPoint.pmrCount && editingPoint.pmrCount > 0)));
      setPmrCount(editingPoint.pmrCount ? editingPoint.pmrCount.toString() : '1');
      setPmrDetails(editingPoint.pmrDetails || '');

      setHazardEvaluations({
        incendio: editingPoint.hazardEvaluations?.incendio ?? (editingPoint.category === 'incendios' ? editingPoint.riskLevel : 'no_aplica'),
        inundacion: editingPoint.hazardEvaluations?.inundacion ?? (editingPoint.category === 'inundaciones' ? editingPoint.riskLevel : 'no_aplica'),
        remocion_masa: editingPoint.hazardEvaluations?.remocion_masa ?? (editingPoint.category === 'remocion_masa' ? editingPoint.riskLevel : 'no_aplica'),
        corte_ruta: editingPoint.hazardEvaluations?.corte_ruta ?? (editingPoint.category === 'rutas_evacuacion' ? editingPoint.riskLevel : 'no_aplica'),
        deficit_hidrico: editingPoint.hazardEvaluations?.deficit_hidrico ?? 'no_aplica',
      });
    } else {
      // New point: Auto-assign single selected sector if exactly one is filtered
      let initialSector = defaultSector || '';
      if (!initialSector) {
        if (selectedFilterSectors.length === 1) {
          initialSector = selectedFilterSectors[0];
        } else if (selectedFilterSectors.length > 1) {
          initialSector = selectedFilterSectors[0];
        } else if (existingSectors.length > 0) {
          initialSector = existingSectors[0];
        } else {
          initialSector = 'Caravanchel';
        }
      }

      if (initialCoords) {
        setTitle(defaultTitle || 'Punto de Terreno');
        setSector(initialSector);
        setCategory('sectores');
        setRiskLevel('medio');
        setStatus('activo');
        setLat(initialCoords.lat.toFixed(6));
        setLng(initialCoords.lng.toFixed(6));
        setElevation('');
        setDescription('');
        setActionsRequired('');
        setHouseholdHead('');
        setResidentsCount('');
        setContactPhone('');
        setHasPmr(false);
        setPmrCount('1');
        setPmrDetails('');
        setHazardEvaluations({
          incendio: 'alto',
          inundacion: 'no_aplica',
          remocion_masa: 'no_aplica',
          corte_ruta: 'no_aplica',
          deficit_hidrico: 'no_aplica',
        });
      } else {
        setTitle(defaultTitle || '');
        setSector(initialSector);
        setDescription('');
        setActionsRequired('');
        setHouseholdHead('');
        setResidentsCount('');
        setContactPhone('');
        setHasPmr(false);
        setPmrCount('1');
        setPmrDetails('');
        setHazardEvaluations({
          incendio: 'no_aplica',
          inundacion: 'no_aplica',
          remocion_masa: 'no_aplica',
          corte_ruta: 'no_aplica',
          deficit_hidrico: 'no_aplica',
        });
      }
    }
    setFormError(null);
  }, [editingPoint, initialCoords, isOpen, defaultSector, defaultTitle, selectedFilterSectors, existingSectors]);

  if (!isOpen) return null;

  const updateHazard = (hazardKey: keyof HazardEvaluation, level: ThreatLevel) => {
    const updated = { ...hazardEvaluations, [hazardKey]: level };
    setHazardEvaluations(updated);

    // Auto calculate highest global severity
    const rank: Record<string, number> = { critico: 4, alto: 3, medio: 2, bajo: 1, informativo: 0, no_aplica: -1 };
    let maxRank = 0;
    let maxLevel: ThreatLevel = 'bajo';

    Object.values(updated).forEach(lvl => {
      if (lvl && rank[lvl] > maxRank) {
        maxRank = rank[lvl];
        maxLevel = lvl;
      }
    });

    if (maxRank > 0) {
      setRiskLevel(maxLevel);
    }
  };

  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada en este dispositivo.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        if (pos.coords.altitude) {
          setElevation(Math.round(pos.coords.altitude).toString());
        }
        setGpsLoading(false);
      },
      (err) => {
        console.warn('GPS error:', err);
        setGpsLoading(false);
        alert('No se pudo obtener la posición GPS. Verifique los permisos del navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Por favor ingresa un nombre o identificador para el punto / vivienda.');
      return;
    }
    if (!sector.trim()) {
      setFormError('Por favor ingresa o selecciona el sector al que pertenece el punto.');
      return;
    }
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if (isNaN(numLat) || isNaN(numLng)) {
      setFormError('Las coordenadas geográficas no son válidas.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payloadData = {
        title: title.trim(),
        threatType: getCategoryLabel(category),
        category,
        riskLevel,
        hazardEvaluations,
        status,
        coordinates: { lat: numLat, lng: numLng },
        elevation: elevation ? parseFloat(elevation) : undefined,
        sector: sector.trim(),
        comuna: 'Zona Territorial',
        description: description.trim(),
        actionsRequired: actionsRequired.trim(),
        householdHead: householdHead.trim() || undefined,
        residentsCount: residentsCount ? parseInt(residentsCount, 10) : undefined,
        responsibleEntity: responsibleEntity.trim(),
        contactPhone: contactPhone.trim(),
        hasPmr: hasPmr,
        pmrCount: hasPmr && pmrCount ? parseInt(pmrCount, 10) : 0,
        pmrDetails: hasPmr ? pmrDetails.trim() : undefined,
      };

      if (editingPoint) {
        if (!isAdmin) {
          setFormError('Permisos insuficientes: El rol de usuario solo puede agregar puntos nuevos, no modificar puntos ya ingresados.');
          setIsSaving(false);
          return;
        }
        await updateRiskPoint(editingPoint.id, payloadData);
      } else {
        await addRiskPoint(payloadData);
      }

      setMapFlyTo({ lat: numLat, lng: numLng, zoom: 16 });
      onClose();
    } catch (err: any) {
      console.error('Error saving risk point:', err);
      setFormError('Ocurrió un error al guardar el punto en la base de datos.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="point-manager-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden"
      >
        
        {/* Modal Header */}
        <div className="bg-emerald-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center shadow-inner">
              <MapPin className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight leading-tight flex items-center gap-2">
                {editingPoint ? 'Editar Punto & Niveles de Riesgo' : 'Evaluar y Registrar Punto en Base de Datos'}
                {sector && (
                  <span className="bg-emerald-800 text-emerald-200 text-xs px-2 py-0.5 rounded-md font-semibold border border-emerald-700">
                    {sector}
                  </span>
                )}
              </h3>
              <p className="text-xs text-emerald-200/90 leading-tight">
                Asigna niveles específicos para Incendio, Inundación, Remoción, PMR y descarga en Excel
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

        {/* Multi-sector Warning Banner if user has > 1 sector active */}
        {!editingPoint && selectedFilterSectors.length > 1 && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Atención:</strong> Tienes {selectedFilterSectors.length} sectores activos en el filtro. Selecciona a cuál asociar este punto:
              </span>
            </div>
            <div className="flex items-center gap-1">
              {selectedFilterSectors.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSector(s)}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] border transition-colors cursor-pointer ${
                    sector === s 
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                      : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Read-Only Notice Banner for Regular Users on Existing Points */}
        {isReadOnly && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>
              <strong>Modo Consulta (Rol Usuario):</strong> Tienes permiso para registrar nuevos puntos territoriales, pero la modificación y eliminación de puntos existentes está reservada para administradores.
            </span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="font-medium">{formError}</span>
            </div>
          )}

          <fieldset disabled={isReadOnly} className="space-y-4">

          {/* Top Info Grid: Sector & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            {/* Sector / Localidad */}
            <div>
              <label className="block font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Sector / Capa Activa <span className="text-red-500">*</span></span>
                <span className="text-[10px] text-slate-500 font-normal">Capa de destino</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nombre del sector (ej: Caravanchel)"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                list="sectors-datalist"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <datalist id="sectors-datalist">
                {existingSectors.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              {existingSectors.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400">Sectores disponibles:</span>
                  {existingSectors.slice(0, 5).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSector(s)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        sector.toLowerCase() === s.toLowerCase() 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Point Name / Title */}
            <div>
              <label className="block font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Nombre del Punto / Vivienda / Familia <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Vivienda Familia Muñoz / Acceso Quebrada / Punto 04"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Identificador que aparecerá en el mapa y en la planilla Excel y reportes PDF.
              </p>
            </div>
          </div>

          {/* MULTI-HAZARD EVALUATION MATRIX (CORE USER REQUEST) */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 p-4 rounded-xl border-2 border-emerald-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-800" />
                <span className="font-bold text-slate-900 text-sm">
                  Evaluación Multirriesgo por Amenaza
                </span>
              </div>
              <span className="text-[11px] text-emerald-800 font-medium">
                Define el nivel para cada amenaza detectada en este punto
              </span>
            </div>

            {/* Hazard 1: Incendio Forestal */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-[200px]">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Flame className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Riesgo Incendio Forestal</span>
                  <span className="text-[10px] text-slate-500">Carga de combustible / cercanía bosque</span>
                </div>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {HAZARD_LEVEL_OPTIONS.map(opt => {
                  const isActive = (hazardEvaluations.incendio || 'no_aplica') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateHazard('incendio', opt.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                        isActive ? opt.activeBg : `${opt.bg} ${opt.text} hover:opacity-80`
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hazard 2: Inundación / Crecidas */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-[200px]">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Droplets className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Riesgo Inundación / Crecidas</span>
                  <span className="text-[10px] text-slate-500">Desborde de esteros / acumulación aguas</span>
                </div>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {HAZARD_LEVEL_OPTIONS.map(opt => {
                  const isActive = (hazardEvaluations.inundacion || 'no_aplica') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateHazard('inundacion', opt.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                        isActive ? opt.activeBg : `${opt.bg} ${opt.text} hover:opacity-80`
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hazard 3: Remoción en Masa / Deslizamiento */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-[200px]">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Mountain className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Riesgo Remoción en Masa</span>
                  <span className="text-[10px] text-slate-500">Pendiente pronunciada / deslizamientos</span>
                </div>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {HAZARD_LEVEL_OPTIONS.map(opt => {
                  const isActive = (hazardEvaluations.remocion_masa || 'no_aplica') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateHazard('remocion_masa', opt.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                        isActive ? opt.activeBg : `${opt.bg} ${opt.text} hover:opacity-80`
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hazard 4: Corte de Ruta / Aislamiento */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-[200px]">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Route className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Riesgo Corte de Ruta / Evacuación</span>
                  <span className="text-[10px] text-slate-500">Camino angosto / puente vulnerable</span>
                </div>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {HAZARD_LEVEL_OPTIONS.map(opt => {
                  const isActive = (hazardEvaluations.corte_ruta || 'no_aplica') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateHazard('corte_ruta', opt.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                        isActive ? opt.activeBg : `${opt.bg} ${opt.text} hover:opacity-80`
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hazard 5: Déficit Hídrico */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-[200px]">
                <div className="w-7 h-7 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                  <Waves className="w-4 h-4 text-cyan-700" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Riesgo Déficit Hídrico</span>
                  <span className="text-[10px] text-slate-500">Sin acceso a red / sequía de norias</span>
                </div>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {HAZARD_LEVEL_OPTIONS.map(opt => {
                  const isActive = (hazardEvaluations.deficit_hidrico || 'no_aplica') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateHazard('deficit_hidrico', opt.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                        isActive ? opt.activeBg : `${opt.bg} ${opt.text} hover:opacity-80`
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* PMR (PERSONAS CON MOVILIDAD REDUCIDA) SECTION (FROM PDF) */}
          <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                  <Accessibility className="w-4 h-4" />
                </div>
                <div>
                  <label htmlFor="checkbox-has-pmr" className="font-bold text-purple-950 text-sm cursor-pointer block">
                    Personas con Movilidad Reducida (PMR)
                  </label>
                  <span className="text-[11px] text-purple-700">
                    ¿Habitan personas con dependencia severa, postradas, sillas de ruedas o tercera edad no autovalente?
                  </span>
                </div>
              </div>
              <input
                id="checkbox-has-pmr"
                type="checkbox"
                checked={hasPmr}
                onChange={(e) => setHasPmr(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded border-purple-300 focus:ring-purple-500 cursor-pointer"
              />
            </div>

            {hasPmr && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-200 animate-in fade-in duration-150">
                <div>
                  <label className="block font-bold text-purple-900 mb-1">
                    Cantidad PMR <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required={hasPmr}
                    value={pmrCount}
                    onChange={(e) => setPmrCount(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-purple-950 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-purple-900 mb-1">
                    Detalle / Condición PMR
                  </label>
                  <input
                    type="text"
                    value={pmrDetails}
                    onChange={(e) => setPmrDetails(e.target.value)}
                    placeholder="Ej: Adulto mayor postrado en cama, requiere auxilio inmediato en evacuación"
                    className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-purple-950 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Global Severity & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Nivel de Riesgo Global</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Prioridad en mapa</span>
              </label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as ThreatLevel)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="critico">🚨 Crítico (Rojo) - Muy Alta Urgencia</option>
                <option value="alto">⚠️ Alto (Naranjo) - Riesgo Elevado</option>
                <option value="medio">⚡ Medio (Amarillo) - Precaución</option>
                <option value="bajo">✅ Bajo (Verde) - Monitoreo Leve</option>
                <option value="informativo">ℹ️ Informativo</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">Estado de Mitigación</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PointStatus)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="activo">🔴 Activo / Sin Mitigar</option>
                <option value="en_mitigacion">🟡 En Mitigación / Coordinación</option>
                <option value="monitoreado">🔵 Monitoreado en Terreno</option>
                <option value="resuelto">🟢 Resuelto / Mitigado</option>
              </select>
            </div>
          </div>

          {/* Coordinates Bar */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-700" />
                Coordenadas Geográficas (Latitud / Longitud WGS84)
              </span>
              <button
                type="button"
                onClick={handleGetCurrentGps}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all shadow-xs cursor-pointer"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                <span>{gpsLoading ? 'Detectando GPS...' : 'Tomar Coordenadas GPS'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Latitud</label>
                <input
                  type="text"
                  required
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="-36.488300"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Longitud</label>
                <input
                  type="text"
                  required
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-72.703100"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Elevación (msnm)</label>
                <input
                  type="number"
                  value={elevation}
                  onChange={(e) => setElevation(e.target.value)}
                  placeholder="50"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Household / Family / Vulnerability */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-slate-500" />
                Jefe de Hogar / Familia
              </label>
              <input
                type="text"
                placeholder="Ej: Familia Morales / Juan Pérez"
                value={householdHead}
                onChange={(e) => setHouseholdHead(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                N° de Habitantes
              </label>
              <input
                type="number"
                min="0"
                placeholder="Ej: 4"
                value={residentsCount}
                onChange={(e) => setResidentsCount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                Teléfono de Contacto
              </label>
              <input
                type="text"
                placeholder="Ej: +56 9 8765 4321"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Detailed Observations & Mitigations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Diagnóstico / Observaciones de Terreno</label>
              <textarea
                rows={3}
                placeholder="Detalle sobre el estado de la vivienda, materialidad, entorno boscoso o acceso."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Acciones Requeridas / Mitigación</label>
              <textarea
                rows={3}
                placeholder="Ej: Construcción de cortafuego de 15m, limpieza de quebrada, entrega de agua potable."
                value={actionsRequired}
                onChange={(e) => setActionsRequired(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>
          </div>
          </fieldset>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isAdmin && editingPoint && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    if (confirm(`¿Estás seguro de eliminar permanentemente este punto de riesgo "${editingPoint.title}"?`)) {
                      setIsDeleting(true);
                      try {
                        await deleteRiskPoint(editingPoint.id);
                        onClose();
                      } finally {
                        setIsDeleting(false);
                      }
                    }
                  }}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Eliminar este punto de la base de datos"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Eliminando...' : 'Eliminar Punto'}</span>
                </button>
              )}
              <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Base de datos en la nube</span>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer text-xs"
              >
                Cancelar
              </button>
              {(!editingPoint || isAdmin) ? (
                <button
                  type="submit"
                  disabled={isSaving || isDeleting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Guardando...' : (editingPoint ? 'Actualizar Evaluación' : 'Guardar Punto en Base de Datos')}</span>
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-200">
                  Solo Lectura (Rol Usuario)
                </span>
              )}
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
