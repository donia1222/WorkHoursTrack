import Constants from 'expo-constants';

export type AIProvider = 'openai' | 'google' | 'none';

export interface AIProviderStatus {
  provider: AIProvider;
  hasOpenAI: boolean;
  hasGemini: boolean;
  primaryProvider: AIProvider;
  fallbackProvider: AIProvider;
  reason: string;
}

/**
 * Servicio para detectar automáticamente qué proveedor de IA usar
 * basándose en las API keys disponibles en las variables de entorno
 */
export class AIProviderDetector {
  private static instance: AIProviderDetector;
  private cachedStatus: AIProviderStatus | null = null;

  private constructor() {}

  static getInstance(): AIProviderDetector {
    if (!AIProviderDetector.instance) {
      AIProviderDetector.instance = new AIProviderDetector();
    }
    return AIProviderDetector.instance;
  }

  /**
   * Detecta qué proveedores de IA están disponibles
   */
  detectAvailableProviders(): AIProviderStatus {
    // Si ya tenemos el resultado en caché, lo devolvemos
    if (this.cachedStatus) {
      return this.cachedStatus;
    }

    // Verificar qué API keys están disponibles
    const openAIKey = Constants.expoConfig?.extra?.openaiApiKey ||
                      process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    const geminiKey = Constants.expoConfig?.extra?.googleGeminiApiKey ||
                      process.env.EXPO_PUBLIC_GOOGLE_GEMINI_API_KEY;

    const hasOpenAI = !!openAIKey && openAIKey.length > 0 && openAIKey !== 'your-openai-api-key';
    const hasGemini = !!geminiKey && geminiKey.length > 0 && geminiKey !== 'your-gemini-api-key';

    console.log('🔍 [AI-DETECTOR] Estado de APIs:', {
      hasOpenAI,
      hasGemini,
      openAIKeyLength: openAIKey?.length || 0,
      geminiKeyLength: geminiKey?.length || 0,
    });

    let status: AIProviderStatus;

    // Lógica de selección
    if (hasOpenAI && hasGemini) {
      // Ambas disponibles: OpenAI primario, Gemini fallback
      status = {
        provider: 'openai',
        hasOpenAI: true,
        hasGemini: true,
        primaryProvider: 'openai',
        fallbackProvider: 'google',
        reason: 'Ambas APIs disponibles. OpenAI como primaria, Gemini como respaldo.',
      };
    } else if (hasOpenAI && !hasGemini) {
      // Solo OpenAI disponible
      status = {
        provider: 'openai',
        hasOpenAI: true,
        hasGemini: false,
        primaryProvider: 'openai',
        fallbackProvider: 'none',
        reason: 'Solo OpenAI API disponible.',
      };
    } else if (!hasOpenAI && hasGemini) {
      // Solo Gemini disponible
      status = {
        provider: 'google',
        hasOpenAI: false,
        hasGemini: true,
        primaryProvider: 'google',
        fallbackProvider: 'none',
        reason: 'Solo Google Gemini API disponible.',
      };
    } else {
      // Ninguna API disponible
      status = {
        provider: 'none',
        hasOpenAI: false,
        hasGemini: false,
        primaryProvider: 'none',
        fallbackProvider: 'none',
        reason: 'No se encontraron API keys válidas. Configure EXPO_PUBLIC_OPENAI_API_KEY o EXPO_PUBLIC_GOOGLE_GEMINI_API_KEY.',
      };
    }

    // Cachear el resultado
    this.cachedStatus = status;

    console.log('✅ [AI-DETECTOR] Configuración detectada:', status);
    return status;
  }

  /**
   * Obtiene el proveedor primario recomendado
   */
  getPrimaryProvider(): AIProvider {
    const status = this.detectAvailableProviders();
    return status.primaryProvider;
  }

  /**
   * Obtiene el proveedor de respaldo
   */
  getFallbackProvider(): AIProvider {
    const status = this.detectAvailableProviders();
    return status.fallbackProvider;
  }

  /**
   * Verifica si hay al menos un proveedor disponible
   */
  hasAnyProvider(): boolean {
    const status = this.detectAvailableProviders();
    return status.hasOpenAI || status.hasGemini;
  }

  /**
   * Reinicia la caché (útil para recargar configuración)
   */
  clearCache(): void {
    this.cachedStatus = null;
    console.log('🔄 [AI-DETECTOR] Caché limpiada');
  }

  /**
   * Obtiene un mensaje descriptivo del estado actual
   */
  getStatusMessage(): string {
    const status = this.detectAvailableProviders();
    return status.reason;
  }
}

// Exportar instancia singleton
export const aiProviderDetector = AIProviderDetector.getInstance();