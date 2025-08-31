import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job, WorkDay, DEFAULT_JOB } from '../types/WorkTypes';
import WidgetSyncService from './WidgetSyncService';

const JOBS_KEY = 'jobs';
const WORK_DAYS_KEY = 'work_days_v2';
const ACTIVE_SESSION_KEY = 'active_session';

export class JobService {
  static async getJobs(): Promise<Job[]> {
    try {
      const data = await AsyncStorage.getItem(JOBS_KEY);
      if (data) {
        return JSON.parse(data);
      } else {
        // Return empty array - user should create their own jobs
        return [];
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      return [];
    }
  }

  static async saveJobs(jobs: Job[]): Promise<void> {
    try {
      await AsyncStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
      // Sync to widget
      await WidgetSyncService.syncJobsToWidget();
    } catch (error) {
      console.error('Error saving jobs:', error);
    }
  }

  static async addJob(job: Omit<Job, 'id' | 'createdAt'>): Promise<Job> {
    const newJob: Job = {
      ...job,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    const jobs = await this.getJobs();
    const updatedJobs = [...jobs, newJob];
    await this.saveJobs(updatedJobs);
    
    return newJob;
  }

  static async updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
    const jobs = await this.getJobs();
    const updatedJobs = jobs.map(job =>
      job.id === jobId ? { ...job, ...updates } : job
    );
    await this.saveJobs(updatedJobs);
  }

  static async deleteJob(jobId: string): Promise<void> {
    console.log(`🗑️ Deleting job ${jobId}`);
    
    const jobs = await this.getJobs();
    const updatedJobs = jobs.filter(job => job.id !== jobId);
    await this.saveJobs(updatedJobs);
    console.log(`📊 Jobs after deletion: ${updatedJobs.length}`);
    
    // Delete all work days for this job
    const workDays = await this.getWorkDays();
    console.log(`📅 Total work days before deletion: ${workDays.length}`);
    
    let updatedWorkDays = workDays.filter(day => day.jobId !== jobId);
    console.log(`📅 Work days after filtering job: ${updatedWorkDays.length}`);
    
    // Always clear all non-work days (free, vacation, sick) when deleting any job
    // because non-work days don't belong to specific jobs and should be cleared
    // to allow fresh start
    console.log(`🧹 Clearing all non-work days after job deletion`);
    const beforeClear = updatedWorkDays.length;
    updatedWorkDays = updatedWorkDays.filter(day => 
      day.type !== 'free' && day.type !== 'vacation' && day.type !== 'sick'
    );
    console.log(`📅 Work days after clearing non-work days: ${updatedWorkDays.length} (was ${beforeClear})`);
    
    await this.saveWorkDays(updatedWorkDays);
    console.log(`✅ Job deletion completed. Final work days: ${updatedWorkDays.length}`);
  }

  static async getWorkDays(): Promise<WorkDay[]> {
    try {
      const data = await AsyncStorage.getItem(WORK_DAYS_KEY);
      let workDays: WorkDay[] = data ? JSON.parse(data) : [];
      
      // Migration: add 'type' field to existing workDays that don't have it
      let needsMigration = false;
      workDays = workDays.map(day => {
        if (!day.type) {
          needsMigration = true;
          return {
            ...day,
            type: 'work' as const, // Default to 'work' for existing entries
            updatedAt: day.updatedAt || new Date().toISOString()
          };
        }
        return day;
      });
      
      // Save migrated data back to AsyncStorage
      if (needsMigration) {
        console.log('🔄 Migrating workDays: adding missing type field to', workDays.length, 'entries');
        await AsyncStorage.setItem(WORK_DAYS_KEY, JSON.stringify(workDays));
      }
      
      return workDays;
    } catch (error) {
      console.error('Error loading work days:', error);
      return [];
    }
  }

  static async saveWorkDays(workDays: WorkDay[]): Promise<void> {
    try {
      await AsyncStorage.setItem(WORK_DAYS_KEY, JSON.stringify(workDays));
      // Sync calendar to widget
      await WidgetSyncService.syncCalendarToWidget();
    } catch (error) {
      console.error('Error saving work days:', error);
    }
  }

  static async addWorkDay(workDay: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkDay> {
    const newWorkDay: WorkDay = {
      ...workDay,
      id: Date.now().toString(),
      type: workDay.type || 'work', // Ensure type is set
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const workDays = await this.getWorkDays();
    const updatedWorkDays = [...workDays, newWorkDay];
    await this.saveWorkDays(updatedWorkDays);
    
    return newWorkDay;
  }

  static async updateWorkDay(workDayId: string, updates: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const workDays = await this.getWorkDays();
    const updatedWorkDays = workDays.map(day =>
      day.id === workDayId 
        ? { 
            ...day, 
            ...updates, 
            updatedAt: new Date().toISOString() 
          } 
        : day
    );
    await this.saveWorkDays(updatedWorkDays);
  }

  static async deleteWorkDay(workDayId: string): Promise<void> {
    const workDays = await this.getWorkDays();
    const updatedWorkDays = workDays.filter(day => day.id !== workDayId);
    await this.saveWorkDays(updatedWorkDays);
  }

  static async getWorkDayForDate(date: string): Promise<WorkDay | null> {
    const workDays = await this.getWorkDays();
    return workDays.find(day => day.date === date) || null;
  }

  static async getWorkDaysForMonth(year: number, month: number): Promise<WorkDay[]> {
    const workDays = await this.getWorkDays();
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    return workDays.filter(day => day.date.startsWith(monthKey));
  }

  static async getWorkDaysForJob(jobId: string): Promise<WorkDay[]> {
    const workDays = await this.getWorkDays();
    return workDays.filter(day => day.jobId === jobId);
  }

  // Active session management
  static async saveActiveSession(session: {
    jobId: string;
    startTime: string;
    notes: string;
  }): Promise<void> {
    try {
      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Error saving active session:', error);
    }
  }

  static async getActiveSession(): Promise<{
    jobId: string;
    startTime: string;
    notes: string;
  } | null> {
    try {
      const data = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading active session:', error);
      return null;
    }
  }

  static async clearActiveSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch (error) {
      console.error('Error clearing active session:', error);
    }
  }
}