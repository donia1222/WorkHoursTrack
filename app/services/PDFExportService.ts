import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Job, WorkDay } from '../types/WorkTypes';

interface ReportData {
  title: string;
  period: string;
  jobs: Job[];
  workDays: WorkDay[];
  totalHours: number;
  totalDays: number;
  overtimeHours: number;
  jobBreakdown: {
    job: Job;
    hours: number;
    days: number;
    percentage: number;
  }[];
  comparison?: {
    previousPeriod: string;
    previousTotalHours: number;
    hoursDifference: number;
    percentageChange: number;
  };
}

export class PDFExportService {
  static async generateReportPDF(data: ReportData): Promise<string> {
    const htmlContent = this.generateHTMLReport(data);
    
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    return uri;
  }

  static async shareReportPDF(data: ReportData): Promise<void> {
    try {
      const pdfUri = await this.generateReportPDF(data);
      
      // Crear nombre de archivo más descriptivo
      const fileName = `reporte_${data.period.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Copiar archivo con nuevo nombre
      await FileSystem.copyAsync({
        from: pdfUri,
        to: newUri,
      });

      // Compartir archivo
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Compartir ${data.title}`,
      });
    } catch (error) {
      console.error('Error sharing PDF:', error);
      throw error;
    }
  }

  private static generateHTMLReport(data: ReportData): string {
    const { title, period, totalHours, totalDays, overtimeHours, jobBreakdown, comparison } = data;

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 40px;
            background: #fff;
          }
          
          .header {
            border-bottom: 3px solid #007AFF;
            padding-bottom: 20px;
            margin-bottom: 30px;
            text-align: center;
          }
          
          .logo {
            color: #007AFF;
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
          }
          
          .title {
            color: #1a1a1a;
            font-size: 2rem;
            font-weight: 600;
            margin-bottom: 5px;
          }
          
          .period {
            color: #666;
            font-size: 1.2rem;
            font-weight: 400;
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          
          .summary-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          
          .summary-card h3 {
            color: #495057;
            font-size: 0.9rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          
          .summary-card .value {
            color: #007AFF;
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 5px;
          }
          
          .summary-card .unit {
            color: #6c757d;
            font-size: 0.9rem;
          }
          
          ${comparison ? `
          .comparison-section {
            background: linear-gradient(135deg, #007AFF10, #007AFF05);
            border: 1px solid #007AFF20;
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
          }
          
          .comparison-title {
            color: #007AFF;
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 15px;
            text-align: center;
          }
          
          .comparison-stats {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            text-align: center;
          }
          
          .comparison-item h4 {
            color: #495057;
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          
          .comparison-item .value {
            font-size: 1.5rem;
            font-weight: 700;
          }
          
          .positive { color: #28a745; }
          .negative { color: #dc3545; }
          .neutral { color: #6c757d; }
          ` : ''}
          
          .jobs-breakdown {
            margin: 40px 0;
          }
          
          .section-title {
            color: #1a1a1a;
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
          }
          
          .job-item {
            display: flex;
            align-items: center;
            padding: 15px;
            background: #fff;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          
          .job-color {
            width: 12px;
            height: 40px;
            border-radius: 6px;
            margin-right: 15px;
          }
          
          .job-info {
            flex: 1;
          }
          
          .job-name {
            font-weight: 600;
            color: #1a1a1a;
            font-size: 1rem;
            margin-bottom: 2px;
          }
          
          .job-company {
            color: #6c757d;
            font-size: 0.85rem;
          }
          
          .job-stats {
            text-align: right;
            min-width: 100px;
          }
          
          .job-hours {
            font-size: 1.1rem;
            font-weight: 600;
            color: #007AFF;
            margin-bottom: 2px;
          }
          
          .job-percentage {
            font-size: 0.8rem;
            color: #6c757d;
          }
          
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            color: #6c757d;
            font-size: 0.85rem;
          }
          
          .generated-date {
            margin-bottom: 5px;
          }
          
          .app-signature {
            color: #007AFF;
            font-weight: 500;
          }
          
          @media print {
            body { padding: 20px; }
            .summary-grid { break-inside: avoid; }
            .job-item { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">📊 WorkTracker</div>
          <h1 class="title">${title}</h1>
          <p class="period">${period}</p>
        </div>
        
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total de Horas</h3>
            <div class="value">${totalHours.toFixed(1)}</div>
            <div class="unit">horas trabajadas</div>
          </div>
          
          <div class="summary-card">
            <h3>Días Trabajados</h3>
            <div class="value">${totalDays}</div>
            <div class="unit">días activos</div>
          </div>
          
          <div class="summary-card">
            <h3>Horas Extra</h3>
            <div class="value">${overtimeHours.toFixed(1)}</div>
            <div class="unit">horas adicionales</div>
          </div>
          
          <div class="summary-card">
            <h3>Promedio Diario</h3>
            <div class="value">${totalDays > 0 ? (totalHours / totalDays).toFixed(1) : '0.0'}</div>
            <div class="unit">horas por día</div>
          </div>
        </div>
        
        ${comparison ? `
        <div class="comparison-section">
          <h2 class="comparison-title">📈 Comparativa con ${comparison.previousPeriod}</h2>
          <div class="comparison-stats">
            <div class="comparison-item">
              <h4>Período Anterior</h4>
              <div class="value neutral">${comparison.previousTotalHours.toFixed(1)}h</div>
            </div>
            <div class="comparison-item">
              <h4>Diferencia</h4>
              <div class="value ${comparison.hoursDifference >= 0 ? 'positive' : 'negative'}">
                ${comparison.hoursDifference >= 0 ? '+' : ''}${comparison.hoursDifference.toFixed(1)}h
              </div>
            </div>
            <div class="comparison-item">
              <h4>Cambio</h4>
              <div class="value ${comparison.percentageChange >= 0 ? 'positive' : 'negative'}">
                ${comparison.percentageChange >= 0 ? '+' : ''}${comparison.percentageChange.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div class="jobs-breakdown">
          <h2 class="section-title">💼 Desglose por Trabajo</h2>
          ${jobBreakdown.map(item => `
            <div class="job-item">
              <div class="job-color" style="background-color: ${item.job.color}"></div>
              <div class="job-info">
                <div class="job-name">${item.job.name}</div>
                ${item.job.company ? `<div class="job-company">${item.job.company}</div>` : ''}
              </div>
              <div class="job-stats">
                <div class="job-hours">${item.hours.toFixed(1)}h</div>
                <div class="job-percentage">${item.percentage.toFixed(1)}%</div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="footer">
          <div class="generated-date">
            Generado el ${new Date().toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div class="app-signature">WorkTracker - Gestión de Tiempo Profesional</div>
        </div>
      </body>
      </html>
    `;
  }
}