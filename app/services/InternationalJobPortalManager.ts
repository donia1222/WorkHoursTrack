// Import as require to avoid JSON module issues
const jobPortalsConfig = require('./InternationalJobPortals.json');
import { SupportedLanguage } from '../contexts/LanguageContext';

export interface JobPortal {
  name: string;
  url: string;
  type: 'Global' | 'Local';
  usesDomain?: boolean;
}

export interface CountryData {
  name: string;
  portals: JobPortal[];
}

export interface JobPortalsConfig {
  global: JobPortal[];
  countries: { [key: string]: CountryData };
  indeedDomains: { [key: string]: string };
  jobTranslations: { [key: string]: { [key: string]: string } };
}

export class InternationalJobPortalManager {
  private static config: JobPortalsConfig = jobPortalsConfig.portals;

  // Traducciones para diferentes idiomas
  private static translations = {
    'es': {
      viewOffers: 'Ver ofertas de',
      explore: 'Explorar',
      portalLocal: 'Portal local de empleo',
      portalInternacional: 'Portal internacional de empleo',
      salariesAvailable: 'Ver salarios disponibles',
      realTimeSearch: 'Búsqueda en tiempo real',
      jobDescription: 'Trabajo estable con excelente ambiente laboral y buenas prestaciones.',
      daysAgo: 'Hace',
      day: 'día',
      days: 'días'
    },
    'en': {
      viewOffers: 'View offers for',
      explore: 'Explore',
      portalLocal: 'Local job portal',
      portalInternacional: 'International job portal',
      salariesAvailable: 'View available salaries',
      realTimeSearch: 'Real-time search',
      jobDescription: 'Stable job with excellent work environment and good benefits.',
      daysAgo: '',
      day: 'day ago',
      days: 'days ago'
    },
    'de': {
      viewOffers: 'Stellenangebote für',
      explore: 'Erkunden',
      portalLocal: 'Lokales Jobportal',
      portalInternacional: 'Internationales Jobportal',
      salariesAvailable: 'Gehälter anzeigen',
      realTimeSearch: 'Echtzeitsuche',
      jobDescription: 'Stabiler Arbeitsplatz mit ausgezeichnetem Arbeitsumfeld und guten Leistungen.',
      daysAgo: 'Vor',
      day: 'Tag',
      days: 'Tagen'
    },
    'fr': {
      viewOffers: 'Voir les offres pour',
      explore: 'Explorer',
      portalLocal: 'Portail d\'emploi local',
      portalInternacional: 'Portail d\'emploi international',
      salariesAvailable: 'Voir les salaires disponibles',
      realTimeSearch: 'Recherche en temps réel',
      jobDescription: 'Emploi stable avec excellent environnement de travail et bons avantages.',
      daysAgo: 'Il y a',
      day: 'jour',
      days: 'jours'
    },
    'it': {
      viewOffers: 'Vedi offerte per',
      explore: 'Esplora',
      portalLocal: 'Portale di lavoro locale',
      portalInternacional: 'Portale di lavoro internazionale',
      salariesAvailable: 'Visualizza stipendi disponibili',
      realTimeSearch: 'Ricerca in tempo reale',
      jobDescription: 'Lavoro stabile con ottimo ambiente lavorativo e buoni benefici.',
      daysAgo: 'Fa',
      day: 'giorno',
      days: 'giorni'
    },
    'pt': {
      viewOffers: 'Ver ofertas para',
      explore: 'Explorar',
      portalLocal: 'Portal de emprego local',
      portalInternacional: 'Portal de emprego internacional',
      salariesAvailable: 'Ver salários disponíveis',
      realTimeSearch: 'Busca em tempo real',
      jobDescription: 'Trabalho estável com excelente ambiente de trabalho e bons benefícios.',
      daysAgo: 'Há',
      day: 'dia',
      days: 'dias'
    },
    'nl': {
      viewOffers: 'Bekijk aanbiedingen voor',
      explore: 'Verkennen',
      portalLocal: 'Lokaal vacatureportaal',
      portalInternacional: 'Internationaal vacatureportaal',
      salariesAvailable: 'Beschikbare salarissen bekijken',
      realTimeSearch: 'Realtime zoeken',
      jobDescription: 'Stabiele baan met uitstekende werkomgeving en goede voordelen.',
      daysAgo: 'Geleden',
      day: 'dag',
      days: 'dagen'
    },
    'tr': {
      viewOffers: 'Teklifler için',
      explore: 'Keşfet',
      portalLocal: 'Yerel iş portalı',
      portalInternacional: 'Uluslararası iş portalı',
      salariesAvailable: 'Mevcut maaşları görüntüle',
      realTimeSearch: 'Gerçek zamanlı arama',
      jobDescription: 'Mükemmel çalışma ortamı ve iyi faydalarla istikrarlı iş.',
      daysAgo: 'Önce',
      day: 'gün',
      days: 'gün'
    },
    'ja': {
      viewOffers: 'オファーを見る',
      explore: '探索',
      portalLocal: 'ローカル求人ポータル',
      portalInternacional: '国際求人ポータル',
      salariesAvailable: '利用可能な給与を表示',
      realTimeSearch: 'リアルタイム検索',
      jobDescription: '優れた労働環境と良好な福利厚生を持つ安定した仕事。',
      daysAgo: '前',
      day: '日',
      days: '日'
    },
    'ru': {
      viewOffers: 'Посмотреть предложения для',
      explore: 'Исследовать',
      portalLocal: 'Локальный портал вакансий',
      portalInternacional: 'Международный портал вакансий',
      salariesAvailable: 'Посмотреть доступные зарплаты',
      realTimeSearch: 'Поиск в реальном времени',
      jobDescription: 'Стабильная работа с отличной рабочей средой и хорошими льготами.',
      daysAgo: 'Назад',
      day: 'день',
      days: 'дней'
    }
  };

