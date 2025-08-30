import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// Tipos para los modos de AutoTimer
export type AutoTimerMode = 'foreground-only' | 'background-allowed' | 'full-background';

export interface AutoTimerModeSettings {
  mode: AutoTimerMode;
  hasBackgroundPermission: boolean;
  userChoice: 'not-selected' | 'foreground-only' | 'background-allowed' | 'full-background';
  dateConfigured?: string;
}

// AsyncStorage key
const AUTOTIMER_MODE_KEY = '@autotimer_mode_settings';

class AutoTimerModeService {
  private static instance: AutoTimerModeService;

  static getInstance(): AutoTimerModeService {
    if (!AutoTimerModeService.instance) {
      AutoTimerModeService.instance = new AutoTimerModeService();
    }
    return AutoTimerModeService.instance;
  }

  /**
   * Obtener configuración actual de modo AutoTimer
   */
  async getAutoTimerModeSettings(): Promise<AutoTimerModeSettings> {
    try {
      const settings = await AsyncStorage.getItem(AUTOTIMER_MODE_KEY);
      if (settings) {
        const parsed = JSON.parse(settings);
        // Si el usuario tenía 'foreground-only' antiguo, actualizar a 'background-allowed'
        if (parsed.mode === 'foreground-only' && parsed.userChoice === 'not-selected') {
          console.log('🔄 Actualizando modo antiguo foreground-only a background-allowed');
          const updated = {
            mode: 'background-allowed' as AutoTimerMode,
            hasBackgroundPermission: false,
            userChoice: 'not-selected' as const
          };
          await this.saveAutoTimerModeSettings(updated);
          return updated;
        }
        return parsed;
      }
    } catch (error) {
      console.error('Error reading AutoTimer mode settings:', error);
    }

    // Configuración por defecto: foreground-only (App Abierta)
    return {
      mode: 'foreground-only',
      hasBackgroundPermission: false,
      userChoice: 'not-selected'
    };
  }

  /**
   * Guardar configuración de modo AutoTimer
   */
  async saveAutoTimerModeSettings(settings: AutoTimerModeSettings): Promise<void> {
    try {
      settings.dateConfigured = new Date().toISOString();
      await AsyncStorage.setItem(AUTOTIMER_MODE_KEY, JSON.stringify(settings));
      console.log('💾 AutoTimer mode settings saved:', settings.mode);
    } catch (error) {
      console.error('Error saving AutoTimer mode settings:', error);
    }
  }

  /**
   * Verificar permisos actuales de ubicación en background
   */
  async checkBackgroundPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking background permissions:', error);
      return false;
    }
  }

  /**
   * Solicitar permisos de ubicación en background
   */
  async requestBackgroundPermissions(): Promise<{ success: boolean; status: string }> {
    try {
      console.log('🔑 Requesting background location permissions...');
      const { status } = await Location.requestBackgroundPermissionsAsync();
      
      const success = status === 'granted';
      console.log(`🔑 Background permission result: ${status} (${success ? 'success' : 'denied'})`);
      
      return { success, status };
    } catch (error) {
      console.error('Error requesting background permissions:', error);
      return { success: false, status: 'error' };
    }
  }

  /**
   * Configurar modo AutoTimer con permisos apropiados
   */
  async setAutoTimerMode(mode: AutoTimerMode): Promise<{ success: boolean; message?: string }> {
    console.log(`🔧 Setting AutoTimer mode to: ${mode}`);
    
    try {
      // Verificar permisos actuales
      const hasBackgroundPermission = await this.checkBackgroundPermissions();
      
      if (mode === 'full-background' && !hasBackgroundPermission) {
        // Necesita permisos de background
        const permissionResult = await this.requestBackgroundPermissions();
        
        if (!permissionResult.success) {
          return {
            success: false,
            message: 'Se necesitan permisos de ubicación en segundo plano para el modo "Siempre Activo"'
          };
        }
      }

      // Guardar configuración
      const settings: AutoTimerModeSettings = {
        mode,
        hasBackgroundPermission: mode === 'full-background' ? true : hasBackgroundPermission,
        userChoice: mode
      };

      await this.saveAutoTimerModeSettings(settings);
      
      return { success: true };
    } catch (error) {
      console.error('Error setting AutoTimer mode:', error);
      return {
        success: false,
        message: 'Error configurando modo AutoTimer'
      };
    }
  }

  /**
   * Configurar modo AutoTimer sin pedir permisos (cuando ya se pidieron)
   */
  async setAutoTimerModeWithoutPermissions(mode: AutoTimerMode, hasBackgroundPermission: boolean = false): Promise<{ success: boolean; message?: string }> {
    console.log(`🔧 Setting AutoTimer mode to: ${mode} (without permission check)`);
    
    try {
      // Guardar configuración directamente
      const settings: AutoTimerModeSettings = {
        mode,
        hasBackgroundPermission,
        userChoice: mode
      };

      await this.saveAutoTimerModeSettings(settings);
      
      return { success: true };
    } catch (error) {
      console.error('Error setting AutoTimer mode:', error);
      return {
        success: false,
        message: 'Error configurando modo AutoTimer'
      };
    }
  }

  /**
   * Obtener descripciones de los modos disponibles
   */
  getModeDescriptions() {
    return {
      'foreground-only': {
        title: 'Solo App Abierta',
        description: 'AutoTimer funciona únicamente cuando la app está visible en pantalla.',
        permissions: 'Permisos básicos de ubicación',
        batteryImpact: 'Mínimo',
        icon: '📱'
      },
      'background-allowed': {
        title: 'App Abierta + Minimizada',
        description: 'AutoTimer funciona cuando la app está abierta o minimizada en segundo plano.',
        permissions: 'Permisos básicos de ubicación',
        batteryImpact: 'Bajo',
        icon: '🔄'
      },
      'full-background': {
        title: 'Siempre Activo',
        description: 'AutoTimer funciona incluso cuando la app está completamente cerrada.',
        permissions: 'Permisos de ubicación en segundo plano requeridos',
        batteryImpact: 'Mayor',
        icon: '🌍'
      }
    };
  }
}

export default AutoTimerModeService;