import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from '../lib/firebase';
import { 
  KmzLayer, 
  RiskPoint, 
  FilterState, 
  ThreatCategory, 
  ThreatLevel,
  PointStatus 
} from '../types';
import { INITIAL_DEMO_LAYERS, INITIAL_RISK_POINTS, DEFAULT_COMUNA_CENTER } from '../services/initialData';
import { 
  saveLayerToLocalDB, 
  getAllLayersFromLocalDB, 
  deleteLayerFromLocalDB, 
  clearAllLocalLayers,
  syncLocalDBWithFirestoreLayers,
  sanitizeForFirestore 
} from '../services/layerStorage';
import {
  saveLayerToFirestore,
  resolveFullLayerFromFirestore,
  deleteLayerFromFirestore,
} from '../services/firestoreLayerSync';
import { useAuth } from './AuthContext';

interface DataContextType {
  layers: KmzLayer[];
  riskPoints: RiskPoint[];
  loading: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncTime: number;
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  filteredLayers: KmzLayer[];
  filteredRiskPoints: RiskPoint[];
  selectedPoint: RiskPoint | null;
  setSelectedPoint: (point: RiskPoint | null) => void;
  selectedLayer: KmzLayer | null;
  setSelectedLayer: (layer: KmzLayer | null) => void;
  mapFlyTo: { lat: number; lng: number; zoom?: number } | null;
  setMapFlyTo: (pos: { lat: number; lng: number; zoom?: number } | null) => void;
  addLayer: (layer: KmzLayer) => Promise<void>;
  updateLayer: (id: string, updates: Partial<KmzLayer>) => Promise<void>;
  toggleLayerVisibility: (id: string) => Promise<void>;
  deleteLayer: (id: string) => Promise<void>;
  deleteAllLayers: () => Promise<void>;
  syncAllLayersToCloud: () => Promise<number>;
  addRiskPoint: (pointData: Omit<RiskPoint, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>) => Promise<string>;
  updateRiskPoint: (id: string, updates: Partial<RiskPoint>) => Promise<void>;
  deleteRiskPoint: (id: string) => Promise<void>;
  deleteAllRiskPoints: () => Promise<void>;
  deleteRiskPointsBySector: (sectorName: string) => Promise<void>;
  restoreDefaultData: () => Promise<void>;
  exportComunaGeoJSON: () => string;
}

