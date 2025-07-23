import * as Location from 'expo-location';
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

  static getInstance(): GeofenceService {
    if (!GeofenceService.instance) {
      GeofenceService.instance = new GeofenceService();
    }
    return GeofenceService.instance;
  }

  /**
   * Start monitoring geofences for jobs with autoTimer enabled
   */
  async startMonitoring(jobs: Job[]): Promise<boolean> {
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

      // Start location tracking
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 20, // Or when user moves 20 meters
        },
        (location) => {
          this.processLocationUpdate(location, jobsToMonitor);
        }
      );

      this.isActive = true;
      console.log(`Started monitoring ${jobsToMonitor.length} job geofences`);
      return true;

    } catch (error) {
      console.error('Error starting geofence monitoring:', error);
      return false;
    }
  }

  /**
   * Stop monitoring geofences
   */
  stopMonitoring(): void {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.currentStatuses.clear();
    this.isActive = false;
    console.log('Stopped geofence monitoring');
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

      const radius = job.autoTimer.geofenceRadius || 100;
      const isInside = distance <= radius;
      
      const currentStatus = this.currentStatuses.get(job.id);
      const wasInside = currentStatus?.isInside || false;

      // Update status
      this.currentStatuses.set(job.id, {
        jobId: job.id,
        isInside,
        distance,
        lastUpdate: new Date(),
      });

      console.log(`🔍 GeofenceService Update - Job: ${job.name}`);
      console.log(`   - Distance: ${distance.toFixed(2)}m`);
      console.log(`   - Radius: ${radius}m`);
      console.log(`   - Was Inside: ${wasInside}`);
      console.log(`   - Is Inside: ${isInside}`);

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

        console.log(`Geofence event: ${event.eventType} ${event.jobName} (${distance.toFixed(0)}m)`);
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
   * Get jobs currently inside geofence
   */
  getJobsInsideGeofence(): string[] {
    return Array.from(this.currentStatuses.values())
      .filter(status => status.isInside)
      .map(status => status.jobId);
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

          const radius = job.autoTimer?.geofenceRadius || 100;
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