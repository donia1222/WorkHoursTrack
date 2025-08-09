import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JobService } from './JobService';
import { Job, WorkDay } from '../types/WorkTypes';

export type BackupFrequency = 'daily' | 'weekly' | 'monthly';

interface AutoBackupConfig {
  enabled: boolean;
  frequency: BackupFrequency;
  lastBackupDate?: string;
}

interface BackupFile {
  fileName: string;
  filePath: string;
  createdDate: string;
  size: number;
  type: BackupFrequency;
}

interface BackupData {
  exportDate: string;
  appVersion: string;
  backupType: 'auto' | 'manual';
  frequency?: BackupFrequency;
  totalJobs: number;
  totalWorkDays: number;
  jobs: Job[];
  workDays: WorkDay[];
}

export class AutoBackupService {
  private static readonly APP_VERSION = '1.0.0';
  private static readonly AUTO_BACKUP_DIR = 'auto-backups/';
  private static readonly CONFIG_KEY = '@auto_backup_config';
  
  // Maximum number of backups to keep
  private static readonly MAX_DAILY_BACKUPS = 7;
  private static readonly MAX_WEEKLY_BACKUPS = 4;
  private static readonly MAX_MONTHLY_BACKUPS = 12;

  /**
   * Get current auto backup configuration
   */
  static async getConfig(): Promise<AutoBackupConfig> {
    try {
      const configStr = await AsyncStorage.getItem(this.CONFIG_KEY);
      if (configStr) {
        return JSON.parse(configStr);
      }
    } catch (error) {
      console.error('Error getting auto backup config:', error);
    }
    
    // Default configuration
    return {
      enabled: false,
      frequency: 'daily',
    };
  }

