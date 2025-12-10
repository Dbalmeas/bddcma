import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

/**
 * Normalise les caracteres accentues pour compatibilite PDF
 * jsPDF avec les polices standard ne supporte pas bien les accents
 */
function normalizePDFText(text: string): string {
  if (!text) return ''
  const replacements: Record<string, string> = {
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'à': 'a', 'â': 'a', 'ä': 'a', 'À': 'A', 'Â': 'A', 'Ä': 'A',
    'ù': 'u', 'û': 'u', 'ü': 'u', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
    'î': 'i', 'ï': 'i', 'Î': 'I', 'Ï': 'I',
    'ô': 'o', 'ö': 'o', 'Ô': 'O', 'Ö': 'O',
    'ç': 'c', 'Ç': 'C',
    'ñ': 'n', 'Ñ': 'N',
    'œ': 'oe', 'Œ': 'OE',
    'æ': 'ae', 'Æ': 'AE',
    '\u20AC': 'EUR',
    '\u00AB': '"', '\u00BB': '"',
    '\u2018': "'", '\u2019': "'",
    '\u201C': '"', '\u201D': '"',
    '\u2013': '-', '\u2014': '-',
    '\u2026': '...',
  }
  let result = text
  for (const [accent, replacement] of Object.entries(replacements)) {
    result = result.split(accent).join(replacement)
  }
  return result.replace(/[^\x00-\x7F]/g, '')
}

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  query: string;
  response: string;
  statistics?: any;
  charts?: HTMLElement[];
  tables?: any[];
  insights?: string[];
  footer?: string;
}

/**
 * Exporte un rapport complet en PDF avec le branding CMA CGM
 */
export async function exportReportToPDF(options: PDFExportOptions): Promise<void> {
  const {
    title,
    subtitle,
    query,
    response,
    statistics,
    charts = [],
    tables = [],
    insights = [],
    footer = 'Generated with Claude Code - Talk to Data'
  } = options;

  // Créer le document PDF (format A4)
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // === HEADER CMA CGM ===
  doc.setFillColor(0, 69, 140); // CMA CGM Blue #00458C
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('CMA CGM', margin, 20);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Talk to Data - Shipping Analytics', margin, 30);

  yPos = 50;

  // === TITLE ===
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(normalizePDFText(title), pageWidth - 2 * margin);
  doc.text(titleLines, margin, yPos);
  yPos += titleLines.length * 8 + 5;

  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(normalizePDFText(subtitle), margin, yPos);
    yPos += 10;
  }

  // === METADATA ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const date = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(normalizePDFText(`Genere le: ${date}`), margin, yPos);
  yPos += 8;

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // === QUERY ===
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 69, 140);
  doc.text('Question:', margin, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const queryLines = doc.splitTextToSize(normalizePDFText(query), pageWidth - 2 * margin);
  doc.text(queryLines, margin, yPos);
  yPos += queryLines.length * 5 + 10;

  // === RESPONSE ===
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 69, 140);
  doc.text('Reponse:', margin, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const responseLines = doc.splitTextToSize(normalizePDFText(response), pageWidth - 2 * margin);

  // Check if we need a new page
  if (yPos + responseLines.length * 5 > pageHeight - margin) {
    doc.addPage();
    yPos = margin;
  }

  doc.text(responseLines, margin, yPos);
  yPos += responseLines.length * 5 + 10;

  // === STATISTICS ===
  if (statistics && Object.keys(statistics).length > 0) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 69, 140);
    doc.text('Statistiques cles:', margin, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    Object.entries(statistics).forEach(([key, value]) => {
      const statText = normalizePDFText(`- ${key}: ${formatValue(value)}`);
      doc.text(statText, margin + 5, yPos);
      yPos += 6;
    });

    yPos += 5;
  }

  // === CHARTS (as images) ===
  if (charts.length > 0) {
    for (const chartElement of charts) {
      if (yPos > pageHeight - 100) {
        doc.addPage();
        yPos = margin;
      }

      try {
        const canvas = await html2canvas(chartElement, {
          scale: 2,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (yPos + imgHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }

        doc.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      } catch (error) {
        console.error('Error rendering chart:', error);
      }
    }
  }

  // === TABLES ===
  if (tables.length > 0) {
    for (const table of tables) {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 69, 140);
      doc.text(normalizePDFText(table.title || 'Donnees'), margin, yPos);
      yPos += 8;

      // Normaliser les headers et les rows
      const normalizedHeaders = table.headers.map((h: string) => normalizePDFText(h));
      const normalizedRows = table.rows.map((row: string[]) => 
        row.map((cell: string) => normalizePDFText(String(cell)))
      );

      autoTable(doc, {
        startY: yPos,
        head: [normalizedHeaders],
        body: normalizedRows,
        theme: 'grid',
        headStyles: {
          fillColor: [0, 69, 140],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { left: margin, right: margin }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // === INSIGHTS ===
  if (insights.length > 0) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 69, 140);
    doc.text('Insights proactifs:', margin, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    insights.forEach((insight, index) => {
      const insightLines = doc.splitTextToSize(normalizePDFText(`${index + 1}. ${insight}`), pageWidth - 2 * margin - 5);

      if (yPos + insightLines.length * 5 > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }

      doc.text(insightLines, margin + 5, yPos);
      yPos += insightLines.length * 5 + 3;
    });
  }

  // === FOOTER ===
  const totalPages = doc.internal.pages.length - 1; // -1 because of the first empty page
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(0, 69, 140);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(normalizePDFText(footer), margin, pageHeight - 10);

    // Page number
    doc.text(`Page ${i}/${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
  }

  // === SAVE PDF ===
  const filename = `CMA_CGM_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Formate une valeur pour l'affichage dans le PDF
 */
function formatValue(value: any): string {
  if (typeof value === 'number') {
    return value.toLocaleString('fr-FR').replace(/\s/g, ' ');
  }
  if (typeof value === 'string') {
    return normalizePDFText(value);
  }
  if (Array.isArray(value)) {
    return value.map(v => normalizePDFText(String(v))).join(', ');
  }
  return normalizePDFText(String(value));
}
