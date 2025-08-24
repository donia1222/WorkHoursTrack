/**
 * SIMPLE AUTO TIMER - VERSIÓN POR TIEMPO (SIN HISTÉRESIS DE METROS)
 * - Comprueba cada 5 s / 5 m
 * - isInside := distancia <= radio
 * - Start/Stop por tiempo de permanencia (delays en minutos del job)
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JobService } from './JobService';
import NotificationService from './NotificationService';
import { EventEmitter } from 'events';

type GeoState = 'inside' | 'outside' | 'unknown';

class SimpleAutoTimer extends EventEmitter {
  private static instance: SimpleAutoTimer;
  private locationWatcher: Location.LocationSubscription | null = null;
  private notificationService: NotificationService;
  private isRunning = false;

  // Estado
  private lastGeoState: GeoState = 'unknown';
  private lastStartActionAt: number | null = null;
  private lastStopActionAt: number | null = null;

  // Permanencia para delays
  private insideSince: number | null = null;
  private outsideSince: number | null = null;

  // Config base
  private readonly minRadius = 30;       // radio mínimo efectivo (m)
  private readonly minGapStartSec = 5;   // antirrebote entre starts
  private readonly minGapStopSec  = 5;   // antirrebote entre stops

  private constructor() {
    super();
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance(): SimpleAutoTimer {
    if (!SimpleAutoTimer.instance) {
      SimpleAutoTimer.instance = new SimpleAutoTimer();
    }
    return SimpleAutoTimer.instance;
  }

  /**
   * INICIAR MONITOREO (app abierta)
   */
  async startSimpleMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ SIMPLE AUTO TIMER YA ACTIVO');
      return;
    }

    console.log('🚀 INICIANDO SIMPLE AUTO TIMER');
    
    // IMPORTANTE: Verificar si hay una sesión activa antes de empezar
    const existingSession = await JobService.getActiveSession();
    if (existingSession) {
      console.log('⏱️ SESIÓN ACTIVA ENCONTRADA:', {
        jobId: existingSession.jobId,
        startTime: existingSession.startTime,
        elapsed: Math.floor((Date.now() - new Date(existingSession.startTime).getTime()) / 1000) + ' segundos'
      });
      
      // Marcar que estamos dentro para que no reinicie el timer
      this.lastGeoState = 'inside';
      this.insideSince = new Date(existingSession.startTime).getTime();
      this.lastStartActionAt = new Date(existingSession.startTime).getTime();
    }

    // Permisos
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('❌ Sin permisos de ubicación');
      return;
    }

    // Cargar job con auto-timer
    const jobsData = await AsyncStorage.getItem('jobs');
    if (!jobsData) {
      console.log('❌ No hay datos de trabajos');
      return;
    }
    const jobs = JSON.parse(jobsData);
    const autoTimerJob = jobs.find((j: any) => j?.autoTimer?.enabled);
    if (!autoTimerJob) {
      console.log('❌ No hay trabajos con auto timer habilitado');
      return;
    }

    // Limpiamos watcher previo
    if (this.locationWatcher) {
      this.locationWatcher.remove();
      this.locationWatcher = null;
    }

    // Reset estado
    this.lastGeoState = 'unknown';
    this.lastStartActionAt = null;
    this.lastStopActionAt = null;
    this.insideSince = null;
    this.outsideSince = null;

    // Lectura inicial
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await this.checkLocationAndAct(current, autoTimerJob, true);
    } catch (e) {
      console.log('⚠️ No se pudo obtener ubicación inicial:', e);
    }

    // Watcher continuo
    this.locationWatcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,   // 5 s
        distanceInterval: 5,  // 5 m
        mayShowUserSettingsDialog: true,
      },
      async (location) => {
        try {
          await this.checkLocationAndAct(location, autoTimerJob, false);
        } catch (e) {
          console.error('⚠️ Error en callback de ubicación:', e);
        }
      }
    );

    this.isRunning = true;
    console.log('✅ SIMPLE AUTO TIMER ACTIVO');
    
    // Emit current status when monitoring starts
    const activeSession = await JobService.getActiveSession();
    if (activeSession) {
      this.emit('statusChanged', { state: 'active', jobId: activeSession.jobId });
    } else {
      this.emit('statusChanged', { state: 'inactive' });
    }
  }

  /**
   * LÓGICA PRINCIPAL (sin histéresis de metros; con delays por tiempo)
   */
  private async checkLocationAndAct(
    location: Location.LocationObject,
    job: any,
    isInitial: boolean
  ): Promise<void> {
    if (!job?.location?.latitude || !job?.location?.longitude) {
      console.log('⚠️ Job sin coordenadas válidas');
      return;
    }

    // Radio efectivo
    const configuredRadius = Number(job.autoTimer?.geofenceRadius ?? job.autoTimer?.radius ?? 50);
    const radius = Math.max(this.minRadius, isNaN(configuredRadius) ? 50 : configuredRadius);

    // Delays (min → sec). Acepta varios nombres por compatibilidad.
    const startDelayMin = Number(
      job.autoTimer?.startDelayMinutes ?? job.autoTimer?.startDelay ?? 0
    );
    const stopDelayMin = Number(
      job.autoTimer?.stopDelayMinutes ?? job.autoTimer?.stopDelay ?? 0
    );
    const startDelaySec = Math.max(0, isNaN(startDelayMin) ? 0 : startDelayMin) * 60;
    const stopDelaySec  = Math.max(0, isNaN(stopDelayMin)  ? 0 : stopDelayMin)  * 60;

    const distance = this.calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      job.location.latitude,
      job.location.longitude
    );

    const isInside = distance <= radius;

    console.log(
      `📍 dist=${distance.toFixed(1)}m | R=${radius}m | inside=${isInside} | ` +
      `delays: start=${startDelaySec}s stop=${stopDelaySec}s ${isInitial ? '(initial)' : ''}`
    );

    const activeSession = await JobService.getActiveSession();
    const hasActiveTimer = !!activeSession;
    const now = Date.now();

    if (isInside) {
      // Entrando o permaneciendo dentro
      this.outsideSince = null;
      if (this.lastGeoState !== 'inside') {
        this.insideSince = now; // acaba de entrar
      } else if (this.insideSince === null) {
        this.insideSince = now;
      }

      // START si no hay timer
      if (!hasActiveTimer) {
        const staySec = this.insideSince ? (now - this.insideSince) / 1000 : 0;
        const sinceLastStart = this.lastStartActionAt ? (now - this.lastStartActionAt) / 1000 : Infinity;

        if (staySec >= startDelaySec && sinceLastStart >= this.minGapStartSec) {
          console.log(`✅ Dentro y cumpliendo delay (${staySec.toFixed(0)}s) → iniciar`);
          await this.startTimer(job);
          this.lastStartActionAt = now;
        } else {
          if (startDelaySec > 0) {
            console.log(`⏳ Dentro, esperando startDelay: ${staySec.toFixed(0)} / ${startDelaySec}s`);
          }
        }
      } else {
        // Ya hay sesión activa, verificar que sea para este trabajo
        if (activeSession && activeSession.jobId === job.id) {
          const isPaused = (activeSession as any).isPaused || false;
          const elapsedSec = Math.floor((now - new Date(activeSession.startTime).getTime()) / 1000);
          
          if (isPaused) {
            console.log(`⏸️ Timer pausado para ${job.name}`);
          } else {
            console.log(`⏱️ Timer activo para ${job.name} (${elapsedSec}s transcurridos)`);
          }
          
          // Actualizar estado interno para no reiniciar
          if (!this.insideSince) {
            this.insideSince = new Date(activeSession.startTime).getTime();
          }
          if (!this.lastStartActionAt) {
            this.lastStartActionAt = new Date(activeSession.startTime).getTime();
          }
        }
      }

      this.lastGeoState = 'inside';
    } else {
      // Fuera
      this.insideSince = null;
      if (this.lastGeoState !== 'outside') {
        this.outsideSince = now; // acaba de salir
      } else if (this.outsideSince === null) {
        this.outsideSince = now;
      }

      // STOP si hay timer (pero no si está pausado)
      if (hasActiveTimer) {
        const isPaused = (activeSession as any).isPaused || false;
        
        if (!isPaused) {
          const stayOutSec = this.outsideSince ? (now - this.outsideSince) / 1000 : 0;
          const sinceLastStop = this.lastStopActionAt ? (now - this.lastStopActionAt) / 1000 : Infinity;

          if (stayOutSec >= stopDelaySec && sinceLastStop >= this.minGapStopSec) {
            console.log(`🛑 Fuera y cumpliendo delay (${stayOutSec.toFixed(0)}s) → parar`);
            await this.stopTimer(job);
            this.lastStopActionAt = now;
          } else {
            if (stopDelaySec > 0) {
              console.log(`⏳ Fuera, esperando stopDelay: ${stayOutSec.toFixed(0)} / ${stopDelaySec}s`);
            } else {
              console.log('⏳ Fuera, esperando próximo fix para confirmar salida…'); // con 0s debería caer en la siguiente lectura
            }
          }
        } else {
          console.log(`⏸️ Timer pausado, no se auto-detiene`);
        }
      }

      this.lastGeoState = 'outside';
    }
  }

  /**
   * START
   */
  private async startTimer(job: any): Promise<void> {
    try {
      // Verificar una vez más que no hay sesión activa (doble verificación)
      const existingSession = await JobService.getActiveSession();
      if (existingSession && existingSession.jobId === job.id) {
        console.log(`⚠️ Ya existe sesión activa para ${job.name}, no crear duplicado`);
        return;
      }
      
      const startTime = new Date();
      await JobService.saveActiveSession({
        jobId: job.id,
        startTime: startTime.toISOString(),
        notes: 'Auto-started (SimpleAutoTimer)',
      });
      
      // Guardar también de forma redundante para BackgroundGeofenceTask
      const redundantSessionKey = `@bg_session_${job.id}`;
      await AsyncStorage.setItem(redundantSessionKey, JSON.stringify({
        jobId: job.id,
        startTime: startTime.toISOString(),
        notes: 'Auto-started (SimpleAutoTimer)',
      }));
      
      await this.notificationService.sendNotification('timer_started', job.name);
      console.log(`✅ Timer iniciado para ${job.name} a las ${startTime.toLocaleTimeString()}`);
      
      // Emit event for listeners (like MapLocation)
      this.emit('statusChanged', { state: 'active', jobId: job.id });
    } catch (error) {
      console.error('Error iniciando timer:', error);
    }
  }

  /**
   * STOP
   */
  private async stopTimer(job: any): Promise<void> {
    try {
      const activeSession = await JobService.getActiveSession();
      if (!activeSession) {
        console.log('ℹ️ No hay sesión activa al intentar parar');
        return;
      }

      const sessionStart = new Date(activeSession.startTime);
      const now = new Date();
      const elapsedMs = now.getTime() - sessionStart.getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60); // Keep full precision

      // Get actual start and end times
      const actualStartTime = sessionStart.toTimeString().split(' ')[0]; // HH:MM:SS format
      const actualEndTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format

      const today = now.toISOString().split('T')[0];
      await JobService.addWorkDay({
        date: today,
        jobId: activeSession.jobId ?? job.id,
        hours: elapsedHours,
        notes: 'Auto-stopped (NoHysteresis)',
        overtime: elapsedHours > 8,
        type: 'work',
        actualStartTime: actualStartTime,
        actualEndTime: actualEndTime,
      });

      await JobService.clearActiveSession();
      
      // Limpiar también sesión redundante
      const redundantSessionKey = `@bg_session_${activeSession.jobId ?? job.id}`;
      await AsyncStorage.removeItem(redundantSessionKey);
      
      await this.notificationService.sendNotification('timer_stopped', job?.name ?? 'Trabajo');

      console.log(`🛑 Timer parado: ${elapsedHours}h`);
      
      // Emit event for listeners (like MapLocation)
      this.emit('statusChanged', { state: 'inactive' });
    } catch (error) {
      console.error('Error parando timer:', error);
    }
  }

  /**
   * Haversine (m)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * STOP watcher
   */
  stop(): void {
    if (this.locationWatcher) {
      this.locationWatcher.remove();
      this.locationWatcher = null;
    }
    this.isRunning = false;
    this.lastGeoState = 'unknown';
    this.insideSince = null;
    this.outsideSince = null;
    console.log('🛑 SIMPLE AUTO TIMER DETENIDO');
  }
  /**
   * Get current status (for compatibility with MapLocation)
   */
  async getStatus(): Promise<any> {
    const activeSession = await JobService.getActiveSession();
    
    if (activeSession) {
      const jobsData = await AsyncStorage.getItem('jobs');
      const jobs = jobsData ? JSON.parse(jobsData) : [];
      const job = jobs.find((j: any) => j.id === activeSession.jobId);
      
      return {
        state: 'active',
        jobId: activeSession.jobId,
        jobName: job?.name || null,
        remainingTime: 0,
        totalDelayTime: 0,
        message: 'active',
      };
    }
    
    return {
      state: 'inactive',
      jobId: null,
      jobName: null,
      remainingTime: 0,
      totalDelayTime: 0,
      message: 'inactive',
    };
  }

  /**
   * Get elapsed time for active timer
   */
  async getElapsedTime(): Promise<number> {
    const activeSession = await JobService.getActiveSession();
    if (activeSession) {
      const isPaused = (activeSession as any).isPaused || false;
      const pausedElapsedTime = (activeSession as any).pausedElapsedTime || 0;
      
      if (isPaused) {
        // If paused, return the stored elapsed time
        return pausedElapsedTime;
      } else {
        // If running, calculate current elapsed time
        const startTime = new Date(activeSession.startTime).getTime();
        const now = Date.now();
        return Math.floor((now - startTime) / 1000);
      }
    }
    return 0;
  }

  /**
   * Check if service is enabled
   */
  isServiceEnabled(): boolean {
    return this.isRunning;
  }

  /**
   * Start service (for compatibility with AutoTimerService)
   */
  async start(jobs: any[]): Promise<boolean> {
    await this.startSimpleMonitoring();
    return true;
  }

  /**
   * Pause the active timer
   */
  async pauseTimer(): Promise<void> {
    try {
      const activeSession = await JobService.getActiveSession();
      if (!activeSession) {
        console.log('⚠️ No active session to pause');
        return;
      }

      const now = new Date();
      const elapsed = Math.floor((now.getTime() - new Date(activeSession.startTime).getTime()) / 1000);
      
      const sessionForStorage = {
        jobId: activeSession.jobId,
        startTime: activeSession.startTime,
        notes: activeSession.notes || 'Auto-started (SimpleAutoTimer)',
        isPaused: true,
        pausedElapsedTime: elapsed,
      };
      
      await JobService.saveActiveSession(sessionForStorage);
      console.log(`⏸️ SimpleAutoTimer: Timer paused with ${elapsed}s elapsed`);
      
      // Emit status change
      this.emit('statusChanged', { state: 'active', jobId: activeSession.jobId, isPaused: true });
    } catch (error) {
      console.error('❌ SimpleAutoTimer: Error pausing timer:', error);
    }
  }

  /**
   * Resume the paused timer
   */
  async resumeTimer(): Promise<void> {
    try {
      const sessionData = await JobService.getActiveSession();
      if (!sessionData) {
        console.log('⚠️ No session to resume');
        return;
      }
      
      const pausedElapsedTime = (sessionData as any).pausedElapsedTime || 0;
      
      // Calculate new start time by subtracting paused elapsed time from now
      const now = new Date();
      const adjustedStartTime = new Date(now.getTime() - (pausedElapsedTime * 1000));
      
      const sessionForStorage = {
        jobId: sessionData.jobId,
        startTime: adjustedStartTime.toISOString(),
        notes: sessionData.notes || 'Auto-started (SimpleAutoTimer)',
        isPaused: false,
        pausedElapsedTime: 0,
      };
      
      await JobService.saveActiveSession(sessionForStorage);
      console.log(`▶️ SimpleAutoTimer: Timer resumed from ${pausedElapsedTime}s`);
      
      // Update internal state
      if (this.lastStartActionAt) {
        // Adjust the lastStartActionAt to account for paused time
        this.lastStartActionAt = adjustedStartTime.getTime();
      }
      
      // Emit status change
      this.emit('statusChanged', { state: 'active', jobId: sessionData.jobId, isPaused: false });
    } catch (error) {
      console.error('❌ SimpleAutoTimer: Error resuming timer:', error);
    }
  }

  /**
   * Update jobs (for compatibility)
   */
  async updateJobs(jobs: any[]): Promise<void> {
    // SimpleAutoTimer reloads jobs on each location update
    console.log('📝 Jobs updated (will reload on next location update)');
  }

  /**
   * Add status listener (for compatibility)
   */
  addStatusListener(callback: (status: any) => void): void {
    // For compatibility - SimpleAutoTimer doesn't use listeners
    console.log('📌 Status listener added (compatibility mode)');
  }

  /**
   * Remove status listener (for compatibility)
   */
  removeStatusListener(callback: (status: any) => void): void {
    // For compatibility
    console.log('📌 Status listener removed (compatibility mode)');
  }

  /**
   * Add alert listener (for compatibility)
   */
  addAlertListener(callback: (showAlert: boolean) => void): void {
    // For compatibility
    console.log('📌 Alert listener added (compatibility mode)');
  }

  /**
   * Remove alert listener (for compatibility)
   */
  removeAlertListener(callback: (showAlert: boolean) => void): void {
    // For compatibility
    console.log('📌 Alert listener removed (compatibility mode)');
  }
}

export default SimpleAutoTimer;
