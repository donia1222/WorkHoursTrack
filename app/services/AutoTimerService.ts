import { Job } from '../types/WorkTypes';
import { JobService } from './JobService';
import GeofenceService, { GeofenceEvent } from './GeofenceService';
import NotificationService from './NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

export type AutoTimerState = 
  | 'inactive'     // Not monitoring or no jobs nearby
  | 'active'       // Timer is running automatically
  | 'manual'       // Manual timer is active, auto-timer disabled
  | 'cancelled';   // User cancelled auto-timer

export interface AutoTimerStatus {
  state: AutoTimerState;
  jobId: string | null;
  jobName: string | null;
  remainingTime: number; // Seconds remaining for delay (always 0 now)
  totalDelayTime: number; // Total delay time in seconds (always 0 now)
  message: string; // User-friendly message
}

class AutoTimerService {
  private static instance: AutoTimerService;
  private geofenceService: GeofenceService;
  private notificationService: NotificationService;
  private currentState: AutoTimerState = 'inactive';
  private currentJobId: string | null = null;
  private jobs: Job[] = [];
  private statusCallbacks: ((status: AutoTimerStatus) => void)[] = [];
  private isEnabled = false;
  private sentNotifications: Set<string> = new Set(); // Track sent notifications to avoid duplicates
  private autoTimerStartTime: Date | null = null; // Track when auto timer actually started

