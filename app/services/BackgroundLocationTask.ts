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
}

interface StoredGeofenceStatus {
  jobId: string;
  isInside: boolean;
  lastUpdate: string;
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

    } catch (error) {
      console.error('Error stopping background location updates:', error);
    }
  }

  private async processBackgroundLocationUpdate(location: Location.LocationObject): Promise<void> {
    try {
      // Get stored geofences
      const geofencesJson = await AsyncStorage.getItem('background_geofences');
      if (!geofencesJson) {
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

        // Update status
        updatedStatuses.push({
          jobId: geofence.jobId,
          isInside,
          lastUpdate: new Date().toISOString(),
        });

        // Check for geofence state change
        if (wasInside !== isInside) {
          console.log(`Background geofence event: ${isInside ? 'enter' : 'exit'} ${geofence.jobName}`);
          
          // Send notification based on event type
          if (isInside) {
            await this.sendBackgroundNotification(geofence.jobName, 'timer_started');
          } else {
            await this.sendBackgroundNotification(geofence.jobName, 'timer_stopped');
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

  private async sendBackgroundNotification(jobName: string, notificationType: 'timer_started' | 'timer_stopped'): Promise<void> {
    try {
      // Check if notifications are enabled
      const settingsJson = await AsyncStorage.getItem('notification_settings');
      if (!settingsJson) {
        return;
      }

      const settings = JSON.parse(settingsJson);
      if (!settings.enabled || !settings.autoTimer) {
        return;
      }

      let title: string;
      let body: string;

      switch (notificationType) {
        case 'timer_started':
          title = 'Timer iniciado automáticamente';
          body = `Has entrado en el área de ${jobName}. El timer se ha iniciado.`;
          break;
        case 'timer_stopped':
          title = 'Timer pausado automáticamente';
          body = `Has salido del área de ${jobName}. El timer se ha pausado.`;
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
        },
        trigger: null, // Send immediately
      });

      console.log(`Background notification sent: ${title}`);

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