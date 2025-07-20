import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job, WorkDay, DEFAULT_JOB } from '../types/WorkTypes';

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
        // Initialize with default job
        const defaultJobs = [DEFAULT_JOB];
        await this.saveJobs(defaultJobs);
        return defaultJobs;
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      return [DEFAULT_JOB];
    }
  }

  static async saveJobs(jobs: Job[]): Promise<void> {
    try {
      await AsyncStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
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
    const jobs = await this.getJobs();
    const updatedJobs = jobs.filter(job => job.id !== jobId);
    await this.saveJobs(updatedJobs);
    
    // Also delete all work days for this job
    const workDays = await this.getWorkDays();
    const updatedWorkDays = workDays.filter(day => day.jobId !== jobId);
    await this.saveWorkDays(updatedWorkDays);
  }

  static async getWorkDays(): Promise<WorkDay[]> {
    try {
      const data = await AsyncStorage.getItem(WORK_DAYS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading work days:', error);
      return [];
    }
  }

  static async saveWorkDays(workDays: WorkDay[]): Promise<void> {
    try {
      await AsyncStorage.setItem(WORK_DAYS_KEY, JSON.stringify(workDays));
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