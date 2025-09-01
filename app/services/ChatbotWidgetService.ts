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
const detectCountryFromCoordinates = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const result = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (result && result.length > 0) {
      const location = result[0];
      return location.country || 'España'; // Default fallback
    }
  } catch (error) {
    console.warn('Error detecting country from coordinates:', error);
  }
  return 'España'; // Default fallback
};

// Map country names to their localized versions
const getLocalizedCountryName = (country: string, language: string): string => {
  const countryMappings: Record<string, Record<string, string>> = {
    'Spain': { 
      'es': 'España', 
      'en': 'Spain', 
      'de': 'Spanien', 
      'fr': 'Espagne', 
      'it': 'Spagna' 
    },
    'France': { 
      'es': 'Francia', 
      'en': 'France', 
      'de': 'Frankreich', 
      'fr': 'France', 
      'it': 'Francia' 
    },
    'Germany': { 
      'es': 'Alemania', 
      'en': 'Germany', 
      'de': 'Deutschland', 
      'fr': 'Allemagne', 
      'it': 'Germania' 
    },
    'Italy': { 
      'es': 'Italia', 
      'en': 'Italy', 
      'de': 'Italien', 
      'fr': 'Italie', 
      'it': 'Italia' 
    },
    'Portugal': { 
      'es': 'Portugal', 
      'en': 'Portugal', 
      'de': 'Portugal', 
      'fr': 'Portugal', 
      'it': 'Portogallo' 
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
  // Only process questions that mention specific countries
  const countryPatterns = [
    { pattern: /Francia/gi, replacement: 'Francia' },
    { pattern: /France/gi, replacement: 'France' },
    { pattern: /España/gi, replacement: 'España' },
    { pattern: /Spain/gi, replacement: 'Spain' },
    { pattern: /Italia/gi, replacement: 'Italia' },
    { pattern: /Italy/gi, replacement: 'Italy' },
    { pattern: /Alemania/gi, replacement: 'Alemania' },
    { pattern: /Germany/gi, replacement: 'Germany' },
  ];

  // Check if question contains any country name
  const hasCountryMention = countryPatterns.some(({ pattern }) => pattern.test(question));
  
  if (!hasCountryMention || !coordinates) {
    return question; // Return original question if no country mention or no coordinates
  }

  try {
    // Detect current country
    const detectedCountry = await detectCountryFromCoordinates(coordinates.latitude, coordinates.longitude);
    const localizedCountry = getLocalizedCountryName(detectedCountry, language);
    
    // Replace any country mention with the detected one
    let updatedQuestion = question;
    countryPatterns.forEach(({ pattern }) => {
      updatedQuestion = updatedQuestion.replace(pattern, localizedCountry);
    });
    
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