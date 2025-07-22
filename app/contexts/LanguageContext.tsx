import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

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
  const deviceLanguage = Localization.getLocales()[0]?.languageCode;
  
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
      return 'en';
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
      const languageToUse = savedLanguage 
        ? (savedLanguage as SupportedLanguage) 
        : getDeviceLanguage();
      
      setCurrentLanguage(languageToUse);
      i18n.locale = languageToUse;
    } catch (error) {
      console.error('Error loading language:', error);
      const deviceLanguage = getDeviceLanguage();
      setCurrentLanguage(deviceLanguage);
      i18n.locale = deviceLanguage;
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (newLanguage: SupportedLanguage) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLanguage);
      setCurrentLanguage(newLanguage);
      i18n.locale = newLanguage;
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