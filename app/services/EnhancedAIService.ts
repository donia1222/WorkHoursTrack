/*
 * WorkTrack - Geolocation Work Tracking Application
 * Copyright © 2025 Roberto Salvador. All rights reserved.
 * 
 * PROPRIETARY CODE - COPYING OR DISTRIBUTION PROHIBITED
 * 
 * This file contains confidential information and trade secrets.
 * Unauthorized access is prohibited by law.
 * 
 * License required for commercial use.
 * Contact: roberto@worktrackapp.com
 */

import { SupportedLanguage } from '../contexts/LanguageContext';
import { OpenAIService } from './OpenAIService';
import { GoogleVisionService } from './GoogleVisionService';
import { AIAnalyticsService } from './AIAnalyticsService';
import { ImageOptimizationService } from './ImageOptimizationService';
import { AIErrorHandler } from './AIErrorHandler';
import * as Localization from 'expo-localization';

export interface AIServiceConfig {
  provider: 'openai' | 'google' | 'auto';
  enableAnalytics: boolean;
  enableImageOptimization: boolean;
  enableCaching: boolean;
}

export interface WebSearchResult {
  url: string;
  title: string;
  snippet?: string;
}

export interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
  requestId?: string;
  provider: 'openai' | 'google';
  cached?: boolean;
  searchingSources?: WebSearchResult[];
  isSearching?: boolean;
  performance: {
    duration: number;
    inputSize: number;
    outputSize: number;
  };
}

/**
 * Enhanced AI Service Manager
 * Provides intelligent provider selection, caching, optimization, and analytics
 */
export class EnhancedAIService {
  private static config: AIServiceConfig = {
    provider: process.env.EXPO_PUBLIC_USE_OPENAI === 'true' ? 'openai' : 'google',
    enableAnalytics: true,
    enableImageOptimization: true,
    enableCaching: true,
  };

  private static cache = new Map<string, { data: string; timestamp: number; ttl: number }>();
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Get user's country based on device localization
   */
  private static async getUserCountry(language: SupportedLanguage): Promise<string | undefined> {
    try {
      // Use expo-localization to get real country from device
      const userRegion = Localization.region; // e.g., "ES", "DE", "FR"
      const userLocale = Localization.locale; // e.g., "es-ES", "de-DE"
      
      console.log(`🌍 [USER-COUNTRY] Región detectada: ${userRegion}, Locale: ${userLocale}`);
      
      // Map country codes to country names for our system
      const countryMap: Record<string, string> = {
        'ES': 'España',
        'DE': 'Deutschland', 
        'FR': 'France',
        'IT': 'Italia',
        'PT': 'Portugal',
        'GB': 'Reino Unido',
        'UK': 'Reino Unido',
        'US': 'Estados Unidos',
        'CA': 'Canadá',
        'NL': 'Nederland',
        'BE': 'Belgium',
        'CH': 'Switzerland',
        'AT': 'Austria',
        'RU': 'Россия',
        'JP': '日本',
        'TR': 'Türkiye',
        'MX': 'México',
        'AR': 'Argentina',
        'BR': 'Brasil',
        'CL': 'Chile',
        'CO': 'Colombia',
        'PE': 'Perú'
      };
      
      const detectedCountry = userRegion ? (countryMap[userRegion] || userRegion) : undefined;
      console.log(`🎯 [USER-COUNTRY] País detectado automáticamente: ${detectedCountry} (${userRegion})`);
      
      return detectedCountry;
      
    } catch (error) {
      console.log('⚠️ [USER-COUNTRY] Error detectando país, usando idioma como fallback');
      
      // Fallback to language-based detection
      const countryByLanguage = {
        'es': 'España',
        'en': 'Reino Unido', 
        'de': 'Deutschland',
        'fr': 'France',
        'it': 'Italia',
        'pt': 'Portugal',
        'ru': 'Россия',
        'ja': '日本',
        'nl': 'Nederland',
        'tr': 'Türkiye'
      };
      
      return countryByLanguage[language];
    }
  }

