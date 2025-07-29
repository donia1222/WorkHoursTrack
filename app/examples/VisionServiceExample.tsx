import React from 'react';
import { GoogleVisionService } from '../services/GoogleVisionService';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * EJEMPLO DE USO DEL GoogleVisionService CON IDIOMAS
 * 
 * Este ejemplo muestra cómo usar el GoogleVisionService actualizado
 * que ahora soporta múltiples idiomas. Los prompts se envían en el
 * idioma configurado por el usuario en la app.
 */

export const VisionServiceExample = () => {
  const { language } = useLanguage(); // Obtiene el idioma actual de la app

  // Ejemplo 1: Análisis básico de imagen con idioma
  const analyzeImageBasic = async (imageUri: string) => {
    try {
      // El método ahora recibe el idioma como tercer parámetro
      const result = await GoogleVisionService.analyzeImage(
        imageUri, 
        ['TEXT_DETECTION', 'LABEL_DETECTION'], 
        language // 🔥 NUEVO: idioma actual de la app
      );
      
      console.log('Resultado del análisis:', result);
      return result;
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Ejemplo 2: Extraer solo texto con idioma
  const extractText = async (imageUri: string) => {
    try {
      // Los mensajes de error se mostrarán en el idioma del usuario
      const text = await GoogleVisionService.extractTextOnly(
        imageUri,
        language // 🔥 NUEVO: idioma actual
      );
      
      console.log('Texto extraído:', text);
      return text;
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Ejemplo 3: Descripción completa de imagen con idioma
  const getDescription = async (imageUri: string) => {
    try {
      // Las etiquetas y descripciones se mostrarán en el idioma del usuario
      const description = await GoogleVisionService.getImageDescription(
        imageUri,
        language // 🔥 NUEVO: idioma actual
      );
      
      console.log('Descripción completa:', description);
      return description;
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Ejemplo 4: Chat con Gemini en el idioma del usuario
  const chatWithGemini = async (message: string) => {
    try {
      // El asistente responderá en el idioma del usuario
      const response = await GoogleVisionService.getChatResponse(
        message,
        language // 🔥 NUEVO: el prompt se envía en el idioma configurado
      );
      
      console.log('Respuesta del chat:', response);
      return response;
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Ejemplo 5: Análisis de plan de trabajo con Gemini Vision
  const analyzePlan = async (imageUri: string, userMessage: string) => {
    try {
      // El análisis se realizará en el idioma del usuario
      const analysis = await GoogleVisionService.analyzeImageWithGeminiVision(
        imageUri,
        userMessage,
        language // 🔥 NUEVO: análisis en idioma configurado
      );
      
      console.log('Análisis del plan:', analysis);
      return analysis;
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Ejemplo 6: Análisis híbrido de plan de trabajo
  const analyzeWorkPlan = async (imageUri: string, userMessage: string) => {
    try {
      // Combina Gemini Vision + Vision API, todo en el idioma del usuario
      const result = await GoogleVisionService.analyzeWorkPlan(
        imageUri,
        userMessage,
        language // 🔥 NUEVO: análisis multimodal en idioma configurado
      );
      
      console.log('Análisis híbrido:', result);
      return result;
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Ejemplo 7: Chat con contexto conversacional
  const chatWithContext = async (
    message: string, 
    conversationHistory: any[], 
    currentImage?: string
  ) => {
    try {
      // El contexto conversacional se maneja en el idioma del usuario
      const response = await GoogleVisionService.getChatResponseWithContext(
        message,
        conversationHistory,
        currentImage,
        language // 🔥 NUEVO: contexto en idioma configurado
      );
      
      console.log('Respuesta con contexto:', response);
      return response;
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Ejemplo 8: Análisis de documentos PDF
  const analyzePDF = async (
    documentUri: string, 
    documentName: string, 
    userMessage: string
  ) => {
    try {
      // Los PDFs se analizan en el idioma del usuario
      const analysis = await GoogleVisionService.analyzePDFDocument(
        documentUri,
        documentName,
        userMessage,
        language // 🔥 NUEVO: análisis de PDF en idioma configurado
      );
      
      console.log('Análisis del PDF:', analysis);
      return analysis;
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <h2>Ejemplos de GoogleVisionService con Idiomas</h2>
      <p>Idioma actual: <strong>{language}</strong></p>
      
      <h3>Funciones disponibles:</h3>
      <ul>
        <li>analyzeImage() - Análisis básico con OCR y detección</li>
        <li>extractTextOnly() - Solo extracción de texto</li>
        <li>getImageDescription() - Descripción completa</li>
        <li>getChatResponse() - Chat con Gemini</li>
        <li>analyzeImageWithGeminiVision() - Análisis inteligente</li>
        <li>analyzeWorkPlan() - Análisis híbrido</li>
        <li>getChatResponseWithContext() - Chat con contexto</li>
        <li>analyzePDFDocument() - Análisis de PDFs</li>
      </ul>

      <h3>Ventajas de la actualización:</h3>
      <ul>
        <li>✅ Prompts en 5 idiomas (es, en, de, fr, it)</li>
        <li>✅ Mensajes de error traducidos</li>
        <li>✅ Respuestas del asistente en idioma del usuario</li>
        <li>✅ Compatibilidad hacia atrás (inglés por defecto)</li>
        <li>✅ Detección automática de idioma no soportado</li>
      </ul>
    </div>
  );
};

/**
 * CASOS DE USO COMUNES:
 * 
 * 1. Usuario con app en español:
 *    - language = 'es'
 *    - Prompts se envían en español
 *    - Gemini responde en español
 *    - Errores en español
 * 
 * 2. Usuario con app en alemán:
 *    - language = 'de' 
 *    - Prompts se envían en alemán
 *    - Gemini responde en alemán
 *    - Errores en alemán
 * 
 * 3. Usuario con idioma no soportado:
 *    - language = 'pt' (no soportado)
 *    - Fallback a inglés automáticamente
 *    - Funcionamiento normal en inglés
 */

export default VisionServiceExample;