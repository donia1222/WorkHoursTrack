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
import ja from '../locales/ja.json';
import ru from '../locales/ru.json';

export type SupportedLanguage = 'es' | 'en' | 'de' | 'fr' | 'it' | 'pt' | 'nl' | 'tr' | 'ja' | 'ru';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage | 'auto') => Promise<void>;
  t: (key: string, options?: any) => string;
  isLoading: boolean;
  resetToDeviceLanguage: () => Promise<void>;
  isAutoDetect: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'user_language';
const AUTODETECT_KEY = 'language_autodetect';

export const i18n = new I18n({
  es,
  en,
  de,
  fr,
  it,
  pt,
  nl,
  tr,
  ja,
  ru,
});

i18n.enableFallback = true;
i18n.defaultLocale = 'en';

const getDeviceLanguage = (): SupportedLanguage => {
  const locales = Localization.getLocales();
  const deviceLanguage = locales[0]?.languageCode?.toLowerCase();
  const deviceRegion = locales[0]?.regionCode;
  
  // Manejar casos especiales de idiomas con regiones
  const fullLocale = deviceRegion ? `${deviceLanguage}-${deviceRegion}` : deviceLanguage;
  
  console.log('=== Language Detection Debug ===');
  console.log('Device language code:', deviceLanguage);
  console.log('Device region:', deviceRegion);
  console.log('Full locale:', fullLocale);
  console.log('Language tag:', locales[0]?.languageTag);
  console.log('All locales:', JSON.stringify(locales, null, 2));
  
  // Primero intentar coincidencia exacta
  if (deviceLanguage) {
    switch (deviceLanguage) {
      case 'es':
      case 'ca': // Catalán -> Español
      case 'gl': // Gallego -> Español
      case 'eu': // Euskera -> Español
        return 'es';
      case 'en':
        return 'en';
      case 'de':
      case 'gsw': // Alemán suizo
        return 'de';
      case 'fr':
        return 'fr';
      case 'it':
        return 'it';
      case 'pt':
        return 'pt';
      case 'nl':
      case 'fy': // Frisón -> Holandés
        return 'nl';
      case 'tr':
        return 'tr';
      case 'ja':
        return 'ja';
      case 'ru':
        return 'ru';
    }
  }
  
  // Si no hay coincidencia exacta, intentar con el languageTag completo
  const languageTag = locales[0]?.languageTag?.toLowerCase();
  if (languageTag) {
    // Verificar si empieza con alguno de nuestros idiomas soportados
    if (languageTag.startsWith('es')) return 'es';
    if (languageTag.startsWith('en')) return 'en';
    if (languageTag.startsWith('de')) return 'de';
    if (languageTag.startsWith('fr')) return 'fr';
    if (languageTag.startsWith('it')) return 'it';
    if (languageTag.startsWith('pt')) return 'pt';
    if (languageTag.startsWith('nl')) return 'nl';
    if (languageTag.startsWith('tr')) return 'tr';
    if (languageTag.startsWith('ja')) return 'ja';
    if (languageTag.startsWith('ru')) return 'ru';
  }
  
  // Si no está entre los 8 idiomas soportados, usar inglés
  console.log('Language not supported, defaulting to English. Device language:', deviceLanguage, 'LanguageTag:', languageTag);
  return 'en';
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoDetect, setIsAutoDetect] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      // Primero verificar si el modo autodetección está activado
      const autoDetectMode = await AsyncStorage.getItem(AUTODETECT_KEY);
      const isAuto = autoDetectMode === null || autoDetectMode === 'true'; // Por defecto es true
      setIsAutoDetect(isAuto);
      
      let languageToUse: SupportedLanguage;
      
      if (isAuto) {
        // Modo autodetección activado - siempre detectar el idioma del dispositivo
        languageToUse = getDeviceLanguage();
        console.log('Auto-detect mode ON - detected language:', languageToUse);
      } else {
        // Modo manual - cargar el idioma guardado
        const savedLanguage = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedLanguage) {
          languageToUse = savedLanguage as SupportedLanguage;
          console.log('Manual mode - loading saved language:', languageToUse);
        } else {
          // Si no hay idioma guardado, detectar pero guardar
          languageToUse = getDeviceLanguage();
          await AsyncStorage.setItem(STORAGE_KEY, languageToUse);
          console.log('Manual mode - no saved language, using device:', languageToUse);
        }
      }
      
      setCurrentLanguage(languageToUse);
      i18n.locale = languageToUse;

      
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
      
      // Intentar guardar el idioma detectado como fallback
      try {
        await AsyncStorage.setItem(STORAGE_KEY, deviceLanguage);
        console.log('Fallback language saved:', deviceLanguage);
      } catch (saveError) {
        console.error('Error saving fallback language:', saveError);
      }
      
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

  const setLanguage = async (newLanguage: SupportedLanguage | 'auto') => {
    try {
      if (newLanguage === 'auto') {
        // Activar modo autodetección
        await AsyncStorage.setItem(AUTODETECT_KEY, 'true');
        await AsyncStorage.removeItem(STORAGE_KEY); // Limpiar idioma manual guardado
        setIsAutoDetect(true);
        
        // Detectar y aplicar idioma del dispositivo
        const deviceLanguage = getDeviceLanguage();
        setCurrentLanguage(deviceLanguage);
        i18n.locale = deviceLanguage;
        
        // Update Quick Actions
        try {
          await SimpleQuickActionsManager.updateLanguage(deviceLanguage);
          console.log('Auto-detect enabled, language set to:', deviceLanguage);
        } catch (error) {
          console.error('Error updating Quick Actions language:', error);
        }
      } else {
        // Desactivar modo autodetección y guardar idioma manual
        await AsyncStorage.setItem(AUTODETECT_KEY, 'false');
        await AsyncStorage.setItem(STORAGE_KEY, newLanguage);
        setIsAutoDetect(false);
        setCurrentLanguage(newLanguage);
        i18n.locale = newLanguage;
        
        // Update Quick Actions when user manually changes language
        try {
          await SimpleQuickActionsManager.updateLanguage(newLanguage);
          console.log('Manual language set to:', newLanguage);
        } catch (error) {
          console.error('Error updating Quick Actions language:', error);
        }
      }
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const resetToDeviceLanguage = async () => {
    try {
      const deviceLanguage = getDeviceLanguage();
      await AsyncStorage.setItem(STORAGE_KEY, deviceLanguage);
      setCurrentLanguage(deviceLanguage);
      i18n.locale = deviceLanguage;
      
      // Update Quick Actions with device language
      try {
        await SimpleQuickActionsManager.updateLanguage(deviceLanguage);
        console.log('Reset to device language:', deviceLanguage);
      } catch (error) {
        console.error('Error updating Quick Actions after reset:', error);
      }
    } catch (error) {
      console.error('Error resetting to device language:', error);
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
        isLoading,
        resetToDeviceLanguage,
        isAutoDetect 
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
  ja: { name: '日本語', flag: '🇯🇵', nativeName: '日本語' },
  ru: { name: 'Русский', flag: '🇷🇺', nativeName: 'Русский' },
};

// Helper function to debug Quick Actions language (for development)
export const debugQuickActionsLanguage = async () => {
  const currentQALanguage = SimpleQuickActionsManager.getCurrentLanguage();
  const locales = Localization.getLocales();
  console.log('=== Quick Actions Language Debug ===');
  console.log('Current Quick Actions language:', currentQALanguage);
  console.log('Device locales:', locales);
  console.log('Device language code:', locales[0]?.languageCode);
  
  // Force refresh with current language
  try {
    await SimpleQuickActionsManager.refreshQuickActions();
    console.log('Quick Actions refreshed successfully');
  } catch (error) {
    console.error('Error refreshing Quick Actions:', error);
  }
};