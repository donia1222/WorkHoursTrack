import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoredActiveSession } from '../types/WorkTypes';

const MANUAL_TIMER_SESSION_KEY = 'manual_timer_session';

export class ManualTimerService {
  static async saveManualSession(session: StoredActiveSession & { isPaused?: boolean; pausedElapsedTime?: number }): Promise<void> {
    try {
      await AsyncStorage.setItem(MANUAL_TIMER_SESSION_KEY, JSON.stringify(session));
      console.log('💾 Manual timer session saved:', session);
    } catch (error) {
      console.error('Error saving manual timer session:', error);
      throw error;
    }
  }

  static async getManualSession(): Promise<(StoredActiveSession & { isPaused?: boolean; pausedElapsedTime?: number }) | null> {
    try {
      const data = await AsyncStorage.getItem(MANUAL_TIMER_SESSION_KEY);
      if (data) {
        const session = JSON.parse(data);
        console.log('📱 Manual timer session loaded:', session);
        return session;
      }
      return null;
    } catch (error) {
      console.error('Error loading manual timer session:', error);
      return null;
    }
  }

  static async clearManualSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MANUAL_TIMER_SESSION_KEY);
      console.log('🗑️ Manual timer session cleared');
    } catch (error) {
      console.error('Error clearing manual timer session:', error);
      throw error;
    }
  }
}