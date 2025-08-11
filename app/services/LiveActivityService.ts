import { Platform } from 'react-native';
import { NativeModules } from 'react-native';

// Interfaz para el estado del Live Activity
export interface LiveActivityState {
  isActive: boolean;
  jobName: string;
  startTime: Date | null;
  elapsedTime: number;
  location?: string;
}

// Tipos de actualizaciones para el Live Activity
export type LiveActivityUpdateType = 'start' | 'update' | 'end';

class LiveActivityService {
  private static instance: LiveActivityService;
  private activityId: string | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private isSupported: boolean = false;

  private constructor() {
    this.checkSupport();
  }

  static getInstance(): LiveActivityService {
    if (!LiveActivityService.instance) {
      LiveActivityService.instance = new LiveActivityService();
    }
    return LiveActivityService.instance;
  }

  /**
   * Verifica si el dispositivo soporta Live Activities
   */
  private checkSupport(): void {
    // Live Activities solo están disponibles en iOS 16.1+
    if (Platform.OS === 'ios') {
      const majorVersion = parseInt(Platform.Version as string, 10);
      this.isSupported = majorVersion >= 16;
      console.log(`📱 Live Activities support: ${this.isSupported} (iOS ${Platform.Version})`);
    } else {
      this.isSupported = false;
    }
  }

  /**
   * Inicia un Live Activity para el auto-timer
   */
  async startLiveActivity(jobName: string, location?: string): Promise<boolean> {
    if (!this.isSupported) {
      console.log('❌ Live Activities not supported on this device');
      return false;
    }

    try {
      console.log('🏃 Starting Live Activity for:', jobName);

      // Verificar si el módulo nativo está disponible
      const LiveActivityModule = NativeModules.LiveActivityModule;
      if (!LiveActivityModule || !LiveActivityModule.startLiveActivity) {
        console.log('⚠️ LiveActivityModule not available yet');
        return false;
      }

      // Configurar el estado inicial
      const initialState = {
        jobName,
        location: location || '',
        startTime: new Date().toISOString(),
        elapsedSeconds: 0,
        isRunning: true,
      };

      // Iniciar el Live Activity
      this.activityId = await LiveActivityModule.startLiveActivity(jobName, location || '');
      
      if (this.activityId) {
        console.log('✅ Live Activity started with ID:', this.activityId);
        
        // Iniciar actualizaciones periódicas del tiempo transcurrido
        this.startUpdateTimer();
        
        return true;
      } else {
        console.log('❌ Failed to start Live Activity');
        return false;
      }
    } catch (error) {
      console.error('Error starting Live Activity:', error);
      return false;
    }
  }

  /**
   * Actualiza el Live Activity existente
   */
  async updateLiveActivity(elapsedSeconds: number): Promise<void> {
    if (!this.isSupported || !this.activityId) {
      return;
    }

    try {
      const LiveActivityModule = NativeModules.LiveActivityModule;
      if (!LiveActivityModule || !LiveActivityModule.updateLiveActivity) {
        return;
      }

      await LiveActivityModule.updateLiveActivity(elapsedSeconds);
      console.log('📊 Live Activity updated - elapsed:', elapsedSeconds);
    } catch (error) {
      console.error('Error updating Live Activity:', error);
    }
  }

  /**
   * Detiene el Live Activity
   */
  async endLiveActivity(finalElapsedSeconds?: number): Promise<void> {
    if (!this.isSupported || !this.activityId) {
      return;
    }

    try {
      console.log('🛑 Ending Live Activity');

      // Detener el timer de actualizaciones
      this.stopUpdateTimer();

      const LiveActivityModule = NativeModules.LiveActivityModule;
      if (!LiveActivityModule || !LiveActivityModule.endLiveActivity) {
        return;
      }

      await LiveActivityModule.endLiveActivity(finalElapsedSeconds || 0);
      
      this.activityId = null;
      console.log('✅ Live Activity ended');
    } catch (error) {
      console.error('Error ending Live Activity:', error);
    }
  }

  /**
   * Inicia el timer de actualizaciones periódicas
   */
  private startUpdateTimer(): void {
    if (this.updateInterval) {
      return;
    }

    let elapsedSeconds = 0;

    // Actualizar cada 30 segundos para no consumir mucha batería
    this.updateInterval = setInterval(() => {
      elapsedSeconds += 30;
      this.updateLiveActivity(elapsedSeconds);
    }, 30000);

    console.log('⏱️ Update timer started');
  }

  /**
   * Detiene el timer de actualizaciones
   */
  private stopUpdateTimer(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('⏱️ Update timer stopped');
    }
  }

  /**
   * Verifica si hay un Live Activity activo
   */
  isActive(): boolean {
    return this.activityId !== null;
  }

  /**
   * Obtiene el ID del Live Activity actual
   */
  getActivityId(): string | null {
    return this.activityId;
  }

  /**
   * Limpieza al destruir el servicio
   */
  cleanup(): void {
    this.stopUpdateTimer();
    if (this.activityId) {
      this.endLiveActivity();
    }
  }
}

export default LiveActivityService;