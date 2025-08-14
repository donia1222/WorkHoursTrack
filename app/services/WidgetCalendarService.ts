/**
 * Service to sync calendar data with iOS widget
 * Saves work day information to shared container for widget display
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import { WorkDay, Job } from '../types/WorkTypes';

const { LiveActivityModule } = NativeModules;

interface WidgetWorkDayInfo {
  date: string; // ISO date string
  type: 'work' | 'vacation' | 'sick' | 'free' | 'scheduled';
  jobName?: string;
  jobColor?: string;
  hours?: number;
}

class WidgetCalendarService {
  private static instance: WidgetCalendarService;
  
  private constructor() {}
  
  static getInstance(): WidgetCalendarService {
    if (!WidgetCalendarService.instance) {
      WidgetCalendarService.instance = new WidgetCalendarService();
    }
    return WidgetCalendarService.instance;
  }

  /**
   * Sync calendar data with widget
   */
  async syncCalendarData(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      // Get work days from storage
      const workDaysJson = await AsyncStorage.getItem('work_days_v2');
      const workDays: WorkDay[] = workDaysJson ? JSON.parse(workDaysJson) : [];
      
      // Get jobs for color information
      const jobsJson = await AsyncStorage.getItem('jobs');
      const jobs: Job[] = jobsJson ? JSON.parse(jobsJson) : [];
      
      // Create job color map
      const jobColorMap = new Map<string, string>();
      jobs.forEach(job => {
        if (job.color) {
          jobColorMap.set(job.id, job.color);
        }
      });
      
      // Get last 14 days and next 7 days
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 14);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 7);
      
      // Filter and transform work days
      const widgetDays: WidgetWorkDayInfo[] = [];
      
      // Add actual work days
      workDays
        .filter(day => {
          const dayDate = new Date(day.date);
          return dayDate >= startDate && dayDate <= endDate;
        })
        .forEach(day => {
          const job = jobs.find(j => j.id === day.jobId);
          widgetDays.push({
            date: day.date,
            type: day.type as WidgetWorkDayInfo['type'],
            jobName: job?.name,
            jobColor: job?.color,
            hours: day.hours
          });
        });
      
      // Fill in missing days as 'free' or 'scheduled'
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Check if we already have this day
        if (!widgetDays.find(d => d.date === dateStr)) {
          // Check if it's a scheduled work day
          const dayOfWeek = currentDate.getDay();
          const isScheduled = jobs.some(job => {
            if (!job.schedule?.workDays) return false;
            return job.schedule.workDays.includes(dayOfWeek);
          });
          
          // Determine type based on whether it's past or future
          let type: WidgetWorkDayInfo['type'] = 'free';
          if (currentDate > today && isScheduled) {
            type = 'scheduled';
          }
          
          widgetDays.push({
            date: dateStr,
            type: type
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Sort by date
      widgetDays.sort((a, b) => a.date.localeCompare(b.date));
      
      // Save to native module (we'll need to add this method)
      await this.saveToNativeWidget(widgetDays);
      
      console.log('✅ Widget calendar synced:', widgetDays.length, 'days');
      
    } catch (error) {
      console.error('Error syncing widget calendar:', error);
    }
  }

  /**
   * Save calendar data to native widget storage
   */
  private async saveToNativeWidget(days: WidgetWorkDayInfo[]): Promise<void> {
    if (Platform.OS !== 'ios' || !LiveActivityModule?.saveCalendarData) {
      console.log('Widget calendar sync not available on this platform');
      return;
    }
    
    try {
      await LiveActivityModule.saveCalendarData(days);
    } catch (error) {
      console.error('Error saving calendar data to widget:', error);
    }
  }

  /**
   * Sync when a work day is added/updated
   */
  async onWorkDayChanged(): Promise<void> {
    // Debounce multiple rapid changes
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    this.syncTimeout = setTimeout(() => {
      this.syncCalendarData();
    }, 500);
  }

  private syncTimeout?: NodeJS.Timeout;
}

export default WidgetCalendarService.getInstance();