  /**
   * Save auto backup configuration
   */
  static async saveConfig(config: AutoBackupConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
      console.log('✅ Auto backup config saved:', config);
    } catch (error) {
      console.error('❌ Error saving auto backup config:', error);
      throw error;
    }
  }

  /**
   * Update auto backup configuration
   */
  static async updateConfig(updates: Partial<AutoBackupConfig>): Promise<void> {
    try {
      const currentConfig = await this.getConfig();
      const updatedConfig = { ...currentConfig, ...updates };
      await this.saveConfig(updatedConfig);
    } catch (error) {
      console.error('❌ Error updating auto backup config:', error);
      throw error;
    }
  }

  /**
   * Check if auto backup directory exists, create if not
   */
  private static async ensureBackupDirectory(): Promise<string> {
    const backupDir = `${FileSystem.documentDirectory}${this.AUTO_BACKUP_DIR}`;
    
    const dirInfo = await FileSystem.getInfoAsync(backupDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      console.log('📁 Created auto backup directory:', backupDir);
    }
    
    return backupDir;
  }

  /**
   * Check if a backup is needed based on configuration
   */
  static async shouldCreateBackup(): Promise<boolean> {
    const config = await this.getConfig();
    console.log('🔍 Checking if backup needed. Config:', config);
    
    if (!config.enabled) {
      console.log('❌ Auto backup is disabled');
      return false;
    }

    if (!config.lastBackupDate) {
      console.log('✅ No previous backup found, will create first backup');
      return true; // First backup
    }

    const lastBackup = new Date(config.lastBackupDate);
    const now = new Date();
    
    switch (config.frequency) {
      case 'daily':
        const daysDiff = Math.floor((now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`📅 Daily backup check: ${daysDiff} days since last backup`);
        return daysDiff >= 1;
        
      case 'weekly':
        const weeksDiff = Math.floor((now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24 * 7));
        return weeksDiff >= 1;
        
      case 'monthly':
        const monthsDiff = (now.getFullYear() - lastBackup.getFullYear()) * 12 + (now.getMonth() - lastBackup.getMonth());
        return monthsDiff >= 1;
        
      default:
        return false;
    }
  }

  /**
   * Create an automatic backup silently
   */
  static async createAutoBackup(): Promise<void> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled) {
        console.log('⏭️ Auto backup is disabled, skipping');
        return;
      }

      console.log('🔄 Creating automatic backup...');

      // Get all data from storage
      const jobs = await JobService.getJobs();
      const workDays = await JobService.getWorkDays();

      // Create backup data structure
      const backupData: BackupData = {
        exportDate: new Date().toISOString(),
        appVersion: this.APP_VERSION,
        backupType: 'auto',
        frequency: config.frequency,
        totalJobs: jobs.length,
        totalWorkDays: workDays.length,
        jobs,
        workDays,
      };

      // Generate filename based on frequency
      const fileName = this.generateFileName(config.frequency);
      const backupDir = await this.ensureBackupDirectory();
      const filePath = `${backupDir}${fileName}`;

      // Write JSON to file
      await FileSystem.writeAsStringAsync(
        filePath,
        JSON.stringify(backupData, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      // Update last backup date
      const updatedConfig = { ...config, lastBackupDate: new Date().toISOString() };
      await this.saveConfig(updatedConfig);

      // Clean old backups
      await this.cleanOldBackups(config.frequency);

      console.log(`✅ Auto backup created successfully: ${fileName}`);
      console.log(`📊 Backed up ${jobs.length} jobs and ${workDays.length} work days`);
      
    } catch (error) {
      console.error('❌ Error creating auto backup:', error);
    }
  }

  /**
   * Generate filename based on frequency and current date
   */
  private static generateFileName(frequency: BackupFrequency): string {
    const now = new Date();
    
    switch (frequency) {
      case 'daily':
        const dailyDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
        return `Auto_Daily_${dailyDate}.json`;
        
      case 'weekly':
        const year = now.getFullYear();
        const week = this.getWeekNumber(now);
        return `Auto_Weekly_${year}-W${week.toString().padStart(2, '0')}.json`;
        
      case 'monthly':
        const monthlyDate = now.toISOString().slice(0, 7); // YYYY-MM
        return `Auto_Monthly_${monthlyDate}.json`;
        
      default:
        return `Auto_Unknown_${now.toISOString().slice(0, 16).replace(/:/g, '-')}.json`;
    }
  }

  /**
   * Get week number of the year
   */
  private static getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  }

  /**
   * Get list of available auto backups
   */
  static async getAvailableBackups(): Promise<BackupFile[]> {
    try {
      const backupDir = await this.ensureBackupDirectory();
      console.log('📁 Backup directory:', backupDir);
      
      const dirContents = await FileSystem.readDirectoryAsync(backupDir);
      console.log('📂 Directory contents:', dirContents);
      
      const backupFiles: BackupFile[] = [];
      
      for (const fileName of dirContents) {
        if (fileName.endsWith('.json') && fileName.startsWith('Auto_')) {
          const filePath = `${backupDir}${fileName}`;
          console.log('🔍 Processing backup file:', fileName, 'at path:', filePath);
          
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (fileInfo.exists && !fileInfo.isDirectory) {
            // Determine backup type from filename
            let type: BackupFrequency = 'daily';
            if (fileName.includes('Weekly')) type = 'weekly';
            else if (fileName.includes('Monthly')) type = 'monthly';
            
            const backupFile = {
              fileName,
              filePath,
              createdDate: new Date(fileInfo.modificationTime! * 1000).toISOString(),
              size: fileInfo.size || 0,
              type,
            };
            
            console.log('✅ Added backup file:', backupFile);
            backupFiles.push(backupFile);
          }
        }
      }
      
      console.log('📊 Total backup files found:', backupFiles.length);
      
      // Sort by creation date (newest first)
      backupFiles.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
      
      return backupFiles;
      
    } catch (error) {
      console.error('❌ Error getting available backups:', error);
      return [];
    }
  }

  /**
   * Download/share a specific backup file
   */
  static async downloadBackup(backupFile: BackupFile): Promise<void> {
    try {
      // Validate file path
      if (!backupFile.filePath) {
        throw new Error('File path is empty or undefined');
      }

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(backupFile.filePath);
      if (!fileInfo.exists) {
        throw new Error(`Backup file does not exist: ${backupFile.fileName}`);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupFile.filePath, {
          mimeType: 'application/json',
          dialogTitle: `Descargar ${backupFile.fileName}`,
        });
        console.log(`✅ Backup shared: ${backupFile.fileName}`);
      } else {
        console.log(`📁 Backup available at: ${backupFile.filePath}`);
      }
    } catch (error) {
      console.error('❌ Error downloading backup:', error);
      throw error;
    }
  }

  /**
   * Clean old backups based on frequency limits
   */
  private static async cleanOldBackups(frequency: BackupFrequency): Promise<void> {
    try {
      const allBackups = await this.getAvailableBackups();
      const backupsOfType = allBackups.filter(backup => backup.type === frequency);
      
      let maxBackups: number;
      switch (frequency) {
        case 'daily':
          maxBackups = this.MAX_DAILY_BACKUPS;
          break;
        case 'weekly':
          maxBackups = this.MAX_WEEKLY_BACKUPS;
          break;
        case 'monthly':
          maxBackups = this.MAX_MONTHLY_BACKUPS;
          break;
        default:
          maxBackups = 7;
      }
      
      if (backupsOfType.length > maxBackups) {
        const backupsToDelete = backupsOfType.slice(maxBackups);
        
        for (const backup of backupsToDelete) {
          try {
            await FileSystem.deleteAsync(backup.filePath);
            console.log(`🗑️ Deleted old backup: ${backup.fileName}`);
          } catch (error) {
            console.error(`❌ Error deleting backup ${backup.fileName}:`, error);
          }
        }
        
        console.log(`🧹 Cleaned ${backupsToDelete.length} old ${frequency} backups`);
      }
      
    } catch (error) {
      console.error('❌ Error cleaning old backups:', error);
    }
  }

  /**
   * Delete a specific backup file
   */
  static async deleteBackup(backupFile: BackupFile): Promise<void> {
    try {
      if (!backupFile.filePath) {
        throw new Error('File path is empty or undefined');
      }

      const fileInfo = await FileSystem.getInfoAsync(backupFile.filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(backupFile.filePath);
        console.log(`🗑️ Backup deleted: ${backupFile.fileName}`);
      } else {
        console.log(`⚠️ Backup file not found: ${backupFile.fileName}`);
      }
    } catch (error) {
      console.error('❌ Error deleting backup:', error);
      throw error;
    }
  }

  /**
   * Delete all auto backups
   */
  static async deleteAllAutoBackups(): Promise<void> {
    try {
      const backupDir = `${FileSystem.documentDirectory}${this.AUTO_BACKUP_DIR}`;
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(backupDir);
        console.log('🗑️ All auto backups deleted');
      }
    } catch (error) {
      console.error('❌ Error deleting all auto backups:', error);
      throw error;
    }
  }

  /**
   * Check and create backup if needed (main entry point)
   */
  static async checkAndCreateBackupIfNeeded(): Promise<void> {
    try {
      const shouldCreate = await this.shouldCreateBackup();
      
      if (shouldCreate) {
        await this.createAutoBackup();
      } else {
        console.log('⏭️ No auto backup needed at this time');
      }
    } catch (error) {
      console.error('❌ Error in backup check:', error);
    }
  }

  /**
   * Force create a backup for testing purposes
   */
  static async createBackupNow(): Promise<void> {
    try {
      console.log('🔄 Force creating backup now...');

      // Get all data from storage
      const jobs = await JobService.getJobs();
      const workDays = await JobService.getWorkDays();

      // Create backup data structure
      const backupData: BackupData = {
        exportDate: new Date().toISOString(),
        appVersion: this.APP_VERSION,
        backupType: 'auto',
        frequency: 'daily',
        totalJobs: jobs.length,
        totalWorkDays: workDays.length,
        jobs,
        workDays,
      };

      // Generate filename
      const fileName = this.generateFileName('daily');
      const backupDir = await this.ensureBackupDirectory();
      const filePath = `${backupDir}${fileName}`;

      console.log('💾 Creating backup file at:', filePath);

      // Write JSON to file
      await FileSystem.writeAsStringAsync(
        filePath,
        JSON.stringify(backupData, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      console.log(`✅ Test backup created successfully: ${fileName}`);
      console.log(`📊 Backed up ${jobs.length} jobs and ${workDays.length} work days`);
      
    } catch (error) {
      console.error('❌ Error creating test backup:', error);
      throw error;
    }
  }
}