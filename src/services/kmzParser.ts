import JSZip from 'jszip';
import { kml } from '@tmcw/togeojson';
import { GeoJsonCollection, GeoJsonFeature, ThreatCategory, ThreatLevel, KmzLayer } from '../types';
import { sanitizeForFirestore } from './layerStorage';

/**
 * Converts KML aabbggrr color string to CSS Hex #rrggbb and opacity
 */
export function parseKmlColor(kmlColorStr?: string): { hex: string; opacity: number } | null {
  if (!kmlColorStr || typeof kmlColorStr !== 'string') return null;
  const clean = kmlColorStr.trim().toLowerCase().replace(/^#/, '');
  if (clean.length === 8) {
    const a = parseInt(clean.substring(0, 2), 16) / 255;
    const b = clean.substring(2, 4);
    const g = clean.substring(4, 6);
    const r = clean.substring(6, 8);
    return {
      hex: `#${r}${g}${b}`,
      opacity: Number(Math.max(0.1, Math.min(1, isNaN(a) ? 1 : a)).toFixed(2)),
    };
  }
  if (clean.length === 6) {
    return { hex: `#${clean}`, opacity: 1 };
  }
  return null;
}

/**
 * Extracts and parses a KMZ or KML file into a GeoJsonCollection with metadata
 */
export async function parseKmzOrKmlFile(file: File, userUid: string, userName: string): Promise<KmzLayer> {
  const fileName = file.name.toLowerCase();
  let kmlTexts: string[] = [];

  // Check if KMZ (zip archive)
  if (fileName.endsWith('.kmz') || file.type.includes('zip') || file.type.includes('google-earth.kmz') || file.type.includes('octet-stream')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Look for all KML files inside KMZ (e.g. doc.kml or custom named kml)
      const kmlEntries: JSZip.JSZipObject[] = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.kml')) {
          kmlEntries.push(zipEntry);
        }
      });

      if (kmlEntries.length === 0) {
        // Fallback search for any text entry
        zip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir && (relativePath.toLowerCase().endsWith('.xml') || relativePath.toLowerCase().endsWith('.txt'))) {
            kmlEntries.push(zipEntry);
          }
        });
      }

      if (kmlEntries.length === 0) {
        throw new Error('No se encontró ningún archivo .kml o de datos dentro del archivo .kmz');
      }

      // Read all KML files found in the archive
      for (const entry of kmlEntries) {
        const text = await entry.async('text');
        if (text && text.trim().length > 0) {
          kmlTexts.push(text);
        }
      }
    } catch (zipErr: any) {
      console.warn('JSZip extraction attempt failed, attempting raw text:', zipErr);
      const text = await file.text();
      if (text.includes('<kml') || text.includes('<Document') || text.includes('<Placemark')) {
        kmlTexts.push(text);
      } else {
        throw new Error(zipErr.message || 'Error al descomprimir archivo KMZ');
      }
    }
  } else if (fileName.endsWith('.kml') || file.type.includes('xml') || fileName.endsWith('.xml')) {
    const text = await file.text();
    kmlTexts.push(text);
  } else if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
    const jsonText = await file.text();
    const parsedJson = JSON.parse(jsonText);
    return processGeoJsonData(parsedJson, file.name, userUid, userName, file.size);
  } else {
    // Attempt parsing as zip first, fallback to text
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      zip.forEach(async (path, entry) => {
        if (path.toLowerCase().endsWith('.kml')) {
          const t = await entry.async('text');
          kmlTexts.push(t);
        }
      });
    } catch {
      const text = await file.text();
      kmlTexts.push(text);
    }
  }

  if (kmlTexts.length === 0) {
    throw new Error('No se pudo extraer contenido geográfico válido del archivo seleccionado.');
  }

  // Parse each KML XML and merge GeoJSON features
  const parser = new DOMParser();
  const allFeatures: GeoJsonFeature[] = [];

  for (const kmlText of kmlTexts) {
    // Sanitize XML string if needed
    const cleanedText = kmlText.replace(/&(?!(?:amp|lt|gt|quot|apos);)/g, '&amp;');
    const xmlDoc = parser.parseFromString(cleanedText, 'text/xml');
    
    // Check for XML parsing errors
    const parseError = xmlDoc.getElementsByTagName('parsererror');
    if (parseError.length > 0 && kmlTexts.length === 1) {
      console.warn('XML parse warning:', parseError[0].textContent);
    }

    // Convert to GeoJSON using togeojson
    try {
      const geojsonRaw = kml(xmlDoc) as unknown as GeoJsonCollection;
      if (geojsonRaw && Array.isArray(geojsonRaw.features)) {
        allFeatures.push(...geojsonRaw.features);
      }
    } catch (kmlErr) {
      console.warn('togeojson conversion warning:', kmlErr);
    }
  }

  if (allFeatures.length === 0) {
    // If no placemark was converted, create a default point if coordinates are found
    console.warn('No standard placemarks found, creating single container feature');
  }

  const combinedCollection: GeoJsonCollection = {
    type: 'FeatureCollection',
    features: allFeatures,
  };

  // Enhance features with parsed attributes, styles and categories
  return processGeoJsonData(combinedCollection, file.name, userUid, userName, file.size);
}

