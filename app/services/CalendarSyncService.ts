import { Alert, Platform, Linking, PermissionsAndroid } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Calendar from 'expo-calendar';
import { WorkDay, Job } from '../types/WorkTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations
import es from '../locales/es.json';
import en from '../locales/en.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import it from '../locales/it.json';

export class CalendarSyncService {
  /**
   * Get translation for a given key
   */
  private static async getTranslation(key: string, params?: any): Promise<string> {
    try {
      const storedLanguage = await AsyncStorage.getItem('user_language');
      const language = storedLanguage || 'en';
      
      const translations: any = { es, en, de, fr, it };
      const langTranslations = translations[language] || translations['en'];
      
      // Navigate through nested keys (e.g., "calendar.work_event_title")
      const keys = key.split('.');
      let value = langTranslations;
      for (const k of keys) {
        value = value?.[k];
      }
      
      if (typeof value === 'string') {
        // Simple parameter replacement
        if (params) {
          return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
            return params[paramKey] || match;
          });
        }
        return value;
      }
      
      return key; // Return key if translation not found
    } catch (error) {
      console.warn('Could not get translation for key:', key, error);
      return key;
    }
  }

  /**
   * Get localized work event title based on app language setting
   */
  private static async getWorkEventTitle(): Promise<string> {
    return await this.getTranslation('calendar.work_event_title');
  }

  /**
   * Get start and end times for a work day, using specific times if available or defaults
   */
  private static getWorkDayTimes(workDay: WorkDay): { startHour: number, startMinute: number, endHour: number, endMinute: number, isAllDay: boolean } {
    let startHour = 9, startMinute = 0, endHour = 17, endMinute = 0;
    let isAllDay = false;
    
    // If specific start/end times are available, use them
    if (workDay.startTime && workDay.endTime) {
      const [startH, startM] = workDay.startTime.split(':').map(Number);
      const [endH, endM] = workDay.endTime.split(':').map(Number);
      
      startHour = startH;
      startMinute = startM;
      endHour = endH;
      endMinute = endM;
    } else {
      // When no specific schedule, create all-day event
      isAllDay = true;
      startHour = 0;
      startMinute = 0;
      endHour = 0;
      endMinute = 0;
    }
    
    return { startHour, startMinute, endHour, endMinute, isAllDay };
  }

  /**
   * Check calendar permissions using expo-calendar
   */
  static async checkCalendarPermissions(): Promise<boolean> {
    try {
      // Check if calendar permissions are available first
      const permissions = await Calendar.getCalendarPermissionsAsync();
      console.log('Initial calendar permission status:', permissions.status);
      
      if (permissions.status === 'granted') {
        return true;
      }
      
      // Only request permissions if not already denied permanently
      if (permissions.status !== 'denied' && permissions.canAskAgain !== false) {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        console.log('Calendar permission request result:', status);
        
        if (status === 'granted') {
          return true;
        } else if (status === 'denied') {
          Alert.alert(
            await this.getTranslation('calendar.permissions_required'),
            await this.getTranslation('calendar.permissions_required_message'),
            [{ text: await this.getTranslation('calendar.understood') }]
          );
          return false;
        }
      } else {
        Alert.alert(
          await this.getTranslation('calendar.permissions_denied'),
          await this.getTranslation('calendar.permissions_denied_message'),
          [{ text: await this.getTranslation('calendar.understood') }]
        );
        return false;
      }
      
      Alert.alert(
        'Permissions',
        'Error requesting calendar permissions',
        [{ text: 'OK' }]
      );
      return false;
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      
      // Handle specific calendar permission errors
      if (error instanceof Error) {
        if (error.message.includes('MissingCalendarPListValue')) {
          Alert.alert(
            'Error de configuración',
            'La app no está configurada correctamente para acceder al calendario. Por favor, contacta al desarrollador.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Error de permisos',
            `No se pudieron solicitar los permisos de calendario: ${error.message}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Error de permisos',
          'No se pudieron solicitar los permisos de calendario. Asegúrate de que los permisos estén configurados correctamente en la configuración de la app.',
          [{ text: 'OK' }]
        );
      }
      return false;
    }
  }

  /**
   * Get default calendar to add events to
   */
  static async getDefaultCalendar(): Promise<string | null> {
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      console.log('Available calendars:', calendars.length);
      
      if (!calendars || calendars.length === 0) {
        console.warn('No calendars found on device');
        return null;
      }
      
      // Find the default calendar (usually the primary one)
      const defaultCalendar = calendars.find(cal => 
        cal.source?.isLocalAccount && cal.allowsModifications
      ) || calendars.find(cal => cal.allowsModifications) || calendars[0];
      
      if (defaultCalendar) {
        console.log('Using calendar:', defaultCalendar.title, defaultCalendar.id);
        return defaultCalendar.id;
      }
      
      console.warn('No writable calendar found');
      return null;
    } catch (error) {
      console.error('Error getting calendars:', error);
      
      // Handle specific calendar access errors
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          console.error('Calendar permission error when getting calendars');
        } else if (error.message.includes('MissingCalendarPListValue')) {
          console.error('Calendar configuration error in app');
        }
      }
      
      return null;
    }
  }

  /**
   * Add event directly to calendar using expo-calendar
   */
  static async addEventToCalendar(workDay: WorkDay, job: Job): Promise<boolean> {
    try {
      console.log('Adding event to calendar for workDay:', workDay.date);

      // Validate input data
      if (!workDay || !workDay.date || !job || !job.name) {
        console.error('Invalid workDay or job data provided');
        Alert.alert('Error', 'Datos del día de trabajo no válidos');
        return false;
      }

      // Get calendar ID
      const calendarId = await this.getDefaultCalendar();
      if (!calendarId) {
        console.warn('No calendar available for creating event');
        Alert.alert('Error', 'No se pudo encontrar un calendario disponible');
        return false;
      }

      // Create date objects with proper validation
      const workDate = new Date(workDay.date + 'T00:00:00');
      if (isNaN(workDate.getTime())) {
        console.error('Invalid date format:', workDay.date);
        Alert.alert('Error', 'Fecha del día de trabajo no válida');
        return false;
      }

      const { startHour, startMinute, endHour, endMinute, isAllDay } = this.getWorkDayTimes(workDay);
      
      const startDate = new Date(workDate);
      const endDate = new Date(workDate);
      
      if (isAllDay) {
        // For all-day events, use midnight to midnight of next day
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
      } else {
        startDate.setHours(startHour, startMinute, 0, 0);
        endDate.setHours(endHour, endMinute, 0, 0);
      }

      // Ensure end date is after start date
      if (endDate <= startDate) {
        endDate.setHours(startDate.getHours() + 1);
      }

      const workEventTitle = await this.getWorkEventTitle();
      const eventData = {
        title: `${workEventTitle}: ${job.name}`,
        startDate: startDate,
        endDate: endDate,
        notes: `${workDay.hours || 0} horas trabajadas${workDay.overtime ? ' (incluye horas extra)' : ''}${workDay.notes ? '\n\nNotas: ' + workDay.notes : ''}`,
        location: job.address || '',
        alarms: [], // No alarms by default
        allDay: isAllDay, // Set allDay flag for events without specific schedule
      };

      console.log('Creating calendar event with data:', {
        ...eventData,
        calendarId
      });

      // Create event
      const eventId = await Calendar.createEventAsync(calendarId, eventData);

      console.log('Event created with ID:', eventId);
      return true;

    } catch (error) {
      console.error('Error adding event to calendar:', error);
      
      let errorMessage = 'Error desconocido';
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'Sin permisos de calendario';
        } else if (error.message.includes('MissingCalendarPListValue')) {
          errorMessage = 'App mal configurada para calendario';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Error', `No se pudo añadir el evento al calendario: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Syncs a work day to the device's native calendar
   */
  static async syncWorkDayToCalendar(workDay: WorkDay, job: Job): Promise<boolean> {
    try {
      console.log('Starting calendar sync for workDay:', workDay.date);
      
      if (workDay.type !== 'work') {
        Alert.alert('Error', 'Solo se pueden sincronizar días de trabajo');
        return false;
      }

      // Check permissions first
      console.log('Checking calendar permissions...');
      const hasPermission = await this.checkCalendarPermissions();
      if (!hasPermission) {
        Alert.alert('Error', 'Se necesitan permisos de calendario para sincronizar eventos');
        return false;
      }
      console.log('Calendar permissions granted');

      // Validate work day data
      if (!workDay.date || workDay.hours <= 0) {
        Alert.alert('Error', 'Datos del día de trabajo no válidos');
        return false;
      }

      // Try direct calendar integration first
      const success = await this.addEventToCalendar(workDay, job);
      if (success) {
        Alert.alert('Éxito', 'Evento añadido al calendario correctamente');
        return true;
      }

      // Fallback to platform-specific approaches
      if (Platform.OS === 'android') {
        return await this.syncToAndroidCalendar(workDay, job);
      } else {
        return await this.syncToIOSCalendar(workDay, job);
      }
      
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      Alert.alert('Error', `No se pudo sincronizar con el calendario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return false;
    }
  }

  /**
   * Android-specific calendar sync using system intents
   */
  private static async syncToAndroidCalendar(workDay: WorkDay, job: Job): Promise<boolean> {
    try {
      console.log('Using Android calendar intent approach');
      
      // Create date objects
      const workDate = new Date(workDay.date + 'T00:00:00');
      const { startHour, startMinute, endHour, endMinute, isAllDay } = this.getWorkDayTimes(workDay);
      
      const startDate = new Date(workDate);
      const endDate = new Date(workDate);
      
      if (isAllDay) {
        // For all-day events, use midnight to midnight of next day
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
      } else {
        startDate.setHours(startHour, startMinute, 0, 0);
        endDate.setHours(endHour, endMinute, 0, 0);
      }

      // Build calendar intent URL
      const workEventTitle = await this.getWorkEventTitle();
      const title = encodeURIComponent(`${workEventTitle}: ${job.name}`);
      const details = encodeURIComponent(`${workDay.hours} horas trabajadas${workDay.overtime ? ' (incluye horas extra)' : ''}${workDay.notes ? '\nNotas: ' + workDay.notes : ''}`);
      const location = encodeURIComponent(job.address || '');
      
      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${this.formatDateForGoogle(startDate)}/${this.formatDateForGoogle(endDate)}&details=${details}&location=${location}`;

      console.log('Opening calendar URL:', calendarUrl);
      
      const supported = await Linking.canOpenURL(calendarUrl);
      if (supported) {
        await Linking.openURL(calendarUrl);
        
        Alert.alert(
          'Calendario abierto',
          'Se ha abierto Google Calendar. Guarda el evento desde allí.',
          [{ text: 'OK' }]
        );
        return true;
      } else {
        // Fallback to native calendar app
        return await this.openNativeCalendarApp(workDay, job);
      }
    } catch (error) {
      console.error('Android calendar sync error:', error);
      return await this.openNativeCalendarApp(workDay, job);
    }
  }

  /**
   * iOS-specific calendar sync
   */
  private static async syncToIOSCalendar(workDay: WorkDay, job: Job): Promise<boolean> {
    try {
      console.log('Using iOS calendar approach');
      
      const workDate = new Date(workDay.date + 'T00:00:00');
      const { startHour, startMinute, endHour, endMinute, isAllDay } = this.getWorkDayTimes(workDay);
      
      const startDate = new Date(workDate);
      const endDate = new Date(workDate);
      
      if (isAllDay) {
        // For all-day events, use midnight to midnight of next day
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
      } else {
        startDate.setHours(startHour, startMinute, 0, 0);
        endDate.setHours(endHour, endMinute, 0, 0);
      }

      // Use iOS calendar URL scheme
      const workEventTitle = await this.getWorkEventTitle();
      const title = encodeURIComponent(`${workEventTitle}: ${job.name}`);
      const notes = encodeURIComponent(`${workDay.hours} horas trabajadas${workDay.overtime ? ' (incluye horas extra)' : ''}${workDay.notes ? '\nNotas: ' + workDay.notes : ''}`);
      const location = encodeURIComponent(job.address || '');
      
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);
      
      const calendarUrl = `calshow:${startTimestamp}`;
      
      console.log('iOS Calendar URL:', calendarUrl);

      const supported = await Linking.canOpenURL(calendarUrl);
      if (supported) {
        await Linking.openURL(calendarUrl);
        
        const workEventTitle = await this.getWorkEventTitle();
        Alert.alert(
          'Calendario abierto',
          `Se ha abierto el calendario de iOS. Puedes crear el evento con estos datos:\n\nTítulo: ${workEventTitle}: ${job.name}\nFecha: ${workDay.date}\nHoras: ${workDay.hours}h`,
          [{ text: 'OK' }]
        );
        return true;
      } else {
        return await this.openNativeCalendarApp(workDay, job);
      }
    } catch (error) {
      console.error('iOS calendar sync error:', error);
      return await this.openNativeCalendarApp(workDay, job);
    }
  }

  /**
   * Format date for Google Calendar URL
   */
  private static formatDateForGoogle(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  /**
   * Fallback: Open native calendar app
   */
  private static async openNativeCalendarApp(workDay: WorkDay, job: Job): Promise<boolean> {
    try {
      console.log('Using fallback calendar app approach');
      
      if (Platform.OS === 'ios') {
        await Linking.openURL('calshow:');
      } else {
        await Linking.openURL('content://com.android.calendar/time');
      }
      
      const workEventTitle = await this.getWorkEventTitle();
      Alert.alert(
        'Calendario abierto',
        `Se ha abierto la app de calendario. Puedes crear manualmente el evento:\n\nTítulo: ${workEventTitle}: ${job.name}\nFecha: ${workDay.date}\nHoras: ${workDay.hours}h`,
        [{ text: 'OK' }]
      );
      
      return true;
    } catch (error) {
      console.error('Fallback calendar error:', error);
      Alert.alert('Error', 'No se pudo abrir la aplicación de calendario');
      return false;
    }
  }

  /**
   * Generates an ICS file content for a work day
   */
  static async generateICSFile(workDay: WorkDay, job: Job): Promise<string> {
    const { startHour, startMinute, endHour, endMinute, isAllDay } = this.getWorkDayTimes(workDay);
    
    const formatDate = (date: string, isStartTime = true): string => {
      const d = new Date(date);
      if (isAllDay) {
        // For all-day events, use date format without time
        if (isStartTime) {
          d.setUTCHours(0, 0, 0, 0);
        } else {
          d.setUTCDate(d.getUTCDate() + 1);
          d.setUTCHours(0, 0, 0, 0);
        }
      } else {
        if (isStartTime) {
          d.setUTCHours(startHour, startMinute, 0, 0);
        } else {
          d.setUTCHours(endHour, endMinute, 0, 0);
        }
      }
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startDate = formatDate(workDay.date, true);
    const endDate = formatDate(workDay.date, false);
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const workEventTitle = await this.getWorkEventTitle();

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Geolocalizacion App//WorkDay Calendar//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:workday-${workDay.id}@geolocalizacion-app.com
DTSTART:${startDate}
DTEND:${endDate}
DTSTAMP:${now}
SUMMARY:${workEventTitle}: ${job.name}
DESCRIPTION:${workDay.overtime ? 'Incluye horas extra\\n' : ''}Horas trabajadas: ${workDay.hours}h
LOCATION:${job.address || ''}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`;
  }

  /**
   * Opens a calendar app with the event data
   */
  static async openCalendarApp(workDay: WorkDay, job: Job): Promise<void> {
    try {
      const { startHour, startMinute, endHour, endMinute, isAllDay } = this.getWorkDayTimes(workDay);
      
      let startTime, endTime;
      if (isAllDay) {
        startTime = new Date(`${workDay.date}T00:00:00`);
        endTime = new Date(`${workDay.date}T23:59:59`);
      } else {
        startTime = new Date(`${workDay.date}T${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}:00`);
        endTime = new Date(`${workDay.date}T${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`);
      }
      
      let calendarUrl = '';
      
      if (Platform.OS === 'ios') {
        // iOS Calendar URL scheme
        calendarUrl = `calshow:${Math.floor(startTime.getTime() / 1000)}`;
      } else {
        // Android Calendar intent
        const workEventTitle = await this.getWorkEventTitle();
        const title = encodeURIComponent(`${workEventTitle}: ${job.name}`);
        const details = encodeURIComponent(workDay.overtime ? 'Incluye horas extra' : '');
        const location = encodeURIComponent(job.address || '');
        
        calendarUrl = `content://com.android.calendar/events?` +
          `title=${title}&` +
          `dtstart=${startTime.getTime()}&` +
          `dtend=${endTime.getTime()}&` +
          `description=${details}&` +
          `eventLocation=${location}`;
      }

      const supported = await Linking.canOpenURL(calendarUrl);
      if (supported) {
        await Linking.openURL(calendarUrl);
      } else {
        // Fallback to system calendar
        if (Platform.OS === 'ios') {
          await Linking.openURL('calshow:');
        } else {
          await Linking.openURL('content://com.android.calendar/time');
        }
      }
    } catch (error) {
      console.error('Error opening calendar app:', error);
      Alert.alert('Error', 'No se pudo abrir la aplicación de calendario');
    }
  }

  /**
   * Creates ICS file and prompts user to save/share it
   */
  static async shareICSFile(workDay: WorkDay, job: Job): Promise<void> {
    try {
      console.log('Generating ICS file for workDay:', workDay.date);
      
      const icsContent = await this.generateICSFile(workDay, job);
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        console.log('Sharing not available, showing content in alert');
        Alert.alert(
          'Contenido del calendario',
          'Copia este contenido y guárdalo como archivo .ics:\n\n' + icsContent.substring(0, 200) + '...',
          [
            {
              text: 'Ver completo',
              onPress: () => Alert.alert('Archivo ICS completo', icsContent)
            },
            { text: 'Cerrar', style: 'cancel' }
          ]
        );
        return;
      }

      // Create a temporary file
      const workEventTitle = await this.getWorkEventTitle();
      const fileName = `${workEventTitle.toLowerCase()}_${job.name.replace(/[^a-zA-Z0-9]/g, '_')}_${workDay.date}.ics`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      console.log('Writing ICS file to:', fileUri);
      
      // Write the ICS content to file
      await FileSystem.writeAsStringAsync(fileUri, icsContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      console.log('Sharing ICS file...');
      
      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/calendar',
        dialogTitle: 'Guardar evento en calendario',
        UTI: 'com.apple.ical.ics',
      });

      console.log('ICS file shared successfully');
      
    } catch (error) {
      console.error('Error sharing ICS file:', error);
      Alert.alert('Error', `No se pudo generar el archivo de calendario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Syncs multiple work days to calendar
   */
  static async syncMultipleWorkDays(workDays: WorkDay[], jobs: Job[]): Promise<number> {
    console.log(`Starting sync for ${workDays.length} work days`);
    
    // Filter only work days
    const onlyWorkDays = workDays.filter(day => day.type === 'work');
    
    if (onlyWorkDays.length === 0) {
      Alert.alert('Información', 'No hay días de trabajo para sincronizar en este mes');
      return 0;
    }

    console.log(`Found ${onlyWorkDays.length} work days to sync`);

    // Check permissions once for all operations
    const hasPermission = await this.checkCalendarPermissions();
    if (!hasPermission) {
      Alert.alert('Error', 'Se necesitan permisos de calendario para sincronizar eventos');
      return 0;
    }

    // For multiple days, add directly to calendar
    if (onlyWorkDays.length > 1) {
      console.log('Adding multiple work days directly to calendar');
      
      let successCount = 0;
      for (const workDay of onlyWorkDays) {
        const job = jobs.find(j => j.id === workDay.jobId);
        if (job) {
          try {
            const success = await this.addEventToCalendar(workDay, job);
            if (success) {
              successCount++;
            }
            // Small delay between creations
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            console.error(`Error adding event for ${workDay.date}:`, error);
          }
        }
      }
      
      if (successCount === 0) {
        Alert.alert('Error', 'No se pudo añadir ningún evento al calendario');
      }
      
      return successCount;
    }

    // Single day sync - use calendar integration
    const workDay = onlyWorkDays[0];
    const job = jobs.find(j => j.id === workDay.jobId);
    if (job) {
      try {
        const success = await this.syncWorkDayToCalendar(workDay, job);
        return success ? 1 : 0;
      } catch (error) {
        console.error(`Error syncing work day ${workDay.date}:`, error);
        return 0;
      }
    }
    
    return 0;
  }

}