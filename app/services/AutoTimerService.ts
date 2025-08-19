import { Job } from '../types/WorkTypes';
import { JobService } from './JobService';
import GeofenceService, { GeofenceEvent } from './GeofenceService';
import NotificationService from './NotificationService';
import LiveActivityService from './LiveActivityService';
import WidgetCalendarService from './WidgetCalendarService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Location from 'expo-location';
import { startBackgroundGeofencing, stopBackgroundGeofencing } from './BackgroundGeofenceTask';

export type AutoTimerState = 
  | 'inactive'     // Not monitoring or no jobs nearby
  | 'entering'     // Inside geofence, waiting to start timer
  | 'active'       // Timer is running automatically
  | 'leaving';     // Outside geofence, waiting to stop timer

export interface AutoTimerStatus {
  state: AutoTimerState;
  jobId: string | null;
  jobName: string | null;
  remainingTime: number; // Seconds remaining for delay
  totalDelayTime: number; // Total delay time in seconds
  message: string; // User-friendly message
}

interface DelayedAction {
  jobId: string;
  action: 'start' | 'stop';
  timeout: NodeJS.Timeout;
  startTime: Date;
  delaySeconds: number;
}

class AutoTimerService {
  private static instance: AutoTimerService;
  private geofenceService: GeofenceService;
  private notificationService: NotificationService;
  private liveActivityService: LiveActivityService;
  private currentDelayedAction: DelayedAction | null = null;
  private currentState: AutoTimerState = 'inactive';
  private currentJobId: string | null = null;
  private jobs: Job[] = [];
  private statusCallbacks: ((status: AutoTimerStatus) => void)[] = [];
  private alertCallbacks: ((showAlert: boolean) => void)[] = [];
  private isEnabled = false;
  private statusUpdateInterval: NodeJS.Timeout | null = null;
  private sentNotifications: Set<string> = new Set(); // Track sent notifications to avoid duplicates
  private autoTimerStartTime: Date | null = null; // Track when auto timer actually started
  private lastProcessedEvents: Map<string, number> = new Map(); // For event deduplication

  constructor() {
    this.geofenceService = GeofenceService.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.liveActivityService = LiveActivityService.getInstance();
    this.bindGeofenceEvents();
    this.setupAppStateListener();
  }


  static getInstance(): AutoTimerService {
    if (!AutoTimerService.instance) {
      AutoTimerService.instance = new AutoTimerService();
    }
    return AutoTimerService.instance;
  }