/**
 * Normalizes GeoJSON data and detects threats, categories, bounding boxes
 */
export function processGeoJsonData(
  geojsonRaw: GeoJsonCollection, 
  filename: string, 
  userUid: string, 
  userName: string,
  fileSize?: number
): KmzLayer {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  let validCoordsCount = 0;

  const cleanName = filename.replace(/\.(kmz|kml|geojson|json)$/i, '').replace(/_/g, ' ').trim();
  const detectedCategory = detectCategoryFromText(cleanName + ' ' + (geojsonRaw.features?.[0]?.properties?.name || ''));
  const detectedThreatLevel = detectThreatLevelFromText(cleanName);
  const detectedSector = detectSectorNameFromText(cleanName + ' ' + (geojsonRaw.features?.[0]?.properties?.name || ''));
  const defaultColor = getDefaultCategoryColor(detectedCategory);

  const features: GeoJsonFeature[] = (geojsonRaw.features || []).map((feat, index) => {
    const props = feat.properties || {};
    const featName = (props.name || `Elemento ${index + 1}`).toString().trim();
    const featDesc = typeof props.description === 'string' 
      ? props.description.replace(/<[^>]*>?/gm, '').trim() // Strip html tags for cleaner view
      : '';
    
    // Extract coordinate bounds
    extractCoordinates(feat.geometry?.coordinates, (lat, lng) => {
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        validCoordsCount++;
      }
    });

    const featCat = detectCategoryFromText(featName + ' ' + featDesc) || detectedCategory;
    const featLevel = detectThreatLevelFromText(featName + ' ' + featDesc) || detectedThreatLevel;

    // Detect KML specific style attributes
    let styleColor = props.stroke || defaultColor;
    let styleFill = props.fill || styleColor;
    let styleOpacity = 0.85;
    let styleFillOpacity = 0.35;

    if (props['stroke-opacity'] !== undefined && !isNaN(Number(props['stroke-opacity']))) {
      styleOpacity = Number(props['stroke-opacity']);
    }
    if (props['fill-opacity'] !== undefined && !isNaN(Number(props['fill-opacity']))) {
      styleFillOpacity = Number(props['fill-opacity']);
    }

    const cleanGeometry = cleanAndOptimizeGeometry(feat.geometry);

    return {
      type: 'Feature',
      geometry: cleanGeometry || { type: 'GeometryCollection', geometries: [] },
      properties: {
        name: featName,
        description: featDesc || 'Sin descripción',
        category: featCat,
        threatLevel: featLevel,
        threatType: getCategoryLabel(featCat),
        style: {
          color: styleColor,
          weight: props['stroke-width'] ? Number(props['stroke-width']) : 3,
          opacity: styleOpacity,
          fillColor: styleFill,
          fillOpacity: styleFillOpacity,
        }
      }
    };
  });

  const bounds: [number, number, number, number] | undefined = validCoordsCount > 0 
    ? [minLat, minLng, maxLat, maxLng]
    : undefined;

  const rawLayer: KmzLayer = {
    id: `layer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: cleanName || 'Capa Territorial',
    filename: filename,
    category: detectedCategory,
    sector: detectedSector,
    threatType: getCategoryLabel(detectedCategory),
    threatLevel: detectedThreatLevel,
    color: defaultColor,
    opacity: 0.85,
    isVisible: true,
    geojson: {
      type: 'FeatureCollection',
      features: features,
    },
    featureCount: features.length,
    bounds: bounds,
    description: `Capa cargada: ${filename} (${features.length} elementos georreferenciados)`,
    uploadedBy: userUid,
    uploadedByName: userName || 'Usuario Comunal',
    createdAt: Date.now(),
    fileSize: fileSize || 0,
  };

  // Ensure no undefined values exist in the object
  return sanitizeForFirestore(rawLayer);
}

/**
 * Traverse GeoJSON coordinates recursively and optimize floating point decimals
 */
function roundCoordinates(coords: any): any {
  if (!coords) return coords;
  if (Array.isArray(coords) && typeof coords[0] === 'number') {
    return coords.map((c, i) => (i < 2 ? Number(Number(c).toFixed(6)) : (typeof c === 'number' ? Math.round(c) : c)));
  }
  if (Array.isArray(coords)) {
    return coords.map(sub => roundCoordinates(sub));
  }
  return coords;
}

export function cleanAndOptimizeGeometry(geom: any): any {
  if (!geom) return { type: 'GeometryCollection', geometries: [] };
  if (geom.type === 'GeometryCollection' && Array.isArray(geom.geometries)) {
    return {
      type: 'GeometryCollection',
      geometries: geom.geometries.map((g: any) => cleanAndOptimizeGeometry(g)),
    };
  }
  return {
    ...geom,
    coordinates: roundCoordinates(geom.coordinates),
  };
}

/**
 * Traverse GeoJSON coordinates recursively
 */
function extractCoordinates(coords: any, callback: (lat: number, lng: number) => void) {
  if (!coords) return;
  if (Array.isArray(coords) && typeof coords[0] === 'number') {
    // GeoJSON coordinate order is [longitude, latitude, elevation?]
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    callback(lat, lng);
  } else if (Array.isArray(coords)) {
    coords.forEach(sub => extractCoordinates(sub, callback));
  }
}

/**
 * Extract human sector name from filename or title (e.g. "Sector Burca", "Guarilihue", "Ranguelmo", etc.)
 */
export function detectSectorNameFromText(text: string): string | undefined {
  const t = text.trim();
  const knownSectors = [
    'Burca',
    'Guarilihue',
    'Ranguelmo',
    'Vegas de Itata',
    'Magdalena',
    'Perales',
    'Peleco',
    'Carrizal',
    'Rincón',
    'Meipo',
    'Pangue',
    'Totoral',
    'Pichimávida',
    'Trobalhué',
    'Urbano Coelemu',
    'Villa Los Jardines',
    'Casas Viejas',
    'San Bartolo',
    'Lomas de Ranguelmo'
  ];

  for (const sector of knownSectors) {
    if (new RegExp(`\\b${sector}\\b`, 'i').test(t)) {
      return sector;
    }
  }

  // Regex pattern matching "Sector <Name>" or "Sectores <Name>"
  const match = t.match(/(?:sector|sectores|localidad|caser[ií]o|poblaci[oó]n|zona|fundo)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s-]{3,25})/i);
  if (match && match[1]) {
    const rawSector = match[1].trim();
    // Clean up trailing words
    const cleanSector = rawSector.split(/[\.,\(\)_-]/)[0].trim();
    if (cleanSector.length >= 3) {
      return cleanSector.charAt(0).toUpperCase() + cleanSector.slice(1);
    }
  }

  return undefined;
}

/**
 * Smart threat category detector based on Chilean / Spanish emergency keywords
 */
export function detectCategoryFromText(text: string): ThreatCategory {
  const t = text.toLowerCase();
  if (t.match(/sector|burca|guarilihue|ranguelmo|vegas de itata|magdalena|vivienda|familia|casa|vecin|predio|parcela|habitante|poblador/)) {
    return 'sectores';
  }
  if (t.match(/incendio|fuego|quema|combustible|forestal|brigada|conaf|ignicion|humo/)) {
    return 'incendios';
  }
  if (t.match(/inunda|crecida|rio|itata|estero|cauce|desborde|fluvial|anegam|tsunami|laguna|costero/)) {
    return 'inundaciones';
  }
  if (t.match(/remocion|masa|desliz|ladera|derrumbe|socavon|grieta|falla|geotec|quebrada/)) {
    return 'remocion_masa';
  }
  if (t.match(/evacua|ruta|camino|via|escape|corredor|salida|desvio|paso|puente/)) {
    return 'rutas_evacuacion';
  }
  if (t.match(/albergue|refugio|escuela|colegio|liceo|gimnasio|estadio|sede|centro comunitario|coe|seguro/)) {
    return 'albergues';
  }
  if (t.match(/hospital|cesfam|posta|antena|copa|apr|agua potable|subestacion|eléctric|grifo|combustible|bencina/)) {
    return 'infraestructura_critica';
  }
  if (t.match(/poblacion|vulnerable|campamento|adulto|jardin|residencia|eleam|sala cuna|discapacidad/)) {
    return 'poblacion_vulnerable';
  }
  if (t.match(/bomberos|carabineros|ambulancia|samu|senapred|onemi|pdi|bodega|helipunto|cuartel/)) {
    return 'recursos_emergencia';
  }
  return 'general';
}

/**
 * Detect threat severity level
 */
export function detectThreatLevelFromText(text: string): ThreatLevel {
  const t = text.toLowerCase();
  if (t.match(/critico|muy alto|urgente|peligro inminente|rojo|alarma|emergencia/)) return 'critico';
  if (t.match(/alto|severo|riesgo alto|naranjo|alerta/)) return 'alto';
  if (t.match(/medio|moderado|amarillo|precaucion|atencion/)) return 'medio';
  if (t.match(/bajo|leve|verde|monitoreo|preventivo/)) return 'bajo';
  return 'informativo';
}

export function getCategoryLabel(category: ThreatCategory): string {
  switch (category) {
    case 'sectores': return 'Sectores y Viviendas / Familias';
    case 'incendios': return 'Incendios Forestales';
    case 'inundaciones': return 'Inundación y Crecidas Fluviales';
    case 'remocion_masa': return 'Remoción en Masa / Deslizamiento';
    case 'rutas_evacuacion': return 'Rutas de Evacuación / Corte de Ruta';
    case 'deficit_hidrico': return 'Déficit Hídrico y Abastecimiento';
    case 'pmr': return 'Personas con Movilidad Reducida (PMR)';
    case 'albergues': return 'Albergues y Puntos de Encuentro';
    case 'infraestructura_critica': return 'Infraestructura Crítica';
    case 'poblacion_vulnerable': return 'Población Vulnerable';
    case 'recursos_emergencia': return 'Recursos de Emergencia y Rescate';
    default: return 'Capa Territorial General';
  }
}

export function getDefaultCategoryColor(category: ThreatCategory): string {
  switch (category) {
    case 'sectores': return '#6366F1'; // Indigo / Violet for Sectors & Families
    case 'incendios': return '#EF4444'; // Red
    case 'inundaciones': return '#2563EB'; // Blue
    case 'remocion_masa': return '#D97706'; // Amber / Orange
    case 'rutas_evacuacion': return '#059669'; // Emerald Green
    case 'deficit_hidrico': return '#0284C7'; // Sky Blue
    case 'pmr': return '#9333EA'; // Purple for PMR
    case 'albergues': return '#7C3AED'; // Purple
    case 'infraestructura_critica': return '#0D9488'; // Teal
    case 'poblacion_vulnerable': return '#DB2777'; // Pink
    case 'recursos_emergencia': return '#DC2626'; // Bright Red
    default: return '#15803D'; // Municipal Green
  }
}

export function getThreatLevelBadge(level?: ThreatLevel): { label: string; bg: string; text: string; border: string } {
  switch (level) {
    case 'critico':
      return { label: 'Crítico', bg: 'bg-red-50 text-red-700 border-red-200', text: 'text-red-700', border: 'border-red-500' };
    case 'alto':
      return { label: 'Alto', bg: 'bg-orange-50 text-orange-700 border-orange-200', text: 'text-orange-700', border: 'border-orange-500' };
    case 'medio':
      return { label: 'Medio', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', border: 'border-amber-500' };
    case 'bajo':
      return { label: 'Bajo', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', border: 'border-emerald-500' };
    case 'no_aplica':
      return { label: 'No Aplica', bg: 'bg-slate-100 text-slate-500 border-slate-200', text: 'text-slate-500', border: 'border-slate-300' };
    default:
      return { label: 'Informativo', bg: 'bg-slate-50 text-slate-700 border-slate-200', text: 'text-slate-700', border: 'border-slate-400' };
  }
}

