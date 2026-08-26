import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Flame, 
  Droplets, 
  Mountain, 
  Route, 
  X, 
  AlertOctagon, 
  SlidersHorizontal,
  RotateCcw,
  Check,
  ChevronDown,
  Home,
  Accessibility,
  Waves
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { ThreatCategory, ThreatLevel } from '../types';

export const ThreatFilters: React.FC = () => {
  const { filterState, setFilterState, layers, riskPoints } = useData();
  const [expanded, setExpanded] = useState(false);
  const [showSectorsList, setShowSectorsList] = useState(false);

  // Top category configuration strictly following PDF guidelines
  const categoriesConfig: { id: ThreatCategory | 'pmr'; label: string; icon: any; color: string; activeBg: string }[] = [
    { id: 'sectores', label: 'Sectores / Familias', icon: Home, color: 'text-indigo-600', activeBg: 'bg-indigo-700 text-white border-indigo-700' },
    { id: 'incendios', label: 'Incendios', icon: Flame, color: 'text-red-500', activeBg: 'bg-red-600 text-white border-red-600' },
    { id: 'inundaciones', label: 'Inundaciones', icon: Droplets, color: 'text-blue-500', activeBg: 'bg-blue-600 text-white border-blue-600' },
    { id: 'remocion_masa', label: 'Remoción Masa', icon: Mountain, color: 'text-amber-600', activeBg: 'bg-amber-600 text-white border-amber-600' },
    { id: 'rutas_evacuacion', label: 'Corte Ruta / Evacuación', icon: Route, color: 'text-emerald-600', activeBg: 'bg-emerald-700 text-white border-emerald-700' },
    { id: 'deficit_hidrico', label: 'Déficit Hídrico', icon: Waves, color: 'text-cyan-600', activeBg: 'bg-cyan-700 text-white border-cyan-700' },
    { id: 'pmr', label: 'PMR (Movilidad Reducida)', icon: Accessibility, color: 'text-purple-600', activeBg: 'bg-purple-700 text-white border-purple-700' },
  ];

  const levelsConfig: { id: ThreatLevel; label: string; bg: string; border: string }[] = [
    { id: 'critico', label: 'Crítico', bg: 'bg-red-600 text-white', border: 'border-red-600' },
    { id: 'alto', label: 'Alto', bg: 'bg-orange-500 text-white', border: 'border-orange-500' },
    { id: 'medio', label: 'Medio', bg: 'bg-amber-500 text-white', border: 'border-amber-500' },
    { id: 'bajo', label: 'Bajo', bg: 'bg-emerald-600 text-white', border: 'border-emerald-600' },
  ];

  // Dynamic list of sectors derived strictly from uploaded KMZ layers
  const availableSectors = useMemo(() => {
    const sectorSet = new Set<string>();

    // Derive sectors exclusively from uploaded KMZ layers
    layers.forEach((l) => {
      // 1. Explicit sector on the layer
      if (l.sector && l.sector.trim().length > 0) {
        sectorSet.add(l.sector.trim());
      }

      // 2. Sector inside Placemark/Feature properties in KMZ
      l.geojson?.features?.forEach((f) => {
        if (f.properties?.sector && typeof f.properties.sector === 'string' && f.properties.sector.trim().length > 0) {
          sectorSet.add(f.properties.sector.trim());
        }
      });

      // 3. Extract sector from layer name if named "Sector <Name>" or clean filename
      const match = l.name.match(/(?:sector|localidad|zona|fundo)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s-]{2,30})/i);
      if (match && match[1]) {
        const cleaned = match[1].trim().split(/[\.,\(\)_-]/)[0].trim();
        if (cleaned.length >= 2) sectorSet.add(cleaned);
      } else if (!l.sector && l.name) {
        const cleanName = l.name.replace(/\.(kmz|kml|geojson|json)$/i, '').replace(/_/g, ' ').trim();
        if (cleanName.length > 0 && cleanName.length <= 35) {
          sectorSet.add(cleanName);
        }
      }
    });

    // Also include sectors from existing risk points if any
    riskPoints.forEach((p) => {
      if (p.sector && p.sector.trim().length > 0) {
        sectorSet.add(p.sector.trim());
      }
    });

    return Array.from(sectorSet).sort((a, b) => a.localeCompare(b));
  }, [layers, riskPoints]);

  const handleCategoryClick = (catId: ThreatCategory | 'pmr') => {
    if (catId === 'pmr') {
      setFilterState((prev) => ({
        ...prev,
        filterPmrOnly: !prev.filterPmrOnly,
      }));
      return;
    }

    setFilterState((prev) => {
      const isCurrentlyActive = prev.activeSpecificCategory === catId;
      const newActive = isCurrentlyActive ? null : catId;
      
      const existsInCategories = prev.categories.includes(catId as ThreatCategory);
      const newCategories = isCurrentlyActive 
        ? prev.categories.filter(c => c !== catId)
        : [...prev.categories.filter(c => c !== catId), catId as ThreatCategory];

      return {
        ...prev,
        activeSpecificCategory: newActive,
        categories: newCategories,
      };
    });
  };

  const toggleSector = (sectorName: string) => {
    setFilterState((prev) => {
      const exists = prev.selectedSectors.includes(sectorName);
      return {
        ...prev,
        selectedSectors: exists
          ? prev.selectedSectors.filter((s) => s !== sectorName)
          : [...prev.selectedSectors, sectorName],
      };
    });
  };

  const toggleLevel = (lvl: ThreatLevel) => {
    setFilterState((prev) => {
      const isSelected = prev.threatLevels.includes(lvl);
      const newThreatLevels = isSelected
        ? prev.threatLevels.filter((l) => l !== lvl)
        : [...prev.threatLevels, lvl];
      
      return {
        ...prev,
        threatLevels: newThreatLevels,
        activeSpecificSeverity: isSelected ? null : lvl,
      };
    });
  };

  const toggleLayer = (layerId: string) => {
    setFilterState((prev) => {
      const exists = prev.selectedLayerIds.includes(layerId);
      return {
        ...prev,
        selectedLayerIds: exists
          ? prev.selectedLayerIds.filter((id) => id !== layerId)
          : [...prev.selectedLayerIds, layerId],
      };
    });
  };

  const resetFilters = () => {
    setFilterState({
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
    });
  };

  const hasActiveFilters = 
    filterState.categories.length > 0 ||
    filterState.threatLevels.length > 0 ||
    filterState.selectedLayerIds.length > 0 ||
    filterState.selectedSectors.length > 0 ||
    filterState.searchKeyword.trim() !== '' ||
    filterState.onlyCritical ||
    Boolean(filterState.filterPmrOnly) ||
    Boolean(filterState.activeSpecificCategory) ||
    Boolean(filterState.activeSpecificSeverity) ||
    filterState.statuses.length > 0;

  return (
    <div id="threat-filters-bar" className="bg-white border-b border-slate-200 px-3 py-2 z-20 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        
        {/* Main Filter Bar: Search + Quick Category Chips + Sectors Toggle + Critical Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-threats"
              type="text"
              placeholder="Buscar sector, familia, amenaza..."
              value={filterState.searchKeyword}
              onChange={(e) => setFilterState((prev) => ({ ...prev, searchKeyword: e.target.value }))}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            {filterState.searchKeyword && (
              <button
                onClick={() => setFilterState((prev) => ({ ...prev, searchKeyword: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Threat Category Pills Strictly matching requested list */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            {categoriesConfig.map((cat) => {
              const Icon = cat.icon;
              const isSelected = 
                cat.id === 'pmr'
                  ? Boolean(filterState.filterPmrOnly)
                  : filterState.activeSpecificCategory === cat.id || filterState.categories.includes(cat.id as ThreatCategory);

              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? `${cat.activeBg} shadow-xs scale-102`
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : cat.color}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

            {/* Sector Multi-Select Quick Button */}
          <div className="relative">
            <button
              id="btn-filter-sectores-dropdown"
              onClick={() => setShowSectorsList(!showSectorsList)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                filterState.selectedSectors.length > 0
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-xs ring-1 ring-indigo-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Filtrar por sectores con capas KMZ cargadas"
            >
              <Home className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sectores ({availableSectors.length})</span>
              {filterState.selectedSectors.length > 0 && (
                <span className="bg-indigo-600 text-white px-1.5 py-0.2 text-[10px] rounded-full font-mono font-black">
                  {filterState.selectedSectors.length}
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Sectors Dropdown / Modal for Mobile and Desktop */}
            {showSectorsList && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs sm:bg-transparent" 
                  onClick={() => setShowSectorsList(false)} 
                />
                <div 
                  id="dropdown-sectores-panel"
                  className="fixed inset-x-3 top-20 sm:top-full sm:absolute sm:inset-auto sm:left-0 sm:mt-2 w-auto sm:w-84 max-w-sm mx-auto sm:mx-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                    <div>
                      <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
                        <Home className="w-4 h-4 text-indigo-600" />
                        Sectores Territoriales ({availableSectors.length})
                      </h5>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        Selecciona uno o varios sectores para filtrar
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSectorsList(false)}
                      className="text-slate-400 hover:text-slate-700 p-1.5 cursor-pointer rounded-xl hover:bg-slate-100 transition-colors"
                      title="Cerrar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Actions Header: Select All / Clear */}
                  {availableSectors.length > 1 && (
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          const allSelected = availableSectors.every(s => filterState.selectedSectors.includes(s));
                          setFilterState(prev => ({
                            ...prev,
                            selectedSectors: allSelected ? [] : [...availableSectors]
                          }));
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                      >
                        {availableSectors.every(s => filterState.selectedSectors.includes(s))
                          ? 'Deseleccionar todos'
                          : 'Seleccionar todos'}
                      </button>
                      {filterState.selectedSectors.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilterState(prev => ({ ...prev, selectedSectors: [] }))}
                          className="text-red-600 hover:text-red-700 font-medium cursor-pointer"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  )}

                  <div className="max-h-64 sm:max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {availableSectors.length === 0 ? (
                      <div className="text-center py-6 px-2 text-slate-400">
                        <Home className="w-7 h-7 mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-semibold text-slate-700 text-xs">Sin sectores registrados</p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          Carga un archivo KMZ con sectores o registra puntos en el mapa.
                        </p>
                      </div>
                    ) : (
                      availableSectors.map((sec) => {
                        const isSelected = filterState.selectedSectors.includes(sec);
                        return (
                          <button
                            key={sec}
                            onClick={() => toggleSector(sec)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200 shadow-xs'
                                : 'text-slate-700 hover:bg-slate-50 border border-slate-100'
                            }`}
                          >
                            <span className="truncate pr-2 font-medium">{sec}</span>
                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {filterState.selectedSectors.length > 0 && (
                    <div className="pt-3 mt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-indigo-800 font-bold">
                        {filterState.selectedSectors.length} sector(es) activos
                      </span>
                      <button
                        onClick={() => setShowSectorsList(false)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition-colors text-xs"
                      >
                        Aplicar Filtro
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Severity & Advanced Filter Toggles */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Quick Critical Filter Button */}
            <button
              id="btn-critical-filter"
              onClick={() => setFilterState((prev) => ({ ...prev, onlyCritical: !prev.onlyCritical }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                filterState.onlyCritical
                  ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <AlertOctagon className={`w-3.5 h-3.5 ${filterState.onlyCritical ? 'text-white' : 'text-red-500'}`} />
              <span className="hidden sm:inline">Críticos</span>
            </button>

            {/* Expand Advanced Filters */}
            <button
              id="btn-expand-filters"
              onClick={() => setExpanded(!expanded)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
                expanded || hasActiveFilters
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Nivel / Capas</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              )}
            </button>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                id="btn-reset-filters"
                onClick={resetFilters}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Limpiar todos los filtros"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

        {/* Active Filters Summary Chips Bar */}
        {(filterState.selectedSectors.length > 0 || filterState.activeSpecificCategory || filterState.filterPmrOnly || filterState.threatLevels.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              Filtro Activo:
            </span>

            {/* Active Sectors */}
            {filterState.selectedSectors.map((sector) => (
              <span
                key={sector}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold text-xs"
              >
                <span>📍 {sector}</span>
                <button
                  onClick={() => toggleSector(sector)}
                  className="text-indigo-400 hover:text-indigo-700 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Active PMR Filter */}
            {filterState.filterPmrOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 font-semibold text-xs">
                <span>♿ Solo PMR (Movilidad Reducida)</span>
                <button
                  onClick={() => setFilterState(prev => ({ ...prev, filterPmrOnly: false }))}
                  className="text-purple-400 hover:text-purple-700 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Active Category */}
            {filterState.activeSpecificCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs">
                <span>Amenaza: {filterState.activeSpecificCategory}</span>
                <button
                  onClick={() => setFilterState(prev => ({ ...prev, activeSpecificCategory: null }))}
                  className="text-emerald-400 hover:text-emerald-700 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Active Severity Levels */}
            {filterState.threatLevels.map((lvl) => (
              <span
                key={lvl}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 font-semibold text-xs"
              >
                <span>Nivel: {lvl.toUpperCase()}</span>
                <button
                  onClick={() => toggleLevel(lvl)}
                  className="text-orange-400 hover:text-orange-700 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <button
              onClick={resetFilters}
              className="text-[11px] text-emerald-700 hover:text-emerald-950 font-bold ml-auto underline cursor-pointer"
            >
              Limpiar todos los filtros
            </button>
          </div>
        )}

        {/* Clean Expanded Filter Panel: Severity + KMZ Layer selector (Redundant Category row removed!) */}
        {expanded && (
          <div id="expanded-filter-panel" className="pt-2 pb-1 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-in fade-in duration-150">
            
            {/* Severity Level Filter */}
            <div>
              <span className="block font-bold text-slate-700 mb-1.5">Nivel de Riesgo / Severidad de la Amenaza:</span>
              <div className="flex flex-wrap gap-1.5">
                {levelsConfig.map((lvl) => {
                  const isSelected = filterState.threatLevels.includes(lvl.id);
                  return (
                    <button
                      key={lvl.id}
                      onClick={() => toggleLevel(lvl.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isSelected
                          ? `${lvl.bg} ${lvl.border} shadow-xs scale-102`
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter by KMZ File Layer */}
            <div>
              <span className="block font-bold text-slate-700 mb-1.5">Capas Cartográficas KMZ Cargadas ({layers.length}):</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {layers.length === 0 ? (
                  <span className="text-slate-400 text-[11px] italic">No hay capas KMZ cargadas aún</span>
                ) : (
                  layers.map((layer) => {
                    const isSelected = filterState.selectedLayerIds.includes(layer.id);
                    return (
                      <button
                        key={layer.id}
                        onClick={() => toggleLayer(layer.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium truncate max-w-[220px] border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-800 text-white border-emerald-800 font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={layer.name}
                      >
                        {layer.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