  /**
   * Start the auto timer service
   */
  async start(jobs: Job[]): Promise<boolean> {
    try {
      // Always update the jobs list
      this.jobs = jobs;
      
      // Check if any job has auto timer enabled
      const autoTimerJobs = jobs.filter(job => job.autoTimer?.enabled);
      console.log(`🔍 AutoTimer: Found ${autoTimerJobs.length} jobs with auto timer enabled`);
      autoTimerJobs.forEach(job => {
        console.log(`🔍 AutoTimer Job: ${job.name} - Radius: ${job.autoTimer?.geofenceRadius}m - Location: ${job.location?.latitude}, ${job.location?.longitude}`);
      });
      
      if (autoTimerJobs.length === 0) {
        console.log('❌ AutoTimer: No jobs with auto timer enabled');
        if (this.isEnabled) {
          this.stop(); // Stop if no more auto timer jobs
        }
        return false;
      }

      // Check if already enabled - just update jobs and continue
      if (this.isEnabled) {
        console.log('🔄 AutoTimer: Service already running, updating jobs only');
        // Also check for pending actions when service is already running
        await this.checkPendingActions();
        return true;
      }

      // Restore state from storage (after jobs are set)
      await this.restoreState();

      // Check for active sessions - NEVER clear them automatically
      const activeSession = await JobService.getActiveSession();
      if (activeSession) {
        console.log(`🔍 Found active session:`, {
          jobId: activeSession.jobId,
          startTime: activeSession.startTime,
          notes: activeSession.notes
        });
        
        // If there's an auto-started session, restore our state to match it
        if (activeSession.notes === 'Auto-started' || activeSession.notes === 'Auto-started (Background)') {
          console.log(`✅ Restoring state from existing auto-started session for job ${activeSession.jobId}`);
          this.currentState = 'active';
          this.currentJobId = activeSession.jobId;
          this.autoTimerStartTime = new Date(activeSession.startTime);
        }
        // NEVER clear active sessions - they should only be stopped by exit or manual stop
      }

      // Start geofence monitoring in FOREGROUND ONLY mode
      let success = await this.geofenceService.startMonitoring(jobs, false);
      if (success) {
        this.isEnabled = true;
        this.currentState = 'inactive';
        this.startStatusUpdateInterval();
        this.notifyStatusChange();
        console.log('🟢 Auto timer service started successfully');
        console.log(`📊 Current status: ${this.currentState}, Job: ${this.currentJobId}, Enabled: ${this.isEnabled}`);
        
        // Iniciar background geofencing solo si no está ya activo
        try {
          // Verificar si ya está activo antes de iniciar
          const isBackgroundActive = await this.isBackgroundGeofencingActive();
          if (!isBackgroundActive) {
            await startBackgroundGeofencing(autoTimerJobs);
            console.log('🌍 Background geofencing iniciado correctamente');
          } else {
            console.log('🔄 Background geofencing ya está activo, actualizando trabajos');
            // Reiniciar con nuevos trabajos si cambió la configuración
            await stopBackgroundGeofencing();
            await startBackgroundGeofencing(autoTimerJobs);
          }
        } catch (error) {
          console.error('❌ Error iniciando background geofencing:', error);
        }
        
        // Check if user is inside any geofence when starting
        const userLocation = await this.getCurrentLocation();
        if (userLocation) {
          const isInsideAnyGeofence = autoTimerJobs.some(job => {
            if (!job.location?.latitude || !job.location?.longitude) return false;
            const distance = this.calculateDistance(
              userLocation.coords.latitude,
              userLocation.coords.longitude,
              job.location.latitude,
              job.location.longitude
            );
            const radius = job.autoTimer?.geofenceRadius || 50; // Default 50m
            return distance <= radius;
          });
          
          // Show alert only if NOT inside any geofence
          if (!isInsideAnyGeofence) {
            setTimeout(() => {
              // Notify UI components to show alert
              this.notifyAlertCallbacks(true);
            }, 500);
          }
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error starting auto timer service:', error);
      return false;
    }
  }

  /**
   * Stop the auto timer service
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping AutoTimerService');
    this.isEnabled = false;
    this.cancelDelayedAction();
    this.geofenceService.stopMonitoring();
    
    // End all Live Activities when stopping the service
    await this.liveActivityService.endAllLiveActivities();
    
    // Detener background geofencing
    try {
      await stopBackgroundGeofencing();
      console.log('🛑 Background geofencing detenido');
    } catch (error) {
      console.error('❌ Error deteniendo background geofencing:', error);
    }
    
    this.cancelDelayedAction();
    this.stopStatusUpdateInterval();
    this.currentState = 'inactive';
    this.currentJobId = null;
    this.autoTimerStartTime = null; // Clear start time
    this.isEnabled = false;
    
    // FORZAR el cierre de TODOS los Live Activities
    await this.liveActivityService.endAllLiveActivities();
    console.log('📱 FORCE ended all Live Activities on AutoTimer stop');
    
    this.clearNotificationHistory(); // Clear notification history when stopping
    
    // Save state and notify all listeners
    await this.saveState();
    this.notifyStatusChange();
    console.log('Auto timer service stopped - state:', this.currentState);
  }

  /**
   * Bind to geofence events
   */
  private bindGeofenceEvents(): void {
    this.geofenceService.addEventListener((event: GeofenceEvent) => {
      this.handleGeofenceEvent(event);
    });
  }

  /**
   * Setup AppState listener to handle app coming back to foreground
   */
  private setupAppStateListener(): void {
    let lastAppState = AppState.currentState;
    
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('📱 AutoTimer: AppState changed from', lastAppState, 'to:', nextAppState);
      
      // Check when app comes back to foreground
      if ((lastAppState === 'background' || lastAppState === 'inactive') && nextAppState === 'active') {
        console.log('📲 App became active - checking pending AutoTimer actions');
        this.checkPendingActions();
      }
      
      lastAppState = nextAppState;
    });
  }

  /**
   * Handle geofence enter/exit events
   */
  private async handleGeofenceEvent(event: GeofenceEvent): Promise<void> {
    // Implement event deduplication (prevent duplicate events from foreground/background)
    const eventKey = `${event.jobId}-${event.eventType}`;
    const eventTime = event.timestamp.getTime();
    const lastEventTime = this.lastProcessedEvents.get(eventKey);
    
    // Increase deduplication window to 10 seconds for better conflict prevention
    if (lastEventTime && (eventTime - lastEventTime) < 10000) {
      console.log(`🔄 Duplicate event detected for ${eventKey}, ignoring (${eventTime - lastEventTime}ms apart)`);
      return;
    }
    
    // Store this event time
    this.lastProcessedEvents.set(eventKey, eventTime);
    
    // Clean up old events (older than 1 minute)
    const oneMinuteAgo = Date.now() - 60000;
    for (const [key, time] of this.lastProcessedEvents.entries()) {
      if (time < oneMinuteAgo) {
        this.lastProcessedEvents.delete(key);
      }
    }
    
    console.log(`\n🎯 [AutoTimerService] ${event.eventType.toUpperCase()} event`);
    console.log(`   Job: ${this.jobs.find(j => j.id === event.jobId)?.name || event.jobId}`);
    console.log(`   Current State: ${this.currentState}${this.currentJobId ? ` (job: ${this.currentJobId})` : ''}`);
    
    // Skip if there's an active timer for a different job
    const activeSession = await JobService.getActiveSession();
    if (activeSession && activeSession.jobId !== event.jobId && event.eventType === 'enter') {
      console.log('Timer active for different job, ignoring enter event');
      return;
    }

    const job = this.jobs.find(j => j.id === event.jobId);
    if (!job || !job.autoTimer?.enabled) {
      console.log('Job not found or AutoTimer not enabled, ignoring geofence event');
      return;
    }

    if (event.eventType === 'enter') {
      await this.handleJobEnter(job);
    } else {
      await this.handleJobExit(job);
    }
  }

