import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

// Import all translation files
import es from './es.json';
import en from './en.json';
import de from './de.json';
import fr from './fr.json';
import it from './it.json';

// Create i18n instance
const i18n = new I18n({
  es,
  en,
  de,
  fr,
  it,
});

// Set the locale once at the beginning of your app
i18n.locale = Localization.locale.split('-')[0] || 'en';

// When a value is missing from a language it'll fall back to English
i18n.enableFallback = true;

// Default locale if device locale is not supported
i18n.defaultLocale = 'en';

export default i18n;