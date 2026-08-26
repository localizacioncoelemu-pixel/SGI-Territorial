import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { KmzLayer, RiskPoint, UserProfile } from '../types';
import { getThreatLevelBadge } from './kmzParser';

export function generateTechnicalReportPdf(
  riskPoints: RiskPoint[],
  layers: KmzLayer[],
  currentUser: UserProfile | null,
  selectedSectors?: string[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currentDate = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isSectorFiltered = selectedSectors && selectedSectors.length > 0;
  const sectorLabel = isSectorFiltered
    ? `Sectores seleccionados (${selectedSectors.length}): ${selectedSectors.join(', ')}`
    : 'Todos los Sectores';

  // Header Banner Background
  doc.setFillColor(6, 78, 59); // Emerald 900
  doc.rect(0, 0, 210, 30, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('INFORME TÉCNICO TERRITORIAL & ANÁLISIS SIG', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Sistema de Información Geográfica y Registro de Terreno - Gestión de Amenazas', 14, 16);
  doc.text(`Fecha de Emisión: ${currentDate} | Generado por: ${currentUser?.displayName || 'Especialista SIG'}`, 14, 21);
  
  // Sector filter line
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(167, 243, 208); // Emerald 200
  doc.setFontSize(8.5);
  const truncatedSectorLabel = sectorLabel.length > 95 ? sectorLabel.slice(0, 92) + '...' : sectorLabel;
  doc.text(`Filtro Territorial: ${truncatedSectorLabel}`, 14, 26);

  // Summary Metrics Cards
  const criticalCount = riskPoints.filter(p => p.riskLevel === 'critico').length;
  const highCount = riskPoints.filter(p => p.riskLevel === 'alto').length;
  const mediumCount = riskPoints.filter(p => p.riskLevel === 'medio').length;
  const pmrTotal = riskPoints.reduce((acc, p) => acc + (p.hasPmr ? (p.pmrCount || 1) : 0), 0);

  let startY = 36;

  // Metric Boxes
  doc.setFillColor(254, 242, 242); // Red light
  doc.setDrawColor(239, 68, 68);
  doc.roundedRect(14, startY, 42, 16, 2, 2, 'FD');
  doc.setTextColor(185, 28, 28);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PUNTOS CRÍTICOS', 17, startY + 5);
  doc.setFontSize(14);
  doc.text(`${criticalCount}`, 17, startY + 12);

  doc.setFillColor(255, 247, 237); // Orange light
  doc.setDrawColor(249, 115, 22);
  doc.roundedRect(60, startY, 42, 16, 2, 2, 'FD');
  doc.setTextColor(194, 65, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RIESGO ALTO', 63, startY + 5);
  doc.setFontSize(14);
  doc.text(`${highCount}`, 63, startY + 12);

  doc.setFillColor(245, 243, 255); // Purple light (PMR)
  doc.setDrawColor(147, 51, 234);
  doc.roundedRect(106, startY, 42, 16, 2, 2, 'FD');
  doc.setTextColor(126, 34, 206);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PERSONAS PMR', 109, startY + 5);
  doc.setFontSize(14);
  doc.text(`${pmrTotal}`, 109, startY + 12);

  doc.setFillColor(236, 253, 245); // Emerald light
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(152, startY, 44, 16, 2, 2, 'FD');
  doc.setTextColor(6, 95, 70);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PUNTOS SIG', 155, startY + 5);
  doc.setFontSize(14);
  doc.text(`${riskPoints.length}`, 155, startY + 12);

  // Section 1: Detailed Table of Evaluated Risk Points
  startY += 22;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. CATASTRO DE PUNTOS DE AMENAZA Y EVALUACIÓN POR SECTOR', 14, startY);

  const tableRows = riskPoints.map((point) => {
    const badge = getThreatLevelBadge(point.riskLevel);
    const pmrInfo = point.hasPmr ? `Sí (${point.pmrCount || 1}${point.pmrDetails ? ': ' + point.pmrDetails : ''})` : 'No';
    
    return [
      point.title,
      point.sector || 'Sin sector',
      badge.label.toUpperCase(),
      point.threatType || point.category,
      pmrInfo,
      point.actionsRequired || point.description || 'Sin observaciones registradas',
      point.responsibleEntity || 'Municipalidad / Terreno',
    ];
  });

  autoTable(doc, {
    startY: startY + 4,
    head: [['Identificador / Familia', 'Sector', 'Nivel', 'Tipo Amenaza', 'PMR', 'Acción Requerida', 'Responsable']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [6, 78, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 28 },
      2: { cellWidth: 16, fontStyle: 'bold' },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 38 },
      6: { cellWidth: 22 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const val = String(data.cell.raw).toLowerCase();
        if (val.includes('crítico') || val.includes('critico')) {
          data.cell.styles.textColor = [185, 28, 28];
        } else if (val.includes('alto')) {
          data.cell.styles.textColor = [194, 65, 12];
        } else if (val.includes('medio')) {
          data.cell.styles.textColor = [180, 83, 9];
        } else if (val.includes('bajo')) {
          data.cell.styles.textColor = [6, 95, 70];
        }
      }
    },
  });

  let finalY = (doc as any).lastAutoTable?.finalY || 160;

  // Check if we need a new page for layers and signatures
  if (finalY > 230) {
    doc.addPage();
    finalY = 20;
  } else {
    finalY += 10;
  }

  // Section 2: Loaded KMZ Layers
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. CAPAS CARTOGRÁFICAS KMZ / SECTORES REGISTRADOS', 14, finalY);

  const layerRows = layers.map((l) => [
    l.name,
    l.sector || 'Comunal / General',
    l.threatType || l.category,
    `${l.featureCount} geometrías`,
    l.filename,
  ]);

  autoTable(doc, {
    startY: finalY + 4,
    head: [['Nombre Capa KMZ', 'Sector', 'Categoría', 'Polígonos / Geometrías', 'Archivo Origen']],
    body: layerRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      cellPadding: 2,
    },
  });

  let sigY = (doc as any).lastAutoTable?.finalY || finalY + 40;
  if (sigY > 245) {
    doc.addPage();
    sigY = 40;
  } else {
    sigY += 20;
  }

  // Signatures Section
  doc.setDrawColor(148, 163, 184);
  doc.line(25, sigY + 12, 85, sigY + 12);
  doc.line(125, sigY + 12, 185, sigY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Especialista SIG / Terreno', 55, sigY + 16, { align: 'center' });
  doc.text('Responsable Técnico Territorial', 155, sigY + 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Validación y Georreferenciación', 55, sigY + 20, { align: 'center' });
  doc.text('Gestión de Emergencias y Planificación', 155, sigY + 20, { align: 'center' });

  // Save / Download PDF
  const filename = `Informe_Tecnico_Territorial_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