  /**
   * Handle entering a job's geofence
   */
  private async handleJobEnter(job: Job): Promise<void> {
    console.log(`\n✅ [ENTER] Processing entry for: ${job.name}`);

    // Cancel any pending exit action
    if (this.currentDelayedAction?.action === 'stop') {
      this.cancelDelayedAction();
    }

    // Check if we're already active for this job
    if (this.currentState === 'active' && this.currentJobId === job.id) {
      console.log(`⚡ AutoTimer already active for ${job.name}, ignoring enter event`);
      return;
    }

    // Check if there's an active session for this job
    const activeSession = await JobService.getActiveSession();
    if (activeSession && activeSession.jobId === job.id) {
      // If it's a manual session (not auto-started), don't interfere
      if (activeSession.notes !== 'Auto-started' && activeSession.notes !== 'Auto-started (Background)') {
        console.log(`⚠️ Manual timer running for ${job.name}, AutoTimer will not interfere`);
        return;
      }
      console.log(`⚡ Timer already running for ${job.name}, setting state to active`);
      this.currentState = 'active';
      this.currentJobId = job.id;
      // Restore the start time if it's an auto-started session
      if (activeSession.notes === 'Auto-started' && !this.autoTimerStartTime) {
        this.autoTimerStartTime = new Date(activeSession.startTime);
        console.log(`⏱️ Restored start time from active session: ${this.autoTimerStartTime.toLocaleTimeString()}`);
      }
      
      // Update Live Activity with current time
      // const elapsedSeconds = Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000);
      
      // Solo intentar crear Live Activity la PRIMERA vez
      // Si ya se intentó antes, no hacer nada para evitar duplicados
      const liveActivityKey = `@live_activity_created_${activeSession.jobId}`;
      const alreadyCreated = await AsyncStorage.getItem(liveActivityKey);
      
      if (alreadyCreated) {
        console.log('📱 Live Activity already created for this session, checking if needs restart');
        // Verificar si el Live Activity está activo y reiniciar actualizaciones
        const hasActive = await this.liveActivityService.checkExistingLiveActivity();
        if (!hasActive) {
          // Si no hay Live Activity activo, crear uno nuevo
          console.log('📱 No active Live Activity found, creating new one');
          const sessionStartTime = new Date(activeSession.startTime);
          await this.liveActivityService.startLiveActivity(job.name, job.address, sessionStartTime);
        }
        
        // IMPORTANTE: Siempre reiniciar el timer de actualizaciones
        if (this.statusUpdateInterval) {
          clearInterval(this.statusUpdateInterval);
        }
        this.statusUpdateInterval = setInterval(() => {
          this.updateLiveActivityTime();
        }, 5000);
        console.log('⏱️ Update timer restarted');
        return;
      }
      
      // Marcar que vamos a crear el Live Activity para esta sesión
      await AsyncStorage.setItem(liveActivityKey, 'true');
      
      // Crear Live Activity
      console.log('📱 Creating Live Activity for first time in this session');
      const sessionStartTime = new Date(activeSession.startTime);
      await this.liveActivityService.startLiveActivity(job.name, job.address, sessionStartTime);
      
      // Start update interval
      if (this.statusUpdateInterval) {
        clearInterval(this.statusUpdateInterval);
      }
      // Actualizar cada 5 segundos (no necesitamos actualizar tan frecuente como LiveActivityService)
      this.statusUpdateInterval = setInterval(() => {
        this.updateLiveActivityTime();
      }, 5000);
      
      await this.saveState();
      this.notifyStatusChange();
      return;
    }

    // Check if we're already in entering state for this job
    if (this.currentState === 'entering' && this.currentJobId === job.id) {
      console.log(`⚠️ Already in entering state for ${job.name}, ignoring duplicate event`);
      return;
    }

    // Use configured delay or default (2 minutes)
    const delayMinutes = job.autoTimer?.delayStart ?? 2;
    
    if (delayMinutes > 0) {
      // Schedule timer start with delay
      console.log(`⏱️ Scheduling timer start for ${job.name} in ${delayMinutes} minutes`);
      this.currentState = 'entering';
      this.currentJobId = job.id;
      
      const delaySeconds = delayMinutes * 60;
      this.currentDelayedAction = {
        jobId: job.id,
        action: 'start',
        startTime: new Date(),
        delaySeconds: delaySeconds,
        timeout: setTimeout(async () => {
          console.log(`🚀 Starting timer for ${job.name} after ${delayMinutes} minute delay`);
          await this.startAutoTimer(job);
        }, delaySeconds * 1000)
      };
      
      // NO enviar notificación cuando se programa - solo cuando realmente inicie
      console.log(`⏱️ Timer programado para iniciar en ${delayMinutes} minutos`);
    } else {
      // Start immediately if delay is 0
      console.log(`🚀 Starting timer immediately for ${job.name} (no delay configured)`);
      await this.startAutoTimer(job);
    }
    
    await this.saveState();
    this.notifyStatusChange();
  }

