import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { Job } from '../types/WorkTypes';

export interface GeofenceStatus {
  jobId: string;
  isInside: boolean;
  distance: number; // Distance in meters
  lastUpdate: Date;
}

export interface GeofenceEvent {
  jobId: string;
  jobName: string;
  eventType: 'enter' | 'exit';
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
}

class GeofenceService {
  private static instance: GeofenceService;
  private locationSubscription: Location.LocationSubscription | null = null;
  private currentStatuses: Map<string, GeofenceStatus> = new Map();
  private eventCallbacks: ((event: GeofenceEvent) => void)[] = [];
  private isActive = false;
  private isBackgroundMode = false;

  static getInstance(): GeofenceService {
    if (!GeofenceService.instance) {
      GeofenceService.instance = new GeofenceService();
    }
    return GeofenceService.instance;
  }

  constructor() {
    // Background task manager removed - using native geofencing instead
  }

  /**
   * Start monitoring geofences for jobs with autoTimer enabled (FOREGROUND ONLY)
   * @param jobs - Array of jobs to monitor
   * @param useBackgroundMode - IGNORED - Always uses foreground mode
   */
  async startMonitoring(jobs: Job[], useBackgroundMode = false): Promise<boolean> {
    try {
      // Check if we have location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission not granted');
        return false;
      }

      // Filter jobs that have autoTimer enabled and location
      const jobsToMonitor = jobs.filter(job => 
        job.autoTimer?.enabled && 
        job.location?.latitude && 
        job.location?.longitude
      );

      if (jobsToMonitor.length === 0) {
        console.log('No jobs with autoTimer and location found');
        return false;
      }

      // Stop existing monitoring
      this.stopMonitoring();

      this.isBackgroundMode = false; // Always foreground mode

      // Initialize statuses for jobs
      jobsToMonitor.forEach(job => {
        if (job.location?.latitude && job.location?.longitude) {
          this.currentStatuses.set(job.id, {
            jobId: job.id,
            isInside: false,
            distance: Number.MAX_VALUE,
            lastUpdate: new Date(),
          });
        }
      });

      // Calculate optimal GPS settings based on smallest radius
      const radiuses = jobsToMonitor.map(job => job.autoTimer?.geofenceRadius || 50);
      const smallestRadius = Math.min(...radiuses);
      
      // Adjust distance interval based on smallest radius
      // For small radios (20-30m), use smaller interval for better detection
      let distanceInterval: number;
      if (smallestRadius <= 30) {
        distanceInterval = 5; // 5m for radios <= 30m
      } else if (smallestRadius <= 50) {
        distanceInterval = 10; // 10m for radios <= 50m
      } else {
        distanceInterval = 15; // 15m for radios > 50m
      }

      console.log(`📍 GPS Config: Smallest radius ${smallestRadius}m → Distance interval ${distanceInterval}m`);

      // Start location tracking with optimized settings
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // Balanced for battery/accuracy trade-off
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: distanceInterval, // Dynamic based on smallest radius
        },
        (location) => {
          this.processLocationUpdate(location, jobsToMonitor);
        }
      );

      this.isActive = true;
      console.log(`✅ Started FOREGROUND-ONLY monitoring ${jobsToMonitor.length} job geofences`);
      return true;

    } catch (error) {
      console.error('Error starting geofence monitoring:', error);
      return false;
    }
  }


  /**
   * Force location update (útil cuando se abre la app)
   */
  async forceLocationUpdate(jobs: Job[] = []): Promise<void> {
    if (!this.isActive) {
      console.log('⚠️ GeofenceService not active, skipping force update');
      return;
    }

    try {
      console.log('🔄 Forcing location update...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Use Balanced for consistency
      });
      
      this.processLocationUpdate(location, jobs);
      console.log('✅ Force location update completed');
    } catch (error) {
      console.error('❌ Error in force location update:', error);
    }
  }

  /**
   * Stop monitoring geofences
   */
  stopMonitoring(): void {
    // Stop foreground monitoring
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    this.currentStatuses.clear();
    this.isActive = false;
    this.isBackgroundMode = false;
    console.log('✅ Stopped FOREGROUND-ONLY geofence monitoring');
  }

  /**
   * Process location updates and check geofences
   */
  private processLocationUpdate(location: Location.LocationObject, jobs: Job[]): void {
    const userLat = location.coords.latitude;
    const userLon = location.coords.longitude;

    jobs.forEach(job => {
      if (!job.location?.latitude || !job.location?.longitude || !job.autoTimer?.enabled) {
        return;
      }

      const distance = this.calculateDistance(
        userLat,
        userLon,
        job.location.latitude,
        job.location.longitude
      );

      // Implement hysteresis: different radius for entry and exit
      const baseRadius = job.autoTimer.geofenceRadius || 50; // Default to 50m
      const entryRadius = baseRadius; // Enter at configured radius
      const exitRadius = baseRadius * 1.3; // Exit at 30% more distance to avoid GPS noise
      
      const currentStatus = this.currentStatuses.get(job.id);
      const wasInside = currentStatus?.isInside || false;
      
      // Use different radius based on current state
      let isInside: boolean;
      if (!wasInside) {
        // Currently outside, use entry radius
        isInside = distance <= entryRadius;
      } else {
        // Currently inside, use exit radius (must go further to exit)
        isInside = distance <= exitRadius;
      }

      // Update status
      this.currentStatuses.set(job.id, {
        jobId: job.id,
        isInside,
        distance,
        lastUpdate: new Date(),
      });

      // Only log significant events or state changes to reduce noise
      if (wasInside !== isInside || distance <= exitRadius * 1.1) {
        console.log(`📍 [GeofenceService] ${job.name}:`);
        console.log(`   Distance: ${distance.toFixed(1)}m | Radius: ${entryRadius}m (entry) / ${exitRadius}m (exit)`);
        console.log(`   State: ${wasInside ? 'INSIDE' : 'OUTSIDE'} → ${isInside ? 'INSIDE' : 'OUTSIDE'} ${wasInside !== isInside ? '⚠️ CHANGED' : ''}`);
        if (wasInside !== isInside) {
          console.log(`   ✅ Triggering ${isInside ? 'ENTER' : 'EXIT'} event`);
        }
      }

      // Check for state changes
      if (wasInside !== isInside) {
        const event: GeofenceEvent = {
          jobId: job.id,
          jobName: job.name,
          eventType: isInside ? 'enter' : 'exit',
          timestamp: new Date(),
          location: {
            latitude: userLat,
            longitude: userLon,
          },
        };

        console.log(`🎯 FOREGROUND Geofence event: ${event.eventType.toUpperCase()} ${event.jobName} (${distance.toFixed(0)}m)`);
        console.log(`📍 Location: ${userLat.toFixed(6)}, ${userLon.toFixed(6)}`);
        console.log(`🔄 State change: ${wasInside ? 'inside' : 'outside'} → ${isInside ? 'inside' : 'outside'}`);
        this.triggerEvent(event);
      }
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
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
   * Trigger event to all listeners
   */
  private triggerEvent(event: GeofenceEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in geofence event callback:', error);
      }
    });
  }

  /**
   * Add event listener
   */
  addEventListener(callback: (event: GeofenceEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(callback: (event: GeofenceEvent) => void): void {
    const index = this.eventCallbacks.indexOf(callback);
    if (index > -1) {
      this.eventCallbacks.splice(index, 1);
    }
  }

  /**
   * Get current status for a job
   */
  getJobStatus(jobId: string): GeofenceStatus | null {
    const status = this.currentStatuses.get(jobId) || null;
    console.log(`🔍 GeofenceService.getJobStatus(${jobId}):`, status);
    console.log(`   - Current statuses size: ${this.currentStatuses.size}`);
    console.log(`   - Is active: ${this.isActive}`);
    return status;
  }

  /**
   * Get current status for all jobs
   */
  getAllStatuses(): GeofenceStatus[] {
    return Array.from(this.currentStatuses.values());
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.isActive;
  }

  /**
   * Check if background monitoring is active
   */
  isBackgroundMonitoring(): boolean {
    return this.isBackgroundMode && this.isActive;
  }

  /**
   * Get monitoring mode
   */
  getMonitoringMode(): 'foreground' | 'background' | 'inactive' {
    if (!this.isActive) return 'inactive';
    return this.isBackgroundMode ? 'background' : 'foreground';
  }

  /**
   * Get jobs currently inside geofence
   */
  getJobsInsideGeofence(): string[] {
    return Array.from(this.currentStatuses.values())
      .filter(status => status.isInside)
      .map(status => status.jobId);
  }

  /**
   * Check if background task is currently registered and running
   */
  async isBackgroundTaskActive(): Promise<boolean> {
    return await this.backgroundTaskManager.isBackgroundTaskRunning();
  }

  /**
   * Manual location check - useful for testing
   */
  async checkCurrentLocation(jobs: Job[]): Promise<GeofenceStatus[]> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return jobs
        .filter(job => job.autoTimer?.enabled && job.location?.latitude && job.location?.longitude)
        .map(job => {
          if (!job.location?.latitude || !job.location?.longitude) {
            return null;
          }

          const distance = this.calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            job.location.latitude,
            job.location.longitude
          );

          const radius = job.autoTimer?.geofenceRadius || 50; // Default 50m
          const isInside = distance <= radius;

          return {
            jobId: job.id,
            isInside,
            distance,
            lastUpdate: new Date(),
          };
        })
        .filter((status): status is GeofenceStatus => status !== null);

    } catch (error) {
      console.error('Error checking current location:', error);
      return [];
    }
  }
}

export default GeofenceService;