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
   * Verifica si hay un Live Activity activo al iniciar la app
   */
  async checkExistingLiveActivity(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      const LiveActivityModule = NativeModules.LiveActivityModule;
      if (!LiveActivityModule || !LiveActivityModule.hasActiveLiveActivity) {
        return false;
      }

      const hasActive = await LiveActivityModule.hasActiveLiveActivity();
      console.log(`📱 Existing Live Activity found: ${hasActive}`);
      return hasActive;
    } catch (error) {
      console.error('Error checking existing Live Activity:', error);
      return false;
    }
  }

  /**
   * Termina todas las Live Activities existentes
   */
  async endAllLiveActivities(): Promise<void> {
    if (!this.isSupported) {
      return;
    }

    try {
      const LiveActivityModule = NativeModules.LiveActivityModule;
      if (!LiveActivityModule || !LiveActivityModule.endAllLiveActivities) {
        return;
      }

      await LiveActivityModule.endAllLiveActivities();
      this.activityId = null;
      this.stopUpdateTimer();
      console.log('✅ All Live Activities ended');
    } catch (error) {
      console.error('Error ending all Live Activities:', error);
    }
  }

  /**
   * Inicia un Live Activity para el auto-timer
   */
  async startLiveActivity(jobName: string, location?: string, existingStartTime?: Date): Promise<boolean> {
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

      // El módulo nativo ahora maneja la verificación de duplicados
      // Iniciar el Live Activity
      this.activityId = await LiveActivityModule.startLiveActivity(jobName, location || '');
      
      if (this.activityId) {
        console.log('✅ Live Activity started/reused with ID:', this.activityId);
        
        // Solo iniciar el timer si no está ya corriendo
        if (!this.updateInterval) {
          // Iniciar actualizaciones periódicas del tiempo transcurrido
          // Si hay un tiempo de inicio existente, usarlo para calcular el tiempo transcurrido
          this.startUpdateTimer(existingStartTime);
        } else {
          console.log('⏱️ Update timer already running, skipping');
        }
        
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
  private startUpdateTimer(existingStartTime?: Date): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Usar el tiempo de inicio existente o el actual
    const startTime = existingStartTime ? existingStartTime.getTime() : Date.now();

    // Actualizar cada segundo para mostrar el tiempo en tiempo real
    this.updateInterval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      this.updateLiveActivity(elapsedSeconds);
    }, 1000); // Actualizar cada segundo

    // Actualizar inmediatamente con el tiempo ya transcurrido
    const initialElapsed = existingStartTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    this.updateLiveActivity(initialElapsed);

    console.log('⏱️ Update timer started with 1s interval, initial elapsed:', initialElapsed);
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