  /**
   * Get translations for a specific language
   */
  private static getTranslations(language: SupportedLanguage) {
    return this.translations[language] || this.translations['es']; // fallback to Spanish
  }

  /**
   * Get all portals for a specific country
   */
  static getPortalsForCountry(countryCode: string, country: string): JobPortal[] {
    const portals: JobPortal[] = [];
    
    // Add global portals first
    this.config.global.forEach(portal => {
      if (portal.usesDomain) {
        // Use Indeed with correct domain
        const domain = this.getIndeedDomain(countryCode);
        portals.push({
          ...portal,
          url: portal.url.replace('{domain}', domain)
        });
      } else {
        portals.push(portal);
      }
    });

    // Add country-specific portals
    const countryPortals = this.config.countries[countryCode.toUpperCase()];
    if (countryPortals && countryPortals.portals) {
      portals.push(...countryPortals.portals);
    }

    return portals;
  }

  /**
   * Get Indeed domain for country
   */
  static getIndeedDomain(countryCode: string): string {
    return this.config.indeedDomains[countryCode.toUpperCase()] || 'www.indeed.com';
  }

  /**
   * Get localized job term for country
   */
  static getLocalizedJobTerm(jobTerm: string, countryCode: string): string {
    // Clean the job term to extract just the job type
    const cleanJobTerm = jobTerm.toLowerCase()
      .replace(/en\s+\w+/g, '') // Remove "en [country]" 
      .replace(/de\s+\w+/g, '') // Remove "de [country]"
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`🔍 [LOCALIZE-TERM] Original: "${jobTerm}" -> Clean: "${cleanJobTerm}" for country: ${countryCode}`);
    
    const translations = this.config.jobTranslations;
    const termLower = cleanJobTerm;
    
    for (const [spanish, trans] of Object.entries(translations)) {
      if (termLower.includes(spanish)) {
        const translationMap = trans as { [key: string]: string };
        const localized = translationMap[countryCode.toUpperCase()] || translationMap['GB'] || jobTerm;
        console.log(`✅ [LOCALIZE-TERM] Found translation: "${spanish}" -> "${localized}" for ${countryCode}`);
        return localized;
      }
    }
    
