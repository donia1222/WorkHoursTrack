/**
 * LogManager - Sistema inteligente de logging que evita spam de logs
 * Agrupa logs similares y controla la frecuencia de logging
 */

class LogManager {
  private static instance: LogManager;
  private logCounts: Map<string, { count: number; lastLog: number; firstLog: number }> = new Map();
  private logThrottles: Map<string, number> = new Map();
  private readonly THROTTLE_TIME = 5000; // 5 segundos entre logs similares
  private readonly MAX_REPEATS = 3; // Máximo 3 logs iguales antes de throttle

  static getInstance(): LogManager {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }

  private getLogKey(message: string, level: 'log' | 'warn' | 'error'): string {
    // Normalizar el mensaje removiendo números que cambian (IDs, timestamps, etc)
    const normalized = message
      .replace(/\d{13,}/g, '[ID]') // IDs largos
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '[TIMESTAMP]') // ISO timestamps
      .replace(/\d+(\.\d+)?h/g, '[HOURS]') // Horas como "0.01h"
      .replace(/\d+m\s\d+s/g, '[TIME]') // Tiempo como "1m 30s"
      .replace(/\d+\.\d+/g, '[NUMBER]') // Números decimales
      .replace(/\d+/g, '[NUM]'); // Números enteros
    
    return `${level}:${normalized}`;
  }

  private shouldLog(key: string): boolean {
    const now = Date.now();
    const logData = this.logCounts.get(key);
    
    if (!logData) {
      // Primera vez que se ve este log
      this.logCounts.set(key, { count: 1, lastLog: now, firstLog: now });
      return true;
    }
    
    // Incrementar contador
    logData.count++;
    
    // Si han pasado más de 30 segundos, resetear el contador
    if (now - logData.firstLog > 30000) {
      this.logCounts.set(key, { count: 1, lastLog: now, firstLog: now });
      return true;
    }
    
    // Si no ha llegado al límite de repeticiones, permitir
    if (logData.count <= this.MAX_REPEATS) {
      logData.lastLog = now;
      return true;
    }
    
    // Si ha pasado el tiempo de throttle, permitir con resumen
    if (now - logData.lastLog > this.THROTTLE_TIME) {
      const suppressedCount = logData.count - this.MAX_REPEATS;
      console.log(`🔇 [LogManager] Suprimidos ${suppressedCount} logs similares en los últimos ${Math.round((now - logData.firstLog) / 1000)}s`);
      
      // Resetear contador
      this.logCounts.set(key, { count: 1, lastLog: now, firstLog: now });
      return true;
    }
    
    // Suprimir el log
    return false;
  }

  log(message: string, ...args: any[]): void {
    const key = this.getLogKey(message, 'log');
    if (this.shouldLog(key)) {
      console.log(message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    const key = this.getLogKey(message, 'warn');
    if (this.shouldLog(key)) {
      console.warn(message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    const key = this.getLogKey(message, 'error');
    if (this.shouldLog(key)) {
      console.error(message, ...args);
    }
  }

  // Método especial para logs que sabemos que pueden ser muy frecuentes
  throttledLog(message: string, throttleMs: number = 2000, ...args: any[]): void {
    const key = `throttled:${this.getLogKey(message, 'log')}`;
    const now = Date.now();
    const lastLog = this.logThrottles.get(key) || 0;
    
    if (now - lastLog >= throttleMs) {
      console.log(message, ...args);
      this.logThrottles.set(key, now);
    }
  }

  // Método para debug solo en desarrollo
  debug(message: string, ...args: any[]): void {
    if (__DEV__) {
      this.log(`🐛 [DEBUG] ${message}`, ...args);
    }
  }

  // Método para logs importantes que nunca se deben suprimir
  important(message: string, ...args: any[]): void {
    console.log(`⚠️ [IMPORTANT] ${message}`, ...args);
  }

  // Limpiar caches viejos
  cleanup(): void {
    const now = Date.now();
    const CLEANUP_THRESHOLD = 60000; // 1 minuto
    
    for (const [key, data] of this.logCounts.entries()) {
      if (now - data.lastLog > CLEANUP_THRESHOLD) {
        this.logCounts.delete(key);
      }
    }
    
    for (const [key, timestamp] of this.logThrottles.entries()) {
      if (now - timestamp > CLEANUP_THRESHOLD) {
        this.logThrottles.delete(key);
      }
    }
  }
}

// Exportar instancia singleton
export const logger = LogManager.getInstance();

// Limpiar caches cada 2 minutos
setInterval(() => {
  logger.cleanup();
}, 120000);

// Crear aliases para uso fácil
export const smartLog = logger.log.bind(logger);
export const smartWarn = logger.warn.bind(logger);
export const smartError = logger.error.bind(logger);
export const throttledLog = logger.throttledLog.bind(logger);
export const debugLog = logger.debug.bind(logger);
export const importantLog = logger.important.bind(logger);