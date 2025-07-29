import * as FileSystem from 'expo-file-system';

export interface ImageAnalysisResult {
  text?: string;
  labels?: Array<{
    description: string;
    score: number;
  }>;
  objects?: Array<{
    name: string;
    score: number;
  }>;
  error?: string;
}

export class GoogleVisionService {
  private static readonly API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
  private static readonly VISION_BASE_URL = 'https://vision.googleapis.com/v1/images:annotate';
  private static readonly GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';
  private static readonly GEMINI_VISION_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-vision:generateContent';

  static async analyzeImage(imageUri: string, features: string[] = ['TEXT_DETECTION', 'LABEL_DETECTION']): Promise<ImageAnalysisResult> {
    try {
      if (!this.API_KEY) {
        throw new Error('Google API key no configurada');
      }

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

      const response = await fetch(`${this.VISION_BASE_URL}?key=${this.API_KEY}`, {
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

  static async extractTextOnly(imageUri: string): Promise<string> {
    const result = await this.analyzeImage(imageUri, ['TEXT_DETECTION']);
    return result.text || result.error || 'No se detectó texto en la imagen';
  }

  static async getImageDescription(imageUri: string): Promise<string> {
    console.log('🔍 [VISION] Iniciando análisis completo de imagen...');
    
    // Hacer análisis completo: OCR + detección de objetos + etiquetas
    const result = await this.analyzeImage(imageUri, ['TEXT_DETECTION', 'LABEL_DETECTION', 'OBJECT_LOCALIZATION']);
    
    if (result.error) {
      console.error('❌ [VISION] Error en análisis:', result.error);
      return `Error: ${result.error}`;
    }

    let description = '📋 **ANÁLISIS COMPLETO DE LA IMAGEN:**\n\n';
    
    // PRIMERO: Texto extraído (lo más importante para planes de trabajo)
    if (result.text && result.text.trim()) {
      console.log('📝 [VISION] Texto extraído:', result.text);
      description += '📝 **TEXTO DETECTADO:**\n';
      description += `${result.text}\n\n`;
    } else {
      console.log('⚠️ [VISION] No se detectó texto legible');
      description += '⚠️ **TEXTO:** No se detectó texto legible en la imagen\n\n';
    }
    
    // SEGUNDO: Elementos generales (contexto adicional)
    if (result.labels && result.labels.length > 0) {
      description += '🏷️ **ELEMENTOS DETECTADOS:**\n';
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
      description += '🎯 **OBJETOS ESPECÍFICOS:**\n';
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
  static async getChatResponse(message: string): Promise<string> {
    try {
      console.log('🤖 [GEMINI] Iniciando getChatResponse...');
      console.log('📝 [GEMINI] Mensaje recibido:', message.substring(0, 200) + '...');
      
      if (!this.API_KEY) {
        console.error('❌ [GEMINI] API key no configurada');
        throw new Error('Google API key no configurada');
      }
      
      console.log('✅ [GEMINI] API key disponible');

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `Eres un asistente especializado en análisis de planes de trabajo y horarios laborales. Tu función principal es:

1. 📅 Analizar imágenes de calendarios, horarios y planes de trabajo
2. 🔍 Extraer información sobre:
   - Días de trabajo y horarios
   - Días libres y descansos
   - Vacaciones y períodos de ausencia
   - Turnos y horarios específicos
3. 👥 Detectar múltiples personas en planes de trabajo y preguntar específicamente de quién extraer los datos
4. 📊 Presentar la información de forma clara y organizada
5. 💼 Ayudar con consultas relacionadas con planificación laboral

IMPORTANTE: Si detectas varios nombres en un plan de trabajo, SIEMPRE pregunta de cuál persona específica debe extraer los horarios antes de proceder.

Responde siempre en español de manera clara y profesional.

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

      console.log('📤 [GEMINI] Enviando request a Gemini API...');
      console.log('🔗 [GEMINI] URL:', this.GEMINI_BASE_URL);
      console.log('📦 [GEMINI] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.GEMINI_BASE_URL}?key=${this.API_KEY}`, {
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
      return 'Lo siento, no pude generar una respuesta en este momento.';
    } catch (error) {
      console.error('Error en Gemini API:', error);
      return 'Lo siento, hubo un problema al procesar tu mensaje. ¿Puedes intentar de nuevo?';
    }
  }

  // Función para analizar imagen directamente con Gemini Vision
  static async analyzeImageWithGeminiVision(imageUri: string, userMessage: string): Promise<string> {
    try {
      console.log('👁️ [GEMINI-VISION] Iniciando análisis con Gemini Vision...');
      console.log('📱 [GEMINI-VISION] Image URI:', imageUri);
      console.log('💬 [GEMINI-VISION] User message:', userMessage);
      
      if (!this.API_KEY) {
        throw new Error('Google API key no configurada');
      }

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
                text: `Eres un experto en análisis de planes de trabajo y horarios laborales.

ANÁLISIS DE PLAN DE TRABAJO - ${userMessage || 'Analiza este plan de trabajo'}

INSTRUCCIONES ESPECÍFICAS:

${userMessage.includes('Extrae los horarios específicamente de') ? 
  `🎯 ANÁLISIS ESPECÍFICO: ${userMessage}

Analiza la imagen y extrae SOLO los datos de la persona especificada:
1. 📅 Días de trabajo de esa persona y sus horarios
2. 🏖️ Días libres, descansos de esa persona (OFF, LIBRE, etc.)
3. 🏝️ Vacaciones de esa persona
4. 🕐 Horarios específicos de esa persona

FORMATO DE RESPUESTA:
- PERSONA: [nombre especificado]
- DÍAS DE TRABAJO: [días y horarios específicos de esa persona]
- DÍAS LIBRES: [días libres de esa persona]
- VACACIONES: [vacaciones de esa persona]
- OBSERVACIONES: [detalles específicos de esa persona]` 
  : 
  `PASO 1 - DETECCIÓN DE PERSONAS:
🔍 Identifica si hay MÚLTIPLES NOMBRES/PERSONAS en este plan de trabajo.

SI HAY VARIOS NOMBRES:
- Lista todos los nombres que veas
- Pregunta: "Veo varios nombres en este plan: [lista nombres]. ¿De cuál persona quieres que extraiga los horarios?"
- NO extraigas datos hasta que el usuario especifique

SI HAY UN SOLO NOMBRE O NINGÚN NOMBRE ESPECÍFICO:
PASO 2 - EXTRACCIÓN DE DATOS:
Analiza la imagen y extrae:
1. 📅 Días de trabajo (lunes, martes, miércoles, etc.) y sus horarios
2. 🏖️ Días libres, descansos (OFF, LIBRE, descanso, etc.)
3. 🏝️ Vacaciones o períodos libres (VACACIONES, holidays, etc.)
4. 🕐 Horarios específicos (8:00-16:00, 9:00-17:00, mañana, tarde, noche, etc.)
5. 👤 Nombres de personas si están visibles

FORMATO DE RESPUESTA:
- PERSONA: [nombre si está visible, sino "Plan general"]
- DÍAS DE TRABAJO: [lista días y horarios]
- DÍAS LIBRES: [lista días de descanso]
- VACACIONES: [períodos de vacaciones]
- OBSERVACIONES: [turnos, notas especiales, etc.]`}

Responde en español de forma clara y estructurada y comprimida mensajes no muy largos.`
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

      console.log('📤 [GEMINI-VISION] Enviando request...');
      const response = await fetch(`${this.GEMINI_BASE_URL}?key=${this.API_KEY}`, {
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
      return 'No pude analizar la imagen del plan de trabajo. Por favor, intenta con una imagen más clara.';

    } catch (error) {
      console.error('❌ [GEMINI-VISION] Error:', error);
      return 'Lo siento, hubo un problema al analizar la imagen con Gemini Vision. Intentaré con el método alternativo.';
    }
  }

  // Función para respuesta con contexto conversacional
  static async getChatResponseWithContext(message: string, conversationHistory: any[], currentImage?: string): Promise<string> {
    try {
      console.log('🧠 [CONTEXTO] Iniciando respuesta con contexto conversacional...');
      console.log('📚 [CONTEXTO] Historial de conversación:', conversationHistory);
      console.log('🖼️ [CONTEXTO] Imagen actual:', currentImage ? 'Sí' : 'No');
      
      if (!this.API_KEY) {
        throw new Error('Google API key no configurada');
      }

      // Crear contexto de conversación
      let contextPrompt = `Eres un asistente especializado en análisis de planes de trabajo y horarios laborales.

CONTEXTO DE LA CONVERSACIÓN:
`;

      // Agregar historial de conversación
      if (conversationHistory.length > 0) {
        contextPrompt += `\nHISTORIAL DE MENSAJES RECIENTES:\n`;
        conversationHistory.forEach((msg) => {
          const mediaIndicator = msg.hasImage ? ' [CON IMAGEN]' : msg.hasDocument ? ' [CON DOCUMENTO PDF]' : '';
          contextPrompt += `${msg.role.toUpperCase()}: ${msg.content}${mediaIndicator}\n`;
        });
      }

      // Si hay imagen actual, mencionarla
      if (currentImage) {
        contextPrompt += `\nIMAGEN ACTIVA: Hay una imagen de plan de trabajo que fue analizada previamente y sigue siendo relevante para las consultas del usuario.\n`;
      }

      contextPrompt += `\nINSTRUCCIONES:
1. 🧠 Usa el contexto de la conversación para entender qué información necesita el usuario
2. 📋 Si se mencionaron nombres en mensajes anteriores, recuerda cuáles eran
3. 🔍 Si el usuario está pidiendo información específica de una persona mencionada antes, proporciona esa información
4. 💬 Mantén coherencia con las respuestas anteriores
5. 📸 Si hay una imagen activa, asume que las preguntas se refieren a esa imagen

MENSAJE ACTUAL DEL USUARIO: ${message}

Responde de manera coherente con el contexto de la conversación.`;

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

      console.log('📤 [CONTEXTO] Enviando request con contexto...');
      const response = await fetch(`${this.GEMINI_BASE_URL}?key=${this.API_KEY}`, {
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

      return 'Lo siento, no pude generar una respuesta en este momento.';
    } catch (error) {
      console.error('❌ [CONTEXTO] Error:', error);
      return 'Lo siento, hubo un problema al procesar tu mensaje con contexto.';
    }
  }

  // Función para analizar documentos PDF
  static async analyzePDFDocument(documentUri: string, documentName: string, userMessage: string): Promise<string> {
    try {
      console.log('📄 [PDF] Iniciando análisis de documento PDF...');
      console.log('📁 [PDF] Document URI:', documentUri);
      console.log('📋 [PDF] Document name:', documentName);
      console.log('💬 [PDF] User message:', userMessage);
      
      if (!this.API_KEY) {
        throw new Error('Google API key no configurada');
      }

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
                text: `Eres un experto en análisis de planes de trabajo y horarios laborales.

ANÁLISIS DE DOCUMENTO PDF - ${userMessage || 'Analiza este documento'}

El usuario subió un documento PDF llamado "${documentName}".

INSTRUCCIONES ESPECÍFICAS:

${userMessage.includes('Extrae los horarios específicamente de') ? 
  `🎯 ANÁLISIS ESPECÍFICO: ${userMessage}

Lee el documento PDF y extrae SOLO los datos de la persona especificada:
1. 📅 Días de trabajo de esa persona y sus horarios
2. 🏖️ Días libres, descansos de esa persona (OFF, LIBRE, etc.)
3. 🏝️ Vacaciones de esa persona
4. 🕐 Horarios específicos de esa persona

FORMATO DE RESPUESTA:
- DOCUMENTO: ${documentName}
- PERSONA: [nombre especificado en el mensaje]
- DÍAS DE TRABAJO: [días y horarios específicos de esa persona]
- DÍAS LIBRES: [días libres de esa persona]
- VACACIONES: [vacaciones de esa persona]
- OBSERVACIONES: [detalles específicos de esa persona]` 
  : 
  `PASO 1 - DETECCIÓN DE PERSONAS:
🔍 Lee el contenido del PDF e identifica si hay MÚLTIPLES NOMBRES/PERSONAS en este plan de trabajo.

SI HAY VARIOS NOMBRES:
- Lista todos los nombres que encuentres
- Pregunta: "Veo varios nombres en este plan: [lista nombres]. ¿De cuál persona quieres que extraiga los horarios?"
- NO extraigas datos hasta que el usuario especifique

SI HAY UN SOLO NOMBRE O NINGÚN NOMBRE ESPECÍFICO:
PASO 2 - EXTRACCIÓN DE DATOS:
Lee el documento PDF y extrae:
1. 📅 Días de trabajo (lunes, martes, miércoles, etc.) y sus horarios
2. 🏖️ Días libres, descansos (OFF, LIBRE, descanso, etc.)
3. 🏝️ Vacaciones o períodos libres (VACACIONES, holidays, etc.)
4. 🕐 Horarios específicos (8:00-16:00, 9:00-17:00, mañana, tarde, noche, etc.)
5. 👤 Nombres de personas si están visibles

FORMATO DE RESPUESTA:
- DOCUMENTO: ${documentName}
- PERSONA: [nombre si está visible, sino "Plan general"]
- DÍAS DE TRABAJO: [lista días y horarios]
- DÍAS LIBRES: [lista días de descanso]
- VACACIONES: [períodos de vacaciones]
- OBSERVACIONES: [turnos, notas especiales, etc.]`}

Responde en español de forma clara y estructurada.`
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

      console.log('📤 [PDF] Enviando request...');
      const response = await fetch(`${this.GEMINI_BASE_URL}?key=${this.API_KEY}`, {
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

  // Función híbrida que usa Gemini Vision primero, y Vision API como fallback
  static async analyzeWorkPlan(imageUri: string, userMessage: string): Promise<string> {
    try {
      console.log('🔀 [HÍBRIDO] Iniciando análisis híbrido de plan de trabajo...');
      
      // MÉTODO 1: Intentar con Gemini Vision primero (más inteligente)
      console.log('👁️ [HÍBRIDO] Probando con Gemini Vision...');
      try {
        const geminiResult = await this.analyzeImageWithGeminiVision(imageUri, userMessage);
        
        // Si Gemini Vision funcionó y no devolvió un mensaje de error
        if (geminiResult && !geminiResult.includes('Lo siento, hubo un problema')) {
          console.log('✅ [HÍBRIDO] Gemini Vision exitoso!');
          return geminiResult;
        }
      } catch (error) {
        console.log('⚠️ [HÍBRIDO] Gemini Vision falló, usando Vision API...');
        console.error('🔍 [HÍBRIDO] Error Gemini Vision:', error);
      }

      // MÉTODO 2: Fallback a Vision API + Gemini texto
      console.log('🔄 [HÍBRIDO] Usando Vision API + Gemini como fallback...');
      return await this.analyzeImageWithContext(imageUri, userMessage);

    } catch (error) {
      console.error('❌ [HÍBRIDO] Error en análisis híbrido:', error);
      return 'Lo siento, hubo un problema al analizar el plan de trabajo. Por favor, intenta con una imagen más clara o en mejor calidad.';
    }
  }

  // Función combinada para análisis de imagen + respuesta conversacional (Vision API)
  static async analyzeImageWithContext(imageUri: string, userMessage: string): Promise<string> {
    try {
      console.log('🖼️ [VISION-API] Iniciando analyzeImageWithContext...');
      console.log('📱 [VISION-API] Image URI:', imageUri);
      console.log('💬 [VISION-API] User message:', userMessage);
      
      // Primero analizar la imagen
      console.log('🔍 [VISION-API] Analizando imagen...');
      const imageAnalysis = await this.getImageDescription(imageUri);
      console.log('📊 [VISION-API] Análisis de imagen completo:', imageAnalysis);
      
      // Luego generar respuesta conversacional basada en el análisis y el mensaje del usuario
      const contextMessage = `ANÁLISIS DE PLAN DE TRABAJO

El usuario envió una imagen de un plan/horario de trabajo y escribió: "${userMessage}"

INFORMACIÓN EXTRAÍDA DE LA IMAGEN:
${imageAnalysis}

INSTRUCCIONES PARA EL ANÁLISIS:

IMPORTANTE: Analiza DIRECTAMENTE el texto extraído de la imagen (sección "TEXTO DETECTADO").

PASO 1 - DETECCIÓN DE PERSONAS:
🔍 Busca NOMBRES DE PERSONAS en el texto extraído.

SI HAY VARIOS NOMBRES:
- Lista todos los nombres que encuentres en el texto
- Pregunta: "Veo varios nombres en este plan: [lista nombres]. ¿De cuál persona quieres que extraiga los horarios?"
- NO extraigas datos hasta que el usuario especifique

SI HAY UN SOLO NOMBRE O EL USUARIO YA ESPECIFICÓ:
PASO 2 - EXTRACCIÓN DE DATOS:
Analiza el TEXTO EXTRAÍDO para identificar:
1. 📅 Días de trabajo (lunes, martes, etc.) y horarios
2. 🏖️ Días libres, descansos, "OFF", "LIBRE", etc.
3. 🏖️ Vacaciones, períodos libres, "VACACIONES", etc.
4. 🕐 Horarios específicos (8:00-16:00, mañana, tarde, etc.)

FORMATO DE RESPUESTA:
- PERSONA: [nombre si está visible]
- DÍAS DE TRABAJO: [extrae del texto]
- DÍAS LIBRES: [extrae del texto]
- VACACIONES: [extrae del texto] 
- OBSERVACIONES: [detalles adicionales del texto]

Si no hay texto legible, indícalo claramente.`;

      console.log('📝 [IMAGEN] Context message generado:', contextMessage);
      console.log('🚀 [IMAGEN] Enviando a Gemini para respuesta final...');
      
      const finalResponse = await this.getChatResponse(contextMessage);
      console.log('✅ [IMAGEN] Respuesta final recibida:', finalResponse);
      
      return finalResponse;
    } catch (error) {
      console.error('Error en análisis combinado:', error);
      return 'Lo siento, hubo un problema al analizar la imagen y generar una respuesta.';
    }
  }
}