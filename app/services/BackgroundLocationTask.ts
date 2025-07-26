import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

interface BackgroundGeofenceData {
  jobId: string;
  jobName: string;
  latitude: number;
  longitude: number;
  radius: number;
  delayStart?: number; // Delay in minutes before starting timer
  delayStop?: number;  // Delay in minutes before stopping timer
}

interface StoredGeofenceStatus {
  jobId: string;
  isInside: boolean;
  lastUpdate: string;
}

interface PendingAction {
  jobId: string;
  action: 'start' | 'stop';
  scheduledTime: string; // ISO string
  delayMinutes: number;
  jobName: string;
}

interface ActiveSession {
  jobId: string;
  startTime: string; // ISO string
  notes: string;
}

class BackgroundLocationTaskManager {
  private static instance: BackgroundLocationTaskManager;
  private isTaskRegistered = false;

  static getInstance(): BackgroundLocationTaskManager {
    if (!BackgroundLocationTaskManager.instance) {
      BackgroundLocationTaskManager.instance = new BackgroundLocationTaskManager();
    }
    return BackgroundLocationTaskManager.instance;
  }

  async registerBackgroundTask(): Promise<void> {
    if (this.isTaskRegistered) {
      return;
    }

    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
      if (error) {
        console.error('Background location task error:', error);
        return;
      }

      if (data) {
        const { locations } = data;
        if (locations && locations.length > 0) {
          const location = locations[0];
          await this.processBackgroundLocationUpdate(location);
        }
      }
    });

    this.isTaskRegistered = true;
    console.log('Background location task registered');
  }

  async startBackgroundLocationUpdates(geofences: BackgroundGeofenceData[]): Promise<boolean> {
    try {
      // Register task if not already registered
      await this.registerBackgroundTask();

      // Request background location permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission not granted');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.log('Background location permission not granted');
        return false;
      }

      // Store geofence data for background processing
      await AsyncStorage.setItem(
        'background_geofences',
        JSON.stringify(geofences)
      );

      // Initialize geofence statuses
      const initialStatuses: StoredGeofenceStatus[] = geofences.map(geofence => ({
        jobId: geofence.jobId,
        isInside: false,
        lastUpdate: new Date().toISOString(),
      }));
      
      await AsyncStorage.setItem(
        'geofence_statuses',
        JSON.stringify(initialStatuses)
      );

      // Initialize empty pending actions
      await AsyncStorage.setItem(
        'pending_background_actions',
        JSON.stringify([])
      );

      // Start background location updates
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 30000, // 30 seconds minimum interval
        distanceInterval: 20, // 20 meters minimum distance
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Tracking location for work timer',
          notificationBody: 'Your location is being tracked to automatically manage work timers.',
        },
      });

      console.log('Background location updates started for geofencing');
      return true;

    } catch (error) {
      console.error('Error starting background location updates:', error);
      return false;
    }
  }

  async stopBackgroundLocationUpdates(): Promise<void> {
    try {
      const isTaskDefined = TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
      if (isTaskDefined) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('Background location updates stopped');
      }

      // Clean up stored data
      await AsyncStorage.removeItem('background_geofences');
      await AsyncStorage.removeItem('geofence_statuses');
      await AsyncStorage.removeItem('pending_background_actions');

    } catch (error) {
      console.error('Error stopping background location updates:', error);
    }
  }

  private async processBackgroundLocationUpdate(location: Location.LocationObject): Promise<void> {
    try {
      console.log('🔍 Processing background location update');
      
      // Check and execute any pending actions first
      await this.checkAndExecutePendingActions();
      
      // Get stored geofences
      const geofencesJson = await AsyncStorage.getItem('background_geofences');
      if (!geofencesJson) {
        console.log('❌ No background geofences found');
        return;
      }

      const geofences: BackgroundGeofenceData[] = JSON.parse(geofencesJson);
      
      // Get current statuses
      const statusesJson = await AsyncStorage.getItem('geofence_statuses');
      const currentStatuses: StoredGeofenceStatus[] = statusesJson 
        ? JSON.parse(statusesJson) 
        : [];

      const updatedStatuses: StoredGeofenceStatus[] = [];
      const userLat = location.coords.latitude;
      const userLon = location.coords.longitude;

      console.log(`📍 User location: ${userLat.toFixed(6)}, ${userLon.toFixed(6)}`);

      for (const geofence of geofences) {
        const distance = this.calculateDistance(
          userLat,
          userLon,
          geofence.latitude,
          geofence.longitude
        );

        const isInside = distance <= geofence.radius;
        const previousStatus = currentStatuses.find(s => s.jobId === geofence.jobId);
        const wasInside = previousStatus?.isInside || false;

        console.log(`🎯 ${geofence.jobName}: ${distance.toFixed(0)}m (radius: ${geofence.radius}m) - Inside: ${isInside} (was: ${wasInside})`);

        // Update status
        updatedStatuses.push({
          jobId: geofence.jobId,
          isInside,
          lastUpdate: new Date().toISOString(),
        });

        // Check for geofence state change
        if (wasInside !== isInside) {
          console.log(`🚨 Background geofence event: ${isInside ? 'ENTER' : 'EXIT'} ${geofence.jobName}`);
          
          if (isInside) {
            await this.handleGeofenceEnter(geofence);
          } else {
            await this.handleGeofenceExit(geofence);
          }
        }
      }

      // Save updated statuses
      await AsyncStorage.setItem(
        'geofence_statuses',
        JSON.stringify(updatedStatuses)
      );

    } catch (error) {
      console.error('Error processing background location update:', error);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  /**
   * Handle entering a geofence (with delay logic)
   */
  private async handleGeofenceEnter(geofence: BackgroundGeofenceData): Promise<void> {
    console.log(`⬇️ Handling geofence ENTER for ${geofence.jobName}`);

    // Cancel any pending exit action for this job
    await this.cancelPendingAction(geofence.jobId, 'stop');

    // Check if there's already an active session for this job
    const activeSession = await this.getActiveSession();
    if (activeSession && activeSession.jobId === geofence.jobId) {
      console.log(`⚡ Timer already running for ${geofence.jobName}`);
      await this.sendNotification('timer_started', geofence.jobName);
      return;
    }

    // Start delayed start action
    const delayMinutes = geofence.delayStart || 2;
    const scheduledTime = new Date(Date.now() + delayMinutes * 60 * 1000);

    console.log(`⏰ Scheduling timer start for ${geofence.jobName} in ${delayMinutes} minutes`);

    // Send notification about upcoming start
    await this.sendNotification('timer_will_start', geofence.jobName, { minutes: delayMinutes });

    // Store the pending action
    await this.addPendingAction({
      jobId: geofence.jobId,
      action: 'start',
      scheduledTime: scheduledTime.toISOString(),
      delayMinutes,
      jobName: geofence.jobName,
    });
  }

  /**
   * Handle exiting a geofence (with delay logic)
   */
  private async handleGeofenceExit(geofence: BackgroundGeofenceData): Promise<void> {
    console.log(`⬆️ Handling geofence EXIT for ${geofence.jobName}`);

    // Cancel any pending start action for this job
    await this.cancelPendingAction(geofence.jobId, 'start');

    // Check if timer is active for this job
    const activeSession = await this.getActiveSession();
    if (!activeSession || activeSession.jobId !== geofence.jobId) {
      console.log(`❌ No active timer for ${geofence.jobName}, ignoring exit`);
      return;
    }

    // Start delayed stop action
    const delayMinutes = geofence.delayStop || 2;
    const scheduledTime = new Date(Date.now() + delayMinutes * 60 * 1000);

    console.log(`⏰ Scheduling timer stop for ${geofence.jobName} in ${delayMinutes} minutes`);

    // Send notification about upcoming stop
    await this.sendNotification('timer_will_stop', geofence.jobName, { minutes: delayMinutes });

    // Store the pending action
    await this.addPendingAction({
      jobId: geofence.jobId,
      action: 'stop',
      scheduledTime: scheduledTime.toISOString(),
      delayMinutes,
      jobName: geofence.jobName,
    });
  }

  /**
   * Check and execute any pending actions that are due
   */
  private async checkAndExecutePendingActions(): Promise<void> {
    try {
      const pendingActionsJson = await AsyncStorage.getItem('pending_background_actions');
      if (!pendingActionsJson) {
        return;
      }

      const pendingActions: PendingAction[] = JSON.parse(pendingActionsJson);
      const now = new Date();
      const actionsToExecute: PendingAction[] = [];
      const remainingActions: PendingAction[] = [];

      for (const action of pendingActions) {
        const scheduledTime = new Date(action.scheduledTime);
        if (now >= scheduledTime) {
          actionsToExecute.push(action);
        } else {
          remainingActions.push(action);
        }
      }

      if (actionsToExecute.length > 0) {
        console.log(`🚀 Executing ${actionsToExecute.length} pending actions`);
        
        for (const action of actionsToExecute) {
          if (action.action === 'start') {
            await this.executeStartTimer(action);
          } else {
            await this.executeStopTimer(action);
          }
        }

        // Save remaining actions
        await AsyncStorage.setItem(
          'pending_background_actions',
          JSON.stringify(remainingActions)
        );
      }
    } catch (error) {
      console.error('Error checking pending actions:', error);
    }
  }

  /**
   * Execute starting a timer
   */
  private async executeStartTimer(action: PendingAction): Promise<void> {
    try {
      console.log(`🚀 Background: Starting timer for ${action.jobName}`);

      // Check if there's already an active session
      const activeSession = await this.getActiveSession();
      if (activeSession) {
        console.log(`⚠️ Active session found, clearing it before starting new one`);
        await this.clearActiveSession();
      }

      // Create new session
      const session: ActiveSession = {
        jobId: action.jobId,
        startTime: new Date().toISOString(),
        notes: 'Auto-started',
      };

      await this.saveActiveSession(session);
      await this.sendNotification('timer_started', action.jobName);
      
      console.log(`✅ Background: Timer started for ${action.jobName}`);
    } catch (error) {
      console.error('Error executing start timer:', error);
    }
  }

  /**
   * Execute stopping a timer
   */
  private async executeStopTimer(action: PendingAction): Promise<void> {
    try {
      console.log(`🛑 Background: Stopping timer for ${action.jobName}`);

      const activeSession = await this.getActiveSession();
      if (!activeSession || activeSession.jobId !== action.jobId) {
        console.log(`❌ No matching active session for ${action.jobName}`);
        return;
      }

      // Calculate elapsed time
      const sessionStart = new Date(activeSession.startTime);
      const now = new Date();
      const elapsedMs = now.getTime() - sessionStart.getTime();
      const elapsedHours = Math.max(0.01, parseFloat(((elapsedMs / (1000 * 60 * 60))).toFixed(2)));

      // Create work day record
      const today = new Date().toISOString().split('T')[0];
      const workDay = {
        date: today,
        jobId: action.jobId,
        hours: elapsedHours,
        notes: activeSession.notes || 'Auto-stopped',
        overtime: elapsedHours > 8,
        type: 'work' as const,
      };

      // Save work day
      await this.addWorkDay(workDay);
      await this.clearActiveSession();
      await this.sendNotification('timer_stopped', action.jobName);

      console.log(`✅ Background: Timer stopped for ${action.jobName}: ${elapsedHours}h recorded`);
    } catch (error) {
      console.error('Error executing stop timer:', error);
    }
  }

  /**
   * Add a pending action
   */
  private async addPendingAction(action: PendingAction): Promise<void> {
    try {
      const pendingActionsJson = await AsyncStorage.getItem('pending_background_actions');
      const pendingActions: PendingAction[] = pendingActionsJson 
        ? JSON.parse(pendingActionsJson) 
        : [];

      pendingActions.push(action);
      await AsyncStorage.setItem(
        'pending_background_actions',
        JSON.stringify(pendingActions)
      );

      console.log(`📝 Added pending ${action.action} action for ${action.jobName}`);
    } catch (error) {
      console.error('Error adding pending action:', error);
    }
  }

  /**
   * Cancel a pending action
   */
  private async cancelPendingAction(jobId: string, actionType: 'start' | 'stop'): Promise<void> {
    try {
      const pendingActionsJson = await AsyncStorage.getItem('pending_background_actions');
      if (!pendingActionsJson) {
        return;
      }

      const pendingActions: PendingAction[] = JSON.parse(pendingActionsJson);
      const filteredActions = pendingActions.filter(
        action => !(action.jobId === jobId && action.action === actionType)
      );

      if (filteredActions.length !== pendingActions.length) {
        await AsyncStorage.setItem(
          'pending_background_actions',
          JSON.stringify(filteredActions)
        );
        console.log(`🚫 Cancelled pending ${actionType} action for job ${jobId}`);
      }
    } catch (error) {
      console.error('Error cancelling pending action:', error);
    }
  }

  /**
   * Get active session from storage
   */
  private async getActiveSession(): Promise<ActiveSession | null> {
    try {
      const sessionJson = await AsyncStorage.getItem('@work_tracking:active_session');
      return sessionJson ? JSON.parse(sessionJson) : null;
    } catch (error) {
      console.error('Error getting active session:', error);
      return null;
    }
  }

  /**
   * Save active session to storage
   */
  private async saveActiveSession(session: ActiveSession): Promise<void> {
    try {
      await AsyncStorage.setItem(
        '@work_tracking:active_session',
        JSON.stringify(session)
      );
    } catch (error) {
      console.error('Error saving active session:', error);
    }
  }

  /**
   * Clear active session from storage
   */
  private async clearActiveSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem('@work_tracking:active_session');
    } catch (error) {
      console.error('Error clearing active session:', error);
    }
  }

  /**
   * Add work day to storage
   */
  private async addWorkDay(workDay: any): Promise<void> {
    try {
      const workDaysJson = await AsyncStorage.getItem('@work_tracking:work_days');
      const workDays = workDaysJson ? JSON.parse(workDaysJson) : [];
      
      workDays.push(workDay);
      
      await AsyncStorage.setItem(
        '@work_tracking:work_days',
        JSON.stringify(workDays)
      );
      
      console.log(`💾 Work day saved: ${workDay.hours}h for job ${workDay.jobId}`);
    } catch (error) {
      console.error('Error adding work day:', error);
    }
  }

  /**
   * Send notification with proper settings check
   */
  private async sendNotification(
    type: 'timer_started' | 'timer_stopped' | 'timer_will_start' | 'timer_will_stop',
    jobName: string,
    extraData?: { minutes?: number }
  ): Promise<void> {
    try {
      // Check if notifications are enabled
      const settingsJson = await AsyncStorage.getItem('notification_settings');
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        if (!settings.enabled || !settings.autoTimer) {
          console.log('📵 Notifications disabled, skipping');
          return;
        }
      }

      let title: string;
      let body: string;
      const minutes = extraData?.minutes || 2;

      switch (type) {
        case 'timer_started':
          title = '⏰ Timer Iniciado';
          body = `Timer automático iniciado para "${jobName}"`;
          break;
        case 'timer_stopped':
          title = '⏹️ Timer Pausado';
          body = `Timer automático pausado para "${jobName}"`;
          break;
        case 'timer_will_start':
          title = '🚀 Timer se Iniciará';
          body = `Timer se iniciará en ${minutes} minutos para "${jobName}"`;
          break;
        case 'timer_will_stop':
          title = '⏸️ Timer se Pausará';
          body = `Timer se pausará en ${minutes} minutos para "${jobName}"`;
          break;
        default:
          return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type,
            jobName,
            timestamp: new Date().toISOString(),
          },
        },
        trigger: null, // Send immediately
      });

      console.log(`📱 Background notification sent: ${title}`);

    } catch (error) {
      console.error('Error sending background notification:', error);
    }
  }

  async isBackgroundTaskRunning(): Promise<boolean> {
    try {
      const isTaskDefined = TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
      if (!isTaskDefined) {
        return false;
      }

      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      return isTaskRegistered;
    } catch (error) {
      console.error('Error checking background task status:', error);
      return false;
    }
  }

  getTaskName(): string {
    return BACKGROUND_LOCATION_TASK;
  }
}

export default BackgroundLocationTaskManager;
export { BACKGROUND_LOCATION_TASK, type BackgroundGeofenceData };