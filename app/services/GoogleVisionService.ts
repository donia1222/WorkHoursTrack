import * as FileSystem from 'expo-file-system';
import { SupportedLanguage } from '../contexts/LanguageContext';
import { VisionPrompts } from './VisionPrompts';

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

export class GoogleVisionService {
  // API Keys de Google desde variables de entorno
  private static readonly GEMINI_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_GEMINI_API_KEY || '';
  private static readonly GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  private static readonly VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

  // Helper method to detect if the message is asking for specific person analysis
  private static isSpecificPersonAnalysis(userMessage: string): boolean {
    const specificAnalysisPatterns = [
      'Extrae los horarios específicamente de',     // Spanish old
      'extrae ÚNICAMENTE los horarios',            // Spanish new
      'Extract schedules specifically from',        // English old
      'extract ONLY the schedules',                // English new
      'Extrahieren Sie die Arbeitszeiten speziell von', // German
      'Extrayez les horaires spécifiquement de',   // French
      'Estrai gli orari specificamente da',        // Italian
      'persona:',                                   // Generic pattern
      'person:'                                     // Generic pattern English
    ];
    
    return specificAnalysisPatterns.some(pattern => userMessage.toLowerCase().includes(pattern.toLowerCase()));
  }

  // Helper method to extract person name from the message
  private static extractPersonName(userMessage: string): string {
    // Pattern matching for different languages
    const patterns = [
      /Extrae los horarios específicamente de "([^"]+)"/,     // Spanish old
      /de la persona:\s*([^.]+)/i,                             // Spanish new
      /Extract schedules specifically from "([^"]+)"/,        // English old
      /for the person:\s*([^.]+)/i,                           // English new
      /person:\s*([^.]+)/i,                                    // Generic
      /persona:\s*([^.]+)/i,                                   // Generic Spanish
      /Extrahieren Sie die Arbeitszeiten speziell von "([^"]+)"/, // German
      /Extrayez les horaires spécifiquement de "([^"]+)"/,   // French
      /Estrai gli orari specificamente da "([^"]+)"/         // Italian
    ];
    
    for (const pattern of patterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Fallback: try to extract name after common words
    const fallbackPatterns = [
      /de "([^"]+)"/,  // Spanish/French fallback
      /from "([^"]+)"/, // English fallback
      /von "([^"]+)"/, // German fallback
      /da "([^"]+)"/   // Italian fallback
    ];
    
    for (const pattern of fallbackPatterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return '';
  }

  static async analyzeImage(imageUri: string, features: string[] = ['TEXT_DETECTION', 'LABEL_DETECTION'], language: SupportedLanguage = 'en'): Promise<ImageAnalysisResult> {
    try {
      // API key ahora está en el servidor, no necesitamos verificarla aquí

      // Convertir imagen a base64
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Preparar request para Google Vision API
      const requestBody = {
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: features.map(feature => ({
              type: feature,
              maxResults: 10,
            })),
          },
        ],
      };

      if (!this.GEMINI_API_KEY) {
        throw new Error('API key de Google no configurada');
      }

      const apiUrl = `${this.VISION_API_URL}?key=${this.GEMINI_API_KEY}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Error en la API: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.responses?.[0]?.error) {
        throw new Error(data.responses[0].error.message);
      }

      const result: ImageAnalysisResult = {};
      const annotations = data.responses?.[0];

      // Extraer texto detectado
      if (annotations?.textAnnotations?.length > 0) {
        result.text = annotations.textAnnotations[0].description;
      }

      // Extraer etiquetas/labels
      if (annotations?.labelAnnotations?.length > 0) {
        result.labels = annotations.labelAnnotations.map((label: any) => ({
          description: label.description,
          score: label.score,
        }));
      }

      // Extraer objetos detectados
      if (annotations?.localizedObjectAnnotations?.length > 0) {
        result.objects = annotations.localizedObjectAnnotations.map((obj: any) => ({
          name: obj.name,
          score: obj.score,
        }));
      }

      return result;
    } catch (error) {
      console.error('Error analizando imagen:', error);
      return {
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  static async extractTextOnly(imageUri: string, language: SupportedLanguage = 'en'): Promise<string> {
    const result = await this.analyzeImage(imageUri, ['TEXT_DETECTION'], language);
    return result.text || result.error || VisionPrompts.getPrompt('noTextDetected', language);
  }

  static async getImageDescription(imageUri: string, language: SupportedLanguage = 'en'): Promise<string> {
    console.log('🔍 [VISION] Iniciando análisis completo de imagen...');
    
    // Hacer análisis completo: OCR + detección de objetos + etiquetas
    const result = await this.analyzeImage(imageUri, ['TEXT_DETECTION', 'LABEL_DETECTION', 'OBJECT_LOCALIZATION'], language);
    
    if (result.error) {
      console.error('❌ [VISION] Error en análisis:', result.error);
      return `Error: ${result.error}`;
    }

    let description = VisionPrompts.getImageAnalysisTitle(language);
    
    // PRIMERO: Texto extraído (lo más importante para planes de trabajo)
    if (result.text && result.text.trim()) {
      console.log('📝 [VISION] Texto extraído:', result.text);
      description += VisionPrompts.getTextDetectedTitle(language);
      description += `${result.text}\n\n`;
    } else {
      console.log('⚠️ [VISION] No se detectó texto legible');
      description += VisionPrompts.getNoTextWarning(language);
    }
    
    // SEGUNDO: Elementos generales (contexto adicional)
    if (result.labels && result.labels.length > 0) {
      description += VisionPrompts.getElementsDetectedTitle(language);
      result.labels
        .filter(label => label.score > 0.5)
        .slice(0, 5)
        .forEach(label => {
          const confidence = Math.round(label.score * 100);
          description += `• ${label.description} (${confidence}% seguro)\n`;
        });
      description += '\n';
    }

    // TERCERO: Objetos específicos
    if (result.objects && result.objects.length > 0) {
      description += VisionPrompts.getSpecificObjectsTitle(language);
      result.objects
        .filter(obj => obj.score > 0.5)
        .slice(0, 3)
        .forEach(obj => {
          const confidence = Math.round(obj.score * 100);
          description += `• ${obj.name} (${confidence}% seguro)\n`;
        });
    }

    console.log('✅ [VISION] Descripción generada:', description);
    return description;
  }

  // Función para respuestas conversacionales con Gemini
  static async getChatResponse(message: string, language: SupportedLanguage = 'en'): Promise<string> {
    try {
      console.log('🤖 [GEMINI] Iniciando getChatResponse...');
      console.log('📝 [GEMINI] Mensaje recibido:', message.substring(0, 200) + '...');
      
      // API key ahora está en el servidor, no necesitamos verificarla aquí
      console.log('✅ [GEMINI] Usando proxy seguro');

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `${VisionPrompts.getChatAssistantPrompt(language)}

