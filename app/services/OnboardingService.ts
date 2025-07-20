import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@app_onboarding_completed';

export class OnboardingService {
  /**
   * Check if the user has completed the onboarding
   */
  static async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  static async markOnboardingComplete(): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
      throw error;
    }
  }

  /**
   * Reset onboarding (useful for testing or settings)
   */
  static async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      throw error;
    }
  }
}