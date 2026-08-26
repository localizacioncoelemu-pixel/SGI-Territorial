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
import { KmzLayer, GeoJsonFeature } from '../types';
import { sanitizeForFirestore } from './layerStorage';

const MAX_DIRECT_DOC_BYTES = 700000; // ~700 KB safe limit for Firestore (1MB max)
const FEATURES_PER_CHUNK = 60; // Max features per chunk

/**
 * Saves a KMZ layer to Firestore safely.
 * If the layer's GeoJSON payload exceeds Firestore's document size limit,
 * it splits features into chunks in the 'layer_chunks' collection so that
 * no upload ever fails and all connected devices receive the complete layer.
 */
export async function saveLayerToFirestore(layer: KmzLayer): Promise<void> {
  const sanitized = sanitizeForFirestore(layer);
  const jsonStr = JSON.stringify(sanitized);

  // Check if it fits in a single document
  if (jsonStr.length < MAX_DIRECT_DOC_BYTES && sanitized.geojson.features.length <= 150) {
    const mainDoc = {
      ...sanitized,
      isChunked: false,
      totalChunks: 0,
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, 'layers', sanitized.id), mainDoc);
    return;
  }

  // Layer is large -> Split features into chunks
  const allFeatures = sanitized.geojson.features || [];
  const totalChunks = Math.ceil(allFeatures.length / FEATURES_PER_CHUNK);

  // 1. Write all feature chunks to 'layer_chunks'
  for (let i = 0; i < totalChunks; i++) {
    const chunkFeatures = allFeatures.slice(i * FEATURES_PER_CHUNK, (i + 1) * FEATURES_PER_CHUNK);
    const chunkDocId = `${sanitized.id}_chunk_${i}`;
    await setDoc(doc(db, 'layer_chunks', chunkDocId), {
      layerId: sanitized.id,
      chunkIndex: i,
      totalChunks: totalChunks,
      features: chunkFeatures,
      updatedAt: Date.now(),
    });
  }

  // 2. Write main metadata layer doc (with empty features array)
  const mainDoc: KmzLayer = {
    ...sanitized,
    isChunked: true,
    totalChunks: totalChunks,
    updatedAt: Date.now(),
    geojson: {
      type: 'FeatureCollection',
      features: [], // Features stored in chunks
    },
  };

  await setDoc(doc(db, 'layers', sanitized.id), mainDoc);
}

/**
 * Reconstructs a full KmzLayer from Firestore doc, fetching chunks if necessary
 */
export async function resolveFullLayerFromFirestore(layerData: KmzLayer): Promise<KmzLayer> {
  if (!layerData.isChunked || !layerData.totalChunks || layerData.totalChunks <= 0) {
    return layerData;
  }

  // Fetch all chunks in parallel
  const chunkPromises: Promise<any>[] = [];
  for (let i = 0; i < layerData.totalChunks; i++) {
    const chunkDocId = `${layerData.id}_chunk_${i}`;
    chunkPromises.push(getDoc(doc(db, 'layer_chunks', chunkDocId)));
  }

  try {
    const chunkSnapshots = await Promise.all(chunkPromises);
    const assembledFeatures: GeoJsonFeature[] = [];

    chunkSnapshots.forEach((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.features)) {
          assembledFeatures.push(...data.features);
        }
      }
    });

    return {
      ...layerData,
      geojson: {
        type: 'FeatureCollection',
        features: assembledFeatures,
      },
      featureCount: assembledFeatures.length,
    };
  } catch (err) {
    console.warn('Error resolving layer chunks for layer:', layerData.id, err);
    return layerData;
  }
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
  if (totalChunks && totalChunks > 0) {
    for (let i = 0; i < totalChunks; i++) {
      try {
        await deleteDoc(doc(db, 'layer_chunks', `${layerId}_chunk_${i}`));
      } catch {
        // ignore
      }
    }
  } else {
    // Attempt deleting potential chunks up to 20
    for (let i = 0; i < 20; i++) {
      try {
        const snap = await getDoc(doc(db, 'layer_chunks', `${layerId}_chunk_${i}`));
        if (snap.exists()) {
          await deleteDoc(doc(db, 'layer_chunks', `${layerId}_chunk_${i}`));
        } else {
          break;
        }
      } catch {
        break;
      }
    }
  }
}
