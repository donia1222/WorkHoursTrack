import { SupportedLanguage } from '../contexts/LanguageContext';
import { VisionPrompts } from './VisionPrompts';

export interface AIError {
  code: string;
  message: string;
  provider: 'openai' | 'google';
  retryable: boolean;
  userMessage: string;
  suggestedAction?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Comprehensive error handling and retry logic for AI operations
 */
export class AIErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  };

  /**
   * Process and categorize AI API errors
   */
  static processError(error: any, provider: 'openai' | 'google', language: SupportedLanguage = 'en'): AIError {
    console.log('🔍 [ERROR-HANDLER] Processing error:', error);

    // OpenAI specific errors
    if (provider === 'openai') {
      return this.processOpenAIError(error, language);
    }

    // Google/Gemini specific errors
    if (provider === 'google') {
      return this.processGoogleError(error, language);
    }

    // Generic error fallback
    return {
      code: 'UNKNOWN_ERROR',
      message: error?.message || 'Unknown error occurred',
      provider,
      retryable: true,
      userMessage: VisionPrompts.getErrorMessage('processing', language),
    };
  }

  /**
   * Process OpenAI specific errors
   */
  private static processOpenAIError(error: any, language: SupportedLanguage): AIError {
    const errorData = error?.error || error;
    const code = errorData?.code || 'UNKNOWN_OPENAI_ERROR';
    const message = errorData?.message || error?.message || 'OpenAI error';

    const baseError: Partial<AIError> = {
      provider: 'openai',
      code,
      message,
    };

    switch (code) {
      case 'model_not_found':
        return {
          ...baseError,
          code: 'MODEL_DEPRECATED',
          retryable: false,
          userMessage: this.getLocalizedMessage('model_deprecated', language),
          suggestedAction: 'update_model',
        } as AIError;

      case 'insufficient_quota':
      case 'rate_limit_exceeded':
        return {
          ...baseError,
          code: 'RATE_LIMIT',
          retryable: true,
          userMessage: this.getLocalizedMessage('rate_limit', language),
          suggestedAction: 'wait_and_retry',
        } as AIError;

      case 'context_length_exceeded':
        return {
          ...baseError,
          code: 'CONTEXT_TOO_LONG',
          retryable: false,
          userMessage: this.getLocalizedMessage('context_too_long', language),
          suggestedAction: 'reduce_content',
        } as AIError;

      case 'invalid_api_key':
        return {
          ...baseError,
          code: 'INVALID_API_KEY',
          retryable: false,
          userMessage: this.getLocalizedMessage('invalid_api_key', language),
          suggestedAction: 'check_api_key',
        } as AIError;

      case 'server_error':
      case 'service_unavailable':
        return {
          ...baseError,
          code: 'SERVICE_UNAVAILABLE',
          retryable: true,
          userMessage: this.getLocalizedMessage('service_unavailable', language),
          suggestedAction: 'retry_later',
        } as AIError;

      default:
        return {
          ...baseError,
          retryable: true,
          userMessage: this.getLocalizedMessage('openai_error', language),
        } as AIError;
    }
  }

  /**
   * Process Google/Gemini specific errors
   */
  private static processGoogleError(error: any, language: SupportedLanguage): AIError {
    const errorData = error?.error || error;
    const code = errorData?.code || 'UNKNOWN_GOOGLE_ERROR';
    const message = errorData?.message || error?.message || 'Google AI error';

    const baseError: Partial<AIError> = {
      provider: 'google',
      code: code.toString(),
      message,
    };

    // HTTP status code based errors
    if (typeof code === 'number') {
      switch (code) {
        case 400:
          return {
            ...baseError,
            code: 'BAD_REQUEST',
            retryable: false,
            userMessage: this.getLocalizedMessage('bad_request', language),
            suggestedAction: 'check_input',
          } as AIError;

        case 401:
          return {
            ...baseError,
            code: 'UNAUTHORIZED',
            retryable: false,
            userMessage: this.getLocalizedMessage('unauthorized', language),
            suggestedAction: 'check_api_key',
          } as AIError;

        case 403:
          return {
            ...baseError,
            code: 'FORBIDDEN',
            retryable: false,
            userMessage: this.getLocalizedMessage('forbidden', language),
            suggestedAction: 'check_permissions',
          } as AIError;

        case 429:
          return {
            ...baseError,
            code: 'RATE_LIMIT',
            retryable: true,
            userMessage: this.getLocalizedMessage('rate_limit', language),
            suggestedAction: 'wait_and_retry',
          } as AIError;

        case 500:
        case 502:
        case 503:
          return {
            ...baseError,
            code: 'SERVICE_ERROR',
            retryable: true,
            userMessage: this.getLocalizedMessage('service_error', language),
            suggestedAction: 'retry_later',
          } as AIError;

        default:
          return {
            ...baseError,
            retryable: true,
            userMessage: this.getLocalizedMessage('google_error', language),
          } as AIError;
      }
    }

    // String-based error codes
    switch (code) {
      case 'SAFETY':
        return {
          ...baseError,
          code: 'CONTENT_FILTERED',
          retryable: false,
          userMessage: this.getLocalizedMessage('content_filtered', language),
          suggestedAction: 'modify_content',
        } as AIError;

      default:
        return {
          ...baseError,
          retryable: true,
          userMessage: this.getLocalizedMessage('google_error', language),
        } as AIError;
    }
  }

  /**
   * Execute function with retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    onRetry?: (attempt: number, error: any) => void
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    let lastError: any;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.log(`🔄 [RETRY] Attempt ${attempt}/${retryConfig.maxAttempts} failed:`, error);

        // Don't retry on the last attempt
        if (attempt === retryConfig.maxAttempts) {
          break;
        }

        // Check if error is retryable
        const processedError = this.processError(error, 'openai'); // Default to openai for generic processing
        if (!processedError.retryable) {
          console.log('❌ [RETRY] Error is not retryable, stopping');
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelay
        );

        console.log(`⏳ [RETRY] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Call retry callback if provided
        onRetry?.(attempt, error);
      }
    }

    throw lastError;
  }

  /**
   * Get localized error messages
   */
  private static getLocalizedMessage(errorType: string, language: SupportedLanguage): string {
    const messages: Record<string, Record<string, string>> = {
      model_deprecated: {
        en: 'The AI model is outdated. Please update the app.',
        es: 'El modelo de IA está obsoleto. Por favor actualiza la aplicación.',
        de: 'Das KI-Modell ist veraltet. Bitte aktualisieren Sie die App.',
        fr: 'Le modèle IA est obsolète. Veuillez mettre à jour l\'application.',
        it: 'Il modello IA è obsoleto. Si prega di aggiornare l\'applicazione.',
      },
      rate_limit: {
        en: 'Too many requests. Please wait a moment and try again.',
        es: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.',
        de: 'Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.',
        fr: 'Trop de demandes. Veuillez attendre un moment et réessayer.',
        it: 'Troppe richieste. Attendere un momento e riprovare.',
      },
      context_too_long: {
        en: 'The message is too long. Please try with shorter content.',
        es: 'El mensaje es demasiado largo. Prueba con contenido más corto.',
        de: 'Die Nachricht ist zu lang. Bitte versuchen Sie es mit kürzerem Inhalt.',
        fr: 'Le message est trop long. Veuillez essayer avec un contenu plus court.',
        it: 'Il messaggio è troppo lungo. Prova con contenuti più brevi.',
      },
      invalid_api_key: {
        en: 'API configuration error. Please contact support.',
        es: 'Error de configuración de API. Contacta con soporte.',
        de: 'API-Konfigurationsfehler. Bitte kontaktieren Sie den Support.',
        fr: 'Erreur de configuration API. Veuillez contacter le support.',
        it: 'Errore di configurazione API. Contattare il supporto.',
      },
      service_unavailable: {
        en: 'AI service is temporarily unavailable. Please try again later.',
        es: 'Servicio de IA temporalmente no disponible. Inténtalo más tarde.',
        de: 'KI-Service ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.',
        fr: 'Service IA temporairement indisponible. Veuillez réessayer plus tard.',
        it: 'Servizio IA temporaneamente non disponibile. Riprova più tardi.',
      },
      content_filtered: {
        en: 'Content was filtered for safety. Please try with different content.',
        es: 'Contenido filtrado por seguridad. Prueba con contenido diferente.',
        de: 'Inhalt wurde aus Sicherheitsgründen gefiltert. Bitte versuchen Sie es mit anderem Inhalt.',
        fr: 'Contenu filtré pour la sécurité. Veuillez essayer avec un contenu différent.',
        it: 'Contenuto filtrato per sicurezza. Prova con contenuto diverso.',
      },
      // Add more error messages as needed
    };

    return messages[errorType]?.[language] || messages[errorType]?.['en'] || 'An error occurred';
  }
}