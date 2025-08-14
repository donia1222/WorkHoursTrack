import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { LiveActivityModule } = NativeModules;

/**
 * Force complete widget sync with debug logging
 */
export async function forceCompleteWidgetSync(): Promise<void> {
  if (Platform.OS !== 'ios') {
    console.log('⚠️ Widget sync only available on iOS');
    return;
  }

  console.log('🔄 Starting FORCE COMPLETE widget sync...');

  try {
    // 1. Get jobs from storage
    const jobsStr = await AsyncStorage.getItem('jobs');
    const jobs = jobsStr ? JSON.parse(jobsStr) : [];
    console.log('📦 Jobs loaded:', jobs.length);
    
    if (jobs.length > 0) {
      console.log('📋 Jobs to sync:');
      jobs.forEach((job: any) => {
        console.log(`  - ${job.name || job.empresa}: ${job.address || job.direccion || 'No address'}`);
      });
      
      // Format jobs for widget
      const jobsForWidget = jobs.map((job: any) => ({
        name: job.name || job.empresa || 'Work',
        location: job.address || job.direccion || job.location,
        color: job.color || '#059669'
      }));
      
      // Sync jobs to widget
      if (LiveActivityModule?.syncJobsToWidget) {
        await LiveActivityModule.syncJobsToWidget(jobsForWidget);
        console.log('✅ Jobs synced to widget');
      } else {
        console.log('❌ LiveActivityModule.syncJobsToWidget not available');
      }
    } else {
      console.log('⚠️ No jobs to sync');
    }

    // 2. Get work days from storage
    const workDaysStr = await AsyncStorage.getItem('work_days_v2');
    const workDays = workDaysStr ? JSON.parse(workDaysStr) : [];
    console.log('📅 Work days loaded:', workDays.length);
    
    // Get today and future days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Format calendar data for next 14 days
    const calendarData: any[] = [];
    
    for (let i = 0; i < 14; i++) {
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
        
        calendarData.push({
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
          
          return workDaysList.includes(currentDayName) || 
                 workDaysList.includes(currentDayNameEn);
        });
        
        if (scheduledJob) {
          calendarData.push({
            date: dateStr,
            type: 'scheduled',
            jobName: scheduledJob.name || scheduledJob.empresa,
            jobColor: scheduledJob.color || '#059669',
            hours: undefined
          });
        } else {
          // Free day
          calendarData.push({
            date: dateStr,
            type: 'free',
            jobName: undefined,
            jobColor: undefined,
            hours: undefined
          });
        }
      }
    }
    
    console.log('📊 Calendar data prepared:', calendarData.filter(d => d.type !== 'free').length, 'work/scheduled days');
    
    // Show first few days for debugging
    console.log('📅 Next 3 days:');
    calendarData.slice(0, 3).forEach(day => {
      console.log(`  ${day.date}: ${day.type} ${day.jobName ? `(${day.jobName})` : ''}`);
    });
    
    // Sync calendar to widget
    if (LiveActivityModule?.syncCalendarToWidget) {
      await LiveActivityModule.syncCalendarToWidget(calendarData);
      console.log('✅ Calendar synced to widget');
    } else {
      console.log('❌ LiveActivityModule.syncCalendarToWidget not available');
    }
    
    console.log('✅ FORCE COMPLETE widget sync finished');
    
  } catch (error) {
    console.error('❌ Error in force widget sync:', error);
  }
}