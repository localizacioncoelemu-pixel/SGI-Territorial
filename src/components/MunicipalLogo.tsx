import React from 'react';

interface MunicipalLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const MunicipalLogo: React.FC<MunicipalLogoProps> = ({ 
  className = '', 
  size = 'md',
  showSubtitle = true 
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Modern Geographic GIS Logo */}
      <div className={`${iconSizes[size]} relative flex items-center justify-center flex-shrink-0 shadow-md`}>
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full drop-shadow-sm transition-transform hover:scale-105"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hexagon / Geo Base */}
          <path 
            d="M50 8 L88 28 L88 72 L50 92 L12 72 L12 28 Z" 
            fill="#064E3B" 
            stroke="#34D399" 
            strokeWidth="3.5" 
          />
          {/* Layer Contour 1 */}
          <path 
            d="M50 16 L80 33 L80 67 L50 84 L20 67 L20 33 Z" 
            fill="#047857" 
          />
          {/* Topo lines */}
          <path 
            d="M26 50 Q50 38 74 50" 
            stroke="#38BDF8" 
            strokeWidth="2.5"
            fill="none"
          />
          <path 
            d="M24 62 Q50 48 76 62" 
            stroke="#A7F3D0" 
            strokeWidth="2"
            fill="none"
          />
          {/* Central Georeference Pin */}
          <circle cx="50" cy="40" r="8" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.5" />
          <circle cx="50" cy="40" r="3" fill="#DC2626" />
        </svg>
      </div>

      {/* Title & Hierarchy */}
      <div className="flex flex-col select-none">
        <div className="flex items-center gap-1.5 leading-tight">
          <span className="font-extrabold text-sm sm:text-base tracking-tight text-white uppercase font-sans">
            SIG TERRITORIAL
          </span>
          <span className="bg-emerald-600/90 text-emerald-100 text-[10px] font-bold px-1.5 py-0.2 rounded border border-emerald-400/40 uppercase">
            PRO
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[11px] text-emerald-200/90 font-medium tracking-normal leading-none hidden xs:inline">
            Gestor Geográfico de Sectores & KMZ
          </span>
        )}
      </div>
    </div>
  );
};

