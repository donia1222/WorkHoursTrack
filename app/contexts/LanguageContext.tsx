import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import NotificationService from '../services/NotificationService';

import es from '../locales/es.json';
import en from '../locales/en.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import it from '../locales/it.json';

export type SupportedLanguage = 'es' | 'en' | 'de' | 'fr' | 'it';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  t: (key: string, options?: any) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'user_language';

const i18n = new I18n({
  es,
  en,
  de,
  fr,
  it,
});

i18n.enableFallback = true;
i18n.defaultLocale = 'en';

const getDeviceLanguage = (): SupportedLanguage => {
  const locales = Localization.getLocales();
  const deviceLanguage = locales[0]?.languageCode;
  const deviceRegion = locales[0]?.regionCode;
  
  // Manejar casos especiales de idiomas con regiones
  const fullLocale = deviceRegion ? `${deviceLanguage}-${deviceRegion}` : deviceLanguage;
  
  console.log('Device language detected:', deviceLanguage, 'Full locale:', fullLocale);
  
  switch (deviceLanguage) {
    case 'es':
      return 'es';
    case 'en':
      return 'en';
    case 'de':
      return 'de';
    case 'fr':
      return 'fr';
    case 'it':
      return 'it';
    default:
      // Si no está entre los 5 idiomas soportados, usar inglés
      console.log('Language not supported, defaulting to English');
      return 'en';
  }
};

const updateNotificationTranslations = (locale: SupportedLanguage) => {
  const localeData = { es, en, de, fr, it }[locale];
  
  // Verificar que existan las traducciones
  if (!localeData?.preferences?.notifications) {
    console.warn('Notification translations not found for locale:', locale);
    return;
  }

  const notifications = localeData.preferences.notifications;
  
  // Definir las traducciones específicas para cada idioma
  const translationsByLocale = {
    es: {
      timer_started_title: notifications.timer_started_title || '⏰ Timer Iniciado',
      timer_started_body: 'Timer automático iniciado para',
      timer_stopped_title: notifications.timer_stopped_title || '⏹️ Timer Pausado',
      timer_stopped_body: 'Timer automático pausado para',
      timer_will_start_title: notifications.timer_will_start_title || '🚀 Timer se Iniciará',
      timer_will_start_body: 'Timer se iniciará en',
      timer_will_stop_title: notifications.timer_will_stop_title || '⏸️ Timer se Pausará',
      timer_will_stop_body: 'Timer se pausará en',
      default_title: notifications.default_notification_title || '📱 Notificación',
      default_body: 'Evento para',
      minute: 'minuto',
      minutes: 'minutos',
    },
    en: {
      timer_started_title: notifications.timer_started_title || '⏰ Timer Started',
      timer_started_body: 'Automatic timer started for',
      timer_stopped_title: notifications.timer_stopped_title || '⏹️ Timer Stopped',
      timer_stopped_body: 'Automatic timer stopped for',
      timer_will_start_title: notifications.timer_will_start_title || '🚀 Timer Will Start',
      timer_will_start_body: 'Timer will start in',
      timer_will_stop_title: notifications.timer_will_stop_title || '⏸️ Timer Will Stop',
      timer_will_stop_body: 'Timer will stop in',
      default_title: notifications.default_notification_title || '📱 Notification',
      default_body: 'Event for',
      minute: 'minute',
      minutes: 'minutes',
    },
    de: {
      timer_started_title: notifications.timer_started_title || '⏰ Timer Gestartet',
      timer_started_body: 'Automatischer Timer gestartet für',
      timer_stopped_title: notifications.timer_stopped_title || '⏹️ Timer Pausiert',
      timer_stopped_body: 'Automatischer Timer pausiert für',
      timer_will_start_title: notifications.timer_will_start_title || '🚀 Timer Wird Starten',
      timer_will_start_body: 'Timer startet in',
      timer_will_stop_title: notifications.timer_will_stop_title || '⏸️ Timer Wird Pausieren',
      timer_will_stop_body: 'Timer pausiert in',
      default_title: notifications.default_notification_title || '📱 Benachrichtigung',
      default_body: 'Ereignis für',
      minute: 'Minute',
      minutes: 'Minuten',
    },
    fr: {
      timer_started_title: notifications.timer_started_title || '⏰ Minuteur Démarré',
      timer_started_body: 'Minuteur automatique démarré pour',
      timer_stopped_title: notifications.timer_stopped_title || '⏹️ Minuteur Arrêté',
      timer_stopped_body: 'Minuteur automatique arrêté pour',
      timer_will_start_title: notifications.timer_will_start_title || '🚀 Le Minuteur Va Démarrer',
      timer_will_start_body: 'Le minuteur démarrera dans',
      timer_will_stop_title: notifications.timer_will_stop_title || "⏸️ Le Minuteur Va S'arrêter",
      timer_will_stop_body: "Le minuteur s'arrêtera dans",
      default_title: notifications.default_notification_title || '📱 Notification',
      default_body: 'Événement pour',
      minute: 'minute',
      minutes: 'minutes',
    },
    it: {
      timer_started_title: notifications.timer_started_title || '⏰ Timer Avviato',
      timer_started_body: 'Timer automatico avviato per',
      timer_stopped_title: notifications.timer_stopped_title || '⏹️ Timer Fermato',
      timer_stopped_body: 'Timer automatico fermato per',
      timer_will_start_title: notifications.timer_will_start_title || '🚀 Il Timer Si Avvierà',
      timer_will_start_body: 'Il timer si avvierà tra',
      timer_will_stop_title: notifications.timer_will_stop_title || '⏸️ Il Timer Si Fermerà',
      timer_will_stop_body: 'Il timer si fermerà tra',
      default_title: notifications.default_notification_title || '📱 Notifica',
      default_body: 'Evento per',
      minute: 'minuto',
      minutes: 'minuti',
    },
  };

  // Usar las traducciones del locale actual
  const translations = translationsByLocale[locale];
  
  if (translations) {
    NotificationService.getInstance().updateTranslations(translations);
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(STORAGE_KEY);
      let languageToUse: SupportedLanguage;
      
      if (savedLanguage) {
        // Usuario ya seleccionó un idioma manualmente
        languageToUse = savedLanguage as SupportedLanguage;
      } else {
        // Primera vez o no hay preferencia guardada
        // Detectar idioma del dispositivo
        languageToUse = getDeviceLanguage();
        // No guardar automáticamente para permitir que el usuario lo cambie si desea
      }
      
      setCurrentLanguage(languageToUse);
      i18n.locale = languageToUse;
      updateNotificationTranslations(languageToUse);
    } catch (error) {
      console.error('Error loading language:', error);
      const deviceLanguage = getDeviceLanguage();
      setCurrentLanguage(deviceLanguage);
      i18n.locale = deviceLanguage;
      updateNotificationTranslations(deviceLanguage);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (newLanguage: SupportedLanguage) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLanguage);
      setCurrentLanguage(newLanguage);
      i18n.locale = newLanguage;
      updateNotificationTranslations(newLanguage);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string, options?: any): string => {
    return i18n.t(key, options);
  };

  return (
    <LanguageContext.Provider 
      value={{ 
        language, 
        setLanguage, 
        t, 
        isLoading 
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export const languageConfig = {
  es: { name: 'Español', flag: '🇪🇸', nativeName: 'Español' },
  en: { name: 'English', flag: '🇺🇸', nativeName: 'English' },
  de: { name: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch' },
  fr: { name: 'Français', flag: '🇫🇷', nativeName: 'Français' },
  it: { name: 'Italiano', flag: '🇮🇹', nativeName: 'Italiano' },
};