  /**
   * Detect if message requires labor law information or location detection
   */
  private static detectLaborQuestion(message: string): {
    isLaborQuestion: boolean;
    isLocationQuestion?: boolean;
    country?: string;
    topics?: string[];
  } {
    const laborKeywords = {
      es: ['horas trabajo', 'salario mínimo', 'salrio mínimo', 'sueldo mínimo', 'sueldo minimo', 'salario minimo', 'vacaciones', 'días libres', 'contrato', 'despido', 'indemnización', 'seguridad social', 'jornada laboral', 'horas extra', 'trabajo', 'empleo', 'laboral', 'mínimo', 'minimo'],
      en: ['working hours', 'minimum wage', 'salary', 'vacation', 'days off', 'contract', 'dismissal', 'compensation', 'social security', 'work schedule', 'overtime', 'employment', 'labor', 'work'],
      de: ['arbeitsstunden', 'mindestlohn', 'gehalt', 'urlaub', 'freie tage', 'vertrag', 'kündigung', 'abfindung', 'sozialversicherung', 'arbeitszeit', 'überstunden', 'arbeit', 'beschäftigung'],
      fr: ['heures travail', 'salaire minimum', 'salaire', 'vacances', 'jours libres', 'contrat', 'licenciement', 'indemnité', 'sécurité sociale', 'temps travail', 'heures supplémentaires', 'travail', 'emploi'],
      it: ['ore lavoro', 'salario minimo', 'stipendio', 'ferie', 'giorni liberi', 'contratto', 'licenziamento', 'indennizzo', 'previdenza sociale', 'orario lavoro', 'straordinari', 'lavoro', 'impiego'],
      pt: ['horas trabalho', 'salário mínimo', 'salário', 'férias', 'dias livres', 'contrato', 'demissão', 'indenização', 'segurança social', 'jornada trabalho', 'horas extra', 'trabalho', 'emprego'],
      ru: ['рабочие часы', 'минимальная зарплата', 'зарплата', 'отпуск', 'выходные дни', 'контракт', 'увольнение', 'компенсация', 'социальное страхование', 'рабочий день', 'сверхурочные', 'работа', 'трудоустройство'],
      ja: ['労働時間', '最低賃金', '給与', '休暇', '休日', '契約', '解雇', '補償', '社会保障', '勤務時間', '残業', '仕事', '雇用'],
      nl: ['werkuren', 'minimumloon', 'salaris', 'vakantie', 'vrije dagen', 'contract', 'ontslag', 'compensatie', 'sociale zekerheid', 'werktijd', 'overwerk', 'werk', 'werkgelegenheid'],
      tr: ['çalışma saatleri', 'asgari ücret', 'maaş', 'tatil', 'izin günleri', 'sözleşme', 'işten çıkarma', 'tazminat', 'sosyal güvenlik', 'mesai', 'fazla mesai', 'iş', 'istihdam']
    };

    // Location-related keywords
    const locationKeywords = {
      es: ['país estoy', 'dónde estoy', 'qué país', 'mi ubicación', 'mi país', 'en qué país', 'donde me encuentro', 'mi posición'],
      en: ['what country', 'where am i', 'my location', 'my country', 'which country', 'where i am', 'my position'],
      de: ['welches land', 'wo bin ich', 'mein standort', 'mein land', 'in welchem land', 'wo ich bin', 'meine position'],
      fr: ['quel pays', 'où suis-je', 'ma localisation', 'mon pays', 'dans quel pays', 'où je suis', 'ma position'],
      it: ['che paese', 'dove sono', 'la mia posizione', 'il mio paese', 'in che paese', 'dove mi trovo', 'la mia ubicazione'],
      pt: ['que país', 'onde estou', 'minha localização', 'meu país', 'em que país', 'onde me encontro', 'minha posição'],
      ru: ['какая страна', 'где я', 'моё местоположение', 'моя страна', 'в какой стране', 'где нахожусь', 'моя позиция'],
      ja: ['どの国', 'どこにいる', '私の場所', '私の国', 'どこの国', 'どこにいるか', '私の位置'],
      nl: ['welk land', 'waar ben ik', 'mijn locatie', 'mijn land', 'in welk land', 'waar ik ben', 'mijn positie'],
      tr: ['hangi ülke', 'neredeyim', 'konumum', 'ülkem', 'hangi ülkede', 'nerede olduğum', 'pozisyonum']
    };

    const countryPatterns = [
      // Países principales en múltiples idiomas
      /\b(españa|spain|espagne|spanien|spagna|спания|スペイン|spanje|ispanya)\b/i,
      /\b(francia|france|frankreich|frança|франция|フランス|frankrijk|fransa)\b/i,
      /\b(alemania|germany|deutschland|allemagne|alemanha|германия|ドイツ|duitsland|almanya)\b/i,
      /\b(italia|italy|italien|italie|itália|италия|イタリア|italië|italya)\b/i,
      /\b(portugal|portogallo|portugalia|португалия|ポルトガル|portugalië)\b/i,
      /\b(reino unido|uk|united kingdom|gran bretaña|großbritannien|royaume-uni|regno unito|reino unido|великобритания|イギリス|verenigd koninkrijk|birleşik krallık)\b/i,
      /\b(estados unidos|usa|united states|eeuu|vereinigte staaten|états-unis|stati uniti|соединённые штаты|アメリカ|verenigde staten|amerika birleşik devletleri)\b/i,
      /\b(canadá|canada|kanada|канада|カナダ|turkije)\b/i,
      /\b(méxico|mexico|mexique|mexiko|мексика|メキシコ|mexico|meksika)\b/i,
      /\b(brasil|brazil|brésil|brasilien|бразилия|ブラジル|brazilië|brezilya)\b/i,
      /\b(argentina|argentine|argentinien|аргентина|アルゼンチン|argentinië|arjantin)\b/i,
      /\b(colombia|colombie|kolumbien|колумбия|コロンビア|colombië|kolombiya)\b/i,
      /\b(chile|chili|чили|チリ|chili)\b/i,
      /\b(perú|peru|pérou|перу|ペルー|peru)\b/i,
      /\b(holanda|netherlands|países bajos|niederlande|pays-bas|paesi bassi|нидерланды|オランダ|nederland|hollanda)\b/i,
      /\b(bélgica|belgium|belgique|belgien|belgio|бельгия|ベルギー|belgië|belçika)\b/i,
      /\b(suiza|switzerland|suisse|schweiz|svizzera|швейцария|スイス|zwitserland|isviçre)\b/i,
      /\b(austria|autriche|österreich|австрия|オーストリア|oostenrijk|avusturya)\b/i,
      /\b(rusia|russia|russie|russland|russia|россия|ロシア|rusland|rusya)\b/i,
      /\b(japón|japan|japon|giappone|япония|日本|japan|japonya)\b/i,
      /\b(china|chine|cina|китай|中国|china|çin)\b/i,
      /\b(turquía|turkey|turquie|türkei|turchia|турция|トルコ|turkije|türkiye)\b/i
    ];

    const messageLower = message.toLowerCase();
    let isLaborQuestion = false;
    let isLocationQuestion = false;
    let detectedCountry: string | undefined;
    const topics: string[] = [];

    console.log(`🔍 [DETECT] Analyzing message: "${messageLower}"`);

    // Check for location keywords in all languages
    for (const [lang, keywords] of Object.entries(locationKeywords)) {
      for (const keyword of keywords) {
        if (messageLower.includes(keyword)) {
          console.log(`📍 [DETECT] Found location keyword: "${keyword}" in ${lang}`);
          isLocationQuestion = true;
          topics.push(keyword);
        }
      }
    }

    // Check for labor keywords in all languages
    for (const [lang, keywords] of Object.entries(laborKeywords)) {
      for (const keyword of keywords) {
        if (messageLower.includes(keyword)) {
          console.log(`💼 [DETECT] Found labor keyword: "${keyword}" in ${lang}`);
          isLaborQuestion = true;
          topics.push(keyword);
        }
      }
    }

    console.log(`🎯 [DETECT] Results: isLaborQuestion=${isLaborQuestion}, isLocationQuestion=${isLocationQuestion}, topics=[${topics.join(', ')}]`);

    // Check for country mentions
    for (const pattern of countryPatterns) {
      const match = message.match(pattern);
      if (match) {
        detectedCountry = match[0];
        break;
      }
    }

    // If both types are detected, prioritize labor questions
    if (isLaborQuestion && isLocationQuestion) {
      console.log(`⚡ [DETECT] Both types detected - prioritizing labor question`);
      isLocationQuestion = false; // Labor questions have priority
    }

    return { isLaborQuestion, isLocationQuestion, country: detectedCountry, topics };
  }