  /**
   * Handle exiting a job's geofence
   */
  private async handleJobExit(job: Job): Promise<void> {
    console.log(`\n🚪 [EXIT] Processing exit for: ${job.name}`);

    // Cancel any pending start action
    if (this.currentDelayedAction?.action === 'start' && this.currentDelayedAction.jobId === job.id) {
      this.cancelDelayedAction();
      this.currentState = 'inactive';
      this.currentJobId = null;
      this.notifyStatusChange();
      return;
    }

    // Check if timer is active for this job
    const activeSession = await JobService.getActiveSession();
    if (!activeSession || activeSession.jobId !== job.id) {
      return;
    }

    // Use configured delay or default (2 minutes)
    const delayMinutes = job.autoTimer?.delayStop ?? 2;
    
    if (delayMinutes > 0) {
      // Schedule timer stop with delay
      console.log(`⏱️ Scheduling timer stop for ${job.name} in ${delayMinutes} minutes`);
      this.currentState = 'exiting';
      
      const delaySeconds = delayMinutes * 60;
      this.currentDelayedAction = {
        jobId: job.id,
        action: 'stop',
        startTime: new Date(),
        delaySeconds: delaySeconds,
        timeout: setTimeout(async () => {
          console.log(`🛑 Stopping timer for ${job.name} after ${delayMinutes} minute delay`);
          await this.stopAutoTimer(job);
        }, delaySeconds * 1000)
      };
      
      // NO enviar notificación cuando se programa - solo cuando realmente pare
      console.log(`⏱️ Timer programado para detenerse en ${delayMinutes} minutos`);
    } else {
      // Stop immediately if delay is 0
      console.log(`🛑 Stopping timer immediately for ${job.name} (no delay configured)`);
      await this.stopAutoTimer(job);
    }
    
    await this.saveState();
    this.notifyStatusChange();
  }

  /**
   * Start automatic timer for a job
   */
  private async startAutoTimer(job: Job): Promise<void> {
    try {
      console.log(`⏰ Attempting to auto-start timer for ${job.name}`);
      
      // Check for any existing session (shouldn't happen if we cleared it properly)
      const activeSession = await JobService.getActiveSession();
      if (activeSession) {
        console.log(`⚠️ Unexpected active session found during auto-start, clearing it`);
        await JobService.clearActiveSession();
      }

      console.log(`🎯 Starting timer for job ${job.id} (${job.name})`);
      
      const startTime = new Date();
      
      // Use the same pattern as TimerScreen to start a timer
      const sessionForStorage = {
        jobId: job.id,
        startTime: startTime.toISOString(),
        notes: 'Auto-started', // Auto-started note
      };
      
      await JobService.saveActiveSession(sessionForStorage);
      this.currentState = 'active';
      this.currentJobId = job.id; // Set the current job ID
      this.currentDelayedAction = null;
      this.autoTimerStartTime = startTime; // Save the actual start time
      
      // Clear any pending action from storage
      await AsyncStorage.removeItem(`@auto_timer_pending_${job.id}`);
      
      // Save state immediately to persist the start time
      await this.saveState();
      
      // Start Live Activity for Dynamic Island with actual start time
      await this.liveActivityService.startLiveActivity(job.name, job.address, this.autoTimerStartTime);
      
      // Start updating Live Activity every 5 seconds
      if (this.statusUpdateInterval) {
        clearInterval(this.statusUpdateInterval);
      }
      this.statusUpdateInterval = setInterval(() => {
        this.updateLiveActivityTime();
      }, 5000);
      
      // Enviar notificación de inicio
      await this.notificationService.sendNotification('timer_started', job.name);
      
      this.notifyStatusChange();
      console.log(`✅ Auto-started timer for ${job.name} at ${startTime.toLocaleTimeString()}`);
    } catch (error) {
      console.error('Error starting auto timer:', error);
      this.currentState = 'inactive';
      this.currentJobId = null;
      this.notifyStatusChange();
    }
  }

  /**
   * Stop automatic timer for a job
   */
  private async stopAutoTimer(job: Job): Promise<void> {
    try {
      const currentSession = await JobService.getActiveSession();
      if (currentSession && currentSession.jobId === job.id) {
        console.log(`🛑 Auto-stopping timer for ${job.name}`);
        
        // Calculate elapsed time (simplified version - we'll use 1 hour as default)
        const sessionStart = new Date(currentSession.startTime);
        const now = new Date();
        const elapsedMs = now.getTime() - sessionStart.getTime();
        const elapsedHours = Math.max(0.01, parseFloat(((elapsedMs / (1000 * 60 * 60))).toFixed(2)));
        
        // Create work day record
        const today = new Date().toISOString().split('T')[0];
        const workDay = {
          date: today,
          jobId: job.id,
          hours: elapsedHours,
          notes: currentSession.notes || 'Auto-stopped',
          overtime: elapsedHours > 8,
          type: 'work' as const,
        };
        
        await JobService.addWorkDay(workDay);
        await JobService.clearActiveSession();
        
        // Sync calendar data with widget
        await WidgetCalendarService.syncCalendarData();
        
        // Stop Live Activity updates
        if (this.statusUpdateInterval) {
          clearInterval(this.statusUpdateInterval);
          this.statusUpdateInterval = null;
        }
        
        // End Live Activity with elapsed seconds
        const elapsedSeconds = Math.floor(elapsedHours * 3600);
        await this.liveActivityService.endLiveActivity(elapsedSeconds);
        
        // IMPORTANTE: Limpiar la marca de Live Activity para esta sesión
        if (currentSession?.jobId) {
          const liveActivityKey = `@live_activity_created_${currentSession.jobId}`;
          await AsyncStorage.removeItem(liveActivityKey);
          console.log('📱 Cleaned Live Activity marker for ended session');
        }
        
        // Solo terminar Live Activity si la app está en segundo plano
        if (Platform.OS === 'ios') {
          try {
            const { NativeModules } = require('react-native');
            if (NativeModules.LiveActivityModule) {
              await NativeModules.LiveActivityModule.endAllLiveActivities();
              console.log('📱 Live Activity terminated (app in background)');
            }
          } catch (error) {
            console.log('Live Activity could not be stopped - app might be closed');
          }
          
          // Notificación ya enviada por notificationService más abajo
          console.log('📱 Live Activity terminado');
        }
        
        // Enviar notificación normal
        await this.notificationService.sendNotification('timer_stopped', job.name);
        
        console.log(`✅ Auto-stopped timer for ${job.name}: ${elapsedHours}h recorded`);
      }
      
      this.currentState = 'inactive';
      this.currentJobId = null;
      this.currentDelayedAction = null;
      this.autoTimerStartTime = null; // Clear the start time
      await this.saveState(); // Save state after clearing
      this.notifyStatusChange();
    } catch (error) {
      console.error('Error stopping auto timer:', error);
      this.currentState = 'inactive';
      this.currentJobId = null;
      this.autoTimerStartTime = null;
      this.notifyStatusChange();
    }
  }

