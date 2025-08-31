import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { TimeFormatPreferences, formatTimeWithPreferences, parseTimeInput, getTimePlaceholder, isValidTimeInput, autoFormatTimeInput } from '../utils/timeUtils';
import { logTimeFormat } from '../config/logging';

export const useTimeFormat = () => {
  const [useTimeFormat, setUseTimeFormat] = useState(true);
  const [use12HourFormat, setUse12HourFormat] = useState(true); // Default to AM/PM format

  useEffect(() => {
    loadTimeFormatPreference();
    load12HourFormatPreference();
    
    // Refresh preferences every 2 seconds to catch changes
    const interval = setInterval(() => {
      loadTimeFormatPreference();
      load12HourFormatPreference();
    }, 2000);
    
    // Listen for app state changes to refresh preferences
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        loadTimeFormatPreference();
        load12HourFormatPreference();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      clearInterval(interval);
      subscription?.remove();
    };
  }, []);

  const loadTimeFormatPreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('@time_format_preference');
      logTimeFormat('Loading time format preference:', saved);
      if (saved !== null) {
        const newValue = saved === 'true';
        console.log('🕐 Setting useTimeFormat to:', newValue);
        setUseTimeFormat(newValue);
      }
    } catch (error) {
      console.error('Error loading time format preference:', error);
    }
  };

  const load12HourFormatPreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('@12hour_format_preference');
      logTimeFormat('Loading 12-hour format preference:', saved);
      if (saved !== null) {
        const newValue = saved === 'true';
        console.log('🕐 Setting use12HourFormat to:', newValue);
        setUse12HourFormat(newValue);
      }
    } catch (error) {
      console.error('Error loading 12-hour format preference:', error);
    }
  };

  const formatTime = (hours: number): string => {
    console.log('🕐 Formatting time:', hours, 'useTimeFormat:', useTimeFormat);
    if (useTimeFormat) {
      // HH:MM:SS format
      const totalSeconds = Math.round(hours * 3600);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      const result = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      console.log('🕐 HH:MM:SS result:', result);
      return result;
    } else {
      // Decimal hours format
      const result = `${hours.toFixed(2)}h`;
      console.log('🕐 Decimal result:', result);
      return result;
    }
  };

  // Get current preferences object
  const preferences: TimeFormatPreferences = {
    useTimeFormat,
    use12HourFormat,
  };


  return {
    useTimeFormat,
    use12HourFormat,
    preferences,
    formatTime,
    refreshPreference: loadTimeFormatPreference,
    // Utility functions from timeUtils
    formatTimeWithPreferences: (time24: string) => formatTimeWithPreferences(time24, preferences),
    parseTimeInput: (timeInput: string) => parseTimeInput(timeInput, preferences),
    getTimePlaceholder: () => getTimePlaceholder(preferences),
    isValidTimeInput: (timeInput: string) => isValidTimeInput(timeInput, preferences),
    autoFormatTimeInput: (input: string, previousInput: string) => autoFormatTimeInput(input, previousInput, preferences),
  };
};