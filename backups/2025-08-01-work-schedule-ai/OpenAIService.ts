import * as FileSystem from 'expo-file-system';
import { SupportedLanguage } from '../contexts/LanguageContext';
import { VisionPrompts } from './VisionPrompts';
import { AIErrorHandler } from './AIErrorHandler';
import { AIAnalyticsService } from './AIAnalyticsService';
import { ImageOptimizationService } from './ImageOptimizationService';

export interface ImageAnalysisResult {
  text?: string;
  labels?: {
    description: string;
    score: number;
  }[];
  objects?: {
    name: string;
    score: number;
  }[];
  error?: string;
}

export class OpenAIService {
  private static readonly API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  private static readonly OPENAI_BASE_URL = 'https://api.openai.com/v1/chat/completions';

  // Helper method to detect if the message is asking for specific person analysis
  private static isSpecificPersonAnalysis(userMessage: string): boolean {
    const specificAnalysisPatterns = [
      'Extrae los horarios específicamente de',     // Spanish
      'Extract schedules specifically from',        // English
      'Extrahieren Sie die Arbeitszeiten speziell von', // German
      'Extrayez les horaires spécifiquement de',   // French
      'Estrai gli orari specificamente da'         // Italian
    ];
    
    return specificAnalysisPatterns.some(pattern => userMessage.includes(pattern));
  }

