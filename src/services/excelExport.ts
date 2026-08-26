import * as XLSX from 'xlsx';
import { RiskPoint, ThreatLevel, PointStatus, ComunaIncident, IncidentType, IncidentStatus, IncidentSeverity } from '../types';

export function formatHazardLevel(level?: ThreatLevel | string): string {
  switch (level) {
    case 'critico':
      return '🚨 CRÍTICO (Muy Alto)';
    case 'alto':
      return '⚠️ ALTO';
    case 'medio':
      return '⚡ MEDIO';
    case 'bajo':
      return '✅ BAJO';
    case 'informativo':
      return 'ℹ️ INFORMATIVO';
    case 'no_aplica':
    default:
      return '— No Aplica';
  }
}

export function formatStatus(status?: PointStatus): string {
  switch (status) {
    case 'activo':
      return '🔴 Activo (Sin Mitigar)';
    case 'en_mitigacion':
      return '🟡 En Mitigación';
    case 'monitoreado':
      return '🔵 Monitoreado';
    case 'resuelto':
      return '🟢 Resuelto / Mitigado';
    default:
      return 'Activo';
  }
}

export function formatIncidentType(type?: IncidentType | string): string {
  switch (type) {
    case 'incendio_forestal':
      return '🔥 Incendio Forestal';
    case 'incendio_estructural':
      return '🏠 Incendio Estructural / Vivienda';
    case 'inundacion':
      return '🌊 Inundación / Crecida Fluvial';
    case 'deslizamiento':
      return '⛰️ Remoción en Masa / Derrumbe';
    case 'corte_ruta':
      return '🚧 Corte de Ruta / Desmoronamiento';
    case 'corte_suministro':
      return '⚡ Corte Suministro Eléctrico / Agua';
    case 'accidente':
      return '🚑 Accidente Vehicular / Rescate';
    case 'deficit_hidrico':
      return '💧 Déficit Hídrico / Emergencia APR';
    case 'otro':
    default:
      return '⚠️ Otro Incidente / Emergencia';
  }
}

export function formatIncidentStatus(status?: IncidentStatus | string): string {
  switch (status) {
    case 'activo':
      return '🔴 ACTIVO';
    case 'en_combate':
      return '🟡 EN COMBATE / RESPUESTA';
    case 'controlado':
      return '🔵 CONTROLADO';
    case 'extinguido':
      return '🟢 EXTINGUIDO';
    case 'resuelto':
      return '✅ RESUELTO / LIQUIDADO';
    default:
      return 'Activo';
  }
}

export function formatIncidentSeverity(severity?: IncidentSeverity | string): string {
  switch (severity) {
    case 'critico':
      return '🚨 CRÍTICO (Alerta Roja)';
    case 'alto':
      return '⚠️ ALTO (Alerta Amarilla)';
    case 'medio':
      return '⚡ MEDIO (Alerta Temprana)';
    case 'bajo':
      return '✅ BAJO (Monitoreo)';
    default:
      return 'Medio';
  }
}

export interface ExportExcelOptions {
  filteredSectors?: string[];
  filenamePrefix?: string;
}

