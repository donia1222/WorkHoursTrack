import { SupportedLanguage } from '../contexts/LanguageContext';
import * as Location from 'expo-location';

// Import all question files statically
import esQuestions from '../locales/chatbot-questions/es-questions.json';
import enQuestions from '../locales/chatbot-questions/en-questions.json';
import deQuestions from '../locales/chatbot-questions/de-questions.json';
import frQuestions from '../locales/chatbot-questions/fr-questions.json';
import itQuestions from '../locales/chatbot-questions/it-questions.json';
import ptQuestions from '../locales/chatbot-questions/pt-questions.json';
import nlQuestions from '../locales/chatbot-questions/nl-questions.json';
import trQuestions from '../locales/chatbot-questions/tr-questions.json';
import jaQuestions from '../locales/chatbot-questions/ja-questions.json';
import ruQuestions from '../locales/chatbot-questions/ru-questions.json';

interface ChatbotQuestions {
  questions: string[];
}

// Static mapping of language to questions
const questionsMap: Record<string, ChatbotQuestions> = {
  'es': esQuestions,
  'en': enQuestions,
  'de': deQuestions,
  'fr': frQuestions,
  'it': itQuestions,
  'pt': ptQuestions,
  'nl': nlQuestions,
  'tr': trQuestions,
  'ja': jaQuestions,
  'ru': ruQuestions,
};

// Function to get questions for a specific language
const loadQuestions = (language: string): ChatbotQuestions => {
  return questionsMap[language] || questionsMap['en'] || { questions: [] };
};

// All supported languages in the app
const SUPPORTED_WIDGET_LANGUAGES = Object.keys(questionsMap);

// Country detection based on coordinates
export const detectCountryFromCoordinates = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const result = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (result && result.length > 0) {
      const location = result[0];
      const detectedCountry = location.country || 'Spain';
      console.log('🌍 Raw country from GPS:', detectedCountry);
      
      // Normalize country names to English for consistent mapping
      const countryNormalization: Record<string, string> = {
        'Suiza': 'Switzerland',
        'España': 'Spain',
        'Francia': 'France',
        'Italia': 'Italy',
        'Alemania': 'Germany',
        'Austria': 'Austria',
        'Bélgica': 'Belgium',
        'Portugal': 'Portugal',
        'Reino Unido': 'United Kingdom',
        'Países Bajos': 'Netherlands',
        'Brasil': 'Brazil',
        'Canadá': 'Canada',
        'Turquía': 'Turkey',
        'Japón': 'Japan',
        'Rusia': 'Russia',
        // Add more variations
        'Switzerland': 'Switzerland',
        'Schweiz': 'Switzerland',
        'Svizzera': 'Switzerland',
        'Suisse': 'Switzerland'
      };
      
      const normalizedCountry = countryNormalization[detectedCountry] || detectedCountry;
      console.log('🌍 Normalized country:', normalizedCountry);
      return normalizedCountry;
    }
  } catch (error) {
    console.warn('Error detecting country from coordinates:', error);
  }
  return 'Spain'; // Default fallback
};