const initialFilterState: FilterState = {
  categories: [],
  threatLevels: [],
  selectedLayerIds: [],
  selectedSectors: [],
  searchKeyword: '',
  onlyCritical: false,
  filterPmrOnly: false,
  activeSpecificCategory: null,
  activeSpecificSeverity: null,
  statuses: [],
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const [layers, setLayers] = useState<KmzLayer[]>(() => {
    const local = localStorage.getItem('sig_cached_layers');
    if (local) {
      try {
        const parsed = JSON.parse(local) as KmzLayer[];
        // Filter out any previous demo layers so only user-uploaded layers remain
        return parsed.filter((l) => !l.id.startsWith('layer_incendios_') && !l.id.startsWith('layer_inundacion_') && !l.id.startsWith('layer_evacuacion_') && !l.id.startsWith('layer_albergues_') && l.uploadedBy !== 'system');
      } catch {
        return [];
      }
    }
    return [];
  });
  
  const [riskPoints, setRiskPoints] = useState<RiskPoint[]>(() => {
    try {
      const local = localStorage.getItem('sig_cached_points');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          // Filter out legacy demo points
          return parsed.filter((p: RiskPoint) => !p.id.startsWith('point_00') && p.createdBy !== 'admin_sys');
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState);
  const [selectedPoint, setSelectedPoint] = useState<RiskPoint | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<KmzLayer | null>(null);
  const [mapFlyTo, setMapFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load from IndexedDB on initial mount for instant offline preview (without re-uploading)
  useEffect(() => {
    getAllLayersFromLocalDB().then((storedLayers) => {
      if (storedLayers && storedLayers.length > 0) {
        setLayers((prev) => {
          if (prev.length > 0) return prev; // If Firestore snapshot already arrived, respect cloud
          const valid = storedLayers.filter(
            (l) => l && l.id && !l.id.startsWith('layer_incendios_') && l.uploadedBy !== 'system'
          );
          return valid;
        });
      }
    }).catch((err) => {
      console.warn('Initial IndexedDB load error:', err);
    });
  }, []);

  // Sync to local storage whenever riskPoints update
  useEffect(() => {
    try {
      localStorage.setItem('sig_cached_points', JSON.stringify(riskPoints));
    } catch (e) {
      console.warn('LocalStorage points cache error:', e);
    }
  }, [riskPoints]);

  // Firestore Real-Time Subscriptions for user uploaded layers
  useEffect(() => {
    setIsSyncing(true);
    let unsubLayers: (() => void) | undefined;
    let unsubPoints: (() => void) | undefined;

    try {
      const layersCol = collection(db, 'layers');
      unsubLayers = onSnapshot(layersCol, async (snapshot) => {
        const rawFirestoreLayers: any[] = [];
        snapshot.forEach((d) => {
          const layerData = d.data();
          // Only include user-created layers, discard legacy demo data
          if (
            layerData &&
            !layerData.id.startsWith('layer_incendios_') &&
            !layerData.id.startsWith('layer_inundacion_') &&
            !layerData.id.startsWith('layer_evacuacion_') &&
            !layerData.id.startsWith('layer_albergues_') &&
            layerData.uploadedBy !== 'system'
          ) {
            rawFirestoreLayers.push(layerData);
          }
        });

        // Resolve chunked layers or stringified GeoJSON
        const resolvedLayers: KmzLayer[] = await Promise.all(
          rawFirestoreLayers.map((l) => resolveFullLayerFromFirestore(l))
        );

        // Synchronize local IndexedDB and LocalStorage so deleted layers are cleanly purged
        syncLocalDBWithFirestoreLayers(resolvedLayers).catch((err) => {
          console.warn('Local DB sync error in onSnapshot:', err);
        });
        
        setLayers(resolvedLayers);
        setIsSyncing(false);
        setLastSyncTime(Date.now());
      }, (err) => {
        console.warn('Firestore layers onSnapshot error:', err);
        setIsSyncing(false);
      });
    } catch (err) {
      console.warn('Firestore layers setup error:', err);
      setIsSyncing(false);
    }

    try {
      const pointsCol = collection(db, 'riskPoints');
      unsubPoints = onSnapshot(pointsCol, (snapshot) => {
        const list: RiskPoint[] = [];
        snapshot.forEach((d) => {
          const pt = d.data() as RiskPoint;
          if (pt && !pt.id.startsWith('point_00') && pt.createdBy !== 'admin_sys') {
            list.push(pt);
          }
        });
        
        setRiskPoints(list);
        setIsSyncing(false);
        setLastSyncTime(Date.now());
      }, (err) => {
        console.warn('Firestore points onSnapshot error:', err);
        setIsSyncing(false);
      });
    } catch (err) {
      console.warn('Firestore points setup error:', err);
      setIsSyncing(false);
    }

    return () => {
      if (unsubLayers) unsubLayers();
      if (unsubPoints) unsubPoints();
    };
  }, []);

  // Actions
  const addLayer = async (newLayer: KmzLayer) => {
    setIsSyncing(true);
    const sanitized = sanitizeForFirestore(newLayer);
    
    // 1. Immediately update React state so the UI reflects the new layer instantly
    setLayers((prev) => [sanitized, ...prev.filter((l) => l.id !== sanitized.id)]);
    
    // 2. Persist to local IndexedDB (guaranteed storage even for 20MB files)
    try {
      await saveLayerToLocalDB(sanitized);
    } catch (dbErr) {
      console.warn('LocalDB layer save warning:', dbErr);
    }

    // 3. Sync to Firestore in cloud so all devices receive the layer
    try {
      await saveLayerToFirestore(sanitized);
    } catch (err: any) {
      console.error('Error saving layer to Firestore:', err);
      throw new Error(`Error al sincronizar con la nube Firestore: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
      setLastSyncTime(Date.now());
    }
  };

  const updateLayer = async (id: string, updates: Partial<KmzLayer>) => {
    setIsSyncing(true);
    const sanitizedUpdates = sanitizeForFirestore(updates);
    
    let targetLayer: KmzLayer | undefined;
    setLayers((prev) => {
      const updated = prev.map((l) => {
        if (l.id === id) {
          const full = { ...l, ...sanitizedUpdates };
          targetLayer = full;
          return full;
        }
        return l;
      });
      if (targetLayer) {
        saveLayerToLocalDB(targetLayer).catch(console.warn);
      }
      return updated;
    });

    try {
      if (targetLayer) {
        await saveLayerToFirestore(targetLayer);
      } else {
        await updateDoc(doc(db, 'layers', id), sanitizedUpdates);
      }
    } catch (err) {
      console.warn('Firestore layer update note:', err);
    } finally {
      setIsSyncing(false);
      setLastSyncTime(Date.now());
    }
  };

  const toggleLayerVisibility = async (id: string) => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;
    const newVisibility = !target.isVisible;
    await updateLayer(id, { isVisible: newVisibility });
  };

  const deleteLayer = async (id: string) => {
    setIsSyncing(true);
    const targetLayer = layers.find((l) => l.id === id);
    const layerName = targetLayer?.name;
    const layerSector = targetLayer?.sector;

    // 1. Remove layer from state
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayer?.id === id) setSelectedLayer(null);
    
    // 2. Cascade delete points associated with this KMZ layer
    const pointsToDelete = riskPoints.filter((p) => {
      if (p.sourceLayerId && p.sourceLayerId === id) return true;
      if (layerName && p.sourceLayerName && p.sourceLayerName === layerName) return true;
      if (layerSector && p.sector && p.sector.trim().toLowerCase() === layerSector.trim().toLowerCase()) {
        const otherLayersWithSameSector = layers.filter(other => other.id !== id && other.sector?.trim().toLowerCase() === layerSector.trim().toLowerCase());
        if (otherLayersWithSameSector.length === 0) return true;
      }
      if (layerName && p.sector && p.sector.trim().toLowerCase() === layerName.trim().toLowerCase()) {
        const otherLayersWithSameName = layers.filter(other => other.id !== id && other.name.trim().toLowerCase() === layerName.trim().toLowerCase());
        if (otherLayersWithSameName.length === 0) return true;
      }
      return false;
    });

    if (pointsToDelete.length > 0) {
      const deleteIds = new Set(pointsToDelete.map(p => p.id));
      setRiskPoints((prev) => prev.filter(p => !deleteIds.has(p.id)));
      if (selectedPoint && deleteIds.has(selectedPoint.id)) setSelectedPoint(null);
      
      for (const pt of pointsToDelete) {
        try {
          await deleteDoc(doc(db, 'riskPoints', pt.id));
        } catch (err) {
          console.warn('Error removing associated point from Firestore:', err);
        }
      }
    }

    // 3. Remove from local IndexedDB & LocalStorage
    try {
      await deleteLayerFromLocalDB(id);
    } catch (e) {
      console.warn('Local DB layer delete error:', e);
    }

    // 4. Remove from Firestore (and any chunks)
    try {
      await deleteLayerFromFirestore(id, targetLayer?.totalChunks);
    } catch (err) {
      console.warn('Firestore deleteLayer note:', err);
    } finally {
      setIsSyncing(false);
      setLastSyncTime(Date.now());
    }
  };

  const deleteAllLayers = async () => {
    setIsSyncing(true);
    const existingLayers = [...layers];
    setLayers([]);
    setSelectedLayer(null);

    // Clear local storage / indexedDB
    try {
      await clearAllLocalLayers();
    } catch (e) {
      console.warn('Error clearing local layers DB:', e);
    }

    // Delete in Firestore
    for (const layer of existingLayers) {
      try {
        await deleteLayerFromFirestore(layer.id, layer.totalChunks);
      } catch (err) {
        console.warn('Error deleting layer from Firestore:', err);
      }
    }

    setIsSyncing(false);
    setLastSyncTime(Date.now());
  };

  const deleteAllRiskPoints = async () => {
    setIsSyncing(true);
    const existingPoints = [...riskPoints];
    setRiskPoints([]);
    setSelectedPoint(null);

    try {
      localStorage.removeItem('sig_cached_points');
    } catch (e) {
      // ignore
    }

    for (const p of existingPoints) {
      try {
        await deleteDoc(doc(db, 'riskPoints', p.id));
      } catch (err) {
        console.warn('Error deleting risk point from Firestore:', err);
      }
    }

    setIsSyncing(false);
    setLastSyncTime(Date.now());
  };

  const deleteRiskPointsBySector = async (sectorName: string) => {
    if (!sectorName) return;
    setIsSyncing(true);
    const s = sectorName.trim().toLowerCase();
    const pointsToDelete = riskPoints.filter(p => (p.sector || '').trim().toLowerCase() === s || (p.title || '').trim().toLowerCase() === s);
    const deleteIds = new Set(pointsToDelete.map(p => p.id));

    setRiskPoints(prev => prev.filter(p => !deleteIds.has(p.id)));
    if (selectedPoint && deleteIds.has(selectedPoint.id)) setSelectedPoint(null);

    // Delete matching points from Firestore
    for (const pt of pointsToDelete) {
      try {
        await deleteDoc(doc(db, 'riskPoints', pt.id));
      } catch (err) {
        console.warn('Error deleting sector point from Firestore:', err);
      }
    }

    // Also delete any matching layers by sector or name
    const layersToDelete = layers.filter(l => (l.sector || '').trim().toLowerCase() === s || l.name.trim().toLowerCase() === s);
    if (layersToDelete.length > 0) {
      for (const layer of layersToDelete) {
        await deleteLayer(layer.id);
      }
    }

    setIsSyncing(false);
    setLastSyncTime(Date.now());
  };

  /**
   * Manually pushes all locally stored and active layers to Firestore cloud
   */
  const syncAllLayersToCloud = async (): Promise<number> => {
    setIsSyncing(true);
    let count = 0;
    try {
      // First get all local DB layers
      const localLayers = await getAllLayersFromLocalDB();
      const combined = new Map<string, KmzLayer>();
      localLayers.forEach(l => combined.set(l.id, l));
      layers.forEach(l => combined.set(l.id, l));

      for (const layer of combined.values()) {
        if (
          layer && 
          layer.id && 
          !layer.id.startsWith('layer_incendios_') && 
          !layer.id.startsWith('layer_inundacion_') && 
          !layer.id.startsWith('layer_evacuacion_') && 
          !layer.id.startsWith('layer_albergues_') && 
          layer.uploadedBy !== 'system'
        ) {
          await saveLayerToFirestore(layer);
          count++;
        }
      }
      return count;
    } finally {
      setIsSyncing(false);
      setLastSyncTime(Date.now());
    }
  };

  const addRiskPoint = async (
    pointData: Omit<RiskPoint, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>
  ): Promise<string> => {
    setIsSyncing(true);
    const newId = `point_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPoint: RiskPoint = sanitizeForFirestore({
      ...pointData,
      id: newId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user?.uid || 'anon',
      createdByName: user?.displayName || 'Funcionario Municipal',
    });

    setRiskPoints((prev) => [newPoint, ...prev]);
    try {
      await setDoc(doc(db, 'riskPoints', newId), newPoint);
    } catch (err) {
      console.warn('Firestore risk point save note:', err);
    } finally {
      setIsSyncing(false);
      setLastSyncTime(Date.now());
    }
    return newId;
  };

  const updateRiskPoint = async (id: string, updates: Partial<RiskPoint>) => {
    setIsSyncing(true);
    const updatedData = sanitizeForFirestore({ ...updates, updatedAt: Date.now() });
    setRiskPoints((prev) => prev.map((p) => p.id === id ? { ...p, ...updatedData } : p));
    if (selectedPoint?.id === id) {
      setSelectedPoint((prev) => prev ? { ...prev, ...updatedData } : null);
    }
    try {
      await updateDoc(doc(db, 'riskPoints', id), updatedData);
    } catch (err) {
      console.warn('Firestore risk point update note:', err);
    } finally {
      setIsSyncing(false);
      setLastSyncTime(Date.now());
    }
  };

  const deleteRiskPoint = async (id: string) => {
    setIsSyncing(true);
    setRiskPoints((prev) => prev.filter((p) => p.id !== id));
    if (selectedPoint?.id === id) setSelectedPoint(null);
    try {
      await deleteDoc(doc(db, 'riskPoints', id));
    } catch (err) {
      console.warn('Firestore deleteRiskPoint note:', err);
    } finally {
      setIsSyncing(false);
      setLastSyncTime(Date.now());
    }
  };

  const restoreDefaultData = async () => {
    setIsSyncing(true);
    await clearAllLocalLayers();
    setLayers(INITIAL_DEMO_LAYERS);
    setRiskPoints(INITIAL_RISK_POINTS);
    for (const l of INITIAL_DEMO_LAYERS) {
      try {
        await saveLayerToLocalDB(l);
        await setDoc(doc(db, 'layers', l.id), sanitizeForFirestore(l));
      } catch {
        // ignore
      }
    }
    for (const p of INITIAL_RISK_POINTS) {
      try {
        await setDoc(doc(db, 'riskPoints', p.id), sanitizeForFirestore(p));
      } catch {
        // ignore
      }
    }
    setIsSyncing(false);
    setLastSyncTime(Date.now());
  };

  // Export combined data as GeoJSON
  const exportComunaGeoJSON = () => {
    const combinedFeatures: any[] = [];

    // Add layer features
    layers.filter(l => l.isVisible).forEach(layer => {
      layer.geojson.features.forEach(f => {
        combinedFeatures.push({
          ...f,
          properties: {
            ...f.properties,
            layerName: layer.name,
            layerCategory: layer.category,
          }
        });
      });
    });

    // Add georeferenced risk points
    riskPoints.forEach(p => {
      combinedFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.coordinates.lng, p.coordinates.lat]
        },
        properties: {
          name: p.title,
          threatType: p.threatType,
          riskLevel: p.riskLevel,
          sector: p.sector,
          description: p.description,
          status: p.status,
          actionsRequired: p.actionsRequired,
          contactPhone: p.contactPhone,
          responsibleEntity: p.responsibleEntity,
          updatedAt: new Date(p.updatedAt).toISOString()
        }
      });
    });

    return JSON.stringify({
      type: 'FeatureCollection',
      name: 'SIG_Comunal_Gestion_Riesgos_Export',
      crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
      features: combinedFeatures
    }, null, 2);
  };

  // Filtered Layers and Risk Points computation
  const filteredLayers = useMemo(() => {
    return layers.filter((layer) => {
      // 0. Hidden layer check: If a layer is toggled off in visibility, it MUST NOT be displayed
      if (!layer.isVisible) {
        return false;
      }
      // Layer ID filter
      if (filterState.selectedLayerIds.length > 0 && !filterState.selectedLayerIds.includes(layer.id)) {
        return false;
      }
      // Category filter
      if (filterState.categories.length > 0 && !filterState.categories.includes(layer.category)) {
        return false;
      }
      // Sector filter (multi-selection of sectors e.g. ['Burca', 'Guarilihue'])
      if (filterState.selectedSectors.length > 0) {
        const matchesSector = filterState.selectedSectors.some((sec) => {
          const s = sec.toLowerCase().trim();
          if (!s) return false;
          const layerSector = (layer.sector || '').toLowerCase().trim();
          const layerName = layer.name.toLowerCase().trim();
          const layerDesc = (layer.description || '').toLowerCase().trim();

          const sectorMatches = Boolean(layerSector && (layerSector === s || layerSector.includes(s) || (s.length >= 4 && s.includes(layerSector))));
          const nameMatches = Boolean(layerName === s || layerName.includes(s) || (s.length >= 4 && s.includes(layerName)));
          const descMatches = Boolean(layerDesc && (layerDesc.includes(`sector ${s}`) || layerDesc.includes(s)));
          const featMatches = layer.geojson.features.some(f => {
            const fSec = (f.properties?.sector || '').toString().toLowerCase().trim();
            const fName = (f.properties?.name || '').toString().toLowerCase().trim();
            return Boolean((fSec && (fSec === s || fSec.includes(s))) ||
                   (fName && (fName.includes(s) || (s.length >= 4 && fName === s))));
          });

          return sectorMatches || nameMatches || descMatches || featMatches;
        });
        if (!matchesSector) {
          return false;
        }
      }
      // Threat level filter
      if (filterState.threatLevels.length > 0 && !filterState.threatLevels.includes(layer.threatLevel)) {
        return false;
      }
      // Only critical filter
      if (filterState.onlyCritical && layer.threatLevel !== 'critico' && layer.threatLevel !== 'alto') {
        return false;
      }
      // Search keyword filter
      if (filterState.searchKeyword.trim()) {
        const kw = filterState.searchKeyword.toLowerCase();
        const matchesName = layer.name.toLowerCase().includes(kw);
        const matchesCat = layer.threatType.toLowerCase().includes(kw);
        const matchesSector = (layer.sector || '').toLowerCase().includes(kw);
        const matchesDesc = (layer.description || '').toLowerCase().includes(kw);
        const matchesFeatures = layer.geojson.features.some(f => 
          (f.properties?.name || '').toLowerCase().includes(kw) ||
          (f.properties?.description || '').toLowerCase().includes(kw)
        );
        if (!matchesName && !matchesCat && !matchesSector && !matchesDesc && !matchesFeatures) {
          return false;
        }
      }
      return true;
    });
  }, [layers, filterState]);

  const filteredRiskPoints = useMemo(() => {
    const visibleLayerIds = new Set(layers.filter(l => l.isVisible).map(l => l.id));
    const selectedLayerIdSet = filterState.selectedLayerIds.length > 0 ? new Set(filterState.selectedLayerIds) : null;

    return riskPoints.filter((point) => {
      // 0. If point belongs to a source KMZ layer that is toggled invisible, do NOT show it
      if (point.sourceLayerId && !visibleLayerIds.has(point.sourceLayerId)) {
        return false;
      }

      // 0.1 If user explicitly filtered by specific KMZ layers, only show points associated with those layers
      if (selectedLayerIdSet) {
        const pointBelongsToSelected = point.sourceLayerId && selectedLayerIdSet.has(point.sourceLayerId);
        const pointMatchesSelectedLayerSector = layers.some(l => 
          selectedLayerIdSet.has(l.id) && 
          l.sector && 
          point.sector && 
          l.sector.trim().toLowerCase() === point.sector.trim().toLowerCase()
        );
        if (!pointBelongsToSelected && !pointMatchesSelectedLayerSector) {
          return false;
        }
      }

      // 1. PMR (Movilidad Reducida) Filter
      if (filterState.filterPmrOnly) {
        const hasPmr = point.hasPmr || (typeof point.pmrCount === 'number' && point.pmrCount > 0);
        if (!hasPmr) return false;
      }

      // 2. Specific Category + Severity matrix evaluation
      // (e.g., if Incendios is active, check specific rating in hazardEvaluations.incendio)
      if (filterState.activeSpecificCategory) {
        const cat = filterState.activeSpecificCategory;
        if (cat === 'incendios') {
          const evalLvl = point.hazardEvaluations?.incendio || (point.category === 'incendios' ? point.riskLevel : 'no_aplica');
          if (filterState.threatLevels.length > 0) {
            if (!filterState.threatLevels.includes(evalLvl)) return false;
          } else if (evalLvl === 'no_aplica') {
            return false;
          }
        } else if (cat === 'inundaciones') {
          const evalLvl = point.hazardEvaluations?.inundacion || (point.category === 'inundaciones' ? point.riskLevel : 'no_aplica');
          if (filterState.threatLevels.length > 0) {
            if (!filterState.threatLevels.includes(evalLvl)) return false;
          } else if (evalLvl === 'no_aplica') {
            return false;
          }
        } else if (cat === 'remocion_masa') {
          const evalLvl = point.hazardEvaluations?.remocion_masa || (point.category === 'remocion_masa' ? point.riskLevel : 'no_aplica');
          if (filterState.threatLevels.length > 0) {
            if (!filterState.threatLevels.includes(evalLvl)) return false;
          } else if (evalLvl === 'no_aplica') {
            return false;
          }
        } else if (cat === 'rutas_evacuacion') {
          const evalLvl = point.hazardEvaluations?.corte_ruta || (point.category === 'rutas_evacuacion' ? point.riskLevel : 'no_aplica');
          if (filterState.threatLevels.length > 0) {
            if (!filterState.threatLevels.includes(evalLvl)) return false;
          } else if (evalLvl === 'no_aplica') {
            return false;
          }
        } else if (cat === 'deficit_hidrico') {
          const evalLvl = point.hazardEvaluations?.deficit_hidrico || 'no_aplica';
          if (filterState.threatLevels.length > 0) {
            if (!filterState.threatLevels.includes(evalLvl)) return false;
          } else if (evalLvl === 'no_aplica') {
            return false;
          }
        } else if (cat === 'pmr') {
          const hasPmr = point.hasPmr || (typeof point.pmrCount === 'number' && point.pmrCount > 0);
          if (!hasPmr) return false;
        } else if (cat === 'sectores') {
          // Show all sector points
        } else {
          if (point.category !== cat) return false;
        }
      } else if (filterState.categories.length > 0 && !filterState.categories.includes(point.category) && !filterState.categories.includes('sectores')) {
        return false;
      }

      // 3. Sector filter (matches point sector or layer)
      if (filterState.selectedSectors.length > 0) {
        const matchesSector = filterState.selectedSectors.some((sec) => {
          const s = sec.toLowerCase().trim();
          if (!s) return false;
          const pSec = (point.sector || '').toLowerCase().trim();
          const pTitle = point.title.toLowerCase().trim();
          const pSrcLayer = (point.sourceLayerName || '').toLowerCase().trim();

          // 1. Direct match on point.sector
          if (pSec && (pSec === s || pSec.includes(s) || (s.length >= 4 && s.includes(pSec)))) {
            return true;
          }
          // 2. Direct match on title if it explicitly contains the sector name
          if (pTitle && (pTitle.includes(s) || pTitle.includes(`sector ${s}`))) {
            return true;
          }
          // 3. Match on source layer name
          if (pSrcLayer && (pSrcLayer === s || pSrcLayer.includes(s))) {
            return true;
          }
          return false;
        });
        if (!matchesSector) {
          return false;
        }
      }

      // 4. Overall Threat level filter (if no specific category active)
      if (!filterState.activeSpecificCategory && filterState.threatLevels.length > 0 && !filterState.threatLevels.includes(point.riskLevel)) {
        return false;
      }

      // 5. Status filter
      if (filterState.statuses.length > 0 && !filterState.statuses.includes(point.status)) {
        return false;
      }

      // 6. Only critical filter
      if (filterState.onlyCritical && point.riskLevel !== 'critico' && point.riskLevel !== 'alto') {
        return false;
      }

      // 7. Search keyword filter
      if (filterState.searchKeyword.trim()) {
        const kw = filterState.searchKeyword.toLowerCase();
        const matchesTitle = point.title.toLowerCase().includes(kw);
        const matchesSector = point.sector.toLowerCase().includes(kw);
        const matchesThreat = point.threatType.toLowerCase().includes(kw);
        const matchesDesc = point.description.toLowerCase().includes(kw);
        const matchesHead = (point.householdHead || '').toLowerCase().includes(kw);
        const matchesPmr = (point.pmrDetails || '').toLowerCase().includes(kw);
        if (!matchesTitle && !matchesSector && !matchesThreat && !matchesDesc && !matchesHead && !matchesPmr) {
          return false;
        }
      }
      return true;
    });
  }, [riskPoints, layers, filterState]);

  return (
    <DataContext.Provider
      value={{
        layers,
        riskPoints,
        loading,
        isSyncing,
        isOnline,
        lastSyncTime,
        filterState,
        setFilterState,
        filteredLayers,
        filteredRiskPoints,
        selectedPoint,
        setSelectedPoint,
        selectedLayer,
        setSelectedLayer,
        mapFlyTo,
        setMapFlyTo,
        addLayer,
        updateLayer,
        toggleLayerVisibility,
        deleteLayer,
        deleteAllLayers,
        syncAllLayersToCloud,
        addRiskPoint,
        updateRiskPoint,
        deleteRiskPoint,
        deleteAllRiskPoints,
        deleteRiskPointsBySector,
        restoreDefaultData,
        exportComunaGeoJSON,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

