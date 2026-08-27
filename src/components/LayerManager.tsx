import React, { useState, useRef, useMemo } from 'react';
import { 
  UploadCloud, 
  Layers, 
  Eye, 
  EyeOff, 
  Trash2, 
  Maximize2, 
  Palette, 
  Sliders, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Info,
  Download,
  Flame,
  Droplets,
  Mountain,
  Route,
  Building2,
  ShieldCheck,
  RefreshCw,
  Home,
  Tag,
  Search,
  Edit3,
  Cloud,
  CloudCheck
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { parseKmzOrKmlFile, getCategoryLabel, getThreatLevelBadge, getDefaultCategoryColor } from '../services/kmzParser';
import { KmzLayer, ThreatCategory, ThreatLevel } from '../types';

interface LayerManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LayerManager: React.FC<LayerManagerProps> = ({ isOpen, onClose }) => {
  const { layers, addLayer, updateLayer, toggleLayerVisibility, deleteLayer, setMapFlyTo, syncAllLayersToCloud, isSyncing } = useData();
  const { user, isAdmin } = useAuth();

  const [isUploading, setIsUploading] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'upload'>('list');
  const [isDragging, setIsDragging] = useState(false);
  const [layerToDelete, setLayerToDelete] = useState<KmzLayer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [layerSearch, setLayerSearch] = useState('');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editSectorVal, setEditSectorVal] = useState('');
  const [editCategoryVal, setEditCategoryVal] = useState<ThreatCategory>('sectores');
  const [editThreatLevelVal, setEditThreatLevelVal] = useState<ThreatLevel>('medio');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sector pre-selection for upload
  const [uploadSector, setUploadSector] = useState('');
  const [uploadCategory, setUploadCategory] = useState<ThreatCategory>('sectores');

  const filteredLayersList = useMemo(() => {
    if (!layerSearch.trim()) return layers;
    const q = layerSearch.toLowerCase();
    return layers.filter(l => 
      l.name.toLowerCase().includes(q) ||
      (l.sector || '').toLowerCase().includes(q) ||
      l.category.toLowerCase().includes(q) ||
      l.filename.toLowerCase().includes(q)
    );
  }, [layers, layerSearch]);

  if (!isOpen) return null;

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setUploadError(msg);
      setUploadSuccess(null);
    } else {
      setUploadSuccess(msg);
      setUploadError(null);
    }
    setTimeout(() => {
      setUploadSuccess(null);
      setUploadError(null);
    }, 4500);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    let successCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const parsedLayer = await parseKmzOrKmlFile(
          file, 
          user?.uid || 'anon', 
          user?.displayName || 'Usuario'
        );

        // If user specified an explicit sector or category on upload, apply it
        if (uploadSector.trim()) {
          parsedLayer.sector = uploadSector.trim();
        }
        if (uploadCategory) {
          parsedLayer.category = uploadCategory;
        }

        await addLayer(parsedLayer);
        successCount++;
        
        // Auto fly to first layer
        if (parsedLayer.bounds) {
          const centerLat = (parsedLayer.bounds[0] + parsedLayer.bounds[2]) / 2;
          const centerLng = (parsedLayer.bounds[1] + parsedLayer.bounds[3]) / 2;
          setMapFlyTo({ lat: centerLat, lng: centerLng, zoom: 13 });
        }
      }
      showNotification(`Se cargaron e integraron exitosamente ${successCount} capa(s) KMZ/KML al almacenamiento.`);
      setActiveTab('list');
      setUploadSector('');
    } catch (err: any) {
      console.error('KMZ upload error:', err);
      showNotification(err.message || 'Error al procesar el archivo KMZ/KML.', true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDeleteLayer = async () => {
    if (!layerToDelete) return;
    setIsDeleting(true);
    try {
      const layerName = layerToDelete.name;
      await deleteLayer(layerToDelete.id);
      setLayerToDelete(null);
      showNotification(`Capa "${layerName}" eliminada correctamente del almacenamiento.`);
    } catch (err: any) {
      console.error('Error deleting layer:', err);
      showNotification(err.message || 'Error al eliminar la capa.', true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleForceSync = async () => {
    setIsManualSyncing(true);
    try {
      const count = await syncAllLayersToCloud();
      showNotification(`Sincronización en la nube completada. ${count} capa(s) actualizadas en Firebase para todos los equipos.`);
    } catch (err: any) {
      console.error('Error in manual sync:', err);
      showNotification(`Error al sincronizar con la nube: ${err.message || err}`, true);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleStartEdit = (layer: KmzLayer) => {
    setEditingLayerId(layer.id);
    setEditSectorVal(layer.sector || '');
    setEditCategoryVal(layer.category);
    setEditThreatLevelVal(layer.threatLevel);
  };

  const handleSaveEdit = async (layerId: string) => {
    try {
      await updateLayer(layerId, {
        sector: editSectorVal.trim() || undefined,
        category: editCategoryVal,
        threatLevel: editThreatLevelVal,
      });
      setEditingLayerId(null);
      showNotification('Capa actualizada correctamente.');
    } catch (e: any) {
      showNotification(e.message || 'Error al actualizar la capa', true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleZoomToLayer = (layer: KmzLayer) => {
    if (layer.bounds) {
      const centerLat = (layer.bounds[0] + layer.bounds[2]) / 2;
      const centerLng = (layer.bounds[1] + layer.bounds[3]) / 2;
      setMapFlyTo({ lat: centerLat, lng: centerLng, zoom: 14 });
      onClose();
    } else if (layer.geojson.features.length > 0) {
      const firstCoords = layer.geojson.features[0].geometry?.coordinates;
      if (Array.isArray(firstCoords) && typeof firstCoords[0] === 'number') {
        setMapFlyTo({ lat: firstCoords[1], lng: firstCoords[0], zoom: 14 });
        onClose();
      }
    }
  };

  const handleDownloadGeoJSON = (layer: KmzLayer) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(layer.geojson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${layer.filename.replace(/\.[^/.]+$/, "")}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="layer-manager-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden relative"
      >
        
        {/* Modal Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center">
              <Layers className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight leading-tight">
                Gestor de Capas de Información Geográfica (KMZ / KML)
              </h3>
              <p className="text-xs text-emerald-200/90 leading-tight">
                Almacenamiento y organización de capas territoriales y sectores
              </p>
            </div>
          </div>
          <button
            id="btn-close-layer-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Layer Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-2.5">
          <div className="flex items-center gap-2">
            <button
              id="tab-active-layers"
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Capas en Almacenamiento ({layers.length})
            </button>
            <button
              id="tab-upload-kmz"
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Cargar Nuevo KMZ
            </button>
          </div>

          {activeTab === 'list' && layers.length > 0 && (
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar capa o sector..."
                value={layerSearch}
                onChange={(e) => setLayerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Error:</span>
                {uploadError}
              </div>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Operación exitosa:</span>
                {uploadSuccess}
              </div>
            </div>
          )}

          {/* TAB 1: LIST LAYERS */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {/* Cloud Sync Status Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block leading-tight">
                      Sincronización en la Nube Firebase Activa
                    </span>
                    <span className="text-[11px] text-emerald-700 block leading-tight mt-0.5">
                      Las capas cargadas se sincronizan automáticamente entre todos los celulares, tablets y PCs conectados.
                    </span>
                  </div>
                </div>

                <button
                  id="btn-force-cloud-sync"
                  onClick={handleForceSync}
                  disabled={isManualSyncing || isSyncing}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ml-auto"
                  title="Forzar actualización de todas las capas locales a la nube"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing || isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isManualSyncing || isSyncing ? 'Sincronizando...' : 'Sincronizar con la Nube'}</span>
                </button>
              </div>

              {layers.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-6">
                  <Layers className="w-12 h-12 text-slate-400 mx-auto mb-2 opacity-60" />
                  <h4 className="font-bold text-slate-800 text-sm">No hay capas en el almacenamiento</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                    El sistema solo mostrará las capas KMZ o KML que tú subas directamente al almacenamiento.
                  </p>
                  <button
                    id="btn-empty-upload-kmz"
                    onClick={() => setActiveTab('upload')}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Cargar mi primer archivo KMZ / KML</span>
                  </button>
                </div>
              ) : filteredLayersList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No se encontraron capas que coincidan con "{layerSearch}".
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredLayersList.map((layer) => {
                    const badge = getThreatLevelBadge(layer.threatLevel);
                    const isEditing = editingLayerId === layer.id;

                    return (
                      <div 
                        key={layer.id}
                        id={`layer-card-${layer.id}`}
                        className={`p-3.5 rounded-xl border transition-all ${
                          layer.isVisible 
                            ? 'bg-white border-slate-200 shadow-xs hover:border-emerald-300' 
                            : 'bg-slate-50/80 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            {/* Visibility Toggle */}
                            <button
                              id={`btn-toggle-vis-${layer.id}`}
                              onClick={() => toggleLayerVisibility(layer.id)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                layer.isVisible
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-200 text-slate-500 border-slate-300'
                              }`}
                              title={layer.isVisible ? 'Ocultar capa en el mapa' : 'Mostrar capa en el mapa'}
                            >
                              {layer.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-slate-900 text-sm truncate leading-tight">
                                  {layer.name}
                                </h4>

                                {/* Sector Tag */}
                                {layer.sector && (
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[10px] flex items-center gap-1">
                                    <Home className="w-3 h-3 text-indigo-500" />
                                    {layer.sector}
                                  </span>
                                )}

                                {/* Category Tag */}
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]">
                                  {getCategoryLabel(layer.category)}
                                </span>
                              </div>

                              <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                                {layer.filename} ({layer.featureCount} elementos)
                              </span>
                            </div>
                          </div>

                          {/* Threat Badge */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg} border flex-shrink-0`}>
                            {badge.label}
                          </span>

                        </div>

                        {/* Inline Layer Editor (Sector & Category Assignment) */}
                        {isEditing ? (
                          <div className="my-2 p-3 bg-slate-50 border border-indigo-100 rounded-xl space-y-2 text-xs">
                            <h5 className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                              Editar Etiqueta de Sector y Categoría
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Sector / Localidad (ej. Burca, Guarilihue):
                                </label>
                                <input
                                  type="text"
                                  placeholder="Nombre del sector..."
                                  value={editSectorVal}
                                  onChange={(e) => setEditSectorVal(e.target.value)}
                                  className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Categoría de Capa:
                                </label>
                                <select
                                  value={editCategoryVal}
                                  onChange={(e) => setEditCategoryVal(e.target.value as ThreatCategory)}
                                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                                >
                                  <option value="sectores">Sectores / Familias / Viviendas</option>
                                  <option value="incendios">Incendios Forestales</option>
                                  <option value="inundaciones">Inundaciones / Cauces</option>
                                  <option value="remocion_masa">Remoción en Masa / Deslizamiento</option>
                                  <option value="rutas_evacuacion">Rutas de Evacuación</option>
                                  <option value="infraestructura_critica">Infraestructura Crítica</option>
                                  <option value="albergues">Albergues y Puntos de Encuentro</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Nivel de Amenaza:
                                </label>
                                <select
                                  value={editThreatLevelVal}
                                  onChange={(e) => setEditThreatLevelVal(e.target.value as ThreatLevel)}
                                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                                >
                                  <option value="critico">Crítico</option>
                                  <option value="alto">Alto</option>
                                  <option value="medio">Medio</option>
                                  <option value="bajo">Bajo</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingLayerId(null)}
                                className="px-2.5 py-1 text-[11px] bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(layer.id)}
                                className="px-3 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs"
                              >
                                Guardar Cambios
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {/* Description */}
                        {layer.description && !isEditing && (
                          <p className="text-xs text-slate-600 mb-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            {layer.description}
                          </p>
                        )}

                        {/* Controls Toolbar: Color, Opacity, Category, Zoom & Delete */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                          
                          <div className="flex items-center gap-3">
                            {/* Color Selector */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-500 font-medium">Color:</span>
                              <input
                                type="color"
                                value={layer.color}
                                onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer border border-slate-300 p-0"
                                title="Cambiar color de capa"
                              />
                            </div>

                            {/* Opacity Slider */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-500 font-medium">Opacidad:</span>
                              <input
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={layer.opacity}
                                onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
                                className="w-16 accent-emerald-600 cursor-pointer"
                              />
                              <span className="text-[10px] text-slate-400 font-mono">
                                {Math.round(layer.opacity * 100)}%
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto">
                            {/* Edit Sector/Category button */}
                            <button
                              onClick={() => handleStartEdit(layer)}
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Editar sector o categoría de esta capa"
                            >
                              <Edit3 className="w-3 h-3 text-indigo-600" />
                              <span>Editar Sector</span>
                            </button>

                            {/* Zoom to layer */}
                            <button
                              id={`btn-zoom-${layer.id}`}
                              onClick={() => handleZoomToLayer(layer)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Centrar mapa en esta capa"
                            >
                              <Maximize2 className="w-3 h-3 text-emerald-700" />
                              Centrar
                            </button>

                            {/* Download GeoJSON */}
                            <button
                              id={`btn-download-${layer.id}`}
                              onClick={() => handleDownloadGeoJSON(layer)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
                              title="Descargar GeoJSON de la capa"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Layer Button */}
                            <button
                              id={`btn-delete-layer-${layer.id}`}
                              onClick={() => setLayerToDelete(layer)}
                              className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Eliminar permanentemente esta capa"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span>Eliminar</span>
                            </button>
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD KMZ */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              
              {/* Optional Pre-Upload Metadata Settings */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-700" />
                  Asignación de Sector y Categoría para la Carga (Opcional):
                </h5>
                <p className="text-[11px] text-slate-500">
                  Puedes especificar a qué sector o categoría pertenece el KMZ antes de subirlo (ej. Sector Burca), o dejarlo vacío para que se auto-detecte del nombre del archivo.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Sector / Localidad (ej. Burca, Guarilihue):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Burca, Ranguelmo, Perales..."
                      value={uploadSector}
                      onChange={(e) => setUploadSector(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Categoría de Información:
                    </label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value as ThreatCategory)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="sectores">Sectores / Familias / Viviendas</option>
                      <option value="incendios">Incendios Forestales</option>
                      <option value="inundaciones">Inundaciones / Cauces</option>
                      <option value="remocion_masa">Remoción en Masa / Deslizamiento</option>
                      <option value="rutas_evacuacion">Rutas de Evacuación</option>
                      <option value="infraestructura_critica">Infraestructura Crítica</option>
                      <option value="albergues">Albergues y Puntos de Encuentro</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                id="drop-zone-kmz"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
                    : 'border-slate-300 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".kmz,.kml,.geojson,.json"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                
                <UploadCloud className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-emerald-600 animate-bounce' : 'text-slate-400'}`} />
                <h4 className="font-bold text-slate-800 text-base">
                  {isUploading ? 'Procesando y almacenando archivo KMZ...' : 'Arrastra y suelta tus archivos KMZ o KML aquí'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Compatible con capas de Google Earth (.kmz, .kml), rutas de evacuación, polígonos de catastro, y archivos GeoJSON.
                </p>
                <button
                  type="button"
                  disabled={isUploading}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  {isUploading ? 'Procesando archivo...' : 'Seleccionar Archivos de mi Equipo'}
                </button>
              </div>

              {/* Instructions Guide */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs space-y-2 text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <Info className="w-4 h-4 text-emerald-700" />
                  <span>Almacenamiento exclusivo de tus capas:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 text-[11px]">
                  <li>Solo se cargarán y mantendrán en el mapa las capas geográficas que tú agregues.</li>
                  <li>Las capas se almacenan de forma segura tanto en la base de datos como en almacenamiento local para acceso inmediato.</li>
                  <li>Puedes eliminar cualquier capa en cualquier momento haciendo clic en el botón <strong>Eliminar</strong>.</li>
                </ul>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            {layers.length} capa(s) registrada(s) por el usuario
          </span>
          <button
            id="btn-close-modal-bottom"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

        {/* IN-APP CONFIRMATION MODAL FOR DELETING LAYER */}
        {layerToDelete && (
          <div className="absolute inset-0 z-60 bg-slate-950/70 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in zoom-in-95 duration-150">
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">¿Eliminar Capa del Almacenamiento?</h4>
                  <p className="text-slate-500 text-[11px]">Esta acción borrará la capa del mapa y del almacenamiento.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-700">
                <p>
                  Estás a punto de eliminar la capa: <strong>"{layerToDelete.name}"</strong>
                </p>
                <p className="text-slate-500 text-[11px]">
                  Archivo: {layerToDelete.filename} ({layerToDelete.featureCount} elementos geográficos)
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setLayerToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-delete-layer"
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteLayer}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar Capa'}</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
