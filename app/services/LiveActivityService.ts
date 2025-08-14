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
  private isCreatingActivity: boolean = false; // Prevent duplicate creation
  private lastJobName: string | null = null;
  private lastLocation: string | null = null;

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
      // NO enviar notificaciones complejas - solo funciona con app en segundo plano
      
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

    // Prevent duplicate simultaneous creation attempts
    if (this.isCreatingActivity) {
      console.log('⏳ Already creating a Live Activity, skipping duplicate request');
      return false;
    }

    try {
      this.isCreatingActivity = true;
      console.log('🏃 Starting Live Activity for:', jobName);

      // Verificar si el módulo nativo está disponible
      const LiveActivityModule = NativeModules.LiveActivityModule;
      if (!LiveActivityModule || !LiveActivityModule.startLiveActivity) {
        console.log('⚠️ LiveActivityModule not available yet');
        this.isCreatingActivity = false;
        return false;
      }

      // First, end all existing activities to ensure clean state
      try {
        if (LiveActivityModule.endAllLiveActivities) {
          console.log('🧹 Cleaning up any existing Live Activities first');
          await LiveActivityModule.endAllLiveActivities();
          // Small delay to let iOS process the cleanup
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (cleanupError) {
        console.log('⚠️ Could not cleanup existing activities:', cleanupError);
      }

      // Store job info for comparison
      this.lastJobName = jobName;
      this.lastLocation = location || '';
      
      // El módulo nativo ahora maneja la verificación de duplicados y devuelve un objeto
      // Iniciar el Live Activity
      const result = await LiveActivityModule.startLiveActivity(jobName, location || '');
      
      // Manejar tanto string (ID) como objeto con ID y pushToken
      if (typeof result === 'string') {
        this.activityId = result;
      } else if (result && result.id) {
        this.activityId = result.id;
        if (result.reused) {
          console.log('♻️ Live Activity reused existing widget');
        }
        if (result.pushToken) {
          console.log('📨 Live Activity has push token support');
        }
      }
      
      if (this.activityId) {
        console.log('✅ Live Activity started with ID:', this.activityId);
        console.log('🕰️ Live Activity showing time:', existingStartTime || new Date());
        this.isCreatingActivity = false;
        return true;
      } else {
        console.log('❌ Failed to start Live Activity');
        this.isCreatingActivity = false;
        return false;
      }
    } catch (error) {
      console.error('Error starting Live Activity:', error);
      this.isCreatingActivity = false;
      return false;
    }
  }

  /**
   * Actualiza el Live Activity existente
   */
  async updateLiveActivity(elapsedSeconds: number): Promise<void> {
    // Ya no necesitamos actualizar el Live Activity constantemente
    // Solo mostrará la hora de inicio
    return;
  }

  /**
   * Detiene el Live Activity
   */
  async endLiveActivity(finalElapsedSeconds?: number): Promise<void> {
    if (!this.isSupported) {
      return;
    }

    try {
      console.log('🛑 Ending Live Activity with stopped state');

      const LiveActivityModule = NativeModules.LiveActivityModule;
      if (!LiveActivityModule || !LiveActivityModule.endLiveActivity) {
        return;
      }

      // The native module will show "Stopped at" state before ending
      await LiveActivityModule.endLiveActivity(finalElapsedSeconds || 0);
      
      this.activityId = null;
      this.isCreatingActivity = false; // Reset flag
      this.lastJobName = null;
      this.lastLocation = null;
      console.log('✅ Live Activity ended with stopped state shown');
    } catch (error) {
      console.error('Error ending Live Activity:', error);
      this.activityId = null;
      this.isCreatingActivity = false;
      this.lastJobName = null;
      this.lastLocation = null;
    }
  }

  /**
   * Inicia el timer de actualizaciones periódicas
   */
  private startUpdateTimer(existingStartTime?: Date): void {
    // Ya no necesitamos actualizar el timer constantemente
    // El widget mostrará solo la hora de inicio
    console.log('🕰️ Live Activity mostrará hora de inicio:', existingStartTime || new Date());
  }

  /**
   * Detiene el timer de actualizaciones
   */
  private stopUpdateTimer(): void {
    // Ya no usamos timer de actualizaciones
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
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
    this.lastJobName = null;
    this.lastLocation = null;
    if (this.activityId) {
      this.endLiveActivity();
    }
  }
}

export default LiveActivityService;