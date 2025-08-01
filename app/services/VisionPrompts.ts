import { SupportedLanguage } from '../contexts/LanguageContext';
import visionPrompts from '../locales/vision-prompts.json';

export class VisionPrompts {
  private static prompts = visionPrompts as Record<SupportedLanguage, Record<string, string>>;

  /**
   * Get a translated prompt text
   * @param key - The prompt key
   * @param language - The target language (defaults to 'en' if not supported)
   * @param variables - Variables to replace in the prompt (use {{variable}} format)
   */
  static getPrompt(
    key: string, 
    language: SupportedLanguage = 'en', 
    variables?: Record<string, string>
  ): string {
    // Fallback to English if language is not supported
    const supportedLanguage = this.prompts[language] ? language : 'en';
    const prompt = this.prompts[supportedLanguage]?.[key] || this.prompts['en']?.[key] || key;
    
    // Replace variables in the format {{variable}}
    if (variables) {
      return Object.entries(variables).reduce((text, [key, value]) => {
        return text.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }, prompt);
    }
    
    return prompt;
  }

  /**
   * Get the chat assistant prompt for the specified language
   */
  static getChatAssistantPrompt(language: SupportedLanguage = 'en'): string {
    return this.getPrompt('chatAssistantPrompt', language);
  }

  /**
   * Get the Gemini Vision analysis prompt
   */
  static getGeminiVisionPrompt(
    language: SupportedLanguage = 'en', 
    userMessage: string = ''
  ): string {
    return this.getPrompt('geminiVisionPrompt', language, { userMessage });
  }

  /**
   * Get the multiple persons detection instruction
   */
  static getMultiplePersonsDetection(language: SupportedLanguage = 'en'): string {
    return this.getPrompt('multiplePersonsDetection', language);
  }

  /**
   * Get the single person analysis instruction
   */
  static getSinglePersonAnalysis(language: SupportedLanguage = 'en'): string {
    return this.getPrompt('singlePersonAnalysis', language);
  }

  /**
   * Get the response format instruction
   */
  static getResponseFormat(language: SupportedLanguage = 'en'): string {
    return this.getPrompt('responseFormat', language);
  }

  /**
   * Get the response language instruction
   */
  static getResponseLanguage(language: SupportedLanguage = 'en'): string {
    return this.getPrompt('responseLanguage', language);
  }

  /**
   * Get the context prompt for conversation
   */
  static getContextPrompt(language: SupportedLanguage = 'en'): string {
    return this.getPrompt('contextPrompt', language);
  }

  /**
   * Get context instructions
   */
  static getContextInstructions(language: SupportedLanguage = 'en', message: string = ''): string {
    return this.getPrompt('contextInstructions', language, { message });
  }

  /**
   * Build a complete analysis prompt for specific person extraction
   */
  static buildSpecificPersonPrompt(
    language: SupportedLanguage,
    userMessage: string,
    personName: string
  ): string {
    const basePrompt = this.getGeminiVisionPrompt(language, userMessage);
    
    // Obtener las instrucciones de análisis específico en el idioma correcto
    const specificAnalysis = this.getPrompt('specificPersonAnalysis', language, { 
      userMessage, 
      personName 
    });

    // Usar el formato de respuesta actualizado del idioma correspondiente
    const responseFormat = this.getPrompt('responseFormat', language);
    const responseLanguage = this.getResponseLanguage(language);

    return `${basePrompt}\n\n${specificAnalysis}\n\n${responseFormat}\n\n${responseLanguage}`;
  }

  /**
   * Build a complete general analysis prompt
   */
  static buildGeneralAnalysisPrompt(language: SupportedLanguage, userMessage: string = ''): string {
    const basePrompt = this.getGeminiVisionPrompt(language, userMessage);
    const multiplePersons = this.getMultiplePersonsDetection(language);
    const singlePerson = this.getSinglePersonAnalysis(language);
    const responseFormat = this.getResponseFormat(language);
    const responseLanguage = this.getResponseLanguage(language);

    return `${basePrompt}\n\n${multiplePersons}\n\n${singlePerson}\n\n${responseFormat}\n\n${responseLanguage}`;
  }

  /**
   * Build conversation context prompt
   */
  static buildContextPrompt(
    language: SupportedLanguage,
    message: string,
    conversationHistory: any[],
    hasActiveImage: boolean = false
  ): string {
    let contextPrompt = this.getContextPrompt(language);
    
    // Add conversation history
    if (conversationHistory.length > 0) {
      contextPrompt += this.getPrompt('conversationHistory', language);
      conversationHistory.forEach((msg) => {
        const mediaIndicator = msg.hasImage ? ' [CON IMAGEN]' : msg.hasDocument ? ' [CON DOCUMENTO PDF]' : '';
        contextPrompt += `${msg.role.toUpperCase()}: ${msg.content}${mediaIndicator}\n`;
      });
    }

    // Add active image info
    if (hasActiveImage) {
      contextPrompt += this.getPrompt('activeImage', language);
    }

    // Add instructions
    contextPrompt += this.getContextInstructions(language, message);

    return contextPrompt;
  }

  /**
   * Get error messages
   */
  static getErrorMessage(errorType: string, language: SupportedLanguage = 'en'): string {
    switch (errorType) {
      case 'apiKey':
        return this.getPrompt('apiKeyError', language);
      case 'noResponse':
        return this.getPrompt('noResponseError', language);
      case 'processing':
        return this.getPrompt('processingError', language);
      case 'visionAnalysis':
        return this.getPrompt('visionAnalysisError', language);
      case 'geminiVision':
        return this.getPrompt('geminiVisionError', language);
      default:
        return this.getPrompt('unknownError', language);
    }
  }

  /**
   * Get language-specific response for image analysis
   */
  static getImageAnalysisTitle(language: SupportedLanguage = 'en'): string {
    return this.getPrompt('completeAnalysisTitle', language);
  }

  static getTextDetectedTitle(language: SupportedLanguage = 'en'): string {
    return this.getPrompt('textDetectedTitle', language);
  }

  static getNoTextWarning(language: SupportedLanguage = 'en'): string {
    return this.getPrompt('noTextWarning', language);
  }

  static getElementsDetectedTitle(language: SupportedLanguage = 'en'): string {
    return this.getPrompt('elementsDetectedTitle', language);
  }

  static getSpecificObjectsTitle(language: SupportedLanguage = 'en'): string {
    return this.getPrompt('specificObjectsTitle', language);
  }

  /**
   * Get the work schedule analysis prompt for interactive analysis
   */
  static getWorkScheduleAnalysisPrompt(language: SupportedLanguage = 'es'): string {
    return this.getPrompt('workScheduleAnalysisPrompt', language);
  }

  /**
   * Get the ambiguity detection prompt
   */
  static getAmbiguityDetectionPrompt(language: SupportedLanguage = 'es'): string {
    return this.getPrompt('ambiguityDetectionPrompt', language);
  }

  /**
   * Get the clarification question format
   */
  static getClarificationQuestionFormat(language: SupportedLanguage = 'es', question: string = ''): string {
    return this.getPrompt('clarificationQuestionFormat', language, { question });
  }

  /**
   * Get the waiting for clarification message
   */
  static getWaitingForClarification(language: SupportedLanguage = 'es'): string {
    return this.getPrompt('waitingForClarification', language);
  }
}