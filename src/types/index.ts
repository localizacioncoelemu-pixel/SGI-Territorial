export type ThreatCategory = 
  | 'incendios'
  | 'inundaciones'
  | 'remocion_masa'
  | 'rutas_evacuacion'
  | 'deficit_hidrico'
  | 'pmr'
  | 'infraestructura_critica'
  | 'albergues'
  | 'poblacion_vulnerable'
  | 'recursos_emergencia'
  | 'sectores'
  | 'general';

export type ThreatLevel = 'critico' | 'alto' | 'medio' | 'bajo' | 'informativo' | 'no_aplica';

export type PointStatus = 'activo' | 'en_mitigacion' | 'monitoreado' | 'resuelto';

export type UserRole = 'admin' | 'usuario';

export interface HazardEvaluation {
  incendio?: ThreatLevel;
  inundacion?: ThreatLevel;
  remocion_masa?: ThreatLevel;
  corte_ruta?: ThreatLevel;
  deficit_hidrico?: ThreatLevel;
  [key: string]: ThreatLevel | undefined;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department?: string;
  phone?: string;
  status: 'active' | 'pending' | 'inactive';
  passwordHint?: string;
  createdAt: number;
  lastLogin?: number;
}

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates?: any;
    geometries?: any[];
  };
  properties: {
    name?: string;
    description?: string;
    threatType?: string;
    threatLevel?: ThreatLevel;
    category?: ThreatCategory;
    style?: {
      color?: string;
      weight?: number;
      opacity?: number;
      fillColor?: string;
      fillOpacity?: number;
    };
    [key: string]: any;
  };
}

export interface GeoJsonCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export interface KmzLayer {
  id: string;
  name: string;
  filename: string;
  category: ThreatCategory;
  sector?: string;
  threatType: string;
  threatLevel: ThreatLevel;
  color: string;
  opacity: number;
  isVisible: boolean;
  geojson: GeoJsonCollection;
  featureCount: number;
  bounds?: [number, number, number, number]; // [minLat, minLng, maxLat, maxLng]
  description?: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: number;
  fileSize?: number;
  isChunked?: boolean;
  totalChunks?: number;
  updatedAt?: number;
}

export interface RiskPoint {
  id: string;
  title: string;
  threatType: string;
  category: ThreatCategory;
  riskLevel: ThreatLevel;
  hazardEvaluations?: HazardEvaluation;
  coordinates: {
    lat: number;
    lng: number;
  };
  elevation?: number;
  sector: string;
  comuna: string;
  description: string;
  status: PointStatus;
  actionsRequired?: string;
  responsibleEntity?: string;
  contactPhone?: string;
  householdHead?: string;
  residentsCount?: number;
  // PMR: Personas con Movilidad Reducida
  hasPmr?: boolean;
  pmrCount?: number;
  pmrDetails?: string;
  sourceLayerId?: string;
  sourceLayerName?: string;
  images?: string[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  createdByName: string;
}

export interface FilterState {
  categories: ThreatCategory[];
  threatLevels: ThreatLevel[];
  selectedLayerIds: string[];
  selectedSectors: string[];
  searchKeyword: string;
  onlyCritical: boolean;
  filterPmrOnly?: boolean;
  activeSpecificCategory?: ThreatCategory | null;
  activeSpecificSeverity?: ThreatLevel | null;
  statuses: PointStatus[];
  dateRange?: {
    start: number;
    end: number;
  };
}

export type IncidentType = 
  | 'incendio_forestal'
  | 'incendio_estructural'
  | 'inundacion'
  | 'deslizamiento'
  | 'corte_ruta'
  | 'corte_suministro'
  | 'accidente'
  | 'deficit_hidrico'
  | 'otro';

export type IncidentSeverity = 'critico' | 'alto' | 'medio' | 'bajo';

export type IncidentStatus = 'activo' | 'en_combate' | 'controlado' | 'extinguido' | 'resuelto';

export interface ComunaIncident {
  id: string;
  title: string;
  incidentType: IncidentType;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  timestamp: number;
  sector: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  elevation?: number;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  affectedArea?: string; // e.g. "3.5 hectáreas", "2 viviendas"
  affectedPeople?: number;
  resourcesDispatched?: string; // e.g. "Bomberos Coelemu, CONAF, Cuadrilla Municipal"
  reportedBy?: string;
  contactPhone?: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  createdByName?: string;
}

export type BasemapType = 'osm' | 'topo' | 'satellite' | 'positron';
