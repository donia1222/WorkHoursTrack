import { NativeModules, Platform } from 'react-native';

const { LiveActivityModule } = NativeModules;

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function forceWidgetSync() {
  if (Platform.OS !== 'ios' || !LiveActivityModule) {
    return;
  }

  try {
    // First check if we have real data
    const jobsStr = await AsyncStorage.getItem('jobs');
    const workDaysStr = await AsyncStorage.getItem('work_days_v2');
    
    // If we have real data, don't use sample data
    if (jobsStr || workDaysStr) {
      console.log('📱 Real data exists, skipping sample data sync');
      return;
    }
    
    console.log('📱 No real data found, syncing sample data to widget');
    
    // Send sample jobs data
    const sampleJobs = [
      {
        name: 'Dsdu',
        address: 'Ellis St 2-16',
        location: 'Ellis St 2-16, San Francisco',
        color: '#059669'
      },
      {
        name: 'Office Work',
        address: 'Downtown',
        location: 'Downtown Office',
        color: '#3B82F6'
      }
    ];

    // Send sample calendar data
    const today = new Date();
    const sampleCalendar = [];
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      
      if (i === 0) {
        // Today - mark as worked
        sampleCalendar.push({
          date: dateStr,
          type: 'work',
          jobName: 'Dsdu',
          jobColor: '#059669',
          hours: 7.5
        });
      } else if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Weekdays - scheduled
        sampleCalendar.push({
          date: dateStr,
          type: 'scheduled',
          jobName: 'Dsdu',
          jobColor: '#059669'
        });
      } else {
        // Weekends - free
        sampleCalendar.push({
          date: dateStr,
          type: 'free'
        });
      }
    }

    // Sync to widget
    if (LiveActivityModule.syncJobsToWidget) {
      await LiveActivityModule.syncJobsToWidget(sampleJobs);
      console.log('✅ Sample jobs synced to widget');
    }
    
    if (LiveActivityModule.syncCalendarToWidget) {
      await LiveActivityModule.syncCalendarToWidget(sampleCalendar);
      console.log('✅ Sample calendar synced to widget');
    }
  } catch (error) {
    console.error('Error forcing widget sync:', error);
  }
}