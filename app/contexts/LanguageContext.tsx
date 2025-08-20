import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import NotificationService from '../services/NotificationService';
import SimpleQuickActionsManager from '../services/SimpleQuickActionsManager';

import es from '../locales/es.json';
import en from '../locales/en.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import it from '../locales/it.json';
import pt from '../locales/pt.json';
import nl from '../locales/nl.json';
import tr from '../locales/tr.json';

export type SupportedLanguage = 'es' | 'en' | 'de' | 'fr' | 'it' | 'pt' | 'nl' | 'tr';

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
  pt,
  nl,
  tr,
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
    case 'pt':
      return 'pt';
    case 'nl':
      return 'nl';
    case 'tr':
      return 'tr';
    default:
      // Si no está entre los 8 idiomas soportados, usar inglés
      console.log('Language not supported, defaulting to English');
      return 'en';
  }
};

const updateNotificationTranslations = (locale: SupportedLanguage) => {
  const localeData = { es, en, de, fr, it, pt, nl, tr }[locale];
  
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
      timer_started_body: notifications.timer_started_body?.replace('"{{jobName}}"', '') || 'Timer automático iniciado para',
      timer_stopped_title: notifications.timer_stopped_title || '⏹️ Timer Pausado',
      timer_stopped_body: notifications.timer_stopped_body?.replace('"{{jobName}}"', '') || 'Timer automático pausado para',
      timer_will_start_title: notifications.timer_will_start_title || '🚀 Timer se Iniciará',
      timer_will_start_body: notifications.timer_will_start_body?.replace('{{minutes}}', '').replace(/minutos? para "{{jobName}}"/, '').trim() || 'Timer se iniciará en',
      timer_will_stop_title: notifications.timer_will_stop_title || '⏸️ Timer se Pausará',
      timer_will_stop_body: notifications.timer_will_stop_body?.replace('{{minutes}}', '').replace(/minutos? para "{{jobName}}"/, '').trim() || 'Timer se pausará en',
      default_title: notifications.default_notification_title || '📱 Notificación',
      default_body: 'Evento para',
      minute: 'minuto',
      minutes: 'minutos',
    },
    en: {
      timer_started_title: notifications.timer_started_title || '⏰ Timer Started',
      timer_started_body: notifications.timer_started_body?.replace('"{{jobName}}"', '') || 'Automatic timer started for',
      timer_stopped_title: notifications.timer_stopped_title || '⏹️ Timer Stopped',
      timer_stopped_body: notifications.timer_stopped_body?.replace('"{{jobName}}"', '') || 'Automatic timer stopped for',
      timer_will_start_title: notifications.timer_will_start_title || '🚀 Timer Will Start',
      timer_will_start_body: notifications.timer_will_start_body?.replace('{{minutes}}', '').replace(/minutes? for "{{jobName}}"/, '').trim() || 'Timer will start in',
      timer_will_stop_title: notifications.timer_will_stop_title || '⏸️ Timer Will Stop',
      timer_will_stop_body: notifications.timer_will_stop_body?.replace('{{minutes}}', '').replace(/minutes? for "{{jobName}}"/, '').trim() || 'Timer will stop in',
      default_title: notifications.default_notification_title || '📱 Notification',
      default_body: 'Event for',
      minute: 'minute',
      minutes: 'minutes',
    },
    de: {
      timer_started_title: notifications.timer_started_title || '⏰ Timer Gestartet',
      timer_started_body: notifications.timer_started_body?.replace('"{{jobName}}"', '') || 'Automatischer Timer gestartet für',
      timer_stopped_title: notifications.timer_stopped_title || '⏹️ Timer Pausiert',
      timer_stopped_body: notifications.timer_stopped_body?.replace('"{{jobName}}"', '') || 'Automatischer Timer pausiert für',
      timer_will_start_title: notifications.timer_will_start_title || '🚀 Timer Wird Starten',
      timer_will_start_body: notifications.timer_will_start_body?.replace('{{minutes}}', '').replace(/Minuten? für "{{jobName}}"/, '').trim() || 'Timer startet in',
      timer_will_stop_title: notifications.timer_will_stop_title || '⏸️ Timer Wird Pausieren',
      timer_will_stop_body: notifications.timer_will_stop_body?.replace('{{minutes}}', '').replace(/Minuten? für "{{jobName}}"/, '').trim() || 'Timer pausiert in',
      default_title: notifications.default_notification_title || '📱 Benachrichtigung',
      default_body: 'Ereignis für',
      minute: 'Minute',
      minutes: 'Minuten',
    },
    fr: {
      timer_started_title: notifications.timer_started_title || '⏰ Minuteur Démarré',
      timer_started_body: notifications.timer_started_body?.replace('"{{jobName}}"', '') || 'Minuteur automatique démarré pour',
      timer_stopped_title: notifications.timer_stopped_title || '⏹️ Minuteur Arrêté',
      timer_stopped_body: notifications.timer_stopped_body?.replace('"{{jobName}}"', '') || 'Minuteur automatique arrêté pour',
      timer_will_start_title: notifications.timer_will_start_title || '🚀 Le Minuteur Va Démarrer',
      timer_will_start_body: notifications.timer_will_start_body?.replace('{{minutes}}', '').replace(/minutes? pour "{{jobName}}"/, '').trim() || 'Le minuteur démarrera dans',
      timer_will_stop_title: notifications.timer_will_stop_title || "⏸️ Le Minuteur Va S'arrêter",
      timer_will_stop_body: notifications.timer_will_stop_body?.replace('{{minutes}}', '').replace(/minutes? pour "{{jobName}}"/, '').trim() || "Le minuteur s'arrêtera dans",
      default_title: notifications.default_notification_title || '📱 Notification',
      default_body: 'Événement pour',
      minute: 'minute',
      minutes: 'minutes',
    },
    it: {
      timer_started_title: notifications.timer_started_title || '⏰ Timer Avviato',
      timer_started_body: notifications.timer_started_body?.replace('"{{jobName}}"', '') || 'Timer automatico avviato per',
      timer_stopped_title: notifications.timer_stopped_title || '⏹️ Timer Fermato',
      timer_stopped_body: notifications.timer_stopped_body?.replace('"{{jobName}}"', '') || 'Timer automatico fermato per',
      timer_will_start_title: notifications.timer_will_start_title || '🚀 Il Timer Si Avvierà',
      timer_will_start_body: notifications.timer_will_start_body?.replace('{{minutes}}', '').replace(/minuti? per "{{jobName}}"/, '').trim() || 'Il timer si avvierà tra',
      timer_will_stop_title: notifications.timer_will_stop_title || '⏸️ Il Timer Si Fermerà',
      timer_will_stop_body: notifications.timer_will_stop_body?.replace('{{minutes}}', '').replace(/minuti? per "{{jobName}}"/, '').trim() || 'Il timer si fermerà tra',
      default_title: notifications.default_notification_title || '📱 Notifica',
      default_body: 'Evento per',
      minute: 'minuto',
      minutes: 'minuti',
    },
    pt: {
      timer_started_title: notifications.timer_started_title || '⏰ Timer Iniciado',
      timer_started_body: notifications.timer_started_body?.replace('"{{jobName}}"', '') || 'Timer automático iniciado para',
      timer_stopped_title: notifications.timer_stopped_title || '⏹️ Timer Parado',
      timer_stopped_body: notifications.timer_stopped_body?.replace('"{{jobName}}"', '') || 'Timer automático parado para',
      timer_will_start_title: notifications.timer_will_start_title || '🚀 Timer Vai Iniciar',
      timer_will_start_body: notifications.timer_will_start_body?.replace('{{minutes}}', '').replace(/minutos? para "{{jobName}}"/, '').trim() || 'Timer iniciará em',
      timer_will_stop_title: notifications.timer_will_stop_title || '⏸️ Timer Vai Parar',
      timer_will_stop_body: notifications.timer_will_stop_body?.replace('{{minutes}}', '').replace(/minutos? para "{{jobName}}"/, '').trim() || 'Timer parará em',
      default_title: notifications.default_notification_title || '📱 Notificação',
      default_body: 'Evento para',
      minute: 'minuto',
      minutes: 'minutos',
    },
    nl: {
      timer_started_title: notifications.timer_started_title || '⏰ Timer Gestart',
      timer_started_body: notifications.timer_started_body?.replace('"{{jobName}}"', '') || 'Automatische timer gestart voor',
      timer_stopped_title: notifications.timer_stopped_title || '⏹️ Timer Gestopt',
      timer_stopped_body: notifications.timer_stopped_body?.replace('"{{jobName}}"', '') || 'Automatische timer gestopt voor',
      timer_will_start_title: notifications.timer_will_start_title || '🚀 Timer Gaat Starten',
      timer_will_start_body: notifications.timer_will_start_body?.replace('{{minutes}}', '').replace(/minuten? voor "{{jobName}}"/, '').trim() || 'Timer start over',
      timer_will_stop_title: notifications.timer_will_stop_title || '⏸️ Timer Gaat Stoppen',
      timer_will_stop_body: notifications.timer_will_stop_body?.replace('{{minutes}}', '').replace(/minuten? voor "{{jobName}}"/, '').trim() || 'Timer stopt over',
      default_title: notifications.default_notification_title || '📱 Melding',
      default_body: 'Gebeurtenis voor',
      minute: 'minuut',
      minutes: 'minuten',
    },
    tr: {
      timer_started_title: notifications.timer_started_title || '⏰ Zamanlayıcı Başladı',
      timer_started_body: notifications.timer_started_body?.replace('"{{jobName}}"', '') || 'Otomatik zamanlayıcı başladı',
      timer_stopped_title: notifications.timer_stopped_title || '⏹️ Zamanlayıcı Durdu',
      timer_stopped_body: notifications.timer_stopped_body?.replace('"{{jobName}}"', '') || 'Otomatik zamanlayıcı durdu',
      timer_will_start_title: notifications.timer_will_start_title || '🚀 Zamanlayıcı Başlayacak',
      timer_will_start_body: notifications.timer_will_start_body?.replace('{{minutes}}', '').replace(/dakika? için "{{jobName}}"/, '').trim() || 'Zamanlayıcı başlayacak',
      timer_will_stop_title: notifications.timer_will_stop_title || '⏸️ Zamanlayıcı Duracak',
      timer_will_stop_body: notifications.timer_will_stop_body?.replace('{{minutes}}', '').replace(/dakika? için "{{jobName}}"/, '').trim() || 'Zamanlayıcı duracak',
      default_title: notifications.default_notification_title || '📱 Bildirim',
      default_body: 'Etkinlik',
      minute: 'dakika',
      minutes: 'dakika',
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
      
      // Update Quick Actions with detected language
      try {
        await SimpleQuickActionsManager.updateLanguage(languageToUse);
      } catch (error) {
        console.error('Error updating Quick Actions language:', error);
      }
    } catch (error) {
      console.error('Error loading language:', error);
      const deviceLanguage = getDeviceLanguage();
      setCurrentLanguage(deviceLanguage);
      i18n.locale = deviceLanguage;
      updateNotificationTranslations(deviceLanguage);
      
      // Update Quick Actions with fallback language
      try {
        await SimpleQuickActionsManager.updateLanguage(deviceLanguage);
      } catch (error) {
        console.error('Error updating Quick Actions fallback language:', error);
      }
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
      
      // Update Quick Actions when user manually changes language
      try {
        await SimpleQuickActionsManager.updateLanguage(newLanguage);
        console.log('Quick Actions language updated to:', newLanguage);
      } catch (error) {
        console.error('Error updating Quick Actions language:', error);
      }
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
  pt: { name: 'Português', flag: '🇧🇷', nativeName: 'Português' },
  nl: { name: 'Nederlands', flag: '🇳🇱', nativeName: 'Nederlands' },
  tr: { name: 'Türkçe', flag: '🇹🇷', nativeName: 'Türkçe' },
};

// Helper function to debug Quick Actions language (for development)
export const debugQuickActionsLanguage = async () => {
  const currentQALanguage = SimpleQuickActionsManager.getCurrentLanguage();
  console.log('=== Quick Actions Language Debug ===');
  console.log('Current Quick Actions language:', currentQALanguage);
  console.log('Device locale:', Localization.locale);
  console.log('Device language code:', Localization.locale.split('-')[0]);
  
  // Force refresh with current language
  try {
    await SimpleQuickActionsManager.refreshQuickActions();
    console.log('Quick Actions refreshed successfully');
  } catch (error) {
    console.error('Error refreshing Quick Actions:', error);
  }
};