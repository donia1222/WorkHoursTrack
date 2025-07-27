import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { JobService } from './JobService';
import { Job, WorkDay } from '../types/WorkTypes';

interface ExportData {
  exportDate: string;
  appVersion: string;
  totalJobs: number;
  totalWorkDays: number;
  jobs: Job[];
  workDays: WorkDay[];
}

export class DataExportService {
  static readonly APP_VERSION = '1.0.0';

  /**
   * Export all app data to JSON file
   */
  static async exportAllData(): Promise<void> {
    try {
      // Get all data from storage
      const jobs = await JobService.getJobs();
      const workDays = await JobService.getWorkDays();

      // Create export data structure
      const exportData: ExportData = {
        exportDate: new Date().toISOString(),
        appVersion: this.APP_VERSION,
        totalJobs: jobs.length,
        totalWorkDays: workDays.length,
        jobs,
        workDays,
      };

      // Create filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 16).replace(/:/g, '-');
      const fileName = `WorkTracker_Backup_${timestamp}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      // Write JSON to file
      await FileSystem.writeAsStringAsync(
        filePath,
        JSON.stringify(exportData, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar datos de WorkTracker',
        });
      } else {
        Alert.alert(
          '✅ Exportación completada',
          `Archivo guardado en: ${fileName}`
        );
      }

      console.log(`✅ Data exported successfully: ${jobs.length} jobs, ${workDays.length} work days`);
      
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      Alert.alert(
        '❌ Error',
        'No se pudo exportar los datos. Inténtalo de nuevo.'
      );
      throw error;
    }
  }

  /**
   * Import data from JSON file
   */
  static async importAllData(): Promise<void> {
    try {
      // Pick file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return; // User cancelled
      }

      const file = result.assets[0];
      
      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Parse JSON
      const importData: ExportData = JSON.parse(fileContent);

      // Validate data structure
      if (!this.validateImportData(importData)) {
        Alert.alert(
          '❌ Archivo inválido',
          'El archivo seleccionado no es un backup válido de WorkTracker.'
        );
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        '📦 Confirmar importación',
        `¿Importar ${importData.totalJobs} trabajos y ${importData.totalWorkDays} días trabajados?\n\n⚠️ Esto reemplazará todos tus datos actuales.`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Importar',
            style: 'destructive',
            onPress: () => this.performImport(importData),
          },
        ]
      );

    } catch (error) {
      console.error('❌ Error importing data:', error);
      Alert.alert(
        '❌ Error',
        'No se pudo importar los datos. Verifica que el archivo sea válido.'
      );
    }
  }

  /**
   * Perform the actual import after confirmation
   */
  private static async performImport(importData: ExportData): Promise<void> {
    try {
      // Clear existing data and import new data
      await JobService.saveJobs(importData.jobs);
      await JobService.saveWorkDays(importData.workDays);

      Alert.alert(
        '✅ Importación completada',
        `Se importaron exitosamente:\n• ${importData.totalJobs} trabajos\n• ${importData.totalWorkDays} días trabajados\n\nReinicia la app para ver todos los cambios.`
      );

      console.log(`✅ Data imported successfully: ${importData.totalJobs} jobs, ${importData.totalWorkDays} work days`);
      
    } catch (error) {
      console.error('❌ Error performing import:', error);
      Alert.alert(
        '❌ Error',
        'Ocurrió un error durante la importación. Inténtalo de nuevo.'
      );
    }
  }

  /**
   * Validate import data structure
   */
  private static validateImportData(data: any): data is ExportData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check required fields
    const requiredFields = ['exportDate', 'appVersion', 'jobs', 'workDays'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.warn(`Missing required field: ${field}`);
        return false;
      }
    }

    // Check that jobs and workDays are arrays
    if (!Array.isArray(data.jobs) || !Array.isArray(data.workDays)) {
      console.warn('Jobs or workDays are not arrays');
      return false;
    }

    // Basic validation of job structure
    if (data.jobs.length > 0) {
      const firstJob = data.jobs[0];
      const requiredJobFields = ['id', 'name', 'color', 'defaultHours', 'isActive', 'createdAt'];
      for (const field of requiredJobFields) {
        if (!(field in firstJob)) {
          console.warn(`Missing required job field: ${field}`);
          return false;
        }
      }
    }

    // Basic validation of workDay structure
    if (data.workDays.length > 0) {
      const firstWorkDay = data.workDays[0];
      const requiredWorkDayFields = ['id', 'date', 'hours', 'type', 'createdAt'];
      for (const field of requiredWorkDayFields) {
        if (!(field in firstWorkDay)) {
          console.warn(`Missing required workDay field: ${field}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get export summary for display
   */
  static async getExportSummary(): Promise<{
    totalJobs: number;
    totalWorkDays: number;
    totalHours: number;
    dateRange: string;
  }> {
    const jobs = await JobService.getJobs();
    const workDays = await JobService.getWorkDays();
    
    const totalHours = workDays.reduce((sum, day) => sum + day.hours, 0);
    
    let dateRange = 'Sin datos';
    if (workDays.length > 0) {
      const dates = workDays.map(day => day.date).sort();
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      dateRange = firstDate === lastDate 
        ? firstDate 
        : `${firstDate} - ${lastDate}`;
    }

    return {
      totalJobs: jobs.length,
      totalWorkDays: workDays.length,
      totalHours,
      dateRange,
    };
  }
}