Usuario: ${message}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      if (!this.GEMINI_API_KEY) {
        throw new Error('API key de Google Gemini no configurada');
      }

      const apiUrl = `${this.GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${this.GEMINI_API_KEY}`;
      console.log('📤 [GEMINI] Enviando request directo a Google Gemini API...');
      console.log('📦 [GEMINI] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 [GEMINI] Response status:', response.status);
      console.log('📡 [GEMINI] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [GEMINI] Error completo:', errorData);
        throw new Error(`Error en Gemini API: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      console.log('📥 [GEMINI] Response data completa:', JSON.stringify(data, null, 2));

      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        console.log('🎯 [GEMINI] Candidate encontrado:', candidate);
        
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const responseText = candidate.content.parts[0].text;
          console.log('✅ [GEMINI] Respuesta exitosa:', responseText);
          return responseText;
        } else {
          console.warn('⚠️ [GEMINI] Candidate sin contenido válido');
        }
      } else {
        console.warn('⚠️ [GEMINI] No hay candidates en la respuesta');
      }

      console.log('🔄 [GEMINI] Retornando respuesta por defecto');
      return VisionPrompts.getErrorMessage('noResponse', language);
    } catch (error) {
      console.error('Error en Gemini API:', error);
      return VisionPrompts.getErrorMessage('processing', language);
    }
  }

  // Función para analizar imagen directamente con Gemini Vision
  static async analyzeImageWithGeminiVision(imageUri: string, userMessage: string, language: SupportedLanguage = 'en'): Promise<string> {
    try {
      console.log('👁️ [GEMINI-VISION] Iniciando análisis con Gemini Vision...');
      console.log('📱 [GEMINI-VISION] Image URI:', imageUri);
      console.log('💬 [GEMINI-VISION] User message:', userMessage);
      
      // API key ahora está en el servidor, no necesitamos verificarla aquí

      // Convertir imagen a base64
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('🖼️ [GEMINI-VISION] Imagen convertida a base64');

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: this.isSpecificPersonAnalysis(userMessage)
                  ? VisionPrompts.buildSpecificPersonPrompt(language, userMessage, this.extractPersonName(userMessage))
                  : VisionPrompts.buildGeneralAnalysisPrompt(language, userMessage)
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };

      if (!this.GEMINI_API_KEY) {
        throw new Error('API key de Google Gemini no configurada');
      }

      const apiUrl = `${this.GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${this.GEMINI_API_KEY}`;
      console.log('📤 [GEMINI-VISION] Enviando request directo a Google Gemini API...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 [GEMINI-VISION] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [GEMINI-VISION] Error:', errorData);
        throw new Error(`Error en Gemini Vision: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      console.log('📥 [GEMINI-VISION] Response data:', JSON.stringify(data, null, 2));

      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const responseText = candidate.content.parts[0].text;
          console.log('✅ [GEMINI-VISION] Respuesta exitosa:', responseText);
          return responseText;
        }
      }

      console.log('⚠️ [GEMINI-VISION] Respuesta vacía, usando fallback');
      return VisionPrompts.getErrorMessage('visionAnalysis', language);

    } catch (error) {
      console.error('❌ [GEMINI-VISION] Error:', error);
      return VisionPrompts.getErrorMessage('geminiVision', language);
    }
  }

  // Función para respuesta con contexto conversacional
  static async getChatResponseWithContext(message: string, conversationHistory: any[], currentImage?: string, language: SupportedLanguage = 'en'): Promise<string> {
    try {
      console.log('🧠 [CONTEXTO] Iniciando respuesta con contexto conversacional...');
      console.log('📚 [CONTEXTO] Historial de conversación:', conversationHistory);
      console.log('🖼️ [CONTEXTO] Imagen actual:', currentImage ? 'Sí' : 'No');
      
      // API key ahora está en el servidor, no necesitamos verificarla aquí

      // Crear contexto de conversación usando VisionPrompts
      const contextPrompt = VisionPrompts.buildContextPrompt(
        language,
        message,
        conversationHistory,
        !!currentImage
      );

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: contextPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      if (!this.GEMINI_API_KEY) {
        throw new Error('API key de Google Gemini no configurada');
      }

      const apiUrl = `${this.GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${this.GEMINI_API_KEY}`;
      console.log('📤 [CONTEXTO] Enviando request directo a Google Gemini API...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [CONTEXTO] Error:', errorData);
        throw new Error(`Error en Gemini API: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      console.log('📥 [CONTEXTO] Response data:', JSON.stringify(data, null, 2));

      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const responseText = candidate.content.parts[0].text;
          console.log('✅ [CONTEXTO] Respuesta con contexto exitosa:', responseText);
          return responseText;
        }
      }

      return VisionPrompts.getErrorMessage('noResponse', language);
    } catch (error) {
      console.error('❌ [CONTEXTO] Error:', error);
      return VisionPrompts.getErrorMessage('processing', language);
    }
  }

  // Función para analizar documentos PDF
  static async analyzePDFDocument(documentUri: string, documentName: string, userMessage: string, language: SupportedLanguage = 'en'): Promise<string> {
    try {
      console.log('📄 [PDF] Iniciando análisis de documento PDF...');
      console.log('📁 [PDF] Document URI:', documentUri);
      console.log('📋 [PDF] Document name:', documentName);
      console.log('💬 [PDF] User message:', userMessage);
      
      // API key ahora está en el servidor, no necesitamos verificarla aquí

      // Convertir PDF a base64
      const base64Document = await FileSystem.readAsStringAsync(documentUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('📄 [PDF] Documento convertido a base64');

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: this.isSpecificPersonAnalysis(userMessage)
                  ? VisionPrompts.buildSpecificPersonPrompt(language, userMessage, this.extractPersonName(userMessage))
                  : VisionPrompts.buildGeneralAnalysisPrompt(language, userMessage || `Analiza este documento PDF llamado "${documentName}"`)
              },
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: base64Document
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };

      if (!this.GEMINI_API_KEY) {
        throw new Error('API key de Google Gemini no configurada');
      }

      const apiUrl = `${this.GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${this.GEMINI_API_KEY}`;
      console.log('📤 [PDF] Enviando request directo a Google Gemini API...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 [PDF] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [PDF] Error:', errorData);
        throw new Error(`Error en análisis de PDF: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      console.log('📥 [PDF] Response data:', JSON.stringify(data, null, 2));

      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const responseText = candidate.content.parts[0].text;
          console.log('✅ [PDF] Respuesta exitosa:', responseText);
          return responseText;
        }
      }

      console.log('⚠️ [PDF] Respuesta vacía, usando fallback');
      return `He recibido el documento PDF "${documentName}" pero no pude procesarlo completamente. Los PDFs a veces requieren procesamiento especial. ¿Podrías intentar convertirlo a imagen o enviar una captura de pantalla del plan de trabajo?`;

    } catch (error) {
      console.error('❌ [PDF] Error:', error);
      return `Lo siento, hubo un problema al analizar el documento PDF "${documentName}". Los PDFs pueden requerir procesamiento especial. Como alternativa, puedes tomar una captura de pantalla del documento y enviarla como imagen.`;
    }
  }

  // Función híbrida que usa análisis interactivo primero (solo español), luego Gemini Vision, y Vision API como fallback
  static async analyzeWorkPlan(imageUri: string, userMessage: string, language: SupportedLanguage = 'en'): Promise<string> {
    try {
      console.log('🔀 [HÍBRIDO] Iniciando análisis híbrido de plan de trabajo...');
      
      // MÉTODO 1: Intentar con análisis interactivo de horarios (solo español por ahora)
      if (language === 'es') {
        console.log('🤖 [INTERACTIVO] Usando análisis interactivo de horarios...');
        try {
          const interactiveResult = await this.analyzeWorkPlanInteractive(imageUri, userMessage, language);
          if (interactiveResult) {
            console.log('✅ [INTERACTIVO] Análisis interactivo exitoso!');
            return interactiveResult;
          }
        } catch (error) {
          console.log('⚠️ [INTERACTIVO] Análisis interactivo falló, usando método normal...');
          console.error('🔍 [INTERACTIVO] Error:', error);
        }
      }
      
      // MÉTODO 2: Intentar con Gemini Vision primero (más inteligente)
      console.log('👁️ [HÍBRIDO] Probando con Gemini Vision...');
      try {
        const geminiResult = await this.analyzeImageWithGeminiVision(imageUri, userMessage, language);
        
        // Si Gemini Vision funcionó y no devolvió un mensaje de error
        if (geminiResult && !geminiResult.includes(VisionPrompts.getErrorMessage('geminiVision', language))) {
          console.log('✅ [HÍBRIDO] Gemini Vision exitoso!');
          return geminiResult;
        }
      } catch (error) {
        console.log('⚠️ [HÍBRIDO] Gemini Vision falló, usando Vision API...');
        console.error('🔍 [HÍBRIDO] Error Gemini Vision:', error);
      }

      // MÉTODO 3: Fallback a Vision API + Gemini texto
      console.log('🔄 [HÍBRIDO] Usando Vision API + Gemini como fallback...');
      return await this.analyzeImageWithContext(imageUri, userMessage, language);

    } catch (error) {
      console.error('❌ [HÍBRIDO] Error en análisis híbrido:', error);
      return VisionPrompts.getErrorMessage('visionAnalysis', language);
    }
  }

  // Función combinada para análisis de imagen + respuesta conversacional (Vision API)
  static async analyzeImageWithContext(imageUri: string, userMessage: string, language: SupportedLanguage = 'en'): Promise<string> {
    try {
      console.log('🖼️ [VISION-API] Iniciando analyzeImageWithContext...');
      console.log('📱 [VISION-API] Image URI:', imageUri);
      console.log('💬 [VISION-API] User message:', userMessage);
      
      // Primero analizar la imagen
      console.log('🔍 [VISION-API] Analizando imagen...');
      const imageAnalysis = await this.getImageDescription(imageUri, language);
      console.log('📊 [VISION-API] Análisis de imagen completo:', imageAnalysis);
      
      // Crear mensaje de contexto usando VisionPrompts
      const contextMessage = `${VisionPrompts.getGeminiVisionPrompt(language, `El usuario envió una imagen de un plan/horario de trabajo y escribió: "${userMessage}"`)}

INFORMACIÓN EXTRAÍDA DE LA IMAGEN:
${imageAnalysis}

INSTRUCCIONES PARA EL ANÁLISIS:

IMPORTANTE: Analiza DIRECTAMENTE el texto extraído de la imagen (sección "TEXTO DETECTADO").

${VisionPrompts.getMultiplePersonsDetection(language)}

${VisionPrompts.getSinglePersonAnalysis(language)}

${VisionPrompts.getResponseFormat(language)}

Si no hay texto legible, indícalo claramente.`;

      console.log('📝 [IMAGEN] Context message generado:', contextMessage);
      console.log('🚀 [IMAGEN] Enviando a Gemini para respuesta final...');
      
      const finalResponse = await this.getChatResponse(contextMessage, language);
      console.log('✅ [IMAGEN] Respuesta final recibida:', finalResponse);
      
      return finalResponse;
    } catch (error) {
      console.error('Error en análisis combinado:', error);
      return VisionPrompts.getErrorMessage('visionAnalysis', language);
    }
  }

  // Nueva función para análisis interactivo de horarios con detección de ambigüedades
  static async analyzeWorkPlanInteractive(imageUri: string, userMessage: string, language: SupportedLanguage = 'es'): Promise<string> {
    try {
      console.log('🤖 [INTERACTIVO] Iniciando análisis interactivo de horarios...');
      
      // API key ahora está en el servidor, no necesitamos verificarla aquí

      // Convertir imagen a base64
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Crear prompt para detección de ambigüedades
      const ambiguityPrompt = `${VisionPrompts.getPrompt('workScheduleAnalysisPrompt', language)}

${VisionPrompts.getPrompt('ambiguityDetectionPrompt', language)}

INSTRUCCIONES DE USUARIO: ${userMessage}

PASO 1: Examina esta imagen de horario de trabajo y detecta si hay elementos confusos o ambiguos.
PASO 2: Si hay ambigüedades, haz UNA pregunta específica usando el formato de clarificationQuestionFormat.
PASO 3: Si todo está claro, procede con el análisis normal usando el formato exacto especificado en responseFormat.

${VisionPrompts.getPrompt('responseFormat', language)}`;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: ambiguityPrompt
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3, // Menor temperatura para más consistencia
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 512, // Respuesta más corta para preguntas
        }
      };

      if (!this.GEMINI_API_KEY) {
        throw new Error('API key de Google Gemini no configurada');
      }

      const apiUrl = `${this.GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${this.GEMINI_API_KEY}`;
      console.log('📤 [INTERACTIVO] Enviando request directo a Google Gemini API...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [INTERACTIVO] Error:', errorData);
        throw new Error(`Error en análisis interactivo: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      console.log('📥 [INTERACTIVO] Response data:', JSON.stringify(data, null, 2));

      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const responseText = candidate.content.parts[0].text;
          console.log('✅ [INTERACTIVO] Respuesta interactiva:', responseText);
          
          // Verificar si la respuesta contiene una pregunta de clarificación
          if (responseText.includes('🤔') || responseText.toLowerCase().includes('necesito aclarar') || 
              responseText.toLowerCase().includes('qué significa') || responseText.toLowerCase().includes('antes de continuar')) {
            console.log('❓ [INTERACTIVO] Se detectó pregunta de clarificación');
            return responseText;
          }
          
          // Verificar si la respuesta tiene el formato correcto para el parser
          if (responseText.includes('👤 **PERSONA:**') && responseText.includes('📅 **DÍAS DE TRABAJO:**')) {
            console.log('✅ [INTERACTIVO] Respuesta con formato correcto detectada');
            return responseText;
          }
          
          // Si no es pregunta ni tiene formato correcto, hacer fallback
          console.log('⚠️ [INTERACTIVO] Respuesta sin formato correcto, usando fallback');
          throw new Error('Formato incorrecto, usando fallback');
        }
      }

      console.log('⚠️ [INTERACTIVO] Respuesta vacía, usando fallback');
      return VisionPrompts.getErrorMessage('visionAnalysis', language);

    } catch (error) {
      console.error('❌ [INTERACTIVO] Error en análisis interactivo:', error);
      throw error; // Re-throw para que el método padre use fallback
    }
  }
}