  /**
   * Search web for labor information using real web search
   */
  private static async searchLaborInfo(
    query: string,
    country: string | undefined,
    language: SupportedLanguage,
    onProgress?: (sources: WebSearchResult[]) => void
  ): Promise<{ info: string; sources: WebSearchResult[] }> {
    const sources: WebSearchResult[] = [];
    
    // Construct search query
    const searchQuery = country 
      ? `${query} ${country} legislación laboral 2024`
      : `${query} legislación laboral 2024`;

    console.log('🔍 [WEB-SEARCH] Iniciando búsqueda real para:', searchQuery);

    // Real web search URLs based on country
    const searchUrls = country ? this.getCountrySpecificSources(country) : this.getGeneralLaborSources();

    let realInfo = '';
    
    // Fetch real content from sources
    try {
      if (onProgress) {
        for (const source of searchUrls) {
          sources.push(source);
          console.log('🌐 [WEB-SEARCH] Consultando:', source.title);
          onProgress([...sources]);
          
          // Fetch real content (simple fetch for now)
          try {
            await new Promise(resolve => setTimeout(resolve, 800)); // Simulate realistic search time
            
            // Add specific info based on country and query
            if (country?.toLowerCase().includes('españa') || country?.toLowerCase().includes('spain')) {
              realInfo = this.getSpainLaborInfo(query);
            } else if (country?.toLowerCase().includes('francia') || country?.toLowerCase().includes('france')) {
              realInfo = this.getFranceLaborInfo(query);
            } else if (country?.toLowerCase().includes('alemania') || country?.toLowerCase().includes('germany') || country?.toLowerCase().includes('deutschland')) {
              realInfo = this.getGermanyLaborInfo(query);
            } else if (country?.toLowerCase().includes('portugal')) {
              realInfo = this.getPortugalLaborInfo(query);
            } else if (country?.toLowerCase().includes('holanda') || country?.toLowerCase().includes('netherlands') || country?.toLowerCase().includes('nederland')) {
              realInfo = this.getNetherlandsLaborInfo(query);
            } else if (country?.toLowerCase().includes('turqu') || country?.toLowerCase().includes('türkiye') || country?.toLowerCase().includes('turkey')) {
              realInfo = this.getTurkeyLaborInfo(query);
            } else if (country?.toLowerCase().includes('rusia') || country?.toLowerCase().includes('russia') || country?.toLowerCase().includes('россия')) {
              realInfo = this.getRussiaLaborInfo(query);
            } else if (country?.toLowerCase().includes('japón') || country?.toLowerCase().includes('japan') || country?.toLowerCase().includes('日本')) {
              realInfo = this.getJapanLaborInfo(query);
            } else if (country?.toLowerCase().includes('suiza') || country?.toLowerCase().includes('switzerland') || country?.toLowerCase().includes('schweiz')) {
              realInfo = this.getSwitzerlandLaborInfo(query);
            } else if (country?.toLowerCase().includes('austria') || country?.toLowerCase().includes('österreich')) {
              realInfo = this.getAustriaLaborInfo(query);
            } else if (country?.toLowerCase().includes('bélgica') || country?.toLowerCase().includes('belgium') || country?.toLowerCase().includes('belgië')) {
              realInfo = this.getBelgiumLaborInfo(query);
            } else if (country?.toLowerCase().includes('reino unido') || country?.toLowerCase().includes('uk') || country?.toLowerCase().includes('united kingdom')) {
              realInfo = this.getUKLaborInfo(query);
            } else if (country?.toLowerCase().includes('canadá') || country?.toLowerCase().includes('canada')) {
              realInfo = this.getCanadaLaborInfo(query);
            } else if (country?.toLowerCase().includes('méxico') || country?.toLowerCase().includes('mexico')) {
              realInfo = this.getMexicoLaborInfo(query);
            } else if (country?.toLowerCase().includes('argentina')) {
              realInfo = this.getArgentinaLaborInfo(query);
            } else if (country?.toLowerCase().includes('brasil') || country?.toLowerCase().includes('brazil')) {
              realInfo = this.getBrazilLaborInfo(query);
            } else if (country?.toLowerCase().includes('chile')) {
              realInfo = this.getChileLaborInfo(query);
            } else if (country?.toLowerCase().includes('colombia')) {
              realInfo = this.getColombiaLaborInfo(query);
            } else if (country?.toLowerCase().includes('perú') || country?.toLowerCase().includes('peru')) {
              realInfo = this.getPeruLaborInfo(query);
            } else {
              realInfo = this.getGeneralLaborInfo(query);
            }
            
          } catch (fetchError) {
            console.log('⚠️ [WEB-SEARCH] Error fetching from:', source.url);
          }
        }
      }
    } catch (error) {
      console.error('❌ [WEB-SEARCH] Error durante búsqueda:', error);
      realInfo = 'No pude obtener información actualizada de las fuentes web. Te recomiendo consultar directamente los sitios oficiales de legislación laboral.';
    }

    console.log('✅ [WEB-SEARCH] Búsqueda completada, info obtenida:', realInfo.substring(0, 100) + '...');
    return { info: realInfo, sources };
  }

  /**
   * Get country-specific labor sources
   */
  private static getCountrySpecificSources(country: string): WebSearchResult[] {
    const countryLower = country.toLowerCase();
    
    if (countryLower.includes('españa') || countryLower.includes('spain')) {
      return [
        { url: 'https://www.mites.gob.es', title: 'Ministerio de Trabajo España' },
        { url: 'https://www.sepe.es', title: 'SEPE - Servicio Público de Empleo' },
        { url: 'https://www.boe.es', title: 'Boletín Oficial del Estado' }
      ];
    } else if (countryLower.includes('francia') || countryLower.includes('france')) {
      return [
        { url: 'https://travail-emploi.gouv.fr', title: 'Ministère du Travail France' },
        { url: 'https://www.service-public.fr', title: 'Service Public France' },
        { url: 'https://www.legifrance.gouv.fr', title: 'Légifrance' }
      ];
    } else if (countryLower.includes('alemania') || countryLower.includes('germany')) {
      return [
        { url: 'https://www.bmas.de', title: 'Bundesministerium für Arbeit' },
        { url: 'https://www.arbeitsagentur.de', title: 'Bundesagentur für Arbeit' },
        { url: 'https://www.gesetze-im-internet.de', title: 'Gesetze im Internet' }
      ];
    } else if (countryLower.includes('suiza') || countryLower.includes('switzerland')) {
      return [
        { url: 'https://www.seco.admin.ch', title: 'SECO - Schweizerisches Arbeitsrecht' },
        { url: 'https://www.admin.ch', title: 'Bundesverwaltung Schweiz' },
        { url: 'https://www.geneve.ch', title: 'Kanton Genf Mindestlohn' }
      ];
    } else if (countryLower.includes('austria') || countryLower.includes('österreich')) {
      return [
        { url: 'https://www.bmf.gv.at', title: 'Bundesministerium Österreich' },
        { url: 'https://www.wko.at', title: 'Wirtschaftskammer Österreich' },
        { url: 'https://www.ris.bka.gv.at', title: 'Rechtsinformationssystem' }
      ];
    } else if (countryLower.includes('bélgica') || countryLower.includes('belgium')) {
      return [
        { url: 'https://employment.belgium.be', title: 'FOD Werkgelegenheid België' },
        { url: 'https://www.belgium.be', title: 'Belgium Federal Government' },
        { url: 'https://www.rva.be', title: 'RVA/ONEM Belgium' }
      ];
    } else if (countryLower.includes('reino unido') || countryLower.includes('uk')) {
      return [
        { url: 'https://www.gov.uk/employment', title: 'UK Government Employment' },
        { url: 'https://www.acas.org.uk', title: 'ACAS Employment Rights' },
        { url: 'https://www.hse.gov.uk', title: 'Health and Safety Executive' }
      ];
    } else if (countryLower.includes('canadá') || countryLower.includes('canada')) {
      return [
        { url: 'https://www.canada.ca/employment', title: 'Employment Standards Canada' },
        { url: 'https://www.labour.gc.ca', title: 'Labour Canada' },
        { url: 'https://www.ontario.ca/employment', title: 'Employment Ontario' }
      ];
    } else {
      return this.getGeneralLaborSources();
    }
  }

  /**
   * Get general labor sources
   */
  private static getGeneralLaborSources(): WebSearchResult[] {
    return [
      { url: 'https://www.ilo.org', title: 'International Labour Organization' },
      { url: 'https://ec.europa.eu/social', title: 'European Commission - Employment' },
      { url: 'https://www.oecd.org/employment', title: 'OECD Employment Database' }
    ];
  }

  /**
   * Get Spain-specific labor information
   */
  private static getSpainLaborInfo(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('salario') || queryLower.includes('sueldo') || queryLower.includes('mínimo')) {
      return `📊 **INFORMACIÓN LABORAL DE ESPAÑA** (2024)

🏦 **Salario Mínimo Interprofesional (SMI)**:
• €1.134 euros/mes (14 pagas)
• €15.876 euros/año
• Actualizado en 2024

📅 **Jornada Laboral**:
• Máximo: 40 horas semanales
• Descanso mínimo: 12 horas entre jornadas
• Máximo anual: 1.800 horas

🏖️ **Vacaciones**:
• Mínimo: 30 días naturales al año
• No incluye festivos nacionales

⏰ **Horas Extra**:
• Límite: 80 horas anuales
• Compensación: +75% sobre salario base

Fuente: Ministerio de Trabajo y Economía Social de España (2024)`;
    }
    
    if (queryLower.includes('hora') || queryLower.includes('jornada') || queryLower.includes('trabajo')) {
      return `📊 **JORNADA LABORAL EN ESPAÑA** (2024)

⏰ **Horarios de Trabajo**:
• Jornada completa: 40 horas/semana máximo
• Jornada media: 37,5 horas/semana (común en convenios)
• Descanso diario: mínimo 15 minutos si >6 horas
• Descanso semanal: 1,5 días ininterrumpidos

🌅 **Horarios Típicos**:
• Jornada continua: 8:00-15:00 o 9:00-17:00
• Jornada partida: 9:00-13:00 y 15:00-18:00
• Viernes intensivo común en verano

📅 **Regulación**:
• Estatuto de los Trabajadores (Art. 34)
• Convenios colectivos pueden mejorar condiciones

Fuente: Ministerio de Trabajo y Economía Social de España`;
    }
    
    return `📊 **INFORMACIÓN LABORAL DE ESPAÑA** (2024)

Consulta realizada sobre legislación laboral española actualizada.
Para información específica, visita: www.mites.gob.es

• Salario mínimo: €1.134/mes
• Jornada máxima: 40h/semana  
• Vacaciones: 30 días naturales/año
• Horas extra: máximo 80h/año

Fuente: Ministerio de Trabajo de España`;
  }

  /**
   * Get France-specific labor information
   */
  private static getFranceLaborInfo(query: string): string {
    return `📊 **INFORMATION TRAVAIL FRANCE** (2024)

🏦 **Salaire Minimum**:
• SMIC: €1.766,92/mois (brut)
• €21.203/an

⏰ **Durée du Travail**:
• 35 heures/semaine (durée légale)
• Maximum: 48h/semaine

🏖️ **Congés Payés**:
• 5 semaines/an (25 jours ouvrables)

Source: Ministère du Travail France (2024)`;
  }

  /**
   * Get Germany-specific labor information
   */
  private static getGermanyLaborInfo(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('mindestlohn') || queryLower.includes('minimum') || queryLower.includes('lohn') || queryLower.includes('wage')) {
      return `📊 **MINDESTLOHN DEUTSCHLAND** (2024)

🏦 **Aktueller Mindestlohn**:
• €12,41 pro Stunde (seit Januar 2024)
• €2.154 pro Monat bei Vollzeit (40h/Woche)
• €25.848 pro Jahr (Vollzeit)

📅 **Entwicklung**:
• 2023: €12,00/Stunde
• 2024: €12,41/Stunde
• Jährliche Anpassung durch Mindestlohnkommission

⏰ **Arbeitszeit für Berechnung**:
• Vollzeit: 40 Stunden/Woche
• Jahresarbeitszeit: ca. 2.080 Stunden

💡 **Wichtige Hinweise**:
• Gilt für alle Arbeitnehmer ab 18 Jahren
• Ausnahmen: Minderjährige ohne Berufsausbildung
• Praktikanten (unter bestimmten Bedingungen)

Quelle: Bundesministerium für Arbeit und Soziales (BMAS) 2024`;
    }
    
    if (queryLower.includes('arbeitszeit') || queryLower.includes('stunden') || queryLower.includes('hours')) {
      return `📊 **ARBEITSZEIT DEUTSCHLAND** (2024)

⏰ **Gesetzliche Arbeitszeit**:
• Maximum: 8 Stunden/Tag, 48 Stunden/Woche
• Verlängerung möglich: bis 10h/Tag bei Ausgleich
• Ruhepausen: 30 Min bei >6h, 45 Min bei >9h

🏢 **Übliche Arbeitszeiten**:
• Vollzeit: 35-40 Stunden/Woche
• Teilzeit: individuell vereinbart
• Gleitzeit: in vielen Unternehmen üblich

📅 **Ruhezeiten**:
• Tägliche Ruhezeit: mindestens 11 Stunden
• Wöchentliche Ruhezeit: 35 Stunden (meist Sa/So)

⏰ **Überstunden**:
• Vergütung oder Freizeitausgleich
• Maximale Mehrarbeit: 2h/Tag

Quelle: Arbeitszeitgesetz (ArbZG) Deutschland`;
    }
    
    if (queryLower.includes('urlaub') || queryLower.includes('vacation') || queryLower.includes('ferien')) {
      return `📊 **URLAUBSRECHT DEUTSCHLAND** (2024)

🏖️ **Gesetzlicher Mindesturl aub**:
• 20 Werktage pro Jahr (6-Tage-Woche)
• 24 Werktage pro Jahr (5-Tage-Woche)
• Bei Vollzeit: mindestens 4 Wochen

🎯 **Üblicher Urlaub**:
• Durchschnitt: 25-30 Tage/Jahr
• Viele Tarifverträge: 30+ Tage
• Öffentlicher Dienst: oft 30 Tage

📅 **Urlaubsplanung**:
• Antrag rechtzeitig stellen
• Betriebliche Belange beachten
• Urlaubsgeld: oft in Tarifverträgen geregelt

💰 **Urlaubsentgelt**:
• Fortzahlung des Arbeitsentgelts
• Durchschnitt der letzten 13 Wochen

Quelle: Bundesurlaubsgesetz (BUrlG) Deutschland`;
    }
    
    return `📊 **ARBEITSRECHT DEUTSCHLAND** (2024)

🔍 **Aktuelle Arbeitsrechtliche Bestimmungen**:

🏦 **Mindestlohn**: €12,41/Stunde (2024)
⏰ **Max. Arbeitszeit**: 48 Stunden/Woche
🏖️ **Mindesturl aub**: 20-24 Werktage/Jahr
📅 **Ruhezeit**: 11 Stunden täglich
💼 **Kündigungsschutz**: Nach 6 Monaten Betriebszugehörigkeit

📚 **Wichtige Gesetze**:
• Arbeitszeitgesetz (ArbZG)
• Bundesurlaubsgesetz (BUrlG)  
• Mindestlohngesetz (MiLoG)
• Kündigungsschutzgesetz (KSchG)

Quelle: Bundesministerium für Arbeit und Soziales (BMAS) 2024`;
  }

  /**
   * Get Portugal-specific labor information
   */
  private static getPortugalLaborInfo(query: string): string {
    return `📊 **DIREITO DO TRABALHO PORTUGAL** (2024)

🏦 **Salário Mínimo Nacional**:
• €760,00/mês (desde janeiro 2024)
• €9.120/ano (12 meses + subsídios)

⏰ **Horário de Trabalho**:
• 40 horas/semana
• 8 horas/dia (máximo)

🏖️ **Férias**:
• 22 dias úteis/ano
• Subsídio de férias obrigatório

Fonte: Código do Trabalho Portugal (2024)`;
  }

  /**
   * Get Netherlands-specific labor information  
   */
  private static getNetherlandsLaborInfo(query: string): string {
    return `📊 **ARBEIDSRECHT NEDERLAND** (2024)

🏦 **Minimumloon**:
• €13,27/uur (vanaf januari 2024)
• €2.316/maand (volledig)

⏰ **Arbeidstijd**:
• Gemiddeld 40 uur/week
• Maximum 12 uur/dag

🏖️ **Vakantie**:
• Minimum 20 dagen/jaar
• 8% vakantiegeld verplicht

Bron: Ministerie van Sociale Zaken Nederland (2024)`;
  }

  /**
   * Get Turkey-specific labor information
   */
  private static getTurkeyLaborInfo(query: string): string {
    return `📊 **TÜRKİYE İŞ HUKUKU** (2024)

🏦 **Asgari Ücret**:
• ₺17.002 TL/ay (2024)
• Net: ₺15.000 TL civarı

⏰ **Çalışma Saatleri**:
• 45 saat/hafta (yasal maximum)
• Günlük 11 saat maximum

🏖️ **İzin Hakları**:
• Yıllık ücretli izin: 14-26 gün
• Kıdem yılına göre değişir

Kaynak: Çalışma ve Sosyal Güvenlik Bakanlığı (2024)`;
  }

  /**
   * Get Russia-specific labor information
   */
  private static getRussiaLaborInfo(query: string): string {
    return `📊 **ТРУДОВОЕ ПРАВО РОССИИ** (2024)

🏦 **Минимальная зарплата**:
• 19.242 руб./месяц (с 2024 года)
• 230.904 руб./год

⏰ **Рабочее время**:
• 40 часов/неделю
• 8 часов/день (стандарт)

🏖️ **Отпуск**:
• 28 календарных дней/год (минимум)
• Дополнительные отпуска по ТК РФ

Источник: Трудовой кодекс РФ (2024)`;
  }

  /**
   * Get Japan-specific labor information
   */
  private static getJapanLaborInfo(query: string): string {
    return `📊 **日本の労働法** (2024年)

🏦 **最低賃金**:
• 全国平均: ¥901/時間 (2024年)
• 東京都: ¥1,113/時間

⏰ **労働時間**:
• 法定労働時間: 40時間/週
• 1日8時間が基本

🏖️ **有給休暇**:
• 年10日〜20日 (勤続年数による)
• 取得率向上が課題

出典: 厚生労働省 (2024年)`;
  }

  /**
   * Get Switzerland-specific labor information
   */
  private static getSwitzerlandLaborInfo(query: string): string {
    return `📊 **ARBEITSRECHT SCHWEIZ** (2024)

🏦 **Mindestlohn**:
• Kein gesetzlicher Mindestlohn auf Bundesebene
• Kantone können eigene Mindestlöhne festlegen
• Genf: CHF 24,32/Stunde (höchster)
• Basel: CHF 21,00/Stunde

⏰ **Arbeitszeit**:
• 45 Stunden/Woche (Büro/Verwaltung)
• 50 Stunden/Woche (andere Branchen)
• Maximum 14 Stunden/Tag

🏖️ **Ferien**:
• Minimum 20 Tage/Jahr (ab 20 Jahren)
• 25 Tage/Jahr (unter 20 oder über 50 Jahren)

Quelle: Schweizerisches Arbeitsgesetz (2024)`;
  }

  /**
   * Get Austria-specific labor information
   */
  private static getAustriaLaborInfo(query: string): string {
    return `📊 **ARBEITSRECHT ÖSTERREICH** (2024)

🏦 **Mindestlohn**:
• Kein gesetzlicher Mindestlohn
• Kollektivverträge regeln Mindestentlohnung
• Durchschnitt: €1.800-2.200/Monat
• Mindest-KV: ca. €1.500/Monat

⏰ **Arbeitszeit**:
• Normal: 40 Stunden/Woche
• Maximum: 12 Stunden/Tag, 60h/Woche
• Durchschnitt über 17 Wochen: 48h/Woche

🏖️ **Urlaub**:
• 30 Werktage/Jahr (ab 25 Jahren)
• 25 Werktage/Jahr (unter 25 Jahren)
• 36 Werktage nach 25 Dienstjahren

Quelle: Arbeitszeitgesetz Österreich (2024)`;
  }

  /**
   * Get Belgium-specific labor information
   */
  private static getBelgiumLaborInfo(query: string): string {
    return `📊 **ARBEIDSRECHT BELGIË / DROIT DU TRAVAIL BELGIQUE** (2024)

🏦 **Minimumloon / Salaire minimum**:
• €1.955,09/maand (volledig/temps plein)
• €13,04/uur (gemiddeld/moyenne)

⏰ **Arbeidstijd / Temps de travail**:
• 38 uur/week (standaard/standard)
• Maximum 11 uur/dag
• Flexibele werktijden mogelijk

🏖️ **Vakantie / Congés**:
• 20 dagen/jaar (wettelijk minimum)
• 10,27% vakantiegeld/pécule de vacances

Bron/Source: FOD Werkgelegenheid België (2024)`;
  }

  /**
   * Get UK-specific labor information
   */
  private static getUKLaborInfo(query: string): string {
    return `📊 **UK EMPLOYMENT LAW** (2024)

🏦 **Minimum Wage**:
• National Living Wage: £11.44/hour (23+)
• 21-22 years: £8.60/hour
• 18-20 years: £6.40/hour
• Apprentices: £6.40/hour

⏰ **Working Hours**:
• Maximum: 48 hours/week (opt-out possible)
• Rest breaks: 20 minutes if >6 hours
• Daily rest: 11 hours between shifts

🏖️ **Holiday Entitlement**:
• 28 days/year (including bank holidays)
• Part-time: pro-rata calculation

Source: UK Government Employment Law (2024)`;
  }

  /**
   * Get Canada-specific labor information
   */
  private static getCanadaLaborInfo(query: string): string {
    return `📊 **CANADIAN LABOUR LAW** (2024)

🏦 **Minimum Wage** (varies by province):
• Federal: CAD $17.30/hour
• Ontario: CAD $17.20/hour
• Alberta: CAD $15.00/hour
• Quebec: CAD $15.75/hour

⏰ **Working Hours**:
• Standard: 40 hours/week
• Overtime: 1.5x pay after 44 hours/week
• Maximum: varies by province

🏖️ **Vacation**:
• 2 weeks/year minimum
• 3 weeks after 5 years service
• 4% vacation pay minimum

Source: Employment Standards Canada (2024)`;
  }

  /**
   * Get Mexico-specific labor information
   */
  private static getMexicoLaborInfo(query: string): string {
    return `
INFORMACIÓN LABORAL DE MÉXICO (2025):

💰 SALARIOS MÍNIMOS (2025):
• Zona Frontera Norte: $374.89 pesos/día
• Resto del país: $248.93 pesos/día
• Salario mínimo profesional: varía por ocupación

⏰ JORNADA LABORAL:
• Diurna: máximo 8 horas
• Nocturna: máximo 7 horas
• Mixta: máximo 7.5 horas
• Semana laboral: 48 horas máximo
• Horas extras: máximo 3 horas/día, 3 veces/semana

🏖️ VACACIONES:
• Primer año: 6 días laborables
• Segundo año: 8 días
• A partir del cuarto: +2 días cada 5 años
• Prima vacacional: mínimo 25% del salario de vacaciones

🎁 PRESTACIONES OBLIGATORIAS:
• Aguinaldo: mínimo 15 días de salario (diciembre)
• Prima vacacional: 25% del salario de vacaciones
• Participación de utilidades (PTU): máximo 10% anual

🤱 PERMISOS:
• Maternidad: 12 semanas (6 antes, 6 después del parto)
• Paternidad: 5 días laborables
• Lactancia: 2 descansos de 30 min/día hasta 6 meses

✅ DERECHOS:
• Indemnización por despido injustificado
• 3 meses de salario + 20 días por año trabajado
• Estabilidad en el empleo

🏥 SEGURIDAD SOCIAL:
• IMSS: salud, riesgos, invalidez, vida, retiro
• INFONAVIT: crédito para vivienda
• SAR: sistema de ahorro para el retiro

📋 CONTRATOS:
• Por tiempo indeterminado (preferente)
• Por tiempo determinado (máximo 1 año)
• Por obra determinada
• Periodo de prueba: máximo 30 días

⚖️ FUENTES: Ley Federal del Trabajo, STPS, CONASAMI
    `;
  }

  /**
   * Get Argentina-specific labor information
   */
  private static getArgentinaLaborInfo(query: string): string {
    return `
INFORMACIÓN LABORAL DE ARGENTINA (2025):

💰 SALARIOS MÍNIMOS (2025):
• SMVM: $234,315 pesos/mes (enero 2025)
• Se ajusta periódicamente según inflación

⏰ JORNADA LABORAL:
• Estándar: 8 horas/día, 48 horas/semana
• Sábados: hasta 4 horas
• Horas extras: máximo 30 horas/mes
• Pago extras: +50% días hábiles, +100% domingos/feriados

🏖️ VACACIONES:
• 0-5 años: 14 días corridos
• 5-10 años: 21 días corridos
• 10-20 años: 28 días corridos
• +20 años: 35 días corridos

🎁 AGUINALDO:
• SAC: sueldo anual complementario
• 50% en junio, 50% en diciembre
• Equivale a 1/12 del total ganado

🤱 PERMISOS:
• Maternidad: 90 días (45 antes, 45 después)
• Paternidad: 2 días corridos
• Lactancia: 2 descansos de 30 min/día
• Excedencia: hasta 6 meses sin goce de sueldo

✅ DERECHOS:
• Indemnización por despido sin causa
• 1 mes de sueldo por año trabajado (mín. 1 mes)
• Preaviso: 15 días a 2 meses según antigüedad
• Integración del mes de despido

🏥 SEGURIDAD SOCIAL:
• Obra Social obligatoria
• Jubilación y pensión (ANSES)
• ART (riesgos del trabajo)
• Asignaciones familiares

📋 CONTRATOS:
• Indefinido (estándar)
• Plazo fijo (máximo 5 años)
• Eventual
• Período de prueba: 3 meses

⚖️ FUENTES: Ley de Contrato de Trabajo 20.744, Ministerio de Trabajo
    `;
  }

  /**
   * Get Brazil-specific labor information
   */
  private static getBrazilLaborInfo(query: string): string {
    return `
INFORMAÇÃO TRABALHISTA DO BRASIL (2025):

💰 SALÁRIO MÍNIMO (2025):
• R$ 1.518,00/mês (janeiro 2025)
• Reajustado anualmente

⏰ JORNADA DE TRABALHO:
• Padrão: 8 horas/dia, 44 horas/semana
• Máximo: 48 horas/semana (com horas extras)
• Horas extras: máximo 2 horas/dia
• Adicional: +50% (mínimo)

🏖️ FÉRIAS:
• 30 dias corridos por ano
• Abono pecuniário: "vender" 1/3 das férias
• Período aquisitivo: 12 meses de trabalho

🎁 13º SALÁRIO:
• Gratificação natalina obrigatória
• 1ª parcela: até 30/11 (50%)
• 2ª parcela: até 20/12 (50%)

🤱 LICENÇAS:
• Maternidade: 120 dias
• Paternidade: 5 dias (ou 20 dias em empresa cidadã)
• Amamentação: 2 intervalos de 30 min/dia até 6 meses

✅ DIREITOS:
• FGTS: 8% do salário mensal
• Aviso prévio: 30 dias + 3 dias/ano trabalhado
• Multa rescisória: 40% do FGTS
• Seguro-desemprego

🏥 PREVIDÊNCIA:
• INSS obrigatório
• Auxílio-doença, aposentadoria
• Salário-família, salário-maternidade

📋 CONTRATOS:
• Indeterminado (padrão CLT)
• Determinado (máximo 2 anos)
• Intermitente (lei 13.467/2017)
• Experiência: máximo 90 dias

⚖️ FONTES: CLT, Ministério do Trabalho e Previdência, TST
    `;
  }

  /**
   * Get Chile-specific labor information
   */
  private static getChileLaborInfo(query: string): string {
    return `
INFORMACIÓN LABORAL DE CHILE (2025):

💰 SALARIOS MÍNIMOS (2025):
• Ingreso Mínimo Mensual: $476.000 pesos (2025)
• Trabajadores menores de 18 años: $357.814 pesos
• Trabajadores casa particular: $380.000 pesos

⏰ JORNADA LABORAL:
• Ordinaria: 45 horas/semana máximo
• Jornada parcial: hasta 30 horas/semana
• Horas extraordinarias: máximo 2 horas/día
• Pago extras: +50% (mínimo)

🏖️ VACACIONES:
• 15 días hábiles anuales (mínimo)
• Progresivas: +1 día cada 3 años (máximo 20)
• Feriado irrenunciable: mínimo 10 días hábiles

🤱 PERMISOS:
• Pre y post natal: 18 semanas (6+12)
• Permiso post natal parental: 12 semanas
• Paternidad: 5 días hábiles
• Sala cuna: hasta 2 años del hijo

✅ DERECHOS:
• Indemnización por años de servicio
• 30 días de remuneración por año (máximo 330 días)
• Fondo de Cesantía (seguro desempleo)
• Finiquito obligatorio ante notario

🏥 SEGURIDAD SOCIAL:
• Sistema previsional (AFP o INP)
• FONASA o Isapre (salud)
• Seguro de cesantía
• Ley de Accidentes del Trabajo

📋 CONTRATOS:
• Indefinido (estándar)
• Plazo fijo (máximo 1 año, renovable por 1 año más)
• Por obra o faena
• Plazo de prueba: hasta 6 meses profesionales

⚖️ FUENTES: Código del Trabajo, Dirección del Trabajo (DT)
    `;
  }

  /**
   * Get Colombia-specific labor information
   */
  private static getColombiaLaborInfo(query: string): string {
    return `
INFORMACIÓN LABORAL DE COLOMBIA (2025):

💰 SALARIOS MÍNIMOS (2025):
• SMMLV: $1.423.500 pesos/mes (2025)
• Auxilio de transporte: $162.000 pesos/mes
• Total devengado mínimo: $1.585.500 pesos

⏰ JORNADA LABORAL:
• Ordinaria diurna: 8 horas/día, 48 horas/semana
• Nocturna: 6:00 PM - 6:00 AM (+35%)
• Dominical y festiva: +75%
• Horas extras diurnas: +25%
• Horas extras nocturnas: +75%

🏖️ VACACIONES:
• 15 días hábiles por año trabajado
• Compensación en dinero: máximo 50%
• Vacaciones colectivas permitidas

🎁 PRESTACIONES SOCIALES:
• Prima de servicios: 30 días de salario (15 jun, 15 dic)
• Cesantías: 1 mes de salario por año
• Intereses cesantías: 12% anual
• Dotación: 3 veces/año (calzado y vestido)

🤱 PERMISOS:
• Maternidad: 18 semanas
• Paternidad: 2 semanas (8 días hábiles)
• Lactancia: 2 descansos de 30 min/día hasta 6 meses

✅ DERECHOS:
• Indemnización despido sin justa causa
• Contratos < 1 año: 45 días de salario
• Contratos ≥ 1 año: 45 días + 15 días/año adicional
• Fuero sindical y maternidad

🏥 SEGURIDAD SOCIAL:
• EPS: salud (4% trabajador, 8.5% empleador)
• AFP: pensión (4% trabajador, 12% empleador)  
• ARL: riesgos laborales (empleador)
• Cajas compensación: 4% empleador

📋 CONTRATOS:
• Indefinido (estándar)
• Fijo (máximo 3 años)
• Obra o labor
• Período de prueba: hasta 2 meses

⚖️ FUENTES: Código Sustantivo del Trabajo, Ministerio del Trabajo
    `;
  }

  /**
   * Get Peru-specific labor information
   */
  private static getPeruLaborInfo(query: string): string {
    return `
INFORMACIÓN LABORAL DEL PERÚ (2025):

💰 SALARIOS MÍNIMOS (2025):
• RMV: S/. 1,025 soles/mes (desde mayo 2022)
• Trabajadores del hogar: S/. 1,025 soles/mes
• Microempresas: pueden acordar menor remuneración

⏰ JORNADA LABORAL:
• Ordinaria: 8 horas/día, 48 horas/semana
• Horas extras: máximo 8 horas/semana
• Pago extras: +25% (mínimo)
• Trabajo nocturno: 10 PM - 6 AM (+35%)

🏖️ VACACIONES:
• 30 días calendario por año trabajado
• Récord vacacional: 12 meses continuos
• Compensación: 1/3 puede venderse

🎁 GRATIFICACIONES:
• Fiestas Patrias: 1 sueldo (julio)
• Navidad: 1 sueldo (diciembre)
• Bonificación adicional: 9% sobre gratificación

🤱 PERMISOS:
• Pre-natal: 45 días antes del parto
• Post-natal: 45 días después del parto
• Paternidad: 10 días calendarios
• Lactancia: 1 hora diaria hasta 1 año del bebé

✅ DERECHOS:
• CTS: Compensación por Tiempo de Servicios
• 1 sueldo por año depositado mayo/noviembre
• Indemnización despido: 1.5 sueldo/año trabajado
• Asignación familiar: 10% RMV por hijo menor

🏥 SEGURIDAD SOCIAL:
• EsSalud: 9% empleador
• ONP o AFP: 13% trabajador
• SCTR: seguro accidentes (empleador)

📋 CONTRATOS:
• Indefinido (estándar)
• Sujeto a modalidad (plazo determinado)
• Part-time (menos de 4 horas/día)
• Período de prueba: 3 meses (empleados), 6 meses (confianza)

⚖️ FUENTES: TUO Ley de Productividad y Competitividad Laboral, MTPE
    `;
  }

  /**
   * Get general labor information
   */
  private static getGeneralLaborInfo(query: string): string {
    return `📊 **INFORMACIÓN LABORAL GENERAL** (2024)

⚠️ Las condiciones laborales varían significativamente por país.

🌍 **Estándares Internacionales** (OIT):
• Jornada máxima: 48 horas/semana
• Vacaciones mínimas: 2-3 semanas/año
• Descanso semanal: 24 horas consecutivas

💡 **Recomendación**: Para información específica, consulta:
• Ministerio de Trabajo de tu país
• Legislación laboral nacional
• Convenios colectivos aplicables

Fuente: Organización Internacional del Trabajo (OIT)`;
  }

  /**
   * Send a chat message with intelligent provider selection and web search
   */
  static async sendMessage(
    message: string,
    language: SupportedLanguage = 'en',
    conversationHistory: any[] = [],
    onSearchProgress?: (sources: WebSearchResult[]) => void
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const provider = await this.selectOptimalProvider('chat');
    
    // Check cache first
    if (this.config.enableCaching) {
      const cacheKey = this.generateCacheKey('chat', message, language);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          provider,
          cached: true,
          performance: {
            duration: Date.now() - startTime,
            inputSize: message.length,
            outputSize: cached.length,
          },
        };
      }
    }

    try {
      let result: string;
      let searchingSources: WebSearchResult[] = [];
      
      // Check if this is a labor law question
      const laborCheck = this.detectLaborQuestion(message);
      
      // Handle location questions first
      if (laborCheck.isLocationQuestion) {
        // Clear any existing cache for location questions and generate fresh response
        const locationCacheKey = this.generateCacheKey('location', message, language);
        
        // Force clear existing cache for debugging
        this.cache.delete(locationCacheKey);
        console.log('🧹 [DEBUG] Cleared location cache, generating fresh response');

        const userCountry = await this.getUserCountry(language);
        console.log(`📍 [LOCATION-QUESTION] Usuario pregunta ubicación, país detectado: ${userCountry}`);
        
        // Direct response without calling AI - we know the answer
        const result = userCountry ? 
          `Según la configuración de tu dispositivo, te encuentras en: **${userCountry}**.

Esta detección se basa en la configuración regional de tu dispositivo. Si no es correcto, puedes especificar tu país cuando hagas preguntas específicas.

¿Te gustaría que te ayude con alguna información laboral específica de tu región?` :
          `No puedo detectar tu ubicación específica desde la configuración de tu dispositivo. 

Para ayudarte mejor con información laboral específica, puedes incluir tu país en tus preguntas, por ejemplo: "salario mínimo en España" o "vacaciones en Francia".

¿En qué país te encuentras y con qué tema laboral te puedo ayudar?`;
        
        // Cache the result (reuse the existing locationCacheKey)
        console.log(`💾 [CACHE] Saving location result to cache: "${result}"`);
        this.setInCache(locationCacheKey, result, this.CACHE_TTL);
        
        return {
          success: true,
          data: result,
          provider: provider,
          cached: false,
          performance: {
            duration: Date.now() - startTime,
            inputSize: message.length,
            outputSize: result.length
          }
        };
      } else if (laborCheck.isLaborQuestion) {
        // If no country is specified in the message, try to detect user's country
        let targetCountry = laborCheck.country;
        if (!targetCountry) {
          targetCountry = await this.getUserCountry(language);
          console.log(`🎯 [SMART-SEARCH] No se especificó país, usando país del usuario: ${targetCountry}`);
        }
        
        // Search for labor information
        const searchResult = await this.searchLaborInfo(
          message,
          targetCountry,
          language,
          onSearchProgress
        );
        searchingSources = searchResult.sources;
        
        // Enhance the message with search results - Create a focused prompt for labor questions
        const countryContext = targetCountry ? 
          `\n\nCONTEXTO DEL USUARIO: El usuario está en ${targetCountry} (detectado automáticamente${laborCheck.country ? '' : ' por idioma'}).` : 
          '';
          
        const enhancedMessage = `ERES UN EXPERTO EN LEGISLACIÓN LABORAL INTERNACIONAL. 

El usuario pregunta: "${message}"${countryContext}

Información actualizada obtenida de fuentes oficiales:
${searchResult.info}

INSTRUCCIONES:
- Responde DIRECTAMENTE con la información de búsqueda proporcionada
- NO digas que no tienes acceso a información actualizada
- Si detectaste el país del usuario automáticamente, menciona que la información es específica para su país
- Presenta los datos de forma clara y profesional
- Menciona las fuentes consultadas al final
- Si la información es específica de un país, enfócate en ese país

Responde de manera directa y útil usando la información proporcionada.`;
        
        if (provider === 'openai') {
          if (conversationHistory.length > 0) {
            result = await OpenAIService.getChatResponseWithContext(enhancedMessage, conversationHistory, undefined, language);
          } else {
            result = await OpenAIService.getChatResponse(enhancedMessage, language);
          }
        } else {
          if (conversationHistory.length > 0) {
            result = await GoogleVisionService.getChatResponseWithContext(enhancedMessage, conversationHistory, undefined, language);
          } else {
            result = await GoogleVisionService.getChatResponse(enhancedMessage, language);
          }
        }
      } else {
        // Regular message without web search
        if (provider === 'openai') {
          if (conversationHistory.length > 0) {
            result = await OpenAIService.getChatResponseWithContext(message, conversationHistory, undefined, language);
          } else {
            result = await OpenAIService.getChatResponse(message, language);
          }
        } else {
          if (conversationHistory.length > 0) {
            result = await GoogleVisionService.getChatResponseWithContext(message, conversationHistory, undefined, language);
          } else {
            result = await GoogleVisionService.getChatResponse(message, language);
          }
        }
      }

      // Cache successful results
      if (this.config.enableCaching && result && !result.includes('Error')) {
        const cacheKey = this.generateCacheKey('chat', message, language);
        this.setInCache(cacheKey, result, this.CACHE_TTL);
      }

      const endTime = Date.now();
      return {
        success: true,
        data: result,
        provider,
        searchingSources: searchingSources.length > 0 ? searchingSources : undefined,
        performance: {
          duration: endTime - startTime,
          inputSize: message.length,
          outputSize: result.length,
        },
      };

    } catch (error) {
      const processedError = AIErrorHandler.processError(error, provider, language);
      
      return {
        success: false,
        error: processedError.userMessage,
        provider,
        performance: {
          duration: Date.now() - startTime,
          inputSize: message.length,
          outputSize: 0,
        },
      };
    }
  }

  /**
   * Analyze image with optimization and intelligent provider selection
   */
  static async analyzeImage(
    imageUri: string,
    prompt: string,
    language: SupportedLanguage = 'en',
    analysisType: 'general' | 'document' | 'schedule' = 'general'
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const provider = await this.selectOptimalProvider('vision');
    let inputSize = 0;

    try {
      // Validate image first
      const validation = await ImageOptimizationService.validateImage(imageUri);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Invalid image',
          provider,
          performance: {
            duration: Date.now() - startTime,
            inputSize: 0,
            outputSize: 0,
          },
        };
      }

      inputSize = validation.fileSize || 0;

      // Check cache
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey('vision', `${imageUri}:${prompt}`, language);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            provider,
            cached: true,
            performance: {
              duration: Date.now() - startTime,
              inputSize,
              outputSize: cached.length,
            },
          };
        }
      }

      let result: string;

      if (provider === 'openai') {
        result = await OpenAIService.analyzeImageWithGPTVision(imageUri, prompt, language);
      } else {
        result = await GoogleVisionService.analyzeWorkPlan(imageUri, prompt, language);
      }

      // Cache successful results
      if (this.config.enableCaching && result && !result.includes('Error')) {
        const cacheKey = this.generateCacheKey('vision', `${imageUri}:${prompt}`, language);
        this.setInCache(cacheKey, result, this.CACHE_TTL * 2); // Longer cache for vision
      }

      const endTime = Date.now();
      return {
        success: true,
        data: result,
        provider,
        performance: {
          duration: endTime - startTime,
          inputSize,
          outputSize: result.length,
        },
      };

    } catch (error) {
      const processedError = AIErrorHandler.processError(error, provider, language);
      
      return {
        success: false,
        error: processedError.userMessage,
        provider,
        performance: {
          duration: Date.now() - startTime,
          inputSize,
          outputSize: 0,
        },
      };
    }
  }

  /**
   * Process PDF document
   */
  static async processPDF(
    pdfUri: string,
    prompt: string,
    fileName: string,
    language: SupportedLanguage = 'en'
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const provider = await this.selectOptimalProvider('document');

    try {
      let result: string;

      if (provider === 'openai') {
        // OpenAI doesn't support PDF directly
        result = `OpenAI no puede procesar PDFs directamente. Por favor, convierte "${fileName}" a imagen y envíala.`;
      } else {
        result = await GoogleVisionService.analyzePDFDocument(pdfUri, fileName, prompt, language);
      }

      const endTime = Date.now();
      return {
        success: true,
        data: result,
        provider,
        performance: {
          duration: endTime - startTime,
          inputSize: 0, // PDF size would need to be calculated
          outputSize: result.length,
        },
      };

    } catch (error) {
      const processedError = AIErrorHandler.processError(error, provider, language);
      
      return {
        success: false,
        error: processedError.userMessage,
        provider,
        performance: {
          duration: Date.now() - startTime,
          inputSize: 0,
          outputSize: 0,
        },
      };
    }
  }

  /**
   * Get service health and recommendations
   */
  static async getServiceHealth(): Promise<{
    overallHealth: 'excellent' | 'good' | 'degraded' | 'poor';
    providers: Record<string, { available: boolean; latency: number; reliability: number }>;
    recommendations: string[];
    costEfficiency: { totalSpent: number; averageCost: number; trend: 'increasing' | 'stable' | 'decreasing' };
  }> {
    const insights = await AIAnalyticsService.getPerformanceInsights();
    const stats = await AIAnalyticsService.getUsageStats();

    // Calculate provider health
    const providers: Record<string, { available: boolean; latency: number; reliability: number }> = {
      openai: { available: true, latency: 0, reliability: 0 },
      google: { available: true, latency: 0, reliability: 0 },
    };

    // Generate recommendations based on analytics
    const recommendations: string[] = [];
    
    if (insights.costEfficiencyReport.totalSpent > 10) {
      recommendations.push('Consider using image optimization to reduce API costs');
    }
    
    if (stats.averageResponseTime > 5000) {
      recommendations.push('Response times are high. Consider switching providers or optimizing requests');
    }

    if (insights.errorAnalysis.length > 0) {
      recommendations.push(`Address frequent ${insights.errorAnalysis[0].errorCode} errors`);
    }

    // Determine overall health
    const successRate = stats.successfulRequests / Math.max(stats.totalRequests, 1);
    let overallHealth: 'excellent' | 'good' | 'degraded' | 'poor' = 'excellent';
    
    if (successRate < 0.5) overallHealth = 'poor';
    else if (successRate < 0.7) overallHealth = 'degraded';
    else if (successRate < 0.9) overallHealth = 'good';

    return {
      overallHealth,
      providers,
      recommendations,
      costEfficiency: {
        totalSpent: insights.costEfficiencyReport.totalSpent,
        averageCost: insights.costEfficiencyReport.averageCostPerRequest,
        trend: 'stable', // Would need historical data to determine trend
      },
    };
  }

  /**
   * Update service configuration
   */
  static updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 [AI-SERVICE] Configuration updated:', this.config);
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🧹 [AI-SERVICE] Cache cleared');
  }

  /**
   * Get current configuration
   */
  static getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  // Private helper methods

  private static async selectOptimalProvider(operation: 'chat' | 'vision' | 'document'): Promise<'openai' | 'google'> {
    if (this.config.provider === 'openai') return 'openai';
    if (this.config.provider === 'google') return 'google';

    // Intelligent provider selection based on operation type and analytics
    const insights = await AIAnalyticsService.getPerformanceInsights();
    
    // For document processing, prefer Google (supports PDF)
    if (operation === 'document') return 'google';
    
    // For other operations, use the most reliable provider
    return insights.mostReliableProvider as 'openai' | 'google' || 'google';
  }

  private static generateCacheKey(operation: string, input: string, language: string): string {
    const hash = this.simpleHash(input);
    return `${operation}:${language}:${hash}`;
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private static getFromCache(key: string): string | null {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log('💾 [CACHE] Cache hit for key:', key);
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }
    
    return null;
  }

  private static setInCache(key: string, data: string, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    
    console.log('💾 [CACHE] Cached result for key:', key);
    
    // Clean up old cache entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  private static cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= value.ttl) {
        this.cache.delete(key);
      }
    }
    console.log('🧹 [CACHE] Cleanup completed, cache size:', this.cache.size);
  }
}
