/*
 * VixTime - Geolocation Work Tracking Application
 * Copyright © 2025 Roberto Salvador. All rights reserved.
 * 
 * PROPRIETARY CODE - COPYING OR DISTRIBUTION PROHIBITED
 * 
 * This file contains confidential information and trade secrets.
 * Unauthorized access is prohibited by law.
 * 
 * License required for commercial use.
 * Contact: roberto@vixtime.com
 */

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
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from './BackgroundLocationService';
import AutoTimerModeService from './AutoTimerModeService';

export type AutoTimerState = 
  | 'inactive'     // Not monitoring or no jobs nearby
  | 'pre-start'    // 5 second countdown before starting timer
  | 'entering'     // Inside geofence, waiting to start timer
  | 'active'       // Timer is running automatically
  | 'leaving'      // Outside geofence, waiting to stop timer
  | 'manual'       // Manual timer is active, auto-timer disabled
  | 'cancelled';   // User cancelled pending action, waiting for manual restart

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
  private pauseCallbacks: ((isPaused: boolean) => void)[] = [];
  private isEnabled = false;
  private isPaused = false; // Service-level pause state
  private statusUpdateInterval: NodeJS.Timeout | null = null;
  private pausedDelayedAction: DelayedAction | null = null; // To remember paused countdown
  private sentNotifications: Set<string> = new Set(); // Track sent notifications to avoid duplicates
  private autoTimerStartTime: Date | null = null; // Track when auto timer actually started
  private pausedAtTime: Date | null = null; // When the timer was paused
  private totalPausedTime: number = 0; // Total time paused in milliseconds

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

      // Restore state from storage FIRST (before checking sessions)
      await this.restoreState();

      // Check for active sessions and handle them properly (AFTER state restoration)
      const activeSession = await JobService.getActiveSession();
      if (activeSession) {
        console.log(`🔍 Found active session:`, {
          jobId: activeSession.jobId,
          startTime: activeSession.startTime,
          notes: activeSession.notes
        });
        console.log(`🔍 Current AutoTimer state: ${this.currentState}, job: ${this.currentJobId}`);
        
        // Keep session if it's auto-started AND matches our restored state
        if (activeSession.notes === 'Auto-started' && this.currentState === 'active' && this.currentJobId === activeSession.jobId) {
          console.log(`✅ Keeping existing auto-started session for job ${activeSession.jobId}`);
        } 
        // Also keep manual sessions that don't conflict
        else if (activeSession.notes !== 'Auto-started') {
          console.log(`✅ Keeping existing manual session for job ${activeSession.jobId}`);
          // Update our state to match the manual session
          this.currentState = 'manual';
          this.currentJobId = activeSession.jobId;
        } 
        else {
          console.log(`🧹 Clearing session (state mismatch: ${this.currentState} vs active session)`);
          await JobService.clearActiveSession();
        }
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
        
        // Get AutoTimer mode to determine which background strategy to use
        const modeSettings = await this.getAutoTimerModeSettings();
        console.log(`📱 Starting background services for mode: ${modeSettings.mode}`);
        
        switch (modeSettings.mode) {
          case 'foreground-only':
            console.log('📱 Foreground-only mode: No background services needed');
            break;
            
          case 'background-allowed':
            // Solo usar Background Location Tracking con permisos básicos
            console.log('📱 App minimized mode: Starting background location tracking with basic permissions');
            try {
              const trackingStarted = await startBackgroundLocationTracking(autoTimerJobs);
              if (trackingStarted) {
                console.log('✅ Background location tracking iniciado para app minimizada');
              } else {
                console.error('❌ No se pudo iniciar background location tracking');
              }
            } catch (error) {
              console.error('❌ Error iniciando background location tracking:', error);
            }
            break;
            
          case 'full-background':
            // Usar ambas estrategias para máxima confiabilidad
            console.log('📱 Full background mode: Starting both location tracking and geofencing');
            
            // Estrategia 1: Background Location Tracking (funciona con permisos When In Use)
            try {
              const trackingStarted = await startBackgroundLocationTracking(autoTimerJobs);
              if (trackingStarted) {
                console.log('✅ Background location tracking iniciado (funciona con app minimizada)');
              }
            } catch (error) {
              console.error('❌ Error iniciando background location tracking:', error);
            }
            
            // Estrategia 2: Geofencing nativo (mejor batería, requiere permisos Always para app cerrada)
            try {
              const geofencingStarted = await startBackgroundGeofencing(autoTimerJobs);
              if (geofencingStarted) {
                console.log('✅ Background geofencing iniciado (funciona con app cerrada si hay permisos Always)');
              }
            } catch (error) {
              console.error('❌ Error iniciando background geofencing:', error);
            }
            break;
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
            const radius = job.autoTimer?.geofenceRadius || 100;
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
    
    // Detener servicios de background
    try {
      await stopBackgroundLocationTracking();
      console.log('🛑 Background location tracking detenido');
    } catch (error) {
      console.error('❌ Error deteniendo background location tracking:', error);
    }
    
    try {
      await stopBackgroundGeofencing();
      console.log('🛑 Background geofencing detenido');
    } catch (error: any) {
      // Solo mostrar error si NO es E_TASK_NOT_FOUND
      if (!error?.message?.includes('E_TASK_NOT_FOUND')) {
        console.error('❌ Error deteniendo background geofencing:', error);
      } else {
        console.log('ℹ️ Background geofencing no estaba activo');
      }
    }
    
    this.cancelDelayedAction();
    this.stopStatusUpdateInterval();
    this.currentState = 'inactive';
    this.currentJobId = null;
    this.pausedDelayedAction = null; // Clear paused state
    this.isEnabled = false;
    
    // FORZAR el cierre de TODOS los Live Activities
    await this.liveActivityService.endAllLiveActivities();
    console.log('📱 FORCE ended all Live Activities on AutoTimer stop');
    
    this.clearNotificationHistory(); // Clear notification history when stopping
    this.notifyStatusChange();
    console.log('Auto timer service stopped');
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
    console.log(`🎯 Geofence ${event.eventType} event for job ${event.jobId}, current state: ${this.currentState}`);
    
    // Skip if AutoTimer is in cancelled state (user manually paused)
    if (this.currentState === 'cancelled') {
      console.log('⏸️ AutoTimer is cancelled, ignoring geofence event');
      return;
    }
    
    // Skip if manual timer is active
    const activeSession = await JobService.getActiveSession();
    if (activeSession && activeSession.jobId !== event.jobId) {
      console.log('Manual timer active for different job, ignoring geofence event');
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
    console.log(`Entered geofence for ${job.name}`);

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

    // Get AutoTimer mode settings to determine delay behavior
    const modeSettings = await this.getAutoTimerModeSettings();
    let delayStartMin = job.autoTimer?.delayStart ?? 0;
    
    // In full-background mode (app closed), ignore delays and start immediately
    if (modeSettings.mode === 'full-background') {
      delayStartMin = 0;
      console.log(`🌍 Full-background mode active: ignoring delayStart, starting immediately`);
    }
    
    console.log(`⏳ ENTER ${job.name}: delayStart=${delayStartMin} min (mode: ${modeSettings.mode})`);
    await this.scheduleDelayedAction(job, 'start', delayStartMin);
  }

  /**
   * Handle exiting a job's geofence
   */
  private async handleJobExit(job: Job): Promise<void> {
    console.log(`Exited geofence for ${job.name}`);

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

    // Get AutoTimer mode settings to determine delay behavior
    const modeSettings = await this.getAutoTimerModeSettings();
    let delayStopMin = job.autoTimer?.delayStop ?? 0;
    
    // In full-background mode (app closed), ignore delays and stop immediately
    if (modeSettings.mode === 'full-background') {
      delayStopMin = 0;
      console.log(`🌍 Full-background mode active: ignoring delayStop, stopping immediately`);
    }
    
    console.log(`⏳ EXIT ${job.name}: delayStop=${delayStopMin} min (mode: ${modeSettings.mode})`);
    await this.scheduleDelayedAction(job, 'stop', delayStopMin);
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
      // Reset pause state when starting
      this.isPaused = false;
      this.pausedAtTime = null;
      this.totalPausedTime = 0;
      
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
      
      // Enviar notificación de inicio solo si las notificaciones de auto-timer están habilitadas
      if (await this.shouldSendAutoTimerNotification()) {
        await this.notificationService.sendNotification('timer_started', job.name);
      }
      
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
        
        // Create work day record with actual start and end times
        const today = new Date().toISOString().split('T')[0];
        const workDay = {
          date: today,
          jobId: job.id,
          hours: elapsedHours,
          notes: currentSession.notes || 'Auto-stopped',
          overtime: elapsedHours > 8,
          type: 'work' as const,
          // Add actual start and end times for display in reports
          actualStartTime: sessionStart.toTimeString().substring(0, 5), // HH:MM format
          actualEndTime: now.toTimeString().substring(0, 5), // HH:MM format
        };
        
        console.log('🔍 AutoTimer WorkDay being saved:', {
          sessionStartTime: sessionStart.toLocaleTimeString(),
          endTime: now.toLocaleTimeString(),
          actualStartTime: workDay.actualStartTime,
          actualEndTime: workDay.actualEndTime,
          hours: workDay.hours,
          jobId: workDay.jobId
        });
        
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
          
        }
        
        // Enviar notificación normal solo si las notificaciones de auto-timer están habilitadas
        if (await this.shouldSendAutoTimerNotification()) {
          await this.notificationService.sendNotification('timer_stopped', job.name);
        }
        
        console.log(`✅ Auto-stopped timer for ${job.name}: ${elapsedHours}h recorded`);
      }
      
      this.currentState = 'inactive';
      this.currentJobId = null;
      this.currentDelayedAction = null;
      this.autoTimerStartTime = null; // Clear the start time
      // Reset pause state
      this.isPaused = false;
      this.pausedAtTime = null;
      this.totalPausedTime = 0;
      await this.saveState(); // Save state after clearing
      this.notifyStatusChange();
    } catch (error) {
      console.error('Error stopping auto timer:', error);
      this.currentState = 'inactive';
      this.currentJobId = null;
      this.autoTimerStartTime = null;
      // Reset pause state
      this.isPaused = false;
      this.pausedAtTime = null;
      this.totalPausedTime = 0;
      this.notifyStatusChange();
    }
  }

  /**
   * Schedule a delayed action (start/stop) respecting delayStart/delayStop (minutes)
   */
  private async scheduleDelayedAction(job: Job, action: 'start' | 'stop', delayMinutes?: number): Promise<void> {
    const normalized = Number.isFinite(delayMinutes) && (delayMinutes as number) > 0 ? (delayMinutes as number) : 0;
    const delaySeconds = Math.floor(normalized * 60);

    // Cancel any pending action first
    await this.cancelDelayedAction();

    if (delaySeconds <= 0) {
      // Action immediately by default (0 minutes)
      if (action === 'start') {
        await this.startAutoTimer(job);
      } else {
        await this.stopAutoTimer(job);
      }
      return;
    }

    // Schedule delayed action
    this.currentState = action === 'start' ? 'entering' : 'leaving';
    this.currentJobId = job.id;

    const targetTime = new Date(Date.now() + delaySeconds * 1000).toISOString();
    await AsyncStorage.setItem(
      `@auto_timer_pending_${job.id}`,
      JSON.stringify({ jobId: job.id, action, targetTime })
    );

    const timeout = setTimeout(async () => {
      await AsyncStorage.removeItem(`@auto_timer_pending_${job.id}`);
      // Execute only if not cancelled or replaced
      if (this.currentDelayedAction?.jobId === job.id && this.currentDelayedAction?.action === action) {
        if (action === 'start') {
          await this.startAutoTimer(job);
        } else {
          await this.stopAutoTimer(job);
        }
        this.currentDelayedAction = null;
      }
    }, delaySeconds * 1000);

    this.currentDelayedAction = { jobId: job.id, action, timeout, startTime: new Date(), delaySeconds };
    this.startStatusUpdateInterval();
    this.notifyStatusChange();
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
      if (this.isPaused) {
        // When paused, return the elapsed time up to the pause point
        if (this.pausedAtTime) {
          const elapsedUntilPause = this.pausedAtTime.getTime() - this.autoTimerStartTime.getTime() - this.totalPausedTime;
          return Math.floor(elapsedUntilPause / 1000);
        }
      } else {
        // When running, calculate total time minus paused time
        const totalElapsed = Date.now() - this.autoTimerStartTime.getTime() - this.totalPausedTime;
        return Math.floor(totalElapsed / 1000);
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
      case 'manual':
        message = 'manual';
        break;
      case 'cancelled':
        message = 'cancelled';
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
   * Force cancel any pending action (user override)
   */
  async cancelPendingAction(): Promise<void> {
    console.log('🚫 User called cancelPendingAction()');
    if (this.currentDelayedAction) {
      const jobId = this.currentDelayedAction.jobId;
      const action = this.currentDelayedAction.action;
      
      // Calculate remaining time to preserve for resume
      const elapsed = (Date.now() - this.currentDelayedAction.startTime.getTime()) / 1000;
      const remainingSeconds = Math.max(0, this.currentDelayedAction.delaySeconds - elapsed);
      
      console.log(`⏸️ Pausing ${action} countdown for job ${jobId} with ${Math.ceil(remainingSeconds)}s remaining`);
      
      // Save the paused state
      this.pausedDelayedAction = {
        ...this.currentDelayedAction,
        delaySeconds: remainingSeconds, // Save remaining time
        startTime: new Date() // Will be updated when resumed
      };
      
      await this.cancelDelayedAction();
      this.currentState = 'cancelled';
      this.currentJobId = jobId; // Keep job ID to show which job was cancelled
      
      console.log(`✅ AutoTimer state set to 'cancelled' for job ${jobId}`);
      this.notifyStatusChange();
      console.log('🔔 Status change notification sent');
    } else {
      console.log('⚠️ No pending action to cancel');
    }
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
        
        // Create work day record with actual start and end times
        const today = new Date().toISOString().split('T')[0];
        const workDay = {
          date: today,
          jobId: activeSession.jobId,
          hours: elapsedHours,
          notes: activeSession.notes || 'Parado manualmente desde AutoTimer',
          overtime: elapsedHours > 8,
          type: 'work' as const,
          // Add actual start and end times for display in reports
          actualStartTime: sessionStart.toTimeString().substring(0, 5), // HH:MM format
          actualEndTime: now.toTimeString().substring(0, 5), // HH:MM format
        };
        
        await JobService.addWorkDay(workDay);
        await JobService.clearActiveSession();
        
        // Sync calendar data with widget
        await WidgetCalendarService.syncCalendarData();
        
        result = { saved: true, hours: elapsedHours };
        console.log(`💾 Force stopped and saved: ${elapsedHours}h`);
      }
      
      // Cancel any pending actions and set to cancelled state
      await this.cancelDelayedAction();
      this.currentState = 'cancelled'; // Changed from 'inactive' to 'cancelled'
      // Keep the currentJobId so UI shows which job was cancelled
      this.notifyStatusChange();
      
      console.log('🚫 AutoTimer set to cancelled state after manual stop');
      
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
   * Set the service to manual mode (when user manually overrides)
   */
  async setManualMode(): Promise<void> {
    await this.cancelDelayedAction();
    this.currentState = 'manual';
    this.notifyStatusChange();
    console.log('Auto timer service set to manual mode');
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
   * Add pause state change listener
   */
  addPauseListener(callback: (isPaused: boolean) => void): void {
    this.pauseCallbacks.push(callback);
  }

  /**
   * Remove pause state change listener
   */
  removePauseListener(callback: (isPaused: boolean) => void): void {
    const index = this.pauseCallbacks.indexOf(callback);
    if (index > -1) {
      this.pauseCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all listeners about pause state change
   */
  private notifyPauseChange(isPaused: boolean): void {
    console.log('🔔 AutoTimer: Notifying pause state change:', isPaused);
    this.pauseCallbacks.forEach(callback => {
      try {
        callback(isPaused);
      } catch (error) {
        console.error('Error in pause callback:', error);
      }
    });
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
        isPaused: this.isPaused,
        pausedAtTime: this.pausedAtTime?.toISOString() || null,
        totalPausedTime: this.totalPausedTime,
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
        
        // Restore pause state
        this.isPaused = state.isPaused || false;
        this.pausedAtTime = state.pausedAtTime ? new Date(state.pausedAtTime) : null;
        this.totalPausedTime = state.totalPausedTime || 0;
        
        // IMPORTANT: Check if there's an active session that should override our state
        const activeSession = await JobService.getActiveSession();
        if (activeSession && activeSession.notes === 'Auto-started') {
          console.log(`🔍 Found active auto session during restore - correcting state`);
          this.currentState = 'active';
          this.currentJobId = activeSession.jobId;
          
          // Restore the start time from the session if we don't have it
          if (!state.autoTimerStartTime && activeSession.startTime) {
            this.autoTimerStartTime = new Date(activeSession.startTime);
            console.log(`⏱️ Restored start time from session: ${this.autoTimerStartTime.toLocaleTimeString()}`);
          }
        }
        
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
   * Handle manual timer start (disable auto timer for that job)
   */
  async handleManualTimerStart(jobId: string): Promise<void> {
    // Cancel any pending actions for this job
    if (this.currentDelayedAction && this.currentDelayedAction.jobId === jobId) {
      await this.cancelDelayedAction();
    }
    
    this.currentState = 'manual';
    this.currentJobId = jobId;
    this.notifyStatusChange();
  }

  /**
   * Handle manual timer stop (re-enable auto timer)
   */
  async handleManualTimerStop(): Promise<void> {
    // Set to cancelled state instead of inactive to prevent auto-restart
    this.currentState = 'cancelled';
    // Keep currentJobId to show which job was cancelled
    this.notifyStatusChange();
    
    console.log('🚫 Manual timer stopped, AutoTimer set to cancelled state');
    
    // Don't restart geofence monitoring - wait for manual restart
  }

  /**
   * Check for pending actions that should have been executed
   * (Called when app becomes active)
   */
  async checkPendingActions(): Promise<void> {
    try {
      console.log('🔍 AutoTimer: Checking pending actions on app resume...');
      
      // First, check if there's a current delayed action that needs adjustment
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
      
      // Check for pending actions created by BackgroundLocationService
      const keys = await AsyncStorage.getAllKeys();
      const pendingStartKeys = keys.filter(key => key.startsWith('@auto_timer_pending_start_'));
      const pendingStopKeys = keys.filter(key => key.startsWith('@auto_timer_pending_stop_'));
      
      console.log(`🔍 Found ${pendingStartKeys.length} pending start actions and ${pendingStopKeys.length} pending stop actions`);
      
      // Process pending start actions
      for (const key of pendingStartKeys) {
        const pendingAction = await AsyncStorage.getItem(key);
        if (pendingAction) {
          const action = JSON.parse(pendingAction);
          const targetTime = new Date(action.targetTime);
          const now = new Date();
          
          const jobId = key.replace('@auto_timer_pending_start_', '');
          const job = this.jobs.find(j => j.id === jobId);
          
          if (job) {
            if (now >= targetTime) {
              console.log(`⏰ Executing expired background start action for ${job.name}`);
              await this.startAutoTimer(job);
              await AsyncStorage.removeItem(key);
            } else {
              console.log(`⏳ Background start action still pending for ${job.name}, scheduling...`);
              const remainingMs = targetTime.getTime() - now.getTime();
              await this.scheduleDelayedAction(job, 'start', Math.ceil(remainingMs / (60 * 1000)));
              await AsyncStorage.removeItem(key); // Clean up background service item
            }
          }
        }
      }
      
      // Process pending stop actions
      for (const key of pendingStopKeys) {
        const pendingAction = await AsyncStorage.getItem(key);
        if (pendingAction) {
          const action = JSON.parse(pendingAction);
          const targetTime = new Date(action.targetTime);
          const now = new Date();
          
          const jobId = key.replace('@auto_timer_pending_stop_', '');
          const job = this.jobs.find(j => j.id === jobId);
          
          if (job) {
            if (now >= targetTime) {
              console.log(`⏰ Executing expired background stop action for ${job.name}`);
              await this.stopAutoTimer(job);
              await AsyncStorage.removeItem(key);
            } else {
              console.log(`⏳ Background stop action still pending for ${job.name}, scheduling...`);
              const remainingMs = targetTime.getTime() - now.getTime();
              await this.scheduleDelayedAction(job, 'stop', Math.ceil(remainingMs / (60 * 1000)));
              await AsyncStorage.removeItem(key); // Clean up background service item
            }
          }
        }
      }
      
      // Check legacy pending actions (for backward compatibility)
      const legacyPendingKeys = keys.filter(key => key.startsWith('@auto_timer_pending_') && !key.includes('start_') && !key.includes('stop_'));
      
      for (const key of legacyPendingKeys) {
        const pendingAction = await AsyncStorage.getItem(key);
        if (pendingAction) {
          const action = JSON.parse(pendingAction);
          const targetTime = new Date(action.targetTime);
          const now = new Date();
          
          // Check if the action should have been executed
          if (now >= targetTime) {
            console.log(`⏰ Found expired legacy pending action for job ${action.jobId}, executing now`);
            
            const job = this.jobs.find(j => j.id === action.jobId);
            if (job) {
              // Execute the pending action based on the action type
              if (action.action === 'start' && (this.currentState === 'entering' || this.currentState === 'inactive')) {
                console.log(`⏰ Executing legacy pending start action for ${job.name}`);
                await this.startAutoTimer(job);
              } else if (action.action === 'stop' && this.currentState === 'leaving') {
                console.log(`⏰ Executing legacy pending stop action for ${job.name}`);
                await this.stopAutoTimer(job);
              }
            }
            
            // Clean up
            await AsyncStorage.removeItem(key);
          }
        }
      }
      
      console.log('✅ AutoTimer: Finished checking pending actions');
    } catch (error) {
      console.error('Error checking pending actions:', error);
    }
  }

  /**
   * Manually restart from cancelled state
   */
  async manualRestart(): Promise<void> {
    if (this.currentState === 'cancelled' && this.currentJobId && this.pausedDelayedAction) {
      console.log(`▶️ Resuming countdown with ${Math.ceil(this.pausedDelayedAction.delaySeconds)}s remaining`);
      
      const job = this.jobs.find(j => j.id === this.currentJobId);
      if (job) {
        // Resume with remaining time
        const remainingSeconds = this.pausedDelayedAction.delaySeconds;
        const action = this.pausedDelayedAction.action;
        
        if (remainingSeconds <= 0) {
          // Time already expired, execute action immediately
          if (action === 'start') {
            await this.startAutoTimer(job);
          } else {
            await this.stopAutoTimer(job);
          }
        } else {
          // Resume countdown with remaining time
          this.currentState = action === 'start' ? 'entering' : 'leaving';
          
          const timeout = setTimeout(async () => {
            console.log(`🚀 Resumed countdown completed for ${job.name}`);
            if (action === 'start') {
              await this.startAutoTimer(job);
            } else {
              await this.stopAutoTimer(job);
            }
          }, remainingSeconds * 1000);

          this.currentDelayedAction = {
            jobId: job.id,
            action: action,
            timeout,
            startTime: new Date(),
            delaySeconds: remainingSeconds,
          };
          
          // Clear paused state
          this.pausedDelayedAction = null;
          this.notifyStatusChange();
        }
      }
    }
  }

  /**
   * Pause the active AutoTimer (pause the actual service timer)
   */
  async pauseActiveTimer(): Promise<boolean> {
    if (this.currentState !== 'active' || !this.currentJobId || this.isPaused) {
      console.log('❌ AutoTimer: Cannot pause - not active or already paused');
      return false;
    }

    try {
      // Mark service as paused
      this.isPaused = true;
      this.pausedAtTime = new Date();
      
      // Save state to persist pause
      await this.saveState();
      
      console.log(`⏸️ AutoTimer: PAUSED service-level timer for job ${this.currentJobId}`);
      
      // Notify all listeners about pause state change
      this.notifyPauseChange(true);
      
      return true;
    } catch (error) {
      console.error('Error pausing AutoTimer:', error);
      return false;
    }
  }

  /**
   * Resume the paused AutoTimer
   */
  async resumeActiveTimer(): Promise<boolean> {
    if (this.currentState !== 'active' || !this.currentJobId || !this.isPaused) {
      console.log('❌ AutoTimer: Cannot resume - not active or not paused');
      return false;
    }

    try {
      // Add the paused time to total paused time
      if (this.pausedAtTime) {
        const pausedDuration = Date.now() - this.pausedAtTime.getTime();
        this.totalPausedTime += pausedDuration;
        console.log(`▶️ AutoTimer: Adding ${Math.floor(pausedDuration/1000)}s to total paused time`);
      }
      
      // Resume service
      this.isPaused = false;
      this.pausedAtTime = null;
      
      // Save state to persist resume
      await this.saveState();
      
      console.log(`▶️ AutoTimer: RESUMED service-level timer for job ${this.currentJobId}`);
      
      // Notify all listeners about pause state change
      this.notifyPauseChange(false);
      
      return true;
    } catch (error) {
      console.error('Error resuming AutoTimer:', error);
      return false;
    }
  }

  /**
   * Check if the active timer is paused
   */
  async isActiveTimerPaused(): Promise<boolean> {
    return this.isPaused;
  }

  /**
   * Get current AutoTimer mode settings
   */
  async getAutoTimerModeSettings() {
    const modeService = AutoTimerModeService.getInstance();
    return await modeService.getAutoTimerModeSettings();
  }

  /**
   * Check if auto-timer notifications should be sent
   * This checks both general notifications and auto-timer specific settings
   */
  private async shouldSendAutoTimerNotification(): Promise<boolean> {
    try {
      const notificationSettings = await AsyncStorage.getItem('notification_settings');
      if (notificationSettings) {
        const settings = JSON.parse(notificationSettings);
        // Check if general notifications AND auto-timer notifications are enabled
        return settings.enabled === true && settings.autoTimer === true;
      }
      // Default to false if no settings found
      return false;
    } catch (error) {
      console.error('Error checking auto-timer notification settings:', error);
      return false;
    }
  }
}

export default AutoTimerService;