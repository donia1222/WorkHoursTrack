import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

// Crear instancia personalizada
const i18n = new I18n({
  es: {
    title1: "Bienvenido a WorkTrack",
    desc1: "Registra tu jornada automáticamente sin pulsar botones.",
    title2: "Ubicación Inteligente",
    desc2: "Detectamos cuándo entras y sales de tu trabajo.",
    title3: "Tu tiempo, tus datos",
    desc3: "Guarda tus horas de entrada y salida de forma segura.",
    start: "Empezar"
  },
  en: {
    title1: "Welcome to WorkTrack",
    desc1: "Automatically track your work hours without pressing buttons.",
    title2: "Smart Location",
    desc2: "We detect when you enter and leave your workplace.",
    title3: "Your time, your data",
    desc3: "Save your check-in and check-out times securely.",
    start: "Get Started"
  },
  de: {
    title1: "Willkommen bei WorkTrack",
    desc1: "Erfasse deine Arbeitszeit automatisch ohne Knopfdruck.",
    title2: "Intelligente Standorterkennung",
    desc2: "Wir erkennen, wann du zur Arbeit kommst und gehst.",
    title3: "Deine Zeit, deine Daten",
    desc3: "Speichere deine Arbeitszeiten sicher.",
    start: "Los geht’s"
  },
  fr: {
    title1: "Bienvenue sur WorkTrack",
    desc1: "Suivez automatiquement vos heures sans appuyer sur un bouton.",
    title2: "Localisation intelligente",
    desc2: "Nous détectons vos entrées et sorties du travail.",
    title3: "Votre temps, vos données",
    desc3: "Enregistrez vos horaires en toute sécurité.",
    start: "Commencer"
  }
});

// Configurar idioma y fallback
i18n.locale = Localization.locale;
i18n.enableFallback = true;

export default i18n;