// Map country names to their localized versions
export const getLocalizedCountryName = (country: string, language: string): string => {
  const countryMappings: Record<string, Record<string, string>> = {
    'Spain': { 
      'es': 'España', 'en': 'Spain', 'de': 'Spanien', 'fr': 'Espagne', 'it': 'Spagna', 
      'pt': 'Espanha', 'nl': 'Spanje', 'tr': 'İspanya', 'ja': 'スペイン', 'ru': 'Испания'
    },
    'France': { 
      'es': 'Francia', 'en': 'France', 'de': 'Frankreich', 'fr': 'France', 'it': 'Francia',
      'pt': 'França', 'nl': 'Frankrijk', 'tr': 'Fransa', 'ja': 'フランス', 'ru': 'Франция'
    },
    'Germany': { 
      'es': 'Alemania', 'en': 'Germany', 'de': 'Deutschland', 'fr': 'Allemagne', 'it': 'Germania',
      'pt': 'Alemanha', 'nl': 'Duitsland', 'tr': 'Almanya', 'ja': 'ドイツ', 'ru': 'Германия'
    },
    'Italy': { 
      'es': 'Italia', 'en': 'Italy', 'de': 'Italien', 'fr': 'Italie', 'it': 'Italia',
      'pt': 'Itália', 'nl': 'Italië', 'tr': 'İtalya', 'ja': 'イタリア', 'ru': 'Италия'
    },
    'Portugal': { 
      'es': 'Portugal', 'en': 'Portugal', 'de': 'Portugal', 'fr': 'Portugal', 'it': 'Portogallo',
      'pt': 'Portugal', 'nl': 'Portugal', 'tr': 'Portekiz', 'ja': 'ポルトガル', 'ru': 'Португалия'
    },
    'Switzerland': { 
      'es': 'Suiza', 'en': 'Switzerland', 'de': 'Schweiz', 'fr': 'Suisse', 'it': 'Svizzera',
      'pt': 'Suíça', 'nl': 'Zwitserland', 'tr': 'İsviçre', 'ja': 'スイス', 'ru': 'Швейцария'
    },
    'Austria': { 
      'es': 'Austria', 'en': 'Austria', 'de': 'Österreich', 'fr': 'Autriche', 'it': 'Austria',
      'pt': 'Áustria', 'nl': 'Oostenrijk', 'tr': 'Avusturya', 'ja': 'オーストリア', 'ru': 'Австрия'
    },
    'Belgium': { 
      'es': 'Bélgica', 'en': 'Belgium', 'de': 'Belgien', 'fr': 'Belgique', 'it': 'Belgio',
      'pt': 'Bélgica', 'nl': 'België', 'tr': 'Belçika', 'ja': 'ベルギー', 'ru': 'Бельгия'
    },
    'Netherlands': { 
      'es': 'Países Bajos', 'en': 'Netherlands', 'de': 'Niederlande', 'fr': 'Pays-Bas', 'it': 'Paesi Bassi',
      'pt': 'Países Baixos', 'nl': 'Nederland', 'tr': 'Hollanda', 'ja': 'オランダ', 'ru': 'Нидерланды'
    },
    'United Kingdom': { 
      'es': 'Reino Unido', 'en': 'United Kingdom', 'de': 'Vereinigtes Königreich', 'fr': 'Royaume-Uni', 'it': 'Regno Unito',
      'pt': 'Reino Unido', 'nl': 'Verenigd Koninkrijk', 'tr': 'Birleşik Krallık', 'ja': 'イギリス', 'ru': 'Великобритания'
    },
    'Turkey': { 
      'es': 'Turquía', 'en': 'Turkey', 'de': 'Türkei', 'fr': 'Turquie', 'it': 'Turchia',
      'pt': 'Turquia', 'nl': 'Turkije', 'tr': 'Türkiye', 'ja': 'トルコ', 'ru': 'Турция'
    },
    'Brazil': { 
      'es': 'Brasil', 'en': 'Brazil', 'de': 'Brasilien', 'fr': 'Brésil', 'it': 'Brasile',
      'pt': 'Brasil', 'nl': 'Brazilië', 'tr': 'Brezilya', 'ja': 'ブラジル', 'ru': 'Бразилия'
    },
    'Canada': { 
      'es': 'Canadá', 'en': 'Canada', 'de': 'Kanada', 'fr': 'Canada', 'it': 'Canada',
      'pt': 'Canadá', 'nl': 'Canada', 'tr': 'Kanada', 'ja': 'カナダ', 'ru': 'Канада'
    },
    'Japan': { 
      'es': 'Japón', 'en': 'Japan', 'de': 'Japan', 'fr': 'Japon', 'it': 'Giappone',
      'pt': 'Japão', 'nl': 'Japan', 'tr': 'Japonya', 'ja': '日本', 'ru': 'Япония'
    },
    'Russia': { 
      'es': 'Rusia', 'en': 'Russia', 'de': 'Russland', 'fr': 'Russie', 'it': 'Russia',
      'pt': 'Rússia', 'nl': 'Rusland', 'tr': 'Rusya', 'ja': 'ロシア', 'ru': 'Россия'
    }
  };

  // Try to find exact match first
  for (const [key, translations] of Object.entries(countryMappings)) {
    if (key.toLowerCase() === country.toLowerCase()) {
      return translations[language] || translations['es'] || country;
    }
  }

  // Return original country name if no mapping found
  return country;
};