  /**
   * Cancel any pending delayed action
   */
  private async cancelDelayedAction(): Promise<void> {
    if (this.currentDelayedAction) {
      console.log(`🚫 Cancelling delayed ${this.currentDelayedAction.action} action`);
      clearTimeout(this.currentDelayedAction.timeout);
      
      // Cancel any scheduled notifications for this job
      const job = this.jobs.find(j => j.id === this.currentDelayedAction?.jobId);
      if (job) {
        // No scheduled notifications to cancel - timer actions are immediate
        // Clean up pending action from storage
        await AsyncStorage.removeItem(`@auto_timer_pending_${job.id}`);
      }
      
      this.currentDelayedAction = null;
      // Clear related sent notifications when cancelling actions
      this.clearNotificationHistory();
    }
  }

  /**
   * Clear notification history to allow new notifications
   */
  private clearNotificationHistory(): void {
    this.sentNotifications.clear();
    console.log('🗑️ Notification history cleared');
  }

  /**
   * Get current location
   */
  private async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }
      
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get elapsed time for active auto timer (includes time when app was closed)
   */
  async getElapsedTime(): Promise<number> {
    if (this.currentState === 'active' && this.autoTimerStartTime) {
      // Check if the session is paused
      const activeSession = await JobService.getActiveSession();
      if (activeSession) {
        const isPaused = (activeSession as any).isPaused || false;
        const pausedElapsedTime = (activeSession as any).pausedElapsedTime || 0;
        
        if (isPaused && pausedElapsedTime > 0) {
          // Return the paused elapsed time
          return pausedElapsedTime;
        } else {
          // Calculate current elapsed time
          const sessionStart = new Date(activeSession.startTime);
          const elapsedMs = Date.now() - sessionStart.getTime();
          return Math.floor(elapsedMs / 1000);
        }
      }
    }
    return 0;
  }

  /**
   * Update Live Activity with current elapsed time
   */
  private updateLiveActivityTime(): void {
    // Ya no necesitamos actualizar el Live Activity
    // Solo muestra la hora de inicio
    return;
  }

  /**
   * Get current auto timer status
   */
  getStatus(): AutoTimerStatus {
    const job = this.currentJobId ? this.jobs.find(j => j.id === this.currentJobId) : null;
    
    let remainingTime = 0;
    let totalDelayTime = 0;
    let message = '';

    if (this.currentDelayedAction) {
      const elapsed = (Date.now() - this.currentDelayedAction.startTime.getTime()) / 1000;
      remainingTime = Math.max(0, this.currentDelayedAction.delaySeconds - elapsed);
      totalDelayTime = this.currentDelayedAction.delaySeconds;
    }

    // Message will be generated in the UI component with proper translations
    switch (this.currentState) {
      case 'inactive':
        message = 'inactive';
        break;
      case 'entering':
        message = `entering:${remainingTime}`;
        break;
      case 'active':
        message = 'active';
        break;
      case 'leaving':
        message = `leaving:${remainingTime}`;
        break;
    }

    return {
      state: this.currentState,
      jobId: this.currentJobId,
      jobName: job?.name || null,
      remainingTime,
      totalDelayTime,
      message,
    };
  }


  /**
   * Reset to monitoring state (stop active timer but keep monitoring)
   */
  async resetToMonitoring(): Promise<void> {
    console.log('🔄 Resetting AutoTimer to monitoring state');
    
    // Cancel any delayed actions
    await this.cancelDelayedAction();
    
    // Reset state but keep service enabled
    this.currentState = 'inactive';
    this.currentJobId = null;
    this.autoTimerStartTime = null;
    
    // Stop Live Activity updates if running
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
    
    // End Live Activity
    await this.liveActivityService.endAllLiveActivities();
    
    // Save and notify
    await this.saveState();
    this.notifyStatusChange();
    
    console.log('✅ AutoTimer reset to monitoring state');
  }

  /**
   * Stop current auto timer and save any active session
   */
  async forceStopAndSave(): Promise<{ hours?: number; saved: boolean }> {
    try {
      const activeSession = await JobService.getActiveSession();
      let result = { saved: false, hours: 0 };
      
      if (activeSession) {
        // Calculate elapsed time
        const sessionStart = new Date(activeSession.startTime);
        const now = new Date();
        const elapsedMs = now.getTime() - sessionStart.getTime();
        const elapsedHours = Math.max(0.01, parseFloat(((elapsedMs / (1000 * 60 * 60))).toFixed(2)));
        
        // Create work day record
        const today = new Date().toISOString().split('T')[0];
        const workDay = {
          date: today,
          jobId: activeSession.jobId,
          hours: elapsedHours,
          notes: activeSession.notes || 'Parado manualmente desde AutoTimer',
          overtime: elapsedHours > 8,
          type: 'work' as const,
        };
        
        await JobService.addWorkDay(workDay);
        await JobService.clearActiveSession();
        
        // Sync calendar data with widget
        await WidgetCalendarService.syncCalendarData();
        
        result = { saved: true, hours: elapsedHours };
        console.log(`💾 Force stopped and saved: ${elapsedHours}h`);
      }
      
      // Reset to monitoring state (keeps service active but stops timer)
      await this.resetToMonitoring();
      
      console.log('🚫 AutoTimer reset after manual stop');
      
      return result;
    } catch (error) {
      console.error('Error in forceStopAndSave:', error);
      return { saved: false };
    }
  }

  /**
   * Check if service is enabled
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Check if background geofencing is active
   */
  private async isBackgroundGeofencingActive(): Promise<boolean> {
    try {
      const TaskManager = require('expo-task-manager');
      const BACKGROUND_GEOFENCE_TASK = 'background-geofence-task';
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_GEOFENCE_TASK);
      return isRegistered;
    } catch (error) {
      console.error('Error checking background geofencing status:', error);
      return false;
    }
  }


  /**
   * Add status change listener
   */
  addStatusListener(callback: (status: AutoTimerStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  /**
   * Remove status change listener
   */
  removeStatusListener(callback: (status: AutoTimerStatus) => void): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  /**
   * Add alert listener
   */
  addAlertListener(callback: (showAlert: boolean) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Remove alert listener
   */
  removeAlertListener(callback: (showAlert: boolean) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify alert callbacks
   */
  private notifyAlertCallbacks(showAlert: boolean): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(showAlert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
  }

  /**
   * Notify all listeners of status change
   */
  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in auto timer status callback:', error);
      }
    });
    // Save state when it changes
    this.saveState();
  }

  /**
   * Notify status change for countdown updates only (without saving state repeatedly)
   */
  private notifyStatusChangeForCountdown(): void {
    const status = this.getStatus();
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in auto timer status callback:', error);
      }
    });
    // No guardamos estado en cada segundo, solo para actualizaciones de UI
  }

  /**
   * Save current state to storage
   */
  private async saveState(): Promise<void> {
    try {
      const state = {
        isEnabled: this.isEnabled,
        currentState: this.currentState,
        currentJobId: this.currentJobId,
        autoTimerStartTime: this.autoTimerStartTime ? this.autoTimerStartTime.toISOString() : null,
        delayedAction: this.currentDelayedAction ? {
          jobId: this.currentDelayedAction.jobId,
          action: this.currentDelayedAction.action,
          startTime: this.currentDelayedAction.startTime.toISOString(),
          delaySeconds: this.currentDelayedAction.delaySeconds,
        } : null,
      };
      
      await AsyncStorage.setItem('@auto_timer_state', JSON.stringify(state));
      console.log('🔄 AutoTimer state saved', { 
        state: this.currentState, 
        hasStartTime: !!this.autoTimerStartTime 
      });
    } catch (error) {
      console.error('Error saving AutoTimer state:', error);
    }
  }

  /**
   * Restore state from storage
   */
  private async restoreState(): Promise<void> {
    try {
      const stateJson = await AsyncStorage.getItem('@auto_timer_state');
      if (stateJson) {
        const state = JSON.parse(stateJson);
        this.isEnabled = state.isEnabled || false;
        this.currentState = state.currentState || 'inactive';
        this.currentJobId = state.currentJobId || null;
        
        // Restore auto timer start time if active
        if (state.autoTimerStartTime && this.currentState === 'active') {
          this.autoTimerStartTime = new Date(state.autoTimerStartTime);
          const elapsedSeconds = Math.floor((Date.now() - this.autoTimerStartTime.getTime()) / 1000);
          console.log(`⏱️ AutoTimer was running: ${elapsedSeconds} seconds elapsed since ${this.autoTimerStartTime.toLocaleTimeString()}`);
          
          // DON'T start a new Live Activity when restoring - it should already be running
          // Just update the existing one with elapsed time if needed
          if (this.liveActivityService.isActive()) {
            this.liveActivityService.updateLiveActivity(elapsedSeconds);
          }
          
          // Start update interval
          if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
          }
          this.statusUpdateInterval = setInterval(() => {
            this.updateLiveActivityTime();
          }, 10000);
        }
        
        // Check if we should restore a delayed action or if it already executed
        if (state.delayedAction && this.currentState !== 'active') {
          const startTime = new Date(state.delayedAction.startTime);
          const elapsedSeconds = (Date.now() - startTime.getTime()) / 1000;
          const remainingSeconds = state.delayedAction.delaySeconds - elapsedSeconds;
          
          console.log(`🔄 Checking delayed action: ${Math.ceil(remainingSeconds)}s remaining from original ${state.delayedAction.delaySeconds}s`);
          
          // Only restore if we're still in the entering/leaving state
          if (this.currentState === 'entering' || this.currentState === 'leaving') {
            if (remainingSeconds > 0) {
              // Recreate the delayed action with remaining time
              const job = this.jobs.find(j => j.id === state.delayedAction.jobId);
              if (job) {
                const timeout = setTimeout(async () => {
                  console.log(`🚀 Restored timer triggered for ${job.name}`);
                  if (state.delayedAction.action === 'start') {
                    await this.startAutoTimer(job);
                  } else {
                    await this.stopAutoTimer(job);
                  }
                }, remainingSeconds * 1000);
                
                this.currentDelayedAction = {
                  jobId: state.delayedAction.jobId,
                  action: state.delayedAction.action,
                  timeout,
                  startTime: startTime,
                  delaySeconds: state.delayedAction.delaySeconds,
                };
                
                // Start status update interval
                this.startStatusUpdateInterval();
              }
            } else {
              // Time already expired, execute action immediately
              console.log(`⏰ Delayed action expired ${Math.abs(remainingSeconds)}s ago, executing now`);
              const job = this.jobs.find(j => j.id === state.delayedAction.jobId);
              if (job) {
                if (state.delayedAction.action === 'start') {
                  await this.startAutoTimer(job);
                } else {
                  await this.stopAutoTimer(job);
                }
              }
            }
          }
        }
        
        console.log('🔄 AutoTimer state restored:', {
          isEnabled: this.isEnabled,
          currentState: this.currentState,
          currentJobId: this.currentJobId,
          hasDelayedAction: !!this.currentDelayedAction,
        });
      }
    } catch (error) {
      console.error('Error restoring AutoTimer state:', error);
    }
  }

  /**
   * Update jobs list (call when jobs change)
   */
  async updateJobs(jobs: Job[]): Promise<void> {
    // Store jobs immediately
    const previousJobs = this.jobs;
    this.jobs = jobs;
    
    // If we haven't restored state yet and we now have jobs, restore it
    if (jobs.length > 0 && previousJobs.length === 0 && this.currentState === 'inactive') {
      console.log('🔄 First jobs loaded, attempting to restore AutoTimer state');
      await this.restoreState();
    }
    
    // Check if there are changes in AutoTimer configuration for active job
    if (this.currentJobId && this.currentDelayedAction) {
      const oldJob = previousJobs.find(j => j.id === this.currentJobId);
      const newJob = jobs.find(j => j.id === this.currentJobId);
      
      if (oldJob && newJob && oldJob.autoTimer && newJob.autoTimer) {
        const delayChanged = 
          oldJob.autoTimer.delayStart !== newJob.autoTimer.delayStart ||
          oldJob.autoTimer.delayStop !== newJob.autoTimer.delayStop;
          
        if (delayChanged) {
          console.log('🔄 AutoTimer configuration changed, restarting countdown with new values');
          
          // Calculate how much time has passed
          const elapsed = (Date.now() - this.currentDelayedAction.startTime.getTime()) / 1000;
          const oldRemainingTime = Math.max(0, this.currentDelayedAction.delaySeconds - elapsed);
          
          // Get new delay value
          const newDelayMinutes = this.currentDelayedAction.action === 'start' 
            ? newJob.autoTimer.delayStart 
            : newJob.autoTimer.delayStop;
          const newDelaySeconds = newDelayMinutes * 60;
          
          // Use the smaller of: new total time or remaining time
          const newRemainingTime = Math.min(newDelaySeconds, oldRemainingTime);
          
          // Restart with new timing
          await this.cancelDelayedAction();
          
          if (newRemainingTime > 0) {
            this.currentState = this.currentDelayedAction.action === 'start' ? 'entering' : 'leaving';
            
            const timeout = setTimeout(async () => {
              if (this.currentDelayedAction?.action === 'start') {
                await this.startAutoTimer(newJob);
              } else {
                await this.stopAutoTimer(newJob);
              }
            }, newRemainingTime * 1000);

            this.currentDelayedAction = {
              jobId: newJob.id,
              action: this.currentDelayedAction.action,
              timeout,
              startTime: new Date(),
              delaySeconds: newRemainingTime,
            };
            
            console.log(`⏰ Countdown restarted with ${Math.ceil(newRemainingTime)}s remaining (was ${Math.ceil(oldRemainingTime)}s)`);
          } else {
            // Time expired, execute action immediately
            if (this.currentDelayedAction.action === 'start') {
              this.startAutoTimer(newJob);
            } else {
              this.stopAutoTimer(newJob);
            }
          }
        }
      }
    }
    
    // Restart geofence monitoring with updated jobs if service is enabled
    if (this.isEnabled) {
      console.log('🔄 Restarting geofence monitoring with updated jobs');
      await this.geofenceService.startMonitoring(jobs, true);
    }
    
    this.notifyStatusChange();
  }

  /**
   * Force restart the service (clear everything and start fresh)
   */
  async forceRestart(jobs: Job[]): Promise<boolean> {
    console.log('🔄 Force restarting AutoTimer service');
    
    // Stop everything
    this.stop();
    
    // Clear any residual sessions
    await JobService.clearActiveSession();
    
    // Start fresh
    return this.start(jobs);
  }

  /**
   * Start status update interval for countdown
   */
  private startStatusUpdateInterval(): void {
    // Clear existing interval if any
    this.stopStatusUpdateInterval();
    
    // Update status every second when there's a delayed action
    this.statusUpdateInterval = setInterval(() => {
      if (this.currentDelayedAction) {
        const elapsed = (Date.now() - this.currentDelayedAction.startTime.getTime()) / 1000;
        const remainingTime = Math.max(0, this.currentDelayedAction.delaySeconds - elapsed);
        
        // Debug logging every 10 seconds or when close to zero
        if (Math.floor(elapsed) % 10 === 0 || remainingTime < 5) {
          console.log(`🔄 AutoTimer countdown: ${Math.ceil(remainingTime)}s remaining for ${this.currentDelayedAction.action} action`);
        }
        
        // Solo notificar cambios de estado, no cada segundo
        // Los listeners de UI se actualizarán solo cuando sea necesario
        this.notifyStatusChangeForCountdown();
      }
      
      // Check if active session was manually stopped every 5 seconds
      if (this.currentState === 'active' && Date.now() % 5000 < 1000) {
        this.checkActiveSessionStatus();
      }
    }, 1000);
  }

  /**
   * Stop status update interval
   */
  private stopStatusUpdateInterval(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
  }


  /**
   * Check if active session was manually stopped and reset state
   */
  private async checkActiveSessionStatus(): Promise<void> {
    if (this.currentState === 'active' && this.currentJobId) {
      const activeSession = await JobService.getActiveSession();
      
      // If there's no active session but we think we're active, reset
      if (!activeSession) {
        console.log('🔄 AutoTimer detected session was stopped manually, resetting to monitoring');
        await this.resetToMonitoring();
      }
      // If session exists but for different job, also reset
      else if (activeSession.jobId !== this.currentJobId) {
        console.log('🔄 AutoTimer detected different session active, resetting');
        await this.resetToMonitoring();
      }
    }
  }

  /**
   * Check for pending actions that should have been executed
   * (Called when app becomes active)
   */
  async checkPendingActions(): Promise<void> {
    try {
      const now = new Date();
      
      // First, check background pending actions
      const keys = await AsyncStorage.getAllKeys();
      const pendingKeys = keys.filter(key => 
        key.startsWith('@auto_timer_pending_start_') || 
        key.startsWith('@auto_timer_pending_stop_')
      );
      
      // Track which actions we've processed to avoid duplicates
      const processedActions = new Set<string>();
      
      for (const key of pendingKeys) {
        const pendingData = await AsyncStorage.getItem(key);
        if (!pendingData) continue;
        
        const pending = JSON.parse(pendingData);
        const targetTime = new Date(pending.targetTime);
        const jobId = key.split('_').pop();
        
        // Si ya pasó el tiempo objetivo, ejecutar la acción
        if (now >= targetTime) {
          console.log(`⏰ Processing pending action from background for job ${jobId}`);
          
          // Create action identifier to avoid duplicates
          const actionId = `${key.includes('pending_start') ? 'start' : 'stop'}_${jobId}`;
          if (processedActions.has(actionId)) {
            console.log(`⚠️ Action ${actionId} already processed, skipping`);
            await AsyncStorage.removeItem(key);
            continue;
          }
          
          const job = this.jobs.find(j => j.id === jobId);
          if (job) {
            if (key.includes('pending_start')) {
              // Check if not already started
              const activeSession = await JobService.getActiveSession();
              if (!activeSession) {
                console.log(`🚀 Starting timer from pending action for ${job.name}`);
                await this.startAutoTimer(job);
                processedActions.add(actionId);
              } else {
                console.log(`⚠️ Session already active, skipping pending start`);
              }
            } else if (key.includes('pending_stop')) {
              // Check if still active
              const activeSession = await JobService.getActiveSession();
              if (activeSession && activeSession.jobId === jobId) {
                console.log(`🛑 Stopping timer from pending action for ${job.name}`);
                await this.stopAutoTimer(job);
                processedActions.add(actionId);
              } else {
                console.log(`⚠️ No active session for job ${jobId}, skipping pending stop`);
              }
            }
          }
          
          // Clean up
          await AsyncStorage.removeItem(key);
        }
      }
      
      // Then check if there's a current delayed action that needs adjustment
      if (this.currentDelayedAction) {
        const elapsed = (Date.now() - this.currentDelayedAction.startTime.getTime()) / 1000;
        const remainingTime = this.currentDelayedAction.delaySeconds - elapsed;
        
        console.log(`🔍 Checking delayed action on app resume: ${Math.ceil(remainingTime)}s remaining`);
        
        if (remainingTime <= 0) {
          // Time has expired while app was in background
          console.log(`⏰ Delayed action expired while in background, executing now`);
          const job = this.jobs.find(j => j.id === this.currentDelayedAction?.jobId);
          if (job) {
            if (this.currentDelayedAction.action === 'start') {
              await this.startAutoTimer(job);
            } else {
              await this.stopAutoTimer(job);
            }
          }
        } else {
          // Restart the interval to ensure countdown updates properly
          console.log(`🔄 Restarting status update interval with ${Math.ceil(remainingTime)}s remaining`);
          this.startStatusUpdateInterval();
        }
      }
    } catch (error) {
      console.error('Error checking pending actions:', error);
    }
  }

}

export default AutoTimerService;