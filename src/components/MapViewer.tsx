import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  MapPin, 
  Flame, 
  Droplets, 
  Mountain, 
  Building2, 
  ShieldCheck, 
  Route, 
  Plus, 
  Maximize2, 
  LocateFixed, 
  FileSpreadsheet,
  AlertOctagon,
  Phone,
  Layers3,
  Edit3,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_COMUNA_CENTER, DEFAULT_COMUNA_ZOOM } from '../services/initialData';
import { BasemapType, KmzLayer, RiskPoint, ThreatCategory, ThreatLevel } from '../types';
import { getCategoryLabel, getThreatLevelBadge } from '../services/kmzParser';

interface MapViewerProps {
  onMapClickAddPoint?: (coords: { lat: number; lng: number }, defaultTitle?: string, defaultSector?: string, layerId?: string, layerName?: string) => void;
  onSelectPointDetail?: (point: RiskPoint) => void;
  onOpenExcelExport?: () => void;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  onMapClickAddPoint,
  onSelectPointDetail,
  onOpenExcelExport,
}) => {
  const { 
    filteredLayers, 
    filteredRiskPoints, 
    selectedPoint, 
    setSelectedPoint, 
    mapFlyTo, 
    setMapFlyTo,
    filterState,
    deleteRiskPoint
  } = useData();
  const { user, isAdmin } = useAuth();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const basemapLayerRef = useRef<L.TileLayer | null>(null);
  const geojsonLayersRef = useRef<Map<string, L.GeoJSON>>(new Map());
  const riskMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  const [activeBasemap, setActiveBasemap] = useState<BasemapType>('osm');
  const [gpsTracking, setGpsTracking] = useState(false);

  // Global window functions for popup click handling
  useEffect(() => {
    (window as any).handleEvaluateKmzPoint = (name: string, sector: string, lat: number, lng: number, layerId?: string, layerName?: string) => {
      if (onMapClickAddPoint) {
        onMapClickAddPoint({ lat, lng }, name, sector, layerId, layerName);
      }
    };

    (window as any).handleEditExistingPoint = (pointId: string) => {
      const point = filteredRiskPoints.find(p => p.id === pointId);
      if (point && onSelectPointDetail) {
        onSelectPointDetail(point);
      }
    };

    (window as any).handleDeleteExistingPoint = async (pointId: string) => {
      if (!isAdmin) return;
      if (confirm('¿Estás seguro de eliminar este punto de riesgo de la base de datos?')) {
        await deleteRiskPoint(pointId);
      }
    };

    return () => {
      delete (window as any).handleEvaluateKmzPoint;
      delete (window as any).handleEditExistingPoint;
      delete (window as any).handleDeleteExistingPoint;
    };
  }, [onMapClickAddPoint, onSelectPointDetail, filteredRiskPoints, deleteRiskPoint, isAdmin]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_COMUNA_CENTER,
        zoom: DEFAULT_COMUNA_ZOOM,
        zoomControl: false,
        attributionControl: false,
      });

      // Custom Controls
      L.control.zoom({ position: 'topright' }).addTo(map);
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      // Initial Base layer
      const tile = getTileLayer('osm');
      tile.addTo(map);
      basemapLayerRef.current = tile;

      // Click handler on map
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (onMapClickAddPoint) {
          onMapClickAddPoint({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
        }
      });

      mapInstanceRef.current = map;
    } catch (err) {
      console.error('Leaflet initialization error:', err);
    }

    return () => {
      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      } catch (err) {
        console.warn('Map remove cleanup error:', err);
      }
    };
  }, []);

  // Update Basemap Tiles
  const switchBasemap = (type: BasemapType) => {
    if (!mapInstanceRef.current) return;
    setActiveBasemap(type);
    if (basemapLayerRef.current) {
      mapInstanceRef.current.removeLayer(basemapLayerRef.current);
    }
    const newTile = getTileLayer(type);
    newTile.addTo(mapInstanceRef.current);
    basemapLayerRef.current = newTile;
  };

  function getTileLayer(type: BasemapType): L.TileLayer {
    switch (type) {
      case 'satellite':
        return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: 'Esri, Maxar, Earthstar'
        });
      case 'topo':
        return L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          maxZoom: 17,
          attribution: 'OpenTopoMap'
        });
      case 'positron':
        return L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
          attribution: 'CartoDB'
        });
      case 'osm':
      default:
        return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: 'OpenStreetMap'
        });
    }
  }

  // Handle FlyTo requests
  useEffect(() => {
    if (mapFlyTo && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([mapFlyTo.lat, mapFlyTo.lng], mapFlyTo.zoom || 16, {
        animate: true,
        duration: 1.2
      });
      setMapFlyTo(null);
    }
  }, [mapFlyTo, setMapFlyTo]);

  // Helper: Checks if an individual feature or layer matches the selected sectors
  const doesKmzFeatureMatchSectors = (feature: any, kmzLayer: KmzLayer, selectedSectors: string[]): boolean => {
    if (!selectedSectors || selectedSectors.length === 0) return true;

    const normalizedSectors = selectedSectors.map(s => s.trim().toLowerCase()).filter(Boolean);
    if (normalizedSectors.length === 0) return true;

    const props = feature?.properties || {};

    const featSector = (props.sector || '').toString().trim().toLowerCase();
    const featName = (props.name || '').toString().trim().toLowerCase();
    const featDesc = (props.description || '').toString().trim().toLowerCase();

    // 1. Direct match on feature sector property
    if (featSector) {
      return normalizedSectors.some(s => featSector === s || featSector.includes(s) || (s.length >= 4 && s.includes(featSector)));
    }

    // 2. Direct match on feature name (only if length >= 3 to avoid matching single letters or generic numbers)
    if (featName && featName.length >= 3) {
      if (normalizedSectors.some(s => featName === s || featName.includes(s) || (s.length >= 4 && featName.includes(s)))) {
        return true;
      }
    }

    // 3. Match on feature description
    if (featDesc && normalizedSectors.some(s => featDesc.includes(s) || featDesc.includes(`sector ${s}`))) {
      return true;
    }

    // 4. Check layer-level attributes if feature doesn't have an explicit conflicting sector
    const layerSector = (kmzLayer.sector || '').toString().trim().toLowerCase();
    const layerName = (kmzLayer.name || '').toString().trim().toLowerCase();
    const layerFilename = (kmzLayer.filename || '').toString().trim().toLowerCase();

    const layerSectorMatches = normalizedSectors.some(s => 
      Boolean(layerSector && (layerSector === s || layerSector.includes(s) || (s.length >= 4 && s.includes(layerSector))))
    );

    if (layerSectorMatches) {
      return true;
    }

    // If layer name matches a sector keyword explicitly
    const layerNameMatches = normalizedSectors.some(s => 
      (layerName && (layerName === s || layerName.includes(s))) ||
      (layerFilename && (layerFilename === s || layerFilename.includes(s)))
    );

    if (layerNameMatches) {
      return true;
    }

    return false;
  };

  // Helper: Checks if an individual KMZ feature should be rendered on the map based on current filter state
  const isKmzFeatureVisible = (feature: any, kmzLayer: KmzLayer): boolean => {
    const props = feature?.properties || {};

    // A. Sector Filter (multi-selection)
    if (filterState.selectedSectors.length > 0) {
      if (!doesKmzFeatureMatchSectors(feature, kmzLayer, filterState.selectedSectors)) {
        return false;
      }
    }

    // B. Specific Category Filter (e.g. Incendios, Inundaciones, PMR)
    if (filterState.activeSpecificCategory) {
      const activeCat = filterState.activeSpecificCategory;
      if (activeCat === 'pmr') {
        const text = `${props.name || ''} ${props.description || ''}`.toLowerCase();
        if (!text.includes('pmr') && !text.includes('movilidad') && !text.includes('discapacidad') && !text.includes('reducida')) {
          return false;
        }
      } else if (activeCat !== 'sectores') {
        const featCat = props.category || kmzLayer.category;
        if (featCat !== activeCat) {
          return false;
        }
      }
    } else if (filterState.categories.length > 0) {
      const featCat = props.category || kmzLayer.category;
      if (!filterState.categories.includes(featCat) && !filterState.categories.includes('sectores')) {
        return false;
      }
    }

    // C. Threat Severity Level Filter
    if (filterState.threatLevels.length > 0) {
      const featLevel = props.threatLevel || kmzLayer.threatLevel;
      if (!filterState.threatLevels.includes(featLevel)) {
        return false;
      }
    }

    // D. Only Critical Filter
    if (filterState.onlyCritical) {
      const featLevel = props.threatLevel || kmzLayer.threatLevel;
      if (featLevel !== 'critico' && featLevel !== 'alto') {
        return false;
      }
    }

    // E. Search Keyword Filter
    if (filterState.searchKeyword.trim()) {
      const kw = filterState.searchKeyword.toLowerCase();
      const featName = (props.name || '').toLowerCase();
      const featDesc = (props.description || '').toLowerCase();
      const featSector = (props.sector || kmzLayer.sector || '').toLowerCase();
      const layerName = (kmzLayer.name || '').toLowerCase();
      if (!featName.includes(kw) && !featDesc.includes(kw) && !featSector.includes(kw) && !layerName.includes(kw)) {
        return false;
      }
    }

    return true;
  };

  // Render Vector KMZ Layers with per-feature filtering
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Fully purge existing Leaflet GeoJSON layers so no stale features/polygons remain
    geojsonLayersRef.current.forEach((layer) => {
      map.removeLayer(layer);
    });
    geojsonLayersRef.current.clear();

    // 2. Add only active, visible layers whose features pass the active filters
    filteredLayers.forEach((kmzLayer) => {
      if (!kmzLayer.isVisible) return;

      const layerSector = kmzLayer.sector || (kmzLayer.name.toLowerCase().includes('caravanchel') ? 'Caravanchel' : kmzLayer.name);

      const geoJsonLayer = L.geoJSON(kmzLayer.geojson as any, {
        filter: (feature) => isKmzFeatureVisible(feature, kmzLayer),
        style: (feature) => {
          const custom = feature?.properties?.style || {};
          return {
            color: custom.color || kmzLayer.color,
            weight: custom.weight || 3,
            opacity: custom.opacity || kmzLayer.opacity,
            fillColor: custom.fillColor || kmzLayer.color,
            fillOpacity: (custom.fillOpacity !== undefined ? custom.fillOpacity : 0.35) * kmzLayer.opacity,
          };
        },
        pointToLayer: (feature, latlng) => {
          const props = feature?.properties || {};
          const cat = props.category || kmzLayer.category;
          const level = props.threatLevel || kmzLayer.threatLevel;
          const customColor = props.style?.color || kmzLayer.color;
          const icon = createHazardPointIcon(cat, level, customColor);
          return L.marker(latlng, { icon });
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const title = props.name || kmzLayer.name;
          const desc = props.description || 'Sin descripción adicional';
          const cat = props.threatType || kmzLayer.threatType;
          const level = props.threatLevel || kmzLayer.threatLevel;
          const badge = getThreatLevelBadge(level);

          let lat = 0;
          let lng = 0;
          if (feature.geometry?.type === 'Point' && feature.geometry.coordinates) {
            lng = feature.geometry.coordinates[0];
            lat = feature.geometry.coordinates[1];
          } else if ((layer as any).getLatLng) {
            const p = (layer as any).getLatLng();
            lat = p.lat;
            lng = p.lng;
          } else if ((layer as any).getBounds) {
            const center = (layer as any).getBounds().getCenter();
            lat = center.lat;
            lng = center.lng;
          }

          const safeTitle = escapeHtml(title).replace(/'/g, "\\'");
          const safeSector = escapeHtml(props.sector || layerSector).replace(/'/g, "\\'");

          const popupContent = `
            <div class="p-3 max-w-[290px] text-xs font-sans">
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <span class="font-bold text-slate-900 text-sm leading-tight">${escapeHtml(title)}</span>
              </div>
              <div class="flex items-center gap-1 mb-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg} border">${badge.label}</span>
                <span class="text-[10px] text-slate-600 font-semibold">Sector: ${escapeHtml(props.sector || layerSector)}</span>
              </div>
              <p class="text-slate-600 text-xs mb-2 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">${escapeHtml(desc)}</p>
              
              <div class="pt-2 border-t border-slate-100 space-y-1.5">
                <div class="text-[10px] text-slate-500 flex justify-between">
                  <span>Capa: ${escapeHtml(kmzLayer.name)}</span>
                  <span>${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
                </div>
                
                <button 
                  onclick="window.handleEvaluateKmzPoint('${safeTitle}', '${safeSector}', ${lat}, ${lng}, '${escapeHtml(kmzLayer.id)}', '${escapeHtml(kmzLayer.name)}')"
                  class="w-full mt-1.5 py-1.5 px-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  📍 Agregar Punto a esta Capa KMZ
                </button>
              </div>
            </div>
          `;
          layer.bindPopup(popupContent, { maxWidth: 320 });
        }
      });

      // Only mount the GeoJSON layer if it has visible features for the active filters
      if (geoJsonLayer.getLayers().length > 0) {
        geoJsonLayer.addTo(map);
        geojsonLayersRef.current.set(kmzLayer.id, geoJsonLayer);
      }
    });
  }, [filteredLayers, filterState]);

  // Render Georeferenced Evaluated Risk Points
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Purge all previous markers so unselected or filtered points are immediately removed
    riskMarkersRef.current.forEach((marker) => {
      map.removeLayer(marker);
    });
    riskMarkersRef.current.clear();

    // Add freshly filtered markers
    filteredRiskPoints.forEach((point) => {
      const icon = createRiskPointIcon(point, filterState.activeSpecificCategory, filterState.filterPmrOnly);
      const marker = L.marker([point.coordinates.lat, point.coordinates.lng], { icon });
        
      marker.on('click', () => {
        setSelectedPoint(point);
      });

      marker.addTo(map);
      riskMarkersRef.current.set(point.id, marker);

      // Detailed Multi-Hazard Badges
      const globalBadge = getThreatLevelBadge(point.riskLevel);
      const fireBadge = getThreatLevelBadge(point.hazardEvaluations?.incendio || (point.category === 'incendios' ? point.riskLevel : 'no_aplica'));
      const floodBadge = getThreatLevelBadge(point.hazardEvaluations?.inundacion || (point.category === 'inundaciones' ? point.riskLevel : 'no_aplica'));
      const landBadge = getThreatLevelBadge(point.hazardEvaluations?.remocion_masa || (point.category === 'remocion_masa' ? point.riskLevel : 'no_aplica'));
      const isoBadge = getThreatLevelBadge(point.hazardEvaluations?.corte_ruta || (point.category === 'rutas_evacuacion' ? point.riskLevel : 'no_aplica'));
      const waterBadge = getThreatLevelBadge(point.hazardEvaluations?.deficit_hidrico || 'no_aplica');

      const activeCat = filterState.activeSpecificCategory;
      const isFireActive = activeCat === 'incendios';
      const isFloodActive = activeCat === 'inundaciones';
      const isLandActive = activeCat === 'remocion_masa';
      const isIsoActive = activeCat === 'rutas_evacuacion';
      const isWaterActive = activeCat === 'deficit_hidrico';
      const isPmrActive = activeCat === 'pmr' || filterState.filterPmrOnly;
      const hasPmr = Boolean(point.hasPmr || (point.pmrCount && point.pmrCount > 0));

      const popupHtml = `
        <div class="p-3 max-w-[320px] text-xs font-sans">
          <div class="flex items-start justify-between gap-2 mb-1.5">
            <h4 class="font-bold text-slate-900 text-sm leading-tight">${escapeHtml(point.title)}</h4>
            <div class="flex items-center gap-1 flex-shrink-0">
              ${hasPmr ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-700 text-white border border-purple-800 flex items-center gap-0.5 shadow-2xs">♿ PMR</span>` : ''}
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${globalBadge.bg} border">
                ${globalBadge.label}
              </span>
            </div>
          </div>
          
          <div class="flex items-center gap-1.5 text-[11px] text-slate-600 mb-2 font-semibold">
            <span>📍 Sector: ${escapeHtml(point.sector || 'Sin sector')}</span>
            ${point.householdHead ? `<span>• 👤 ${escapeHtml(point.householdHead)}</span>` : ''}
          </div>

          <!-- Multi-Hazard Rating Grid -->
          <div class="bg-slate-50 p-2 rounded-lg border border-slate-200 mb-2 space-y-1 text-[10px]">
            <div class="font-bold text-slate-700 border-b border-slate-200 pb-1 mb-1 flex items-center justify-between">
              <span>Evaluación de Riesgos:</span>
              ${activeCat ? `<span class="text-emerald-700 text-[9px] font-semibold">Filtro: ${activeCat === 'pmr' ? 'PMR (Movilidad Reducida)' : getCategoryLabel(activeCat)}</span>` : ''}
            </div>
            
            <div class="flex items-center justify-between p-1 rounded ${isFireActive ? 'bg-red-100 ring-1 ring-red-400 font-bold' : ''}">
              <span class="text-slate-700 flex items-center gap-1">🔥 Incendio Forestal:</span>
              <span class="px-1.5 py-0.2 rounded font-bold ${fireBadge.bg} border">${fireBadge.label}</span>
            </div>

            <div class="flex items-center justify-between p-1 rounded ${isFloodActive ? 'bg-blue-100 ring-1 ring-blue-400 font-bold' : ''}">
              <span class="text-slate-700 flex items-center gap-1">🌊 Inundación / Crecidas:</span>
              <span class="px-1.5 py-0.2 rounded font-bold ${floodBadge.bg} border">${floodBadge.label}</span>
            </div>

            <div class="flex items-center justify-between p-1 rounded ${isLandActive ? 'bg-amber-100 ring-1 ring-amber-400 font-bold' : ''}">
              <span class="text-slate-700 flex items-center gap-1">⛰️ Remoción en Masa:</span>
              <span class="px-1.5 py-0.2 rounded font-bold ${landBadge.bg} border">${landBadge.label}</span>
            </div>

            <div class="flex items-center justify-between p-1 rounded ${isIsoActive ? 'bg-emerald-100 ring-1 ring-emerald-400 font-bold' : ''}">
              <span class="text-slate-700 flex items-center gap-1">🚧 Corte Ruta / Aislamiento:</span>
              <span class="px-1.5 py-0.2 rounded font-bold ${isoBadge.bg} border">${isoBadge.label}</span>
            </div>

            <div class="flex items-center justify-between p-1 rounded ${isWaterActive ? 'bg-cyan-100 ring-1 ring-cyan-400 font-bold' : ''}">
              <span class="text-slate-700 flex items-center gap-1">💧 Déficit Hídrico:</span>
              <span class="px-1.5 py-0.2 rounded font-bold ${waterBadge.bg} border">${waterBadge.label}</span>
            </div>

            <!-- PMR Row inside Evaluation -->
            <div class="flex items-center justify-between p-1 rounded ${hasPmr ? 'bg-purple-100 ring-1 ring-purple-400 font-bold' : (isPmrActive ? 'bg-purple-50' : '')}">
              <span class="text-slate-700 flex items-center gap-1 font-semibold">♿ PMR (Movilidad Reducida):</span>
              ${hasPmr 
                ? `<span class="px-1.5 py-0.2 rounded font-bold bg-purple-700 text-white border border-purple-800 text-[10px]">Sí (${point.pmrCount || 1} pers.)</span>`
                : `<span class="px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-500 border border-slate-200 text-[10px]">No</span>`
              }
            </div>

            ${(hasPmr && point.pmrDetails) ? `
              <div class="text-[9px] text-purple-900 bg-purple-50 px-1.5 py-1 rounded border border-purple-200 italic font-medium">
                ℹ️ <strong>Detalle PMR:</strong> ${escapeHtml(point.pmrDetails)}
              </div>
            ` : ''}
          </div>

          ${point.description ? `
            <p class="text-slate-700 text-xs mb-2 leading-relaxed bg-white p-2 rounded-lg border border-slate-200">
              ${escapeHtml(point.description)}
            </p>
          ` : ''}

          ${point.actionsRequired ? `
            <div class="mb-2 p-1.5 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-900">
              <strong class="font-bold block">Acción Requerida:</strong>
              ${escapeHtml(point.actionsRequired)}
            </div>
          ` : ''}

          <div class="pt-2 border-t border-slate-100 flex flex-col gap-1">
            <div class="flex justify-between text-[10px] text-slate-500">
              <span>Coord: ${point.coordinates.lat.toFixed(4)}, ${point.coordinates.lng.toFixed(4)}</span>
              ${point.contactPhone ? `<span class="font-bold text-emerald-700">📞 ${escapeHtml(point.contactPhone)}</span>` : ''}
            </div>

            ${isAdmin ? `
              <div class="flex items-center gap-1.5 mt-1">
                <button
                  onclick="window.handleEditExistingPoint('${point.id}')"
                  class="flex-1 py-1.5 px-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                >
                  ✏️ Modificar
                </button>
                <button
                  onclick="window.handleDeleteExistingPoint('${point.id}')"
                  class="py-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Eliminar este punto de la base de datos"
                >
                  🗑️ Eliminar
                </button>
              </div>
            ` : `
              <div class="mt-1">
                <button
                  onclick="window.handleEditExistingPoint('${point.id}')"
                  class="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Ver ficha técnica completa en modo lectura"
                >
                  👁️ Ver Detalle Completo (Modo Consulta)
                </button>
              </div>
            `}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 340 });
    });
  }, [filteredRiskPoints, filterState.activeSpecificCategory, filterState.filterPmrOnly, setSelectedPoint, onSelectPointDetail, isAdmin]);

  // GPS Geolocation Handler
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no es compatible con este navegador.');
      return;
    }
    setGpsTracking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsTracking(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([coords.lat, coords.lng], 16, { animate: true });
        }
      },
      (err) => {
        console.warn('GPS error:', err);
        setGpsTracking(false);
        alert('No se pudo obtener la posición GPS. Asegúrese de otorgar permisos de ubicación.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Center Entire Zone
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(DEFAULT_COMUNA_CENTER, DEFAULT_COMUNA_ZOOM, { animate: true });
    }
  };

  return (
    <div id="map-viewer-wrapper" className="relative w-full h-full flex flex-col overflow-hidden bg-slate-100">
      
      {/* Leaflet Canvas Container */}
      <div id="sig-map-container" ref={mapContainerRef} className="w-full h-full flex-1 z-10" />

      {/* Floating Basemap & Tool Controls (Positioned at bottom-left so top filters never overlap) */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 max-w-[calc(100vw-32px)]">
        {/* Basemap Switcher Pill */}
        <div className="bg-white/95 backdrop-blur shadow-lg rounded-2xl p-1 border border-slate-200/90 flex items-center gap-1 text-xs">
          <button
            onClick={() => switchBasemap('osm')}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeBasemap === 'osm'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Calles
          </button>
          <button
            onClick={() => switchBasemap('satellite')}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeBasemap === 'satellite'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Satelital
          </button>
          <button
            onClick={() => switchBasemap('topo')}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeBasemap === 'topo'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Topográfico
          </button>
          <button
            onClick={() => switchBasemap('positron')}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeBasemap === 'positron'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Claro
          </button>
        </div>

        {/* GPS and Reset Map view buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-gps-locate"
            onClick={handleGetGpsLocation}
            className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl shadow-md border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Ubicar mi posición actual en terreno (GPS)"
          >
            <LocateFixed className={`w-4 h-4 ${gpsTracking ? 'text-amber-500 animate-spin' : 'text-emerald-700'}`} />
            <span className="hidden sm:inline">Mi Ubicación GPS</span>
          </button>

          <button
            id="btn-reset-zoom"
            onClick={handleResetView}
            className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl shadow-md border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Centrar mapa en la Comuna"
          >
            <Maximize2 className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Centrar Mapa</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Pill on Bottom Right */}
      <div className="absolute bottom-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-xl border border-slate-700/80 text-xs flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Layers3 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold">{filteredLayers.filter(l => l.isVisible).length} Capas</span>
        </div>
        <div className="w-px h-3 bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold">{filteredRiskPoints.length} Puntos</span>
        </div>
      </div>

    </div>
  );
};

