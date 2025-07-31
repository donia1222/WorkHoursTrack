import { Job } from '../types/WorkTypes';
import { JobService } from './JobService';
import GeofenceService, { GeofenceEvent } from './GeofenceService';
import NotificationService from './NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AutoTimerState = 
  | 'inactive'     // Not monitoring or no jobs nearby
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
  private currentDelayedAction: DelayedAction | null = null;
  private currentState: AutoTimerState = 'inactive';
  private currentJobId: string | null = null;
  private jobs: Job[] = [];
  private statusCallbacks: ((status: AutoTimerStatus) => void)[] = [];
  private isEnabled = false;
  private statusUpdateInterval: NodeJS.Timeout | null = null;
  private pausedDelayedAction: DelayedAction | null = null; // To remember paused countdown
  private sentNotifications: Set<string> = new Set(); // Track sent notifications to avoid duplicates

  constructor() {
    this.geofenceService = GeofenceService.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.bindGeofenceEvents();
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

      // Check for active sessions and clear old ones
      const activeSession = await JobService.getActiveSession();
      if (activeSession) {
        console.log(`🔍 Found active session:`, {
          jobId: activeSession.jobId,
          startTime: activeSession.startTime,
          notes: activeSession.notes
        });
        
        // For now, always clear any existing session to allow AutoTimer to work
        // Later we can add smart detection if needed
        console.log(`🧹 Clearing existing session to allow AutoTimer`);
        await JobService.clearActiveSession();
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
    this.stopStatusUpdateInterval();
    this.currentState = 'inactive';
    this.currentJobId = null;
    this.pausedDelayedAction = null; // Clear paused state
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

    // Check if there's an active session for this job
    const activeSession = await JobService.getActiveSession();
    if (activeSession && activeSession.jobId === job.id) {
      console.log(`⚡ Timer already running for ${job.name}, setting state to active`);
      this.currentState = 'active';
      this.currentJobId = job.id;
      this.notifyStatusChange();
      return;
    }

    // TESTING: Start timer immediately without delay
    console.log(`🚀 TESTING MODE: Starting timer immediately for ${job.name}`);
    this.currentJobId = job.id;
    await this.startAutoTimer(job);
    
    /* ORIGINAL CODE WITH COUNTDOWN - DISABLED FOR TESTING
    // Start delayed start action
    const delayMinutes = job.autoTimer?.delayStart || 2;
    const delaySeconds = delayMinutes * 60;

    this.currentState = 'entering';
    this.currentJobId = job.id;
    
    // Schedule notifications for the future instead of sending immediately
    const notificationTime = new Date(Date.now() + delaySeconds * 1000);
    
    // No countdown notification needed - removed
    
    // Schedule "timer started" notification for when it actually starts
    const timerStartedId = `timer_started_${job.id}_${Date.now()}`;
    if (!this.sentNotifications.has(timerStartedId)) {
      await this.notificationService.scheduleNotificationForTime('timer_started', job.name, notificationTime);
      this.sentNotifications.add(timerStartedId);
    }
    
    // For short delays (< 5 seconds), use setTimeout
    // For longer delays, also set a backup check when app becomes active
    const timeout = setTimeout(async () => {
      console.log(`🚀 AutoTimer timeout triggered for ${job.name} after ${delayMinutes} minutes`);
      await this.startAutoTimer(job);
    }, delaySeconds * 1000);
    
    // Store the exact time when timer should start
    const timerShouldStartAt = new Date(Date.now() + delaySeconds * 1000);
    await AsyncStorage.setItem(`@auto_timer_pending_${job.id}`, JSON.stringify({
      jobId: job.id,
      action: 'start',
      targetTime: timerShouldStartAt.toISOString(),
    }));

    this.currentDelayedAction = {
      jobId: job.id,
      action: 'start',
      timeout,
      startTime: new Date(),
      delaySeconds,
    };

    this.notifyStatusChange();
    console.log(`Will start timer for ${job.name} in ${delayMinutes} minutes`);
    */
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

    // TESTING: Stop timer immediately without delay
    console.log(`🛑 TESTING MODE: Stopping timer immediately for ${job.name}`);
    await this.stopAutoTimer(job);
    
    /* ORIGINAL CODE WITH COUNTDOWN - DISABLED FOR TESTING
    // Start delayed stop action
    const delayMinutes = job.autoTimer?.delayStop || 2;
    const delaySeconds = delayMinutes * 60;

    this.currentState = 'leaving';
    this.currentJobId = job.id;
    
    // Schedule notifications for timer stop
    const stopNotificationTime = new Date(Date.now() + delaySeconds * 1000);
    
    // No countdown notification needed - removed
    
    // Schedule "timer stopped" notification for when it actually stops
    const timerStoppedId = `timer_stopped_${job.id}_${Date.now()}`;
    if (!this.sentNotifications.has(timerStoppedId)) {
      await this.notificationService.scheduleNotificationForTime('timer_stopped', job.name, stopNotificationTime);
      this.sentNotifications.add(timerStoppedId);
    }
    
    const timeout = setTimeout(async () => {
      await this.stopAutoTimer(job);
    }, delaySeconds * 1000);
    
    // Store the exact time when timer should stop
    const timerShouldStopAt = new Date(Date.now() + delaySeconds * 1000);
    await AsyncStorage.setItem(`@auto_timer_pending_${job.id}`, JSON.stringify({
      jobId: job.id,
      action: 'stop',
      targetTime: timerShouldStopAt.toISOString(),
    }));

    this.currentDelayedAction = {
      jobId: job.id,
      action: 'stop',
      timeout,
      startTime: new Date(),
      delaySeconds,
    };

    this.notifyStatusChange();
    console.log(`Will stop timer for ${job.name} in ${delayMinutes} minutes`);
    */
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
      
      // Use the same pattern as TimerScreen to start a timer
      const sessionForStorage = {
        jobId: job.id,
        startTime: new Date().toISOString(),
        notes: 'Auto-started', // Auto-started note
      };
      
      await JobService.saveActiveSession(sessionForStorage);
      this.currentState = 'active';
      this.currentDelayedAction = null;
      
      // Send immediate notification for timer start (TESTING MODE)
      if (job.autoTimer?.notifications !== false) {
        await this.notificationService.sendNotification('timer_started', job.name);
        console.log(`🔔 Sent immediate timer started notification for ${job.name}`);
      }
      
      this.notifyStatusChange();
      console.log(`✅ Auto-started timer for ${job.name}`);
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
        
        // Send immediate notification for timer stop (TESTING MODE)
        if (job.autoTimer?.notifications !== false) {
          await this.notificationService.sendNotification('timer_stopped', job.name);
          console.log(`🔔 Sent immediate timer stopped notification for ${job.name}`);
        }
        
        console.log(`✅ Auto-stopped timer for ${job.name}: ${elapsedHours}h recorded`);
      }
      
      this.currentState = 'inactive';
      this.currentJobId = null;
      this.currentDelayedAction = null;
      this.notifyStatusChange();
    } catch (error) {
      console.error('Error stopping auto timer:', error);
      this.currentState = 'inactive';
      this.currentJobId = null;
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
        await this.notificationService.cancelScheduledNotifications(job.name);
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
        message = `entering:${Math.ceil(remainingTime / 60)}`;
        break;
      case 'active':
        message = 'active';
        break;
      case 'leaving':
        message = `leaving:${Math.ceil(remainingTime / 60)}`;
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
        delayedAction: this.currentDelayedAction ? {
          jobId: this.currentDelayedAction.jobId,
          action: this.currentDelayedAction.action,
          startTime: this.currentDelayedAction.startTime.toISOString(),
          delaySeconds: this.currentDelayedAction.delaySeconds,
        } : null,
      };
      
      await AsyncStorage.setItem('@auto_timer_state', JSON.stringify(state));
      console.log('🔄 AutoTimer state saved');
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
        
        // Restore delayed action if it exists
        if (state.delayedAction && (this.currentState === 'entering' || this.currentState === 'leaving')) {
          const startTime = new Date(state.delayedAction.startTime);
          const elapsedSeconds = (Date.now() - startTime.getTime()) / 1000;
          const remainingSeconds = state.delayedAction.delaySeconds - elapsedSeconds;
          
          console.log(`🔄 Restoring delayed action: ${Math.ceil(remainingSeconds)}s remaining`);
          
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
            console.log(`⏰ Restored action already expired, executing now`);
            await this.checkPendingActions();
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
    // Check if there are changes in AutoTimer configuration for active job
    if (this.currentJobId && this.currentDelayedAction) {
      const oldJob = this.jobs.find(j => j.id === this.currentJobId);
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
    
    this.jobs = jobs;
    
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
      
      // Get all stored keys
      const keys = await AsyncStorage.getAllKeys();
      const pendingKeys = keys.filter(key => key.startsWith('@auto_timer_pending_'));
      
      for (const key of pendingKeys) {
        const pendingAction = await AsyncStorage.getItem(key);
        if (pendingAction) {
          const action = JSON.parse(pendingAction);
          const targetTime = new Date(action.targetTime);
          const now = new Date();
          
          // Check if the action should have been executed
          if (now >= targetTime) {
            console.log(`⏰ Found expired pending action for job ${action.jobId}, executing now`);
            
            const job = this.jobs.find(j => j.id === action.jobId);
            if (job && this.currentState === 'entering' && this.currentJobId === job.id) {
              // Execute the pending action
              if (action.action === 'start') {
                await this.startAutoTimer(job);
              } else if (action.action === 'stop') {
                await this.stopAutoTimer(job);
              }
            }
            
            // Clean up
            await AsyncStorage.removeItem(key);
          }
        }
      }
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
}

export default AutoTimerService;