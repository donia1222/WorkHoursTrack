import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { LiveActivityModule } = NativeModules;

export interface WorkDayForWidget {
  date: string;
  type: 'work' | 'vacation' | 'sick' | 'free' | 'scheduled';
  jobName?: string;
  jobColor?: string;
  hours?: number;
}

export interface JobForWidget {
  name: string;
  address?: string;
  color?: string;
}

export interface TimerForWidget {
  isActive: boolean;
  jobName: string;
  location?: string;
  startTime?: string; // ISO string
}

class WidgetSyncService {
  /**
   * Sync jobs to widget
   */
  async syncJobsToWidget(): Promise<void> {
    if (Platform.OS !== 'ios' || !LiveActivityModule?.syncJobsToWidget) {
      return;
    }

    try {
      // Get jobs from storage
      const jobsStr = await AsyncStorage.getItem('jobs');
      const jobs = jobsStr ? JSON.parse(jobsStr) : [];
      
      // Convert to widget format - map both old and new field names
      const jobsForWidget: JobForWidget[] = jobs.map((job: any) => ({
        name: job.name || job.empresa || 'Work',
        address: job.address || job.direccion || job.location,
        location: job.address || job.direccion || job.location,  // Send both for compatibility
        color: job.color || '#059669'
      }));

      // Send to native module
      await LiveActivityModule.syncJobsToWidget(jobsForWidget);
      console.log('✅ Jobs synced to widget:', jobsForWidget.length);
    } catch (error) {
      console.error('❌ Error syncing jobs to widget:', error);
    }
  }

  /**
   * Sync calendar/work days to widget
   */
  async syncCalendarToWidget(): Promise<void> {
    if (Platform.OS !== 'ios' || !LiveActivityModule?.syncCalendarToWidget) {
      return;
    }

    try {
      // Get work days from storage
      const workDaysStr = await AsyncStorage.getItem('work_days_v2');
      const workDays = workDaysStr ? JSON.parse(workDaysStr) : [];
      
      // Get jobs for colors and schedules
      const jobsStr = await AsyncStorage.getItem('jobs');
      const jobs = jobsStr ? JSON.parse(jobsStr) : [];
      
      console.log('📱 Jobs loaded for widget sync:', jobs.length);
      console.log('📅 Work days loaded for widget sync:', workDays.length);
      
      // Get today and future days
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filter and format work days for next 35 days (full month + buffer)
      const nextDays: WorkDayForWidget[] = [];
      
      for (let i = 0; i < 35; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        // Find if this day has work recorded
        const workDay = workDays.find((day: any) => {
          const dayDate = new Date(day.date);
          dayDate.setHours(0, 0, 0, 0);
          return dayDate.toISOString().split('T')[0] === dateStr;
        });
        
        if (workDay) {
          // Find job for color
          const job = jobs.find((j: any) => j.id === workDay.jobId);
          
          nextDays.push({
            date: dateStr,
            type: workDay.type || 'work',
            jobName: job?.name || job?.empresa || workDay.jobName || 'Work',
            jobColor: job?.color || workDay.jobColor || '#059669',
            hours: workDay.totalHours || workDay.hours
          });
        } else {
          // Check if it's a scheduled work day
          const dayOfWeek = checkDate.getDay();
          const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
          const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const currentDayName = dayNames[dayOfWeek].toLowerCase();
          const currentDayNameEn = dayNamesEn[dayOfWeek].toLowerCase();
          
          // Find job scheduled for this day
          const scheduledJob = jobs.find((job: any) => {
            if (!job.diasTrabajo && !job.workDays) return false;
            
            const workDaysStr = job.diasTrabajo || job.workDays || '';
            const workDaysList = workDaysStr.toLowerCase().split(',').map((d: string) => d.trim());
            
            // Check both Spanish and English day names
            return workDaysList.includes(currentDayName) || 
                   workDaysList.includes(currentDayNameEn) ||
                   workDaysList.includes(dayNames[dayOfWeek]) ||
                   workDaysList.includes(dayNamesEn[dayOfWeek]);
          });
          
          if (scheduledJob) {
            console.log(`📅 Found scheduled work for ${dateStr}:`, scheduledJob.name || scheduledJob.empresa);
            nextDays.push({
              date: dateStr,
              type: 'scheduled',
              jobName: scheduledJob.name || scheduledJob.empresa,
              jobColor: scheduledJob.color || '#059669',
              hours: undefined
            });
          } else {
            // Free day
            nextDays.push({
              date: dateStr,
              type: 'free',
              jobName: undefined,
              jobColor: undefined,
              hours: undefined
            });
          }
        }
      }

      console.log('📊 Prepared calendar data for widget:', nextDays.filter(d => d.type !== 'free').length, 'work/scheduled days');

      // Send to native module
      await LiveActivityModule.syncCalendarToWidget(nextDays);
      console.log('✅ Calendar synced to widget:', nextDays.length, 'days');
    } catch (error) {
      console.error('❌ Error syncing calendar to widget:', error);
    }
  }

  /**
   * Sync active timer to widget
   */
  async syncActiveTimerToWidget(): Promise<void> {
    if (Platform.OS !== 'ios' || !LiveActivityModule?.syncTimerToWidget) {
      return;
    }

    try {
      // Get active session from storage
      const sessionStr = await AsyncStorage.getItem('active_session');
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      
      // Get jobs for job name lookup
      const jobsStr = await AsyncStorage.getItem('jobs');
      const jobs = jobsStr ? JSON.parse(jobsStr) : [];
      
      let timerData: TimerForWidget;
      
      if (session && session.jobId) {
        const job = jobs.find((j: any) => j.id === session.jobId);
        timerData = {
          isActive: true,
          jobName: job?.name || job?.empresa || 'Work',
          location: job?.address || job?.direccion || job?.location,
          startTime: session.startTime
        };
        console.log('📱 Syncing active timer to widget:', timerData.jobName);
      } else {
        timerData = {
          isActive: false,
          jobName: 'WorkTrack',
          location: undefined,
          startTime: undefined
        };
        console.log('📱 Syncing inactive timer to widget');
      }
      
      // Send to native module
      if (LiveActivityModule?.syncTimerToWidget) {
        await LiveActivityModule.syncTimerToWidget(timerData);
        console.log('✅ Timer synced to widget successfully');
      } else {
        console.log('⚠️ syncTimerToWidget method not available');
      }
      
    } catch (error) {
      console.error('❌ Error syncing timer to widget:', error);
    }
  }

  /**
   * Sync all widget data
   */
  async syncAllToWidget(): Promise<void> {
    console.log('🔄 Starting full widget sync...');
    await Promise.all([
      this.syncJobsToWidget(),
      this.syncCalendarToWidget(),
      this.syncActiveTimerToWidget()
    ]);
    console.log('✅ Full widget sync completed');
  }
}

export default new WidgetSyncService();