// Replace country names in specific questions
const replaceCountryInQuestion = async (question: string, language: string, coordinates?: { latitude: number, longitude: number }): Promise<string> => {
  if (!coordinates) {
    return question; // Return original question if no coordinates
  }

  try {
    // Detect current country
    const detectedCountry = await detectCountryFromCoordinates(coordinates.latitude, coordinates.longitude);
    const localizedCountry = getLocalizedCountryName(detectedCountry, language);
    
    // All possible country patterns that could appear in questions (multilingual)
    const countryPatterns = [
      // Spanish
      /Francia/gi, /España/gi, /Italia/gi, /Alemania/gi, /Portugal/gi, /Brasil/gi, /Austria/gi, /Suiza/gi, /Bélgica/gi, /Canadá/gi,
      // English  
      /France/gi, /Spain/gi, /Italy/gi, /Germany/gi, /Portugal/gi, /Brazil/gi, /Austria/gi, /Switzerland/gi, /Belgium/gi, /Canada/gi, /UK/gi, /United Kingdom/gi,
      // German
      /Frankreich/gi, /Spanien/gi, /Italien/gi, /Deutschland/gi, /Österreich/gi, /Schweiz/gi, /Belgien/gi,
      // French
      /Espagne/gi, /Italie/gi, /Allemagne/gi, /Autriche/gi, /Suisse/gi, /Belgique/gi,
      // Italian
      /Spagna/gi, /Francia/gi, /Germania/gi, /Svizzera/gi, /Austria/gi, /Belgio/gi,
      // Portuguese
      /Espanha/gi, /França/gi, /Alemanha/gi, /Itália/gi, /Áustria/gi, /Suíça/gi, /Bélgica/gi,
      // Dutch
      /Frankrijk/gi, /Spanje/gi, /Italië/gi, /Duitsland/gi, /Oostenrijk/gi, /Zwitserland/gi, /België/gi, /Nederland/gi,
      // Turkish
      /Fransa/gi, /İspanya/gi, /İtalya/gi, /Almanya/gi, /Avusturya/gi, /İsviçre/gi, /Belçika/gi, /Türkiye/gi,
      // Japanese
      /フランス/gi, /スペイン/gi, /イタリア/gi, /ドイツ/gi, /オーストリア/gi, /スイス/gi, /ベルギー/gi, /日本/gi, /韓国/gi,
      // Russian
      /Франция/gi, /Испания/gi, /Италия/gi, /Германия/gi, /Австрия/gi, /Швейцария/gi, /Бельгия/gi, /Россия/gi, /Казахстан/gi
    ];

    // Check if question contains any country name
    const hasCountryMention = countryPatterns.some(pattern => pattern.test(question));
    
    if (!hasCountryMention) {
      return question; // Return original question if no country mention
    }
    
    // Replace any country mention with the detected one
    let updatedQuestion = question;
    console.log('🔄 Original question:', question);
    console.log('🔄 Localized country to replace with:', localizedCountry);
    
    countryPatterns.forEach(pattern => {
      if (pattern.test(question)) {
        console.log('🔄 Found pattern to replace:', pattern);
        updatedQuestion = updatedQuestion.replace(pattern, localizedCountry);
      }
    });
    
    console.log('🔄 Updated question:', updatedQuestion);
    return updatedQuestion;
  } catch (error) {
    console.warn('Error replacing country in question:', error);
    return question; // Return original on error
  }
};

/**
 * Get random questions for the chatbot widget based on the current language
 * @param language Current language
 * @param count Number of questions to return (default: 3)
 * @param coordinates Optional coordinates for location-based questions
 * @returns Array of random questions
 */
export async function getRandomQuestions(language: string, count: number = 3, coordinates?: { latitude: number, longitude: number }): Promise<string[]> {
  // Use English as fallback if language not found
  const targetLanguage = questionsMap[language] ? language : 'en';
  
  const questionData = loadQuestions(targetLanguage);
  const questions = questionData.questions || [];
  
  if (questions.length === 0) {
    console.warn(`No questions found for language: ${targetLanguage}`);
    return [];
  }
  
  // If we have fewer questions than requested, return all available
  const selectedQuestions = questions.length <= count 
    ? [...questions] 
    : [...questions].sort(() => Math.random() - 0.5).slice(0, count);
  
  // Process questions to replace country names if coordinates provided
  const processedQuestions = await Promise.all(
    selectedQuestions.map(question => replaceCountryInQuestion(question, language, coordinates))
  );
  
  return processedQuestions;
}

/**
 * Get all questions for a specific language
 * @param language Target language
 * @returns Array of all questions for the language
 */
export function getAllQuestions(language: string): string[] {
  const targetLanguage = questionsMap[language] ? language : 'en';
  const questionData = loadQuestions(targetLanguage);
  return questionData.questions || [];
}

/**
 * Get a single random question for the chatbot widget
 * @param language Current language
 * @param coordinates Optional coordinates for location-based questions
 * @returns Single random question
 */
export async function getRandomQuestion(language: string, coordinates?: { latitude: number, longitude: number }): Promise<string> {
  const questions = await getRandomQuestions(language, 1, coordinates);
  return questions[0] || '';
}

/**
 * Check if a language is supported by the chatbot widget
 * @param language Language to check
 * @returns True if supported, false otherwise
 */
export function isLanguageSupported(language: string): boolean {
  return !!questionsMap[language];
}

/**
 * Get the fallback language (English) questions
 * @returns Array of English questions
 */
export function getFallbackQuestions(): string[] {
  const questionData = loadQuestions('en');
  return questionData.questions || [];
}

/**
 * Get questions count for a specific language
 * @param language Target language
 * @returns Number of available questions
 */
export function getQuestionsCount(language: string): number {
  const targetLanguage = questionsMap[language] ? language : 'en';
  const questionData = loadQuestions(targetLanguage);
  return questionData.questions?.length || 0;
}

// Export the service as default
const ChatbotWidgetService = {
  getRandomQuestions,
  getAllQuestions,
  getRandomQuestion,
  isLanguageSupported,
  getFallbackQuestions,
  getQuestionsCount,
  SUPPORTED_WIDGET_LANGUAGES,
};

export default ChatbotWidgetService;