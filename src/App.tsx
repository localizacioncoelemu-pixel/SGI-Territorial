import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Navbar } from './components/Navbar';
import { ThreatFilters } from './components/ThreatFilters';
import { MapViewer } from './components/MapViewer';
import { LayerManager } from './components/LayerManager';
import { PointListDrawer } from './components/PointListDrawer';
import { PointManagerModal } from './components/PointManagerModal';
import { UserManagerModal } from './components/UserManagerModal';
import { ExportReportModal } from './components/ExportReportModal';
import { ExcelExportModal } from './components/ExcelExportModal';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { InstallPwaModal } from './components/InstallPwaModal';
import { RiskPoint } from './types';
import { Plus, Layers, MapPin, AlertTriangle, ShieldCheck, Flame, Smartphone, FileSpreadsheet, Loader2 } from 'lucide-react';

function MainApp() {
  const { user, isAdmin, loading } = useAuth();
  const { filteredRiskPoints, layers } = useData();

  // Modals & Drawers state
  const [layersModalOpen, setLayersModalOpen] = useState(false);
  const [pointsDrawerOpen, setPointsDrawerOpen] = useState(false);
  const [addPointModalOpen, setAddPointModalOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  // Point editing / creation state
  const [selectedCoordsForNewPoint, setSelectedCoordsForNewPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [editingPoint, setEditingPoint] = useState<RiskPoint | null>(null);
  const [defaultSectorForNewPoint, setDefaultSectorForNewPoint] = useState<string | undefined>(undefined);
  const [defaultTitleForNewPoint, setDefaultTitleForNewPoint] = useState<string | undefined>(undefined);
  const [activeViewTab, setActiveViewTab] = useState<'map' | 'layers' | 'points'>('map');

  // If auth is loading, show clean loader
  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <span className="font-bold text-sm tracking-wide text-emerald-200">Cargando SIG Territorial...</span>
      </div>
    );
  }

  // IF NOT AUTHENTICATED: Show ONLY the Login screen
  if (!user) {
    return <LoginPage />;
  }

  // Handle clicking on map or KMZ Placemark to add/evaluate point (accessible to both Admin and Usuario)
  const handleMapClick = (coords: { lat: number; lng: number }, defaultTitle?: string, defaultSector?: string) => {
    setSelectedCoordsForNewPoint(coords);
    setDefaultTitleForNewPoint(defaultTitle);
    setDefaultSectorForNewPoint(defaultSector);
    setEditingPoint(null);
    setAddPointModalOpen(true);
  };

  const handleEditPoint = (point: RiskPoint) => {
    // Role 'usuario' cannot modify or delete existing points; only admin can edit
    if (!isAdmin) return;
    setEditingPoint(point);
    setSelectedCoordsForNewPoint(null);
    setDefaultTitleForNewPoint(undefined);
    setDefaultSectorForNewPoint(undefined);
    setAddPointModalOpen(true);
  };

  const handleOpenNewPointManual = () => {
    // Both admin and usuario can add new points
    setSelectedCoordsForNewPoint(null);
    setDefaultTitleForNewPoint(undefined);
    setDefaultSectorForNewPoint(undefined);
    setEditingPoint(null);
    setAddPointModalOpen(true);
  };

  return (
    <div id="sig-app-root" className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      
      {/* Top Municipal Navigation Header */}
      <Navbar
        onOpenLayers={() => setLayersModalOpen(true)}
        onOpenPoints={() => setPointsDrawerOpen(true)}
        onOpenAddPoint={handleOpenNewPointManual}
        onOpenUsers={() => setUsersModalOpen(true)}
        onOpenReport={() => setReportModalOpen(true)}
        onOpenExcel={() => {
          if (isAdmin) setExcelModalOpen(true);
        }}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenInstallApp={() => setInstallModalOpen(true)}
        activeViewTab={activeViewTab}
        setActiveViewTab={setActiveViewTab}
      />

      {/* Interactive Threat & Layer Filter Bar */}
      <ThreatFilters />

      {/* Main Map Viewer Canvas */}
      <main className="flex-1 relative overflow-hidden flex">
        <MapViewer 
          onMapClickAddPoint={handleMapClick}
          onSelectPointDetail={handleEditPoint}
          onOpenExcelExport={isAdmin ? () => setExcelModalOpen(true) : undefined}
        />

        {/* Floating Action Button for Mobile Point Creation (accessible to both Admin and Usuario) */}
        <button
          id="btn-fab-add-point"
          onClick={handleOpenNewPointManual}
          className="md:hidden absolute bottom-20 right-4 z-30 w-12 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white active:scale-95 transition-transform cursor-pointer"
          title="Agregar punto georreferenciado"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Floating Quick Drawer Toggles on Left bottom for mobile */}
        <div className="md:hidden absolute bottom-20 left-4 z-30 flex items-center gap-2">
          <button
            onClick={() => setLayersModalOpen(true)}
            className="px-3 py-2 bg-white/95 backdrop-blur text-emerald-800 rounded-xl shadow-lg border border-slate-200 text-xs font-bold flex items-center gap-1.5 active:scale-95"
          >
            <Layers className="w-4 h-4" />
            <span>Capas ({layers.length})</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setExcelModalOpen(true)}
              className="px-3 py-2 bg-emerald-800 text-white rounded-xl shadow-lg border border-emerald-600 text-xs font-bold flex items-center gap-1.5 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Excel</span>
            </button>
          )}
        </div>
      </main>

      {/* MODALS & DRAWERS */}
      
      {/* KMZ Layer Manager Modal */}
      <LayerManager
        isOpen={layersModalOpen}
        onClose={() => setLayersModalOpen(false)}
      />

      {/* Georeferenced Point Creation & Editing Modal with Multi-Hazard Assessment */}
      <PointManagerModal
        isOpen={addPointModalOpen}
        onClose={() => {
          setAddPointModalOpen(false);
          setSelectedCoordsForNewPoint(null);
          setEditingPoint(null);
          setDefaultTitleForNewPoint(undefined);
          setDefaultSectorForNewPoint(undefined);
        }}
        initialCoords={selectedCoordsForNewPoint}
        editingPoint={editingPoint}
        defaultSector={defaultSectorForNewPoint}
        defaultTitle={defaultTitleForNewPoint}
      />

      {/* Georeferenced Points List Side Drawer */}
      <PointListDrawer
        isOpen={pointsDrawerOpen}
        onClose={() => setPointsDrawerOpen(false)}
        onEditPoint={handleEditPoint}
        onAddNewPoint={handleOpenNewPointManual}
        onOpenExcel={isAdmin ? () => setExcelModalOpen(true) : undefined}
      />

      {/* Excel Database Export Modal (.xlsx) */}
      <ExcelExportModal
        isOpen={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
      />

      {/* User & Access Management Modal */}
      <UserManagerModal
        isOpen={usersModalOpen}
        onClose={() => setUsersModalOpen(false)}
      />

      {/* Printable Situation Report Modal */}
      <ExportReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />

      {/* Authentication & Profile Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Install PWA Modal */}
      <InstallPwaModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainApp />
      </DataProvider>
    </AuthProvider>
  );
}