  constructor() {
    this.geofenceService = GeofenceService.getInstance();
    this.notificationService = NotificationService.getInstance();
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

      // Check for active sessions and handle them properly
      const activeSession = await JobService.getActiveSession();
      if (activeSession) {
        console.log(`🔍 Found active session:`, {
          jobId: activeSession.jobId,
          startTime: activeSession.startTime,
          notes: activeSession.notes
        });
        
        // Only clear if it's not an auto-started session or if it doesn't match our state
        if (activeSession.notes === 'Auto-started' && this.currentState === 'active' && this.currentJobId === activeSession.jobId) {
          console.log(`✅ Keeping existing auto-started session for job ${activeSession.jobId}`);
        } else {
          console.log(`🧹 Clearing session (not auto-started or state mismatch)`);
          await JobService.clearActiveSession();
        }
      }

      // Start geofence monitoring in FOREGROUND ONLY mode
      let success = await this.geofenceService.startMonitoring(jobs, false);
      if (success) {
        this.isEnabled = true;
        this.currentState = 'inactive';
        this.notifyStatusChange();
        console.log('🟢 Auto timer service started successfully');
        console.log(`📊 Current status: ${this.currentState}, Job: ${this.currentJobId}, Enabled: ${this.isEnabled}`);
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
  stop(): void {
    this.geofenceService.stopMonitoring();
    this.cancelDelayedAction();
    this.currentState = 'inactive';
    this.currentJobId = null;
    this.isEnabled = false;
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
      await this.saveState();
      this.notifyStatusChange();
      return;
    }

    // Start timer immediately without delay
    console.log(`⏰ Job ${job.name} auto-timer settings:`, {
      delayStart: job.autoTimer?.delayStart,
      delayStop: job.autoTimer?.delayStop,
      geofenceRadius: job.autoTimer?.geofenceRadius
    });

    this.currentJobId = job.id;
    
    // Start timer immediately
    console.log(`🚀 Starting timer immediately for ${job.name}`);
    await this.startAutoTimer(job);
  }

  /**
   * Handle exiting a job's geofence
   */
  private async handleJobExit(job: Job): Promise<void> {
    console.log(`Exited geofence for ${job.name}`);

    // Check if timer is active for this job
    const activeSession = await JobService.getActiveSession();
    if (!activeSession || activeSession.jobId !== job.id) {
      return;
    }

    // Stop timer immediately without delay
    this.currentJobId = job.id;
    
    // Stop timer immediately
    console.log(`🛑 Stopping timer immediately for ${job.name}`);
    await this.stopAutoTimer(job);
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
      this.autoTimerStartTime = startTime; // Save the actual start time
      
      // Save state immediately to persist the start time
      await this.saveState();
      
      // Send notification immediately
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
      const activeSession = await JobService.getActiveSession();
      if (activeSession && activeSession.jobId === job.id) {
        console.log(`🛑 Auto-stopping timer for ${job.name}`);
        
        // Calculate elapsed time (simplified version - we'll use 1 hour as default)
        const sessionStart = new Date(activeSession.startTime);
        const now = new Date();
        const elapsedMs = now.getTime() - sessionStart.getTime();
        const elapsedHours = Math.max(0.01, parseFloat(((elapsedMs / (1000 * 60 * 60))).toFixed(2)));
        
        // Create work day record
        const today = new Date().toISOString().split('T')[0];
        const workDay = {
          date: today,
          jobId: job.id,
          hours: elapsedHours,
          notes: activeSession.notes || 'Auto-stopped',
          overtime: elapsedHours > 8,
          type: 'work' as const,
        };
        
        await JobService.addWorkDay(workDay);
        await JobService.clearActiveSession();
        
        // Send notification immediately
        await this.notificationService.sendNotification('timer_stopped', job.name);
        
        console.log(`✅ Auto-stopped timer for ${job.name}: ${elapsedHours}h recorded`);
      }
      
      this.currentState = 'inactive';
      this.currentJobId = null;
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
    // No longer needed since we don't have delayed actions
    this.clearNotificationHistory();
  }

  /**
   * Clear notification history to allow new notifications
   */
  private clearNotificationHistory(): void {
    this.sentNotifications.clear();
    console.log('🗑️ Notification history cleared');
  }

  /**
   * Get elapsed time for active auto timer (includes time when app was closed)
   */
  getElapsedTime(): number {
    if (this.currentState === 'active' && this.autoTimerStartTime) {
      const elapsedMs = Date.now() - this.autoTimerStartTime.getTime();
      return Math.floor(elapsedMs / 1000);
    }
    return 0;
  }

  /**
   * Get current auto timer status
   */
  getStatus(): AutoTimerStatus {
    const job = this.currentJobId ? this.jobs.find(j => j.id === this.currentJobId) : null;
    
    let message = '';

    // Message will be generated in the UI component with proper translations
    switch (this.currentState) {
      case 'inactive':
        message = 'inactive';
        break;
      case 'active':
        message = 'active';
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
      remainingTime: 0,
      totalDelayTime: 0,
      message,
    };
  }

  /**
   * Force cancel any pending action (user override)
   */
  async cancelPendingAction(): Promise<void> {
    console.log('🚫 User called cancelPendingAction()');
    // Since we no longer have delayed actions, just set to cancelled state
    if (this.currentJobId) {
      this.currentState = 'cancelled';
      console.log(`✅ AutoTimer state set to 'cancelled' for job ${this.currentJobId}`);
      this.notifyStatusChange();
    } else {
      console.log('⚠️ No active job to cancel');
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
   * Save current state to storage
   */
  private async saveState(): Promise<void> {
    try {
      const state = {
        isEnabled: this.isEnabled,
        currentState: this.currentState,
        currentJobId: this.currentJobId,
        autoTimerStartTime: this.autoTimerStartTime ? this.autoTimerStartTime.toISOString() : null,
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
        }
        
        console.log('🔄 AutoTimer state restored:', {
          isEnabled: this.isEnabled,
          currentState: this.currentState,
          currentJobId: this.currentJobId,
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

  // Status update interval methods are no longer needed since we don't have countdowns

  /**
   * Handle manual timer start (disable auto timer for that job)
   */
  async handleManualTimerStart(jobId: string): Promise<void> {
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
    // No longer needed since we don't have delayed actions
    console.log('📲 App became active - no pending actions to check');
  }

  /**
   * Manually restart from cancelled state
   */
  async manualRestart(): Promise<void> {
    if (this.currentState === 'cancelled') {
      console.log(`▶️ Restarting AutoTimer from cancelled state`);
      this.currentState = 'inactive';
      this.currentJobId = null;
      this.notifyStatusChange();
    }
  }
}

export default AutoTimerService;