// Helper: Creates custom SVG icons for GeoJSON Placemarks
function createHazardPointIcon(category: ThreatCategory, level: ThreatLevel, customColor?: string): L.DivIcon {
  const color = customColor || '#10B981';
  const isCritical = level === 'critico';

  return L.divIcon({
    className: 'custom-hazard-div-icon',
    html: `
      <div class="relative flex items-center justify-center">
        ${isCritical ? `<div class="absolute w-8 h-8 rounded-full bg-red-500/40 risk-pulse-critical -z-10"></div>` : ''}
        <div style="background-color: ${color};" class="w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

// Helper: Determines the active risk level for a point based on the selected hazard category
function getPointEffectiveRiskLevel(point: RiskPoint, activeCategory?: ThreatCategory | null): ThreatLevel {
  if (!activeCategory || activeCategory === 'sectores') {
    return point.riskLevel || 'medio';
  }
  
  if (activeCategory === 'incendios') {
    const val = point.hazardEvaluations?.incendio;
    if (val && val !== 'no_aplica') return val;
    if (point.category === 'incendios') return point.riskLevel;
    return 'no_aplica';
  }
  if (activeCategory === 'inundaciones') {
    const val = point.hazardEvaluations?.inundacion;
    if (val && val !== 'no_aplica') return val;
    if (point.category === 'inundaciones') return point.riskLevel;
    return 'no_aplica';
  }
  if (activeCategory === 'remocion_masa') {
    const val = point.hazardEvaluations?.remocion_masa;
    if (val && val !== 'no_aplica') return val;
    if (point.category === 'remocion_masa') return point.riskLevel;
    return 'no_aplica';
  }
  if (activeCategory === 'rutas_evacuacion') {
    const val = point.hazardEvaluations?.corte_ruta;
    if (val && val !== 'no_aplica') return val;
    if (point.category === 'rutas_evacuacion') return point.riskLevel;
    return 'no_aplica';
  }
  if (activeCategory === 'deficit_hidrico') {
    const val = point.hazardEvaluations?.deficit_hidrico;
    if (val && val !== 'no_aplica') return val;
    return 'no_aplica';
  }

  return point.riskLevel || 'medio';
}

// Helper: Creates custom Leaflet DivIcon with hazard symbols and dynamic severity color
function createRiskPointIcon(point: RiskPoint, activeCategory?: ThreatCategory | 'pmr' | null, filterPmrOnly?: boolean): L.DivIcon {
  const isPmrActive = activeCategory === 'pmr' || Boolean(filterPmrOnly);
  const hasPmr = Boolean(point.hasPmr || (point.pmrCount && point.pmrCount > 0));

  let bgColor = '#10B981'; // default green for bajo
  let isPmrHighlight = false;

  if (isPmrActive && hasPmr) {
    // Exact purple color (#7E22CE / rgb(126, 34, 206)) matching the PMR button
    bgColor = '#7E22CE';
    isPmrHighlight = true;
  } else {
    const effectiveLevel = getPointEffectiveRiskLevel(point, activeCategory as ThreatCategory);
    if (effectiveLevel === 'critico') bgColor = '#DC2626'; // red
    else if (effectiveLevel === 'alto') bgColor = '#EA580C'; // orange / naranjo alto
    else if (effectiveLevel === 'medio') bgColor = '#F59E0B'; // amber / naranjo medio
    else if (effectiveLevel === 'bajo') bgColor = '#10B981'; // emerald green / verde bajo
    else if (effectiveLevel === 'informativo') bgColor = '#3B82F6'; // blue
    else if (effectiveLevel === 'no_aplica') bgColor = '#64748B'; // slate gray
  }
  
  const isCritical = !isPmrHighlight && getPointEffectiveRiskLevel(point, activeCategory as ThreatCategory) === 'critico';
  const displayCategory = isPmrHighlight ? 'pmr' : ((activeCategory && activeCategory !== 'sectores' && activeCategory !== 'pmr') ? activeCategory : (point.category || 'sectores'));

  return L.divIcon({
    className: 'custom-risk-marker',
    html: `
      <div class="relative flex items-center justify-center cursor-pointer group">
        ${isCritical ? `<div class="absolute w-10 h-10 rounded-full bg-red-500/40 risk-pulse-critical -z-10"></div>` : ''}
        ${isPmrHighlight ? `<div class="absolute w-10 h-10 rounded-full bg-purple-600/40 risk-pulse-critical -z-10"></div>` : ''}
        <div style="background-color: ${bgColor};" class="w-8 h-8 rounded-xl border-2 border-white shadow-lg flex items-center justify-center text-white transition-transform transform group-hover:scale-110">
          ${getCategorySvgIcon(displayCategory)}
        </div>
        <div class="absolute -bottom-1 w-2 h-2 rotate-45 border-r-2 border-b-2 border-white" style="background-color: ${bgColor};"></div>
      </div>
    `,
    iconSize: [32, 36],
    iconAnchor: [16, 36],
    popupAnchor: [0, -36],
  });
}

function getCategorySvgIcon(category: ThreatCategory | 'pmr' | string): string {
  switch (category) {
    case 'incendios':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg>`;
    case 'inundaciones':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
    case 'remocion_masa':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`;
    case 'rutas_evacuacion':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a4.5 4.5 0 0 0 0-9H10"/><polyline points="13 6 9 10 13 14"/></svg>`;
    case 'deficit_hidrico':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 12h20"/><path d="M20 12v8H4v-8"/><path d="m4 4 16 16"/></svg>`;
    case 'pmr':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="4" r="2"/><path d="m5 11 4-2 3 3 3-1 2 3"/><path d="M9 18h6"/><path d="m10 13-1.5 6"/><path d="m14 13 1.5 6"/></svg>`;
    case 'sectores':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    case 'albergues':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    case 'infraestructura_critica':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="18"/><line x1="15" y1="22" x2="15" y2="18"/></svg>`;
    default:
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  }
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function (m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}