export function exportPointsToExcel(
  points: RiskPoint[],
  options?: ExportExcelOptions
) {
  const pointsToExport = options?.filteredSectors && options.filteredSectors.length > 0
    ? points.filter(p => options.filteredSectors!.some(s => (p.sector || '').toLowerCase() === s.toLowerCase()))
    : points;

  // 1. Data Sheet Rows
  const rows = pointsToExport.map((p, index) => {
    // Resolve hazard levels prioritizing explicit hazardEvaluations, fallback to category match
    const fireRisk = p.hazardEvaluations?.incendio ?? (p.category === 'incendios' ? p.riskLevel : 'no_aplica');
    const floodRisk = p.hazardEvaluations?.inundacion ?? (p.category === 'inundaciones' ? p.riskLevel : 'no_aplica');
    const landslideRisk = p.hazardEvaluations?.remocion_masa ?? (p.category === 'remocion_masa' ? p.riskLevel : 'no_aplica');
    const isolationRisk = p.hazardEvaluations?.corte_ruta ?? (p.category === 'rutas_evacuacion' ? p.riskLevel : 'no_aplica');
    const waterRisk = p.hazardEvaluations?.deficit_hidrico ?? 'no_aplica';

    return {
      'N°': index + 1,
      'Sector / Localidad': p.sector || 'Sin sector',
      'Nombre del Punto / Vivienda / Familia': p.title || '',
      'Latitud': typeof p.coordinates?.lat === 'number' ? Number(p.coordinates.lat.toFixed(6)) : p.coordinates?.lat || '',
      'Longitud': typeof p.coordinates?.lng === 'number' ? Number(p.coordinates.lng.toFixed(6)) : p.coordinates?.lng || '',
      'Elevación (msnm)': p.elevation ? `${p.elevation} m` : '—',
      'Riesgo Incendio Forestal': formatHazardLevel(fireRisk),
      'Riesgo Inundación / Crecidas': formatHazardLevel(floodRisk),
      'Riesgo Remoción en Masa / Derrumbe': formatHazardLevel(landslideRisk),
      'Riesgo Corte Ruta / Aislamiento': formatHazardLevel(isolationRisk),
      'Riesgo Déficit Hídrico': formatHazardLevel(waterRisk),
      'Nivel de Riesgo Global': formatHazardLevel(p.riskLevel),
      'Estado de Mitigación': formatStatus(p.status),
      'Descripción / Diagnóstico Terreno': p.description || '',
      'Acciones Requeridas': p.actionsRequired || '',
      'Responsable / Cuadrilla': p.responsibleEntity || '',
      'Teléfono Contacto': p.contactPhone || '',
      'Fecha Actualización': p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '',
    };
  });

  const wb = XLSX.utils.book_new();

  // Create sheet 1: Puntos Evaluados
  const wsPoints = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{
    'N°': 1,
    'Sector / Localidad': 'Sin registros',
    'Nombre del Punto / Vivienda / Familia': 'No hay puntos registrados aún',
    'Latitud': '',
    'Longitud': '',
    'Elevación (msnm)': '',
    'Riesgo Incendio Forestal': '',
    'Riesgo Inundación / Crecidas': '',
    'Riesgo Remoción en Masa / Derrumbe': '',
    'Riesgo Corte Ruta / Aislamiento': '',
    'Riesgo Déficit Hídrico': '',
    'Nivel de Riesgo Global': '',
    'Estado de Mitigación': '',
    'Descripción / Diagnóstico Terreno': '',
    'Acciones Requeridas': '',
    'Responsable / Cuadrilla': '',
    'Teléfono Contacto': '',
    'Fecha Actualización': '',
  }]);

  wsPoints['!cols'] = [
    { wch: 6 },  // N°
    { wch: 22 }, // Sector
    { wch: 34 }, // Nombre
    { wch: 15 }, // Latitud
    { wch: 15 }, // Longitud
    { wch: 16 }, // Elevación
    { wch: 24 }, // Incendio
    { wch: 25 }, // Inundación
    { wch: 28 }, // Remoción
    { wch: 27 }, // Corte ruta
    { wch: 23 }, // Déficit hídrico
    { wch: 24 }, // Nivel Global
    { wch: 22 }, // Estado
    { wch: 45 }, // Descripción
    { wch: 38 }, // Acciones
    { wch: 22 }, // Responsable
    { wch: 18 }, // Teléfono
    { wch: 18 }, // Fecha
  ];

  XLSX.utils.book_append_sheet(wb, wsPoints, 'Base_Datos_Puntos');

  // Sheet 2: Resumen Consolidado por Sector
  const sectorMap = new Map<string, {
    total: number;
    criticos: number;
    altos: number;
    medios: number;
    bajos: number;
    conIncendio: number;
    conInundacion: number;
    conRemocion: number;
    conAislamiento: number;
    conHidrico: number;
  }>();

  pointsToExport.forEach(p => {
    const sec = p.sector || 'Sin sector';
    if (!sectorMap.has(sec)) {
      sectorMap.set(sec, {
        total: 0,
        criticos: 0,
        altos: 0,
        medios: 0,
        bajos: 0,
        conIncendio: 0,
        conInundacion: 0,
        conRemocion: 0,
        conAislamiento: 0,
        conHidrico: 0,
      });
    }
    const stats = sectorMap.get(sec)!;
    stats.total += 1;
    if (p.riskLevel === 'critico') stats.criticos += 1;
    if (p.riskLevel === 'alto') stats.altos += 1;
    if (p.riskLevel === 'medio') stats.medios += 1;
    if (p.riskLevel === 'bajo') stats.bajos += 1;

    const fire = p.hazardEvaluations?.incendio ?? (p.category === 'incendios' ? p.riskLevel : undefined);
    if (fire === 'critico' || fire === 'alto') stats.conIncendio += 1;

    const flood = p.hazardEvaluations?.inundacion ?? (p.category === 'inundaciones' ? p.riskLevel : undefined);
    if (flood === 'critico' || flood === 'alto') stats.conInundacion += 1;

    const land = p.hazardEvaluations?.remocion_masa ?? (p.category === 'remocion_masa' ? p.riskLevel : undefined);
    if (land === 'critico' || land === 'alto') stats.conRemocion += 1;

    const iso = p.hazardEvaluations?.corte_ruta ?? (p.category === 'rutas_evacuacion' ? p.riskLevel : undefined);
    if (iso === 'critico' || iso === 'alto') stats.conAislamiento += 1;

    const water = p.hazardEvaluations?.deficit_hidrico;
    if (water === 'critico' || water === 'alto') stats.conHidrico += 1;
  });

  const summaryRows = Array.from(sectorMap.entries()).map(([sector, st]) => ({
    'Sector': sector,
    'Total Puntos Evaluados': st.total,
    'Riesgo Global Crítico': st.criticos,
    'Riesgo Global Alto': st.altos,
    'Riesgo Global Medio': st.medios,
    'Riesgo Global Bajo': st.bajos,
    'Puntos Alerta Incendio (Alto/Crítico)': st.conIncendio,
    'Puntos Alerta Inundación (Alto/Crítico)': st.conInundacion,
    'Puntos Alerta Remoción Masa (Alto/Crítico)': st.conRemocion,
    'Puntos Alerta Aislamiento / Ruta (Alto/Crítico)': st.conAislamiento,
    'Puntos Alerta Déficit Hídrico (Alto/Crítico)': st.conHidrico,
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows.length > 0 ? summaryRows : [{
    'Sector': 'Todos los sectores',
    'Total Puntos Evaluados': 0,
    'Riesgo Global Crítico': 0,
    'Riesgo Global Alto': 0,
    'Riesgo Global Medio': 0,
    'Riesgo Global Bajo': 0,
    'Puntos Alerta Incendio (Alto/Crítico)': 0,
    'Puntos Alerta Inundación (Alto/Crítico)': 0,
    'Puntos Alerta Remoción Masa (Alto/Crítico)': 0,
    'Puntos Alerta Aislamiento / Ruta (Alto/Crítico)': 0,
    'Puntos Alerta Déficit Hídrico (Alto/Crítico)': 0,
  }]);

  wsSummary['!cols'] = [
    { wch: 25 }, // Sector
    { wch: 22 }, // Total
    { wch: 22 }, // Crítico
    { wch: 20 }, // Alto
    { wch: 20 }, // Medio
    { wch: 20 }, // Bajo
    { wch: 34 }, // Incendio
    { wch: 35 }, // Inundación
    { wch: 38 }, // Remoción
    { wch: 40 }, // Aislamiento
    { wch: 38 }, // Hídrico
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_Por_Sector');

  const today = new Date().toISOString().split('T')[0];
  const prefix = options?.filenamePrefix || 'SIG_Territorial_Base_Datos_Sectores';
  const filename = `${prefix}_${today}.xlsx`;

  XLSX.writeFile(wb, filename);
  return filename;
}

export interface ExportIncidentsOptions {
  filteredSectors?: string[];
  filteredTypes?: string[];
  filenamePrefix?: string;
}

export function exportIncidentsToExcel(
  incidents: ComunaIncident[],
  options?: ExportIncidentsOptions
) {
  let incidentsToExport = incidents;

  if (options?.filteredSectors && options.filteredSectors.length > 0) {
    incidentsToExport = incidentsToExport.filter(inc => 
      options.filteredSectors!.some(s => (inc.sector || '').toLowerCase() === s.toLowerCase())
    );
  }

  if (options?.filteredTypes && options.filteredTypes.length > 0) {
    incidentsToExport = incidentsToExport.filter(inc => 
      options.filteredTypes!.includes(inc.incidentType)
    );
  }

  // Sort by date descending (most recent first)
  const sorted = [...incidentsToExport].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // 1. Sheet: Historial de Acontecimientos
  const rows = sorted.map((inc, idx) => ({
    'N°': idx + 1,
    'Fecha Suceso': inc.date || '',
    'Hora': inc.time || '',
    'Tipo de Emergencia / Acontecimiento': formatIncidentType(inc.incidentType),
    'Sector / Localidad': inc.sector || 'Sin sector',
    'Título / Resumen Suceso': inc.title || '',
    'Latitud': typeof inc.coordinates?.lat === 'number' ? Number(inc.coordinates.lat.toFixed(6)) : inc.coordinates?.lat || '',
    'Longitud': typeof inc.coordinates?.lng === 'number' ? Number(inc.coordinates.lng.toFixed(6)) : inc.coordinates?.lng || '',
    'Elevación (msnm)': inc.elevation ? `${inc.elevation} m` : '—',
    'Nivel de Severidad': formatIncidentSeverity(inc.severity),
    'Estado Operativo': formatIncidentStatus(inc.status),
    'Afectación / Hectáreas / Daño': inc.affectedArea || '—',
    'Personas Afectadas / Evacuadas': inc.affectedPeople ?? '0',
    'Recursos y Cuadrillas Despachadas': inc.resourcesDispatched || '—',
    'Descripción Detallada del Suceso': inc.description || '',
    'Informado / Reportado Por': inc.reportedBy || 'Central de Emergencias',
    'Teléfono Contacto': inc.contactPhone || '',
    'Fecha Registro en Sistema': inc.createdAt ? new Date(inc.createdAt).toLocaleString('es-CL') : ''
  }));

  const wb = XLSX.utils.book_new();

  const wsIncidents = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{
    'N°': 1,
    'Fecha Suceso': '—',
    'Hora': '—',
    'Tipo de Emergencia / Acontecimiento': 'Sin acontecimientos registrados',
    'Sector / Localidad': '—',
    'Título / Resumen Suceso': 'No hay incidentes para los filtros seleccionados',
    'Latitud': '',
    'Longitud': '',
    'Elevación (msnm)': '',
    'Nivel de Severidad': '',
    'Estado Operativo': '',
    'Afectación / Hectáreas / Daño': '',
    'Personas Afectadas / Evacuadas': '',
    'Recursos y Cuadrillas Despachadas': '',
    'Descripción Detallada del Suceso': '',
    'Informado / Reportado Por': '',
    'Teléfono Contacto': '',
    'Fecha Registro en Sistema': ''
  }]);

  wsIncidents['!cols'] = [
    { wch: 6 },  // N°
    { wch: 14 }, // Fecha
    { wch: 10 }, // Hora
    { wch: 34 }, // Tipo
    { wch: 22 }, // Sector
    { wch: 38 }, // Título
    { wch: 14 }, // Latitud
    { wch: 14 }, // Longitud
    { wch: 15 }, // Elevación
    { wch: 26 }, // Severidad
    { wch: 24 }, // Estado
    { wch: 28 }, // Afectación
    { wch: 18 }, // Afectados
    { wch: 40 }, // Recursos
    { wch: 55 }, // Descripción
    { wch: 26 }, // Reportado por
    { wch: 18 }, // Teléfono
    { wch: 24 }  // Fecha registro
  ];

  XLSX.utils.book_append_sheet(wb, wsIncidents, 'Historial_Acontecimientos');

  // 2. Sheet: Resumen y Estadísticas
  const typeStats = new Map<string, { total: number; activos: number; controlados: number; extinguidos: number }>();
  const sectorStats = new Map<string, number>();

  sorted.forEach(inc => {
    const typeLabel = formatIncidentType(inc.incidentType);
    if (!typeStats.has(typeLabel)) {
      typeStats.set(typeLabel, { total: 0, activos: 0, controlados: 0, extinguidos: 0 });
    }
    const t = typeStats.get(typeLabel)!;
    t.total += 1;
    if (inc.status === 'activo' || inc.status === 'en_combate') t.activos += 1;
    if (inc.status === 'controlado') t.controlados += 1;
    if (inc.status === 'extinguido' || inc.status === 'resuelto') t.extinguidos += 1;

    const sec = inc.sector || 'Sin sector';
    sectorStats.set(sec, (sectorStats.get(sec) || 0) + 1);
  });

  const typeRows = Array.from(typeStats.entries()).map(([tipo, st]) => ({
    'Categoría de Emergencia': tipo,
    'Total Acontecimientos': st.total,
    'Activos / En Combate': st.activos,
    'Controlados': st.controlados,
    'Extinguidos / Resueltos': st.extinguidos
  }));

  const sectorSummaryRows = Array.from(sectorStats.entries()).map(([sector, count]) => ({
    'Sector': sector,
    'Total Incidentes Registrados': count
  }));

  const wsStats = XLSX.utils.json_to_sheet(typeRows.length > 0 ? typeRows : [{
    'Categoría de Emergencia': 'Todos los tipos',
    'Total Acontecimientos': 0,
    'Activos / En Combate': 0,
    'Controlados': 0,
    'Extinguidos / Resueltos': 0
  }]);

  wsStats['!cols'] = [
    { wch: 35 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 24 }
  ];

  XLSX.utils.book_append_sheet(wb, wsStats, 'Estadisticas_Emergencias');

  const wsSectorStats = XLSX.utils.json_to_sheet(sectorSummaryRows.length > 0 ? sectorSummaryRows : [{
    'Sector': 'Todos los sectores',
    'Total Incidentes Registrados': 0
  }]);

  wsSectorStats['!cols'] = [
    { wch: 28 },
    { wch: 28 }
  ];

  XLSX.utils.book_append_sheet(wb, wsSectorStats, 'Resumen_Por_Sector');

  const today = new Date().toISOString().split('T')[0];
  const prefix = options?.filenamePrefix || 'Historial_Acontecimientos_Comuna';
  const filename = `${prefix}_${today}.xlsx`;

  XLSX.writeFile(wb, filename);
  return filename;
}