  // Helper method to extract person name from the message
  private static extractPersonName(userMessage: string): string {
    const patterns = [
      /Extrae los horarios específicamente de "([^"]+)"/,
      /Extract schedules specifically from "([^"]+)"/,
      /Extrahieren Sie die Arbeitszeiten speziell von "([^"]+)"/,
      /Extrayez les horaires spécifiquement de "([^"]+)"/,
      /Estrai gli orari specificamente da "([^"]+)"/
    ];
    
    for (const pattern of patterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return '';
  }

  // Función para respuestas conversacionales con OpenAI
  static async getChatResponse(message: string, language: SupportedLanguage = 'en'): Promise<string> {
    const startTime = Date.now();
    let success = false;
    let errorCode: string | undefined;

    try {
      console.log('🤖 [OPENAI] Iniciando getChatResponse...');
      console.log('📝 [OPENAI] Mensaje recibido:', message.substring(0, 200) + '...');
      
      if (!this.API_KEY) {
        console.error('❌ [OPENAI] API key no configurada');
        throw new Error(VisionPrompts.getErrorMessage('apiKey', language));
      }

      const result = await AIErrorHandler.withRetry(async () => {
        const requestBody = {
          model: "gpt-4o-mini", // Updated to latest cost-effective model
          messages: [
            {
              role: "system",
              content: VisionPrompts.getChatAssistantPrompt(language)
            },
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 1024
        };

        console.log('📤 [OPENAI] Enviando request a OpenAI API...');
        
        const response = await fetch(this.OPENAI_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.API_KEY}`
          },
          body: JSON.stringify(requestBody),
        });

        console.log('📡 [OPENAI] Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ [OPENAI] Error completo:', errorData);
          throw errorData;
        }

        const data = await response.json();
        console.log('📥 [OPENAI] Response data:', data);

        if (data.choices && data.choices.length > 0) {
          const responseText = data.choices[0].message.content;
          console.log('✅ [OPENAI] Respuesta exitosa:', responseText);
          success = true;
          return responseText;
        }

        throw new Error('No response from OpenAI');
      }, {
        maxAttempts: 3,
        baseDelay: 1000,
      });

      return result;

    } catch (error) {
      console.error('Error en OpenAI API:', error);
      const processedError = AIErrorHandler.processError(error, 'openai', language);
      errorCode = processedError.code;
      return processedError.userMessage;
    } finally {
      // Track analytics
      AIAnalyticsService.trackOperation({
        provider: 'openai',
        operation: 'chat',
        startTime,
        endTime: Date.now(),
        inputSize: message.length,
        outputSize: 0, // Will be updated if successful
        success,
        errorCode,
        language,
      }).catch(err => console.error('Analytics tracking failed:', err));
    }
  }

  // Función para analizar imagen con GPT-4 Vision
  static async analyzeImageWithGPTVision(imageUri: string, userMessage: string, language: SupportedLanguage = 'en'): Promise<string> {
    const startTime = Date.now();
    let success = false;
    let errorCode: string | undefined;
    let inputSize = 0;

    try {
      console.log('👁️ [GPT-VISION] Iniciando análisis con GPT-4 Vision...');
      
      if (!this.API_KEY) {
        throw new Error(VisionPrompts.getErrorMessage('apiKey', language));
      }

      // Optimize image for AI analysis
      const optimizedImage = await ImageOptimizationService.optimizeForAI(imageUri, 'document');
      inputSize = optimizedImage.fileSize;

      console.log('🖼️ [GPT-VISION] Imagen optimizada:', {
        originalSize: 'N/A',
        optimizedSize: optimizedImage.fileSize,
        dimensions: `${optimizedImage.width}x${optimizedImage.height}`,
        compressionRatio: `${Math.round(optimizedImage.compressionRatio * 100)}%`
      });

      const result = await AIErrorHandler.withRetry(async () => {
        const requestBody = {
          model: "gpt-4o", // Updated to latest vision-capable model
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: this.isSpecificPersonAnalysis(userMessage)
                    ? VisionPrompts.buildSpecificPersonPrompt(language, userMessage, this.extractPersonName(userMessage))
                    : VisionPrompts.buildGeneralAnalysisPrompt(language, userMessage)
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${optimizedImage.base64}`,
                    detail: "high" // Better image analysis quality
                  }
                }
              ]
            }
          ],
          max_tokens: 1024,
          temperature: 0.3 // Lower temperature for more consistent analysis
        };

        console.log('📤 [GPT-VISION] Enviando request...');
        const response = await fetch(this.OPENAI_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.API_KEY}`
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ [GPT-VISION] Error:', errorData);
          throw errorData;
        }

        const data = await response.json();
        
        if (data.choices && data.choices.length > 0) {
          const responseText = data.choices[0].message.content;
          console.log('✅ [GPT-VISION] Respuesta exitosa');
          success = true;
          return responseText;
        }

        throw new Error('No response from GPT Vision');
      }, {
        maxAttempts: 2, // Fewer retries for vision as it's more expensive
        baseDelay: 2000,
      });

      return result;

    } catch (error) {
      console.error('❌ [GPT-VISION] Error:', error);
      const processedError = AIErrorHandler.processError(error, 'openai', language);
      errorCode = processedError.code;
      return processedError.userMessage;
    } finally {
      // Track analytics
      AIAnalyticsService.trackOperation({
        provider: 'openai',
        operation: 'vision',
        startTime,
        endTime: Date.now(),
        inputSize,
        outputSize: 0,
        success,
        errorCode,
        language,
      }).catch(err => console.error('Analytics tracking failed:', err));
    }
  }

  // Función para respuesta con contexto conversacional
  static async getChatResponseWithContext(message: string, conversationHistory: any[], currentImage?: string, language: SupportedLanguage = 'en'): Promise<string> {
    try {
      console.log('🧠 [OPENAI-CONTEXT] Iniciando respuesta con contexto conversacional...');
      
      if (!this.API_KEY) {
        throw new Error(VisionPrompts.getErrorMessage('apiKey', language));
      }

      // Construir mensajes con historial
      const messages = [
        {
          role: "system",
          content: VisionPrompts.getChatAssistantPrompt(language) + 
            (currentImage ? "\n\nNota: El usuario tiene una imagen activa en la conversación." : "")
        }
      ];

      // Agregar historial de conversación
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });

      // Agregar mensaje actual
      messages.push({
        role: "user",
        content: message
      });

      const requestBody = {
        model: "gpt-4o-mini", // Updated to latest cost-effective model
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
      };

      const response = await fetch(this.OPENAI_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error en OpenAI API: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        const responseText = data.choices[0].message.content;
        console.log('✅ [OPENAI-CONTEXT] Respuesta con contexto exitosa');
        return responseText;
      }

      return VisionPrompts.getErrorMessage('noResponse', language);
    } catch (error) {
      console.error('❌ [OPENAI-CONTEXT] Error:', error);
      return VisionPrompts.getErrorMessage('processing', language);
    }
  }

  // Función para analizar documentos PDF usando agentes de IA
  static async analyzePDFDocument(documentUri: string, documentName: string, userMessage: string, language: SupportedLanguage = 'en'): Promise<string> {
    try {
      console.log('📄 [OPENAI-PDF] Intentando procesar PDF con agentes de IA...');
      
      // Estrategia 1: Intentar leer el PDF como texto plano si es posible
      try {
        const fileInfo = await FileSystem.getInfoAsync(documentUri);
        if (fileInfo.exists) {
          console.log('📄 [OPENAI-PDF] PDF encontrado, intentando procesamiento inteligente...');
          
          // Usar un agente de IA para sugerir alternativas
          const aiResponse = await this.getChatResponse(
            `El usuario quiere analizar un documento PDF llamado "${documentName}" con la consulta: "${userMessage}". 
            Como OpenAI no puede procesar PDFs directamente, sugiere alternativas útiles como:
            1. Convertir el PDF a imágenes
            2. Extraer texto del PDF manualmente
            3. Usar herramientas de conversión
            4. Proporcionar instrucciones específicas según el idioma del usuario.
            
            Responde de manera útil y propositiva en ${language}.`,
            language
          );
          
          return aiResponse;
        }
      } catch (error) {
        console.log('📄 [OPENAI-PDF] Error accediendo al archivo:', error);
      }
      
      // Fallback: Mensaje informativo usando el agente de IA
      const fallbackResponse = await this.getChatResponse(
        `Ayuda al usuario a procesar un documento PDF. El usuario quiere analizar "${documentName}" con la consulta: "${userMessage}". 
        Explica que OpenAI necesita el documento como imagen y da instrucciones claras sobre cómo convertirlo. 
        Sé útil y específico en ${language}.`,
        language
      );
      
      return fallbackResponse;
      
    } catch (error) {
      console.error('❌ [OPENAI-PDF] Error:', error);
      return `Lo siento, no puedo procesar el PDF "${documentName}" directamente. Para analizarlo, por favor toma una captura de pantalla del documento y envíala como imagen. Así podré ayudarte con tu consulta: "${userMessage}".`;
    }
  }

  // Función híbrida para analizar planes de trabajo
  static async analyzeWorkPlan(imageUri: string, userMessage: string, language: SupportedLanguage = 'en'): Promise<string> {
    try {
      console.log('🔀 [OPENAI] Analizando plan de trabajo con GPT-4 Vision...');
      return await this.analyzeImageWithGPTVision(imageUri, userMessage, language);
    } catch (error) {
      console.error('❌ [OPENAI] Error en análisis:', error);
      return VisionPrompts.getErrorMessage('visionAnalysis', language);
    }
  }

  // Para compatibilidad con la interfaz existente
  static async analyzeImage(imageUri: string, features: string[] = [], language: SupportedLanguage = 'en'): Promise<ImageAnalysisResult> {
    // OpenAI no tiene el mismo tipo de análisis que Google Vision
    // Esta función existe solo para compatibilidad
    return {
      error: 'Esta función no está implementada para OpenAI. Use analyzeImageWithGPTVision en su lugar.'
    };
  }

  static async extractTextOnly(imageUri: string, language: SupportedLanguage = 'en'): Promise<string> {
    const result = await this.analyzeImageWithGPTVision(imageUri, 'Extrae solo el texto de esta imagen', language);
    return result;
  }

  static async getImageDescription(imageUri: string, language: SupportedLanguage = 'en'): Promise<string> {
    return await this.analyzeImageWithGPTVision(imageUri, 'Describe esta imagen en detalle', language);
  }

  static async analyzeImageWithContext(imageUri: string, userMessage: string, language: SupportedLanguage = 'en'): Promise<string> {
    return await this.analyzeImageWithGPTVision(imageUri, userMessage, language);
  }
}