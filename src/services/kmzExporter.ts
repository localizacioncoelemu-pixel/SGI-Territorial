import JSZip from 'jszip';
import { KmzLayer, RiskPoint, GeoJsonFeature } from '../types';

/**
 * Escapes characters for XML/KML content
 */
function escapeXml(unsafe?: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts Hex color and opacity to KML aabbggrr format
 */
function hexToKmlColor(hex: string, opacity = 1): string {
  const clean = hex.replace('#', '').trim().toLowerCase();
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  let r = 'ff';
  let g = '00';
  let b = '00';

  if (clean.length === 6) {
    r = clean.substring(0, 2);
    g = clean.substring(2, 4);
    b = clean.substring(4, 6);
  } else if (clean.length === 3) {
    r = clean[0] + clean[0];
    g = clean[1] + clean[1];
    b = clean[2] + clean[2];
  }
  // KML order: Alpha, Blue, Green, Red
  return `${a}${b}${g}${r}`;
}

/**
 * Formats GeoJSON coordinate tuples into KML coordinate string
 */
function formatKmlCoordinates(coords: any): string {
  if (!Array.isArray(coords)) return '';
  
  // Single point: [lng, lat] or [lng, lat, alt]
  if (typeof coords[0] === 'number') {
    const lng = Number(coords[0]) || 0;
    const lat = Number(coords[1]) || 0;
    const alt = Number(coords[2]) || 0;
    return `${lng},${lat},${alt}`;
  }

  // Array of points: [[lng, lat], ...]
  return coords
    .map((pt: any) => {
      if (Array.isArray(pt) && typeof pt[0] === 'number') {
        const lng = Number(pt[0]) || 0;
        const lat = Number(pt[1]) || 0;
        const alt = Number(pt[2]) || 0;
        return `${lng},${lat},${alt}`;
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * Converts a GeoJSON Feature into a KML Placemark XML string
 */
function featureToKmlPlacemark(feature: GeoJsonFeature, layerColor: string, layerOpacity: number): string {
  const props = feature.properties || {};
  const geom = feature.geometry;
  if (!geom || !geom.type) return '';

  const name = props.name || props.title || 'Elemento Territorial';
  const desc = props.description || props.desc || '';
  const styleColor = props.style?.color || layerColor || '#059669';
  const styleFill = props.style?.fillColor || styleColor;
  const kmlLineColor = hexToKmlColor(styleColor, 1);
  const kmlPolyColor = hexToKmlColor(styleFill, layerOpacity || 0.4);

  let geomXml = '';

  switch (geom.type) {
    case 'Point': {
      geomXml = `
        <Point>
          <coordinates>${formatKmlCoordinates(geom.coordinates)}</coordinates>
        </Point>
      `;
      break;
    }

    case 'MultiPoint': {
      geomXml = `
        <MultiGeometry>
          ${(geom.coordinates || []).map((pt: any) => `
            <Point>
              <coordinates>${formatKmlCoordinates(pt)}</coordinates>
            </Point>
          `).join('')}
        </MultiGeometry>
      `;
      break;
    }

    case 'LineString': {
      geomXml = `
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>${formatKmlCoordinates(geom.coordinates)}</coordinates>
        </LineString>
      `;
      break;
    }

    case 'MultiLineString': {
      geomXml = `
        <MultiGeometry>
          ${(geom.coordinates || []).map((line: any) => `
            <LineString>
              <tessellate>1</tessellate>
              <coordinates>${formatKmlCoordinates(line)}</coordinates>
            </LineString>
          `).join('')}
        </MultiGeometry>
      `;
      break;
    }

    case 'Polygon': {
      const outerRing = geom.coordinates?.[0];
      const innerRings = geom.coordinates?.slice(1) || [];
      if (!outerRing) return '';

      geomXml = `
        <Polygon>
          <extrude>0</extrude>
          <altitudeMode>clampToGround</altitudeMode>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${formatKmlCoordinates(outerRing)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
          ${innerRings.map((ring: any) => `
            <innerBoundaryIs>
              <LinearRing>
                <coordinates>${formatKmlCoordinates(ring)}</coordinates>
              </LinearRing>
            </innerBoundaryIs>
          `).join('')}
        </Polygon>
      `;
      break;
    }

    case 'MultiPolygon': {
      geomXml = `
        <MultiGeometry>
          ${(geom.coordinates || []).map((poly: any) => {
            const outer = poly?.[0];
            const inners = poly?.slice(1) || [];
            if (!outer) return '';
            return `
              <Polygon>
                <altitudeMode>clampToGround</altitudeMode>
                <outerBoundaryIs>
                  <LinearRing>
                    <coordinates>${formatKmlCoordinates(outer)}</coordinates>
                  </LinearRing>
                </outerBoundaryIs>
                ${inners.map((inner: any) => `
                  <innerBoundaryIs>
                    <LinearRing>
                      <coordinates>${formatKmlCoordinates(inner)}</coordinates>
                    </LinearRing>
                  </innerBoundaryIs>
                `).join('')}
              </Polygon>
            `;
          }).join('')}
        </MultiGeometry>
      `;
      break;
    }

    default:
      return '';
  }

  return `
    <Placemark>
      <name>${escapeXml(name)}</name>
      ${desc ? `<description><![CDATA[${desc}]]></description>` : ''}
      <Style>
        <LineStyle>
          <color>${kmlLineColor}</color>
          <width>2.5</width>
        </LineStyle>
        <PolyStyle>
          <color>${kmlPolyColor}</color>
          <fill>1</fill>
          <outline>1</outline>
        </PolyStyle>
      </Style>
      ${geomXml}
    </Placemark>
  `;
}

/**
 * Converts an assessed RiskPoint into a rich Google Earth KML Placemark
 */
function riskPointToKmlPlacemark(point: RiskPoint): string {
  const lat = point.coordinates.lat;
  const lng = point.coordinates.lng;
  const alt = point.elevation || 0;

  const styleId = `style-threat-${point.riskLevel || 'medio'}`;

  // Multi-hazard breakdown text
  const hazards = point.hazardEvaluations || {};
  const hazardRows = Object.entries(hazards)
    .filter(([_, level]) => level && level !== 'no_aplica')
    .map(([key, level]) => {
      const labels: Record<string, string> = {
        incendio: 'Incendio Forestal',
        inundacion: 'Inundación / Anegamiento',
        remocion_masa: 'Remoción en Masa',
        corte_ruta: 'Aislamiento / Corte de Ruta',
        deficit_hidrico: 'Déficit Hídrico',
      };
      return `<li><strong>${labels[key] || key}:</strong> ${String(level).toUpperCase()}</li>`;
    })
    .join('');

  const htmlDescription = `
    <div style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #1e293b; max-width: 360px;">
      <h3 style="margin: 0 0 6px 0; color: #065f46; font-size: 16px; border-bottom: 2px solid #10b981; padding-bottom: 4px;">
        ${escapeXml(point.title)}
      </h3>
      <p style="margin: 4px 0;"><strong>Sector:</strong> ${escapeXml(point.sector)} • <strong>Comuna:</strong> Coelemu</p>
      <p style="margin: 4px 0;"><strong>Nivel de Riesgo Global:</strong> <span style="font-weight: bold; color: ${
        point.riskLevel === 'critico' ? '#dc2626' : point.riskLevel === 'alto' ? '#ea580c' : point.riskLevel === 'medio' ? '#d97706' : '#16a34a'
      };">${String(point.riskLevel).toUpperCase()}</span></p>
      <p style="margin: 4px 0;"><strong>Estado Operativo:</strong> ${escapeXml(point.status)}</p>
      
      ${point.description ? `<p style="margin: 6px 0; padding: 6px; background: #f1f5f9; border-left: 3px solid #64748b; font-size: 12px;">${escapeXml(point.description)}</p>` : ''}
      
      ${hazardRows ? `<div style="margin: 6px 0;"><strong>Evaluación Multirriesgo:</strong><ul style="margin: 4px 0 0 16px; padding: 0;">${hazardRows}</ul></div>` : ''}

      ${point.hasPmr ? `
        <div style="margin: 6px 0; padding: 6px; background: #fee2e2; border-radius: 4px; border: 1px solid #f87171; color: #991b1b;">
          <strong>⚠️ Persona con Movilidad Reducida (PMR):</strong> SÍ (${point.pmrCount || 1} persona${(point.pmrCount || 1) > 1 ? 's' : ''})
          ${point.pmrDetails ? `<br/><span style="font-size: 11px;">${escapeXml(point.pmrDetails)}</span>` : ''}
        </div>
      ` : ''}

      ${point.householdHead ? `<p style="margin: 4px 0;"><strong>Jefe/a de Hogar:</strong> ${escapeXml(point.householdHead)} (${point.residentsCount || 1} hab.)</p>` : ''}
      ${point.contactPhone ? `<p style="margin: 4px 0;"><strong>Teléfono:</strong> ${escapeXml(point.contactPhone)}</p>` : ''}
      ${point.actionsRequired ? `<p style="margin: 4px 0;"><strong>Acciones Requeridas:</strong> ${escapeXml(point.actionsRequired)}</p>` : ''}
      ${point.responsibleEntity ? `<p style="margin: 4px 0;"><strong>Entidad Responsable:</strong> ${escapeXml(point.responsibleEntity)}</p>` : ''}
      
      <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 8px 0;" />
      <div style="font-size: 11px; color: #64748b;">
        <span>Registrado por: ${escapeXml(point.createdByName || 'Técnico')}</span><br/>
        <span>Fecha: ${new Date(point.createdAt).toLocaleDateString('es-CL')}</span>
        ${point.sourceLayerName ? `<br/><span>Capa vinculada: ${escapeXml(point.sourceLayerName)}</span>` : ''}
      </div>
    </div>
  `;

  return `
    <Placemark id="point-${point.id}">
      <name>${escapeXml(point.title)}</name>
      <description><![CDATA[${htmlDescription}]]></description>
      <styleUrl>#${styleId}</styleUrl>
      <ExtendedData>
        <Data name="id"><value>${point.id}</value></Data>
        <Data name="sector"><value>${escapeXml(point.sector)}</value></Data>
        <Data name="riskLevel"><value>${point.riskLevel}</value></Data>
        <Data name="status"><value>${point.status}</value></Data>
        <Data name="threatType"><value>${escapeXml(point.threatType)}</value></Data>
        <Data name="hasPmr"><value>${point.hasPmr ? 'SI' : 'NO'}</value></Data>
        <Data name="pmrCount"><value>${point.pmrCount || 0}</value></Data>
        <Data name="householdHead"><value>${escapeXml(point.householdHead || '')}</value></Data>
        <Data name="residentsCount"><value>${point.residentsCount || 0}</value></Data>
        <Data name="responsibleEntity"><value>${escapeXml(point.responsibleEntity || '')}</value></Data>
        <Data name="evaluator"><value>${escapeXml(point.createdByName || '')}</value></Data>
      </ExtendedData>
      <Point>
        <coordinates>${lng},${lat},${alt}</coordinates>
      </Point>
    </Placemark>
  `;
}

/**
 * Standard KML Styles definition for Google Earth pins and layers
 */
function getKmlStylesDefinition(): string {
  return `
    <!-- Estilo Riesgo Crítico (Rojo) -->
    <Style id="style-threat-critico">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <color>ff0000ff</color>
        <scale>0.9</scale>
      </LabelStyle>
    </Style>

    <!-- Estilo Riesgo Alto (Naranja) -->
    <Style id="style-threat-alto">
      <IconStyle>
        <color>ff0066ff</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/orange-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <color>ff0066ff</color>
        <scale>0.9</scale>
      </LabelStyle>
    </Style>

    <!-- Estilo Riesgo Medio (Amarillo/Ámbar) -->
    <Style id="style-threat-medio">
      <IconStyle>
        <color>ff00c8ff</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <color>ff00c8ff</color>
        <scale>0.85</scale>
      </LabelStyle>
    </Style>

    <!-- Estilo Riesgo Bajo (Verde) -->
    <Style id="style-threat-bajo">
      <IconStyle>
        <color>ff00aa00</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <color>ff00aa00</color>
        <scale>0.85</scale>
      </LabelStyle>
    </Style>

    <!-- Estilo Informativo (Azul) -->
    <Style id="style-threat-informativo">
      <IconStyle>
        <color>ffff6600</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/blu-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <color>ffff6600</color>
        <scale>0.85</scale>
      </LabelStyle>
    </Style>

    <!-- Estilo No Aplica (Gris) -->
    <Style id="style-threat-no_aplica">
      <IconStyle>
        <color>ff888888</color>
        <scale>0.9</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/wht-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <color>ff888888</color>
        <scale>0.8</scale>
      </LabelStyle>
    </Style>
  `;
}

/**
 * Builds a complete KML document string for a single layer and its related points
 */
export function buildLayerKml(layer: KmzLayer, relatedPoints: RiskPoint[]): string {
  const featurePlacemarks = (layer.geojson?.features || [])
    .map(f => featureToKmlPlacemark(f, layer.color, layer.opacity))
    .join('\n');

  const pointPlacemarks = relatedPoints
    .map(p => riskPointToKmlPlacemark(p))
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(layer.name)} - Respaldo SIG Coelemu</name>
    <open>1</open>
    <description><![CDATA[Capa territorial: ${escapeXml(layer.name)} con respaldo de nuevos puntos georreferenciados. Generado por SIG Comunal Coelemu.]]></description>
    
    ${getKmlStylesDefinition()}

    <!-- Carpeta 1: Elementos Geográficos Originales de la Capa -->
    <Folder>
      <name>🗺️ Trazado y Elementos de la Capa (${(layer.geojson?.features || []).length})</name>
      <open>1</open>
      ${featurePlacemarks}
    </Folder>

    <!-- Carpeta 2: Nuevos Puntos Georreferenciados y Evaluaciones -->
    ${relatedPoints.length > 0 ? `
    <Folder>
      <name>📍 Nuevos Puntos de Riesgo Evaluados (${relatedPoints.length})</name>
      <open>1</open>
      ${pointPlacemarks}
    </Folder>
    ` : ''}

  </Document>
</kml>`;
}

/**
 * Builds a Master KML document backing up ALL layers and ALL points in the system
 */
export function buildMasterBackupKml(layers: KmzLayer[], riskPoints: RiskPoint[]): string {
  const dateStr = new Date().toLocaleDateString('es-CL');

  // Build folders for each layer
  const layersFolders = layers.map(layer => {
    const featurePlacemarks = (layer.geojson?.features || [])
      .map(f => featureToKmlPlacemark(f, layer.color, layer.opacity))
      .join('\n');

    return `
      <Folder>
        <name>🗺️ Capa: ${escapeXml(layer.name)} [Sector: ${escapeXml(layer.sector || 'General')}]</name>
        <open>0</open>
        ${featurePlacemarks}
      </Folder>
    `;
  }).join('\n');

  // Build folder for all risk points
  const pointsPlacemarks = riskPoints
    .map(p => riskPointToKmlPlacemark(p))
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Respaldo Maestro Territorial SIG Coelemu (${dateStr})</name>
    <open>1</open>
    <description><![CDATA[Copia de seguridad territorial completa de la Comuna de Coelemu. Incluye todas las capas de catastro, rutas de evacuación, quebradas y ${riskPoints.length} puntos críticos georreferenciados con evaluación de riesgos.]]></description>
    
    ${getKmlStylesDefinition()}

    <Folder>
      <name>📂 Capas Territoriales (${layers.length})</name>
      <open>1</open>
      ${layersFolders}
    </Folder>

    <Folder>
      <name>📍 Inventario de Puntos de Riesgo (${riskPoints.length})</name>
      <open>1</open>
      ${pointsPlacemarks}
    </Folder>

  </Document>
</kml>`;
}

/**
 * Packages KML text into a valid compressed KMZ (.kmz) Blob via JSZip
 */
export async function createKmzBlob(kmlContent: string): Promise<Blob> {
  const zip = new JSZip();
  // Standard Google Earth KMZ expects doc.kml in the root
  zip.file('doc.kml', kmlContent);
  
  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.google-earth.kmz',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}

/**
 * Browser download utility for blobs
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.href = url;
  downloadAnchor.download = filename;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  setTimeout(() => {
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);
  }, 300);
}

/**
 * Exports a single KMZ layer packaged with all its associated risk points as a .kmz file
 */
export async function exportLayerToKmzFile(
  layer: KmzLayer,
  allRiskPoints: RiskPoint[]
): Promise<{ pointCount: number; filename: string }> {
  // Find points linked to this layer either by sourceLayerId OR matching sector
  const relatedPoints = allRiskPoints.filter(p => {
    if (p.sourceLayerId && p.sourceLayerId === layer.id) return true;
    if (layer.sector && p.sector && p.sector.trim().toLowerCase() === layer.sector.trim().toLowerCase()) return true;
    return false;
  });

  const kml = buildLayerKml(layer, relatedPoints);
  const kmzBlob = await createKmzBlob(kml);
  
  const cleanName = layer.name.replace(/\.(kmz|kml|geojson|json)$/i, '').replace(/\s+/g, '_');
  const filename = `${cleanName}_con_puntos_respaldados.kmz`;
  
  downloadBlob(kmzBlob, filename);
  return { pointCount: relatedPoints.length, filename };
}

/**
 * Exports the complete master territorial database (all layers + all points) as a single .kmz file
 */
export async function exportMasterKmzBackup(
  layers: KmzLayer[],
  riskPoints: RiskPoint[]
): Promise<{ layerCount: number; pointCount: number; filename: string }> {
  const kml = buildMasterBackupKml(layers, riskPoints);
  const kmzBlob = await createKmzBlob(kml);
  
  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = `SIG_Coelemu_Respaldo_Total_${dateSuffix}.kmz`;
  
  downloadBlob(kmzBlob, filename);
  return { layerCount: layers.length, pointCount: riskPoints.length, filename };
}

/**
 * Exports risk points as a standalone KMZ file for Google Earth
 */
export async function exportPointsToKmzFile(
  riskPoints: RiskPoint[]
): Promise<{ pointCount: number; filename: string }> {
  const pointsPlacemarks = riskPoints
    .map(p => riskPointToKmlPlacemark(p))
    .join('\n');

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Puntos de Riesgo Evaluados - SIG Coelemu</name>
    <open>1</open>
    <description><![CDATA[Inventario de ${riskPoints.length} puntos críticos georreferenciados en Coelemu con evaluación técnica multirriesgo.]]></description>
    ${getKmlStylesDefinition()}
    <Folder>
      <name>📍 Puntos de Riesgo (${riskPoints.length})</name>
      <open>1</open>
      ${pointsPlacemarks}
    </Folder>
  </Document>
</kml>`;

  const kmzBlob = await createKmzBlob(kml);
  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = `Puntos_Riesgo_Coelemu_${dateSuffix}.kmz`;
  downloadBlob(kmzBlob, filename);
  return { pointCount: riskPoints.length, filename };
}

