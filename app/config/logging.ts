/**
 * Configuración de logging por categorías
 * Permite habilitar/deshabilitar logs específicos para reducir el ruido
 */

export const LogConfig = {
  // Logs de tiempo y formato (muy frecuentes)
  TIME_FORMAT: __DEV__ ? false : false, // Deshabilitados por defecto
  
  // Logs de detección de pantalla (muy frecuentes)  
  SCREEN_DETECTION: __DEV__ ? false : false,
  
  // Logs de componentes (moderadamente frecuentes)
  MINI_MAP_WIDGET: __DEV__ ? false : false,
  MAP_LOCATION: __DEV__ ? true : false,
  
  // Logs de AutoTimer (importantes para debugging)
  AUTO_TIMER: __DEV__ ? true : false,
  
  // Logs de servicios (importantes)
  SERVICES: __DEV__ ? true : false,
  
  // Logs de notificaciones (importantes)
  NOTIFICATIONS: __DEV__ ? true : false,
  
  // Logs de suscripciones (importantes)
  SUBSCRIPTIONS: __DEV__ ? true : false,
  
  // Logs de datos/storage (importantes)
  DATA_STORAGE: __DEV__ ? true : false,
  
  // Logs de debugging específico (solo cuando se necesite)
  DEBUG: __DEV__ ? false : false,
  
  // Logs importantes que nunca se deben suprimir
  IMPORTANT: true,
  
  // Logs de errores (siempre habilitados)
  ERRORS: true,
};

// Función helper para verificar si una categoría está habilitada
export const isLogEnabled = (category: keyof typeof LogConfig): boolean => {
  return LogConfig[category] === true;
};

// Logs categorized helpers
export const logTimeFormat = (message: string, ...args: any[]): void => {
  if (isLogEnabled('TIME_FORMAT')) {
    console.log(`🕐 [TIME] ${message}`, ...args);
  }
};

export const logScreenDetection = (message: string, ...args: any[]): void => {
  if (isLogEnabled('SCREEN_DETECTION')) {
    console.log(`🔍 [SCREEN] ${message}`, ...args);
  }
};

export const logMiniMapWidget = (message: string, ...args: any[]): void => {
  if (isLogEnabled('MINI_MAP_WIDGET')) {
    console.log(`🔧 [WIDGET] ${message}`, ...args);
  }
};

export const logMapLocation = (message: string, ...args: any[]): void => {
  if (isLogEnabled('MAP_LOCATION')) {
    console.log(`📍 [MAP] ${message}`, ...args);
  }
};

export const logAutoTimer = (message: string, ...args: any[]): void => {
  if (isLogEnabled('AUTO_TIMER')) {
    console.log(`⏱️ [TIMER] ${message}`, ...args);
  }
};

export const logServices = (message: string, ...args: any[]): void => {
  if (isLogEnabled('SERVICES')) {
    console.log(`🔧 [SERVICE] ${message}`, ...args);
  }
};

export const logNotifications = (message: string, ...args: any[]): void => {
  if (isLogEnabled('NOTIFICATIONS')) {
    console.log(`🔔 [NOTIF] ${message}`, ...args);
  }
};

export const logSubscriptions = (message: string, ...args: any[]): void => {
  if (isLogEnabled('SUBSCRIPTIONS')) {
    console.log(`💰 [SUB] ${message}`, ...args);
  }
};

export const logDataStorage = (message: string, ...args: any[]): void => {
  if (isLogEnabled('DATA_STORAGE')) {
    console.log(`📊 [DATA] ${message}`, ...args);
  }
};

export const logDebug = (message: string, ...args: any[]): void => {
  if (isLogEnabled('DEBUG')) {
    console.log(`🐛 [DEBUG] ${message}`, ...args);
  }
};

export const logImportant = (message: string, ...args: any[]): void => {
  if (isLogEnabled('IMPORTANT')) {
    console.log(`⚠️ [IMPORTANT] ${message}`, ...args);
  }
};

export const logError = (message: string, ...args: any[]): void => {
  if (isLogEnabled('ERRORS')) {
    console.error(`❌ [ERROR] ${message}`, ...args);
  }
};