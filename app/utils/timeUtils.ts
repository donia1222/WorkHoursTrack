/**
 * Utility functions for time format conversions and parsing
 */

export interface TimeFormatPreferences {
  useTimeFormat: boolean; // true = HH:MM, false = 0.00h
  use12HourFormat: boolean; // true = 12-hour (AM/PM), false = 24-hour
}

/**
 * Convert 24-hour format to 12-hour format with AM/PM
 * @param time24 - Time in 24-hour format (e.g., "14:30", "09:15")
 * @returns Time in 12-hour format (e.g., "2:30 PM", "9:15 AM")
 */
export const convert24to12 = (time24: string): string => {
  if (!time24 || !time24.includes(':')) return time24;
  
  const [hoursStr, minutesStr] = time24.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (isNaN(hours) || isNaN(minutes)) return time24;
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // 0 becomes 12 for midnight/noon
  const minutesFormatted = minutes.toString().padStart(2, '0');
  
  return `${hours12}:${minutesFormatted} ${ampm}`;
};

/**
 * Convert 12-hour format with AM/PM to 24-hour format
 * @param time12 - Time in 12-hour format (e.g., "2:30 PM", "9:15 AM")
 * @returns Time in 24-hour format (e.g., "14:30", "09:15")
 */
export const convert12to24 = (time12: string): string => {
  if (!time12) return time12;
  
  // Remove extra spaces and convert to uppercase
  const cleanTime = time12.trim().toUpperCase();
  
  // Check if it has AM/PM
  if (!cleanTime.includes('AM') && !cleanTime.includes('PM')) {
    return time12; // Return as-is if no AM/PM found
  }
  
  const isAM = cleanTime.includes('AM');
  const isPM = cleanTime.includes('PM');
  
  if (!isAM && !isPM) return time12;
  
  // Extract the time part (remove AM/PM)
  const timePart = cleanTime.replace(/\s*(AM|PM)$/, '');
  
  if (!timePart.includes(':')) return time12;
  
  const [hoursStr, minutesStr] = timePart.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (isNaN(hours) || isNaN(minutes)) return time12;
  
  // Convert to 24-hour format
  if (isPM && hours !== 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }
  
  const hoursFormatted = hours.toString().padStart(2, '0');
  const minutesFormatted = minutes.toString().padStart(2, '0');
  
  return `${hoursFormatted}:${minutesFormatted}`;
};

/**
 * Format time according to user preferences
 * @param time24 - Time in 24-hour format
 * @param preferences - User's time format preferences
 * @returns Formatted time string
 */
export const formatTimeWithPreferences = (
  time24: string, 
  preferences: TimeFormatPreferences
): string => {
  if (!preferences.useTimeFormat) {
    // If not using time format, return as-is (probably decimal hours)
    return time24;
  }
  
  if (preferences.use12HourFormat) {
    return convert24to12(time24);
  }
  
  return time24; // Return 24-hour format as-is
};

/**
 * Parse time input and convert to 24-hour format for storage
 * @param timeInput - Time input from user (could be 12-hour or 24-hour)
 * @param preferences - User's time format preferences
 * @returns Time in 24-hour format for storage
 */
export const parseTimeInput = (
  timeInput: string, 
  preferences: TimeFormatPreferences
): string => {
  if (!timeInput) return timeInput;
  
  if (preferences.use12HourFormat && (timeInput.includes('AM') || timeInput.includes('PM'))) {
    return convert12to24(timeInput);
  }
  
  return timeInput; // Already in 24-hour format or no conversion needed
};

/**
 * Get placeholder text for time inputs based on preferences
 * @param preferences - User's time format preferences
 * @returns Appropriate placeholder text
 */
export const getTimePlaceholder = (preferences: TimeFormatPreferences): string => {
  if (!preferences.useTimeFormat) return '0.00';
  
  if (preferences.use12HourFormat) {
    return '9:00 AM';
  }
  
  return '09:00';
};

/**
 * Validate if time input is in correct format
 * @param timeInput - Time input to validate
 * @param preferences - User's time format preferences
 * @returns true if valid, false otherwise
 */
export const isValidTimeInput = (
  timeInput: string, 
  preferences: TimeFormatPreferences
): boolean => {
  if (!timeInput) return false;
  
  if (preferences.use12HourFormat) {
    // Check 12-hour format: H:MM AM/PM or HH:MM AM/PM
    const regex12 = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i;
    return regex12.test(timeInput.trim());
  } else {
    // Check 24-hour format: H:MM or HH:MM
    const regex24 = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex24.test(timeInput.trim());
  }
};

/**
 * Auto-format time input as user types
 * @param input - Current input value
 * @param previousInput - Previous input value
 * @param preferences - User's time format preferences
 * @returns Formatted input
 */
export const autoFormatTimeInput = (
  input: string,
  previousInput: string,
  preferences: TimeFormatPreferences
): string => {
  if (!input) return input;
  
  // Remove any existing formatting
  let cleanInput = input.replace(/[^0-9APMapm:]/g, '');
  
  if (preferences.use12HourFormat) {
    // Handle AM/PM formatting
    if (cleanInput.length >= 2 && !cleanInput.includes(':')) {
      cleanInput = cleanInput.substring(0, 2) + ':' + cleanInput.substring(2);
    }
    
    // Add AM/PM if not present and input looks complete
    if (cleanInput.length >= 4 && cleanInput.includes(':') && !cleanInput.includes('AM') && !cleanInput.includes('PM')) {
      // Default to AM for morning hours, PM for afternoon
      const [hoursStr] = cleanInput.split(':');
      const hours = parseInt(hoursStr, 10);
      const ampm = hours < 12 ? ' AM' : ' PM';
      cleanInput += ampm;
    }
  } else {
    // 24-hour format
    if (cleanInput.length >= 2 && !cleanInput.includes(':')) {
      cleanInput = cleanInput.substring(0, 2) + ':' + cleanInput.substring(2);
    }
  }
  
  return cleanInput;
};