    console.log(`⚠️ [LOCALIZE-TERM] No translation found for "${cleanJobTerm}", using original term`);
    return cleanJobTerm;
  }

  /**
   * Get country name
   */
  static getCountryName(countryCode: string): string {
    const country = this.config.countries[countryCode.toUpperCase()];
    return country?.name || countryCode;
  }

  /**
   * Get all supported countries
   */
  static getSupportedCountries(): { code: string; name: string }[] {
    return Object.entries(this.config.countries).map(([code, data]: [string, CountryData]) => ({
      code,
      name: data.name
    }));
  }

  /**
   * Check if country is supported
   */
  static isCountrySupported(countryCode: string): boolean {
    return !!this.config.countries[countryCode.toUpperCase()];
  }

  /**
   * Generate search URLs for all portals in a country
   */
  static generateSearchLinks(jobTerm: string, countryCode: string, country: string, language: SupportedLanguage = 'es'): any[] {
    const portals = this.getPortalsForCountry(countryCode, country);
    const localizedTerm = this.getLocalizedJobTerm(jobTerm, countryCode);
    const offers: any[] = [];
    const t = this.getTranslations(language);

    console.log(`🔗 [PORTAL-LINKS] Generando ${portals.length} enlaces para "${jobTerm}" en ${country} (${countryCode})`);
    
    portals.forEach((portal, index) => {
      const searchUrl = portal.url
        .replace('{query}', encodeURIComponent(localizedTerm))
        .replace('{country}', encodeURIComponent(country));
      
      console.log(`🔗 Portal ${index + 1}: ${portal.name} -> ${searchUrl}`);
      
      offers.push({
        company: portal.name,
        position: `🔍 ${t.viewOffers} "${jobTerm}"`,
        location: country,
        description: `${t.explore} ${jobTerm} en ${portal.name} - ${portal.type === 'Local' ? t.portalLocal : t.portalInternacional}`,
        salary: t.salariesAvailable,
        url: searchUrl,
        source: portal.type,
        posted: t.realTimeSearch
      });
    });

    console.log(`✅ [PORTAL-LINKS] Total generado: ${offers.length} enlaces reales`);
    return offers;
  }

  /**
   * Add simulated realistic offers for better user experience
   */
  static addSimulatedOffers(jobTerm: string, countryCode: string, country: string, count: number = 4, language: SupportedLanguage = 'es'): any[] {
    const offers: any[] = [];
    const companies = this.getCompaniesForCountry(countryCode);
    const locations = this.getLocationsForCountry(countryCode, country);
    const localizedTerm = this.getLocalizedJobTerm(jobTerm, countryCode);
    const t = this.getTranslations(language);
    
    for (let i = 0; i < count; i++) {
      const company = companies[Math.floor(Math.random() * companies.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const salary = this.generateSalaryForCountry(countryCode);
      const daysAgo = Math.floor(Math.random() * 14) + 1;
      const jobPosition = this.generateJobPosition(jobTerm, countryCode);
      
      // Generate better working URLs for specific portals
      let workingUrl = '';
      const randomPortal = Math.random();
      
      if (countryCode.toUpperCase() === 'CH') {
        if (randomPortal < 0.33) {
          workingUrl = `https://www.jobs.ch/de/stellenangebote/?term=${encodeURIComponent(localizedTerm)}`;
        } else if (randomPortal < 0.66) {
          workingUrl = `https://www.stepstone.ch/stellenangebote--${encodeURIComponent(localizedTerm.replace(/\s+/g, '-'))}-k`;
        } else {
          workingUrl = `https://ch.indeed.com/jobs?q=${encodeURIComponent(localizedTerm)}`;
        }
      } else {
        workingUrl = `https://${this.getIndeedDomain(countryCode)}/jobs?q=${encodeURIComponent(localizedTerm)}`;
      }
      
      // Format the posted time based on language
      let postedText = '';
      if (language === 'en') {
        postedText = `${daysAgo} ${daysAgo > 1 ? t.days : t.day}`;
      } else if (language === 'de') {
        postedText = `${t.daysAgo} ${daysAgo} ${daysAgo > 1 ? t.days : t.day}`;
      } else {
        // Spanish, French, Italian use similar pattern
        postedText = `${t.daysAgo} ${daysAgo} ${daysAgo > 1 ? t.days : t.day}`;
      }

      offers.push({
        company: company,
        position: jobPosition,
        location: location,
        description: `${jobPosition} en ${company}. ${t.jobDescription}`,
        salary: salary,
        url: workingUrl,
        source: 'Empresa',
        posted: postedText
      });
    }
    
    return offers;
  }

  /**
   * Get companies for country
   */
  private static getCompaniesForCountry(countryCode: string): string[] {
    const companiesMap: { [key: string]: string[] } = {
      'ES': ['Mercadona', 'Inditex', 'Telefónica', 'Santander', 'BBVA', 'Iberdrola', 'Repsol'],
      'DE': ['SAP', 'Volkswagen', 'BMW', 'Siemens', 'Mercedes-Benz', 'Adidas', 'Bayer'],
      'FR': ['Total', 'L\'Oréal', 'LVMH', 'Sanofi', 'Orange', 'BNP Paribas', 'Carrefour'],
      'IT': ['Fiat Chrysler', 'Enel', 'ENI', 'Intesa Sanpaolo', 'UniCredit', 'Generali'],
      'PL': ['PKN Orlen', 'PZU', 'PKO Bank Polski', 'KGHM', 'Orange Polska', 'Allegro'],
      'GB': ['Tesco', 'BP', 'Vodafone', 'HSBC', 'Barclays', 'BT Group', 'Shell'],
      'NL': ['Royal Dutch Shell', 'Unilever', 'ING Group', 'ASML', 'Heineken'],
      'CH': ['Nestlé', 'Novartis', 'Roche', 'UBS', 'Credit Suisse', 'ABB']
    };
    
    return companiesMap[countryCode.toUpperCase()] || ['International Corp', 'Tech Solutions', 'Service Group'];
  }

  /**
   * Get locations for country
   */
  private static getLocationsForCountry(countryCode: string, country: string): string[] {
    const locationsMap: { [key: string]: string[] } = {
      'ES': ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao'],
      'DE': ['Berlin', 'München', 'Hamburg', 'Köln', 'Frankfurt'],
      'FR': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Lille'],
      'IT': ['Roma', 'Milano', 'Napoli', 'Torino', 'Palermo'],
      'PL': ['Warszawa', 'Kraków', 'Łódź', 'Wrocław', 'Poznań'],
      'GB': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'],
      'NL': ['Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven'],
      'CH': ['Zürich', 'Geneva', 'Basel', 'Bern', 'Lausanne']
    };
    
    return locationsMap[countryCode.toUpperCase()] || ['Capital City', 'City Center', 'Downtown'];
  }

  /**
   * Generate salary for country
   */
  private static generateSalaryForCountry(countryCode: string): string {
    const salaryMap: { [key: string]: () => string } = {
      'ES': () => `€${(Math.random() * 20000 + 20000).toFixed(0)}/año`,
      'DE': () => `€${(Math.random() * 30000 + 35000).toFixed(0)}/año`,
      'FR': () => `€${(Math.random() * 25000 + 30000).toFixed(0)}/año`,
      'IT': () => `€${(Math.random() * 20000 + 25000).toFixed(0)}/año`,
      'PL': () => `${(Math.random() * 30000 + 40000).toFixed(0)} PLN/año`,
      'GB': () => `£${(Math.random() * 25000 + 30000).toFixed(0)}/year`,
      'NL': () => `€${(Math.random() * 25000 + 35000).toFixed(0)}/jaar`,
      'CH': () => `CHF ${(Math.random() * 40000 + 60000).toFixed(0)}/Jahr`
    };
    
    return salaryMap[countryCode.toUpperCase()]?.() || 'Competitive salary';
  }

  /**
   * Generate job position variations
   */
  private static generateJobPosition(jobTerm: string, countryCode?: string): string {
    const isGermanSpeaking = ['CH', 'DE', 'AT'].includes(countryCode?.toUpperCase() || '');
    
    const variations: { [key: string]: { es: string[]; de: string[] } } = {
      'camarero': {
        es: ['Jefe de sala', 'Camarero turno completo', 'Camarero de barra', 'Camarero/a', 'Mesero/a'],
        de: ['Serviceleiter', 'Kellner Vollzeit', 'Barkeeper', 'Servicekraft', 'Restaurantfachkraft']
      },
      'programador': {
        es: ['Desarrollador Full Stack', 'Programador Senior', 'Software Engineer', 'Desarrollador Frontend', 'Backend Developer'],
        de: ['Full Stack Entwickler', 'Senior Software Engineer', 'Programmierer', 'Frontend Entwickler', 'Backend Entwickler']
      },
      'cocinero': {
        es: ['Chef de cocina', 'Cocinero de línea', 'Sous Chef', 'Cocinero turno noche', 'Chef ejecutivo'],
        de: ['Küchenchef', 'Koch de Partie', 'Sous Chef', 'Nachtschicht Koch', 'Executive Chef']
      }
    };
    
    for (const [key, positions] of Object.entries(variations)) {
      if (jobTerm.toLowerCase().includes(key)) {
        const positionList = isGermanSpeaking ? positions.de : positions.es;
        return positionList[Math.floor(Math.random() * positionList.length)];
      }
    }
    
    return jobTerm;
  }
}