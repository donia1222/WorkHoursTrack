// Import as require to avoid JSON module issues
const jobPortalsConfig = require('./InternationalJobPortals.json');

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
  static generateSearchLinks(jobTerm: string, countryCode: string, country: string): any[] {
    const portals = this.getPortalsForCountry(countryCode, country);
    const localizedTerm = this.getLocalizedJobTerm(jobTerm, countryCode);
    const offers: any[] = [];

    console.log(`🔗 [PORTAL-LINKS] Generando ${portals.length} enlaces para "${jobTerm}" en ${country} (${countryCode})`);
    
    portals.forEach((portal, index) => {
      const searchUrl = portal.url
        .replace('{query}', encodeURIComponent(localizedTerm))
        .replace('{country}', encodeURIComponent(country));
      
      console.log(`🔗 Portal ${index + 1}: ${portal.name} -> ${searchUrl}`);
      
      offers.push({
        company: portal.name,
        position: `🔍 Ver ofertas de "${jobTerm}"`,
        location: country,
        description: `Explorar ${jobTerm} en ${portal.name} - Portal${portal.type === 'Local' ? ' local' : ' internacional'} de empleo`,
        salary: 'Ver salarios disponibles',
        url: searchUrl,
        source: portal.type,
        posted: 'Búsqueda en tiempo real'
      });
    });

    console.log(`✅ [PORTAL-LINKS] Total generado: ${offers.length} enlaces reales`);
    return offers;
  }

  /**
   * Add simulated realistic offers for better user experience
   */
  static addSimulatedOffers(jobTerm: string, countryCode: string, country: string, count: number = 4): any[] {
    const offers: any[] = [];
    const companies = this.getCompaniesForCountry(countryCode);
    const locations = this.getLocationsForCountry(countryCode, country);
    const localizedTerm = this.getLocalizedJobTerm(jobTerm, countryCode);
    
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
      
      offers.push({
        company: company,
        position: jobPosition,
        location: location,
        description: `${jobPosition} en ${company}. Trabajo estable con excelente ambiente laboral y buenas prestaciones.`,
        salary: salary,
        url: workingUrl,
        source: 'Empresa',
        posted: `Hace ${daysAgo} día${daysAgo > 1 ? 's' : ''}`
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