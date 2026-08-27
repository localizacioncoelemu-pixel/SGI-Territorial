import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where 
} from '../lib/firebase';
import { KmzLayer, GeoJsonCollection, GeoJsonFeature } from '../types';
import { sanitizeForFirestore } from './layerStorage';

// Firestore single document limit is 1MB (~1,048,576 bytes).
// We set a conservative string chunk limit of 500 KB (500,000 chars) for guaranteed delivery.
const MAX_DIRECT_STRING_CHARS = 500000;
const CHUNK_STRING_CHARS = 450000;

/**
 * Saves a KMZ layer to Firestore safely.
 * GeoJSON contains nested coordinate arrays (e.g. [[lng, lat]] or [[[lng, lat]]])
 * which are rejected by Firestore's document model ("Nested arrays are not supported").
 * We serialize the GeoJSON into a structured string payload, splitting into chunks in
 * 'layer_chunks' if the file is very large.
 */
export async function saveLayerToFirestore(layer: KmzLayer): Promise<void> {
  const sanitized = sanitizeForFirestore(layer);
  const geojsonObj = sanitized.geojson || { type: 'FeatureCollection', features: [] };
  const geoJsonString = JSON.stringify(geojsonObj);

  // Common metadata object without the raw nested geojson object
  const metadata = {
    id: sanitized.id,
    name: sanitized.name || 'Capa Territorial',
    filename: sanitized.filename || 'capa.kmz',
    category: sanitized.category || 'general',
    sector: sanitized.sector || null,
    threatType: sanitized.threatType || 'Capa Territorial',
    threatLevel: sanitized.threatLevel || 'medio',
    color: sanitized.color || '#15803D',
    opacity: typeof sanitized.opacity === 'number' ? sanitized.opacity : 0.85,
    isVisible: sanitized.isVisible !== false,
    featureCount: sanitized.featureCount || (geojsonObj.features ? geojsonObj.features.length : 0),
    bounds: sanitized.bounds || null,
    description: sanitized.description || '',
    uploadedBy: sanitized.uploadedBy || 'anon',
    uploadedByName: sanitized.uploadedByName || 'Usuario Comunal',
    createdAt: sanitized.createdAt || Date.now(),
    fileSize: sanitized.fileSize || 0,
    updatedAt: Date.now(),
  };

  // Case 1: Standard / Medium layer fits directly in one document
  if (geoJsonString.length <= MAX_DIRECT_STRING_CHARS) {
    const mainDoc = {
      ...metadata,
      isChunked: false,
      totalChunks: 0,
      geoJsonString: geoJsonString,
    };
    await setDoc(doc(db, 'layers', sanitized.id), mainDoc);
    return;
  }

  // Case 2: Very large KMZ layer (>500KB) -> Split GeoJSON string across chunks
  const totalChunks = Math.ceil(geoJsonString.length / CHUNK_STRING_CHARS);

  // 1. Write chunks in parallel to 'layer_chunks'
  const chunkWrites: Promise<void>[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkData = geoJsonString.substring(i * CHUNK_STRING_CHARS, (i + 1) * CHUNK_STRING_CHARS);
    const chunkDocId = `${sanitized.id}_chunk_${i}`;
    chunkWrites.push(
      setDoc(doc(db, 'layer_chunks', chunkDocId), {
        layerId: sanitized.id,
        chunkIndex: i,
        totalChunks: totalChunks,
        chunkData: chunkData,
        updatedAt: Date.now(),
      })
    );
  }
  await Promise.all(chunkWrites);

  // 2. Write main metadata layer doc in 'layers'
  const mainDoc = {
    ...metadata,
    isChunked: true,
    totalChunks: totalChunks,
    geoJsonString: '', // Empty in main doc since chunks store payload
  };

  await setDoc(doc(db, 'layers', sanitized.id), mainDoc);
}

/**
 * Reconstructs a full KmzLayer from Firestore doc, resolving chunks or JSON strings
 */
export async function resolveFullLayerFromFirestore(data: any): Promise<KmzLayer> {
  if (!data || !data.id) {
    return data;
  }

  let resolvedGeojson: GeoJsonCollection = {
    type: 'FeatureCollection',
    features: [],
  };

  try {
    // 1. If layer was chunked into 'layer_chunks'
    if (data.isChunked && data.totalChunks && data.totalChunks > 0) {
      const chunkPromises: Promise<any>[] = [];
      for (let i = 0; i < data.totalChunks; i++) {
        const chunkDocId = `${data.id}_chunk_${i}`;
        chunkPromises.push(getDoc(doc(db, 'layer_chunks', chunkDocId)));
      }

      const chunkSnapshots = await Promise.all(chunkPromises);
      const stringParts: string[] = [];
      const legacyFeatures: GeoJsonFeature[] = [];

      chunkSnapshots.forEach((snap) => {
        if (snap.exists()) {
          const chunkData = snap.data();
          if (chunkData) {
            if (typeof chunkData.chunkData === 'string') {
              stringParts.push(chunkData.chunkData);
            } else if (Array.isArray(chunkData.features)) {
              // Backward compatibility with legacy feature chunking
              legacyFeatures.push(...chunkData.features);
            }
          }
        }
      });

      if (stringParts.length > 0) {
        const fullString = stringParts.join('');
        resolvedGeojson = JSON.parse(fullString);
      } else if (legacyFeatures.length > 0) {
        resolvedGeojson = {
          type: 'FeatureCollection',
          features: legacyFeatures,
        };
      }
    } 
    // 2. If layer was stored as direct geoJsonString
    else if (typeof data.geoJsonString === 'string' && data.geoJsonString.trim().length > 0) {
      resolvedGeojson = JSON.parse(data.geoJsonString);
    } 
    // 3. Fallback: if doc has raw geojson (e.g. simple 1D points)
    else if (data.geojson && Array.isArray(data.geojson.features)) {
      resolvedGeojson = data.geojson;
    }
  } catch (err) {
    console.warn('Error reconstructing GeoJSON for layer:', data.id, err);
  }

  const featureCount = resolvedGeojson.features ? resolvedGeojson.features.length : (data.featureCount || 0);

  return {
    id: data.id,
    name: data.name || 'Capa Territorial',
    filename: data.filename || 'capa.kmz',
    category: data.category || 'general',
    sector: data.sector || undefined,
    threatType: data.threatType || 'Capa Territorial',
    threatLevel: data.threatLevel || 'medio',
    color: data.color || '#15803D',
    opacity: typeof data.opacity === 'number' ? data.opacity : 0.85,
    isVisible: data.isVisible !== false,
    geojson: resolvedGeojson,
    featureCount: featureCount,
    bounds: data.bounds || undefined,
    description: data.description || '',
    uploadedBy: data.uploadedBy || 'anon',
    uploadedByName: data.uploadedByName || 'Usuario Comunal',
    createdAt: data.createdAt || Date.now(),
    fileSize: data.fileSize || 0,
    isChunked: data.isChunked,
    totalChunks: data.totalChunks,
    updatedAt: data.updatedAt,
  };
}

/**
 * Deletes a layer and any associated chunks from Firestore
 */
export async function deleteLayerFromFirestore(layerId: string, totalChunks?: number): Promise<void> {
  // Delete main layer document
  try {
    await deleteDoc(doc(db, 'layers', layerId));
  } catch (err) {
    console.warn('Error deleting main layer doc from Firestore:', err);
  }

  // Delete chunks if chunked
  const chunkCount = totalChunks && totalChunks > 0 ? totalChunks : 30;
  for (let i = 0; i < chunkCount; i++) {
    try {
      const snap = await getDoc(doc(db, 'layer_chunks', `${layerId}_chunk_${i}`));
      if (snap.exists()) {
        await deleteDoc(doc(db, 'layer_chunks', `${layerId}_chunk_${i}`));
      } else if (!totalChunks) {
        break;
      }
    } catch {
      // ignore
    }
  }
}
