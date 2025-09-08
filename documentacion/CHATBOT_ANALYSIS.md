# 🤖 ANÁLISIS COMPLETO DEL CHATBOT AI - WorkTrack

## 📋 INFORMACIÓN GENERAL

**Ubicación**: `/app/screens/ChatbotScreen.tsx`  
**Tipo**: Chatbot AI multimodal con análisis de documentos y PDFs  
**Tecnologías**: React Native + Expo, OpenAI GPT-4 Vision, Google Gemini Vision, TypeScript  
**Servicios de IA**: GoogleVisionService, EnhancedAIService, OpenAIService  

---

## 🚀 **MEJORAS INTELIGENCIA AVANZADA (2024)**

### **🧠 Sistema de Detección Contextual Revolucionado**
- **Contexto Conversacional Expandido**: 10 mensajes vs 4 anteriores
- **Inferencia Inteligente**: Comprende preguntas sin palabras clave explícitas
- **Patrones Multiidioma**: Reconoce "Y en...", "And in...", "Et pour...", "Was ist mit..."
- **Memoria Conversacional**: Entiende que "Y en Austria?" es pregunta laboral por contexto

### **🌍 Búsqueda Web Automática Universal**  
- **Sin Límites Geográficos**: Cualquier país del mundo, no solo pre-programados
- **Auto-Búsqueda**: Si no conoce información, busca automáticamente
- **Queries Inteligentes**: Términos de búsqueda nativos en 10 idiomas
- **Respuestas Estructuradas**: Información organizada profesionalmente

### **🗣️ Localización Completa Multiidioma**
- **10 Idiomas Soportados**: ES, EN, DE, FR, IT, PT, NL, TR, JA, RU
- **Prompts Nativos**: Instrucciones IA completamente traducidas
- **Detección Automática**: País por configuración de dispositivo
- **Respuestas Contextuales**: Adaptadas al idioma del usuario

### **⚡ Flujo de Trabajo Inteligente**
```
Ejemplo de Conversación:
Usuario: "Cuál es el sueldo mínimo?" 
Bot: [Detecta país (Suiza), busca info, responde con datos oficiales]

Usuario: "Y en Austria?"
Bot: [Detecta contexto laboral + Austria por patrones de seguimiento]
     [Búsqueda automática información Austria]  
     [Respuesta con datos específicos de Austria]
```

---

## 🎯 FUNCIONALIDADES PRINCIPALES

### 1. **Análisis Multimodal de Documentos**
- **Imágenes**: Captura desde cámara o selección desde galería
- **PDFs**: Procesamiento completo con Google Gemini Vision
- **OCR**: Extracción de texto con Google Vision API
- **Análisis Inteligente**: Detección de horarios, personas, fechas y ubicaciones

### 2. **Sistema de Conversación Contextual**
- **Historial Persistente**: Mantiene contexto de conversaciones previas
- **Memoria Activa**: Recuerda el último archivo analizado para preguntas de seguimiento
- **Comandos de Reset**: Limpieza de contexto con palabras clave multiidioma
- **Detección de Estados**: Maneja estados de espera para selección de personas y clarificaciones

### 3. **Procesamiento de Horarios Laborales**
- **Detección Automática**: Identifica múltiples personas en un plan de trabajo
- **Selección Interactiva**: Botones dinámicos para elegir persona específica
- **Análisis Específico**: Extracción de horarios por persona individual
- **Formato Estructurado**: Respuestas con emojis, separadores y estructura clara

### 4. **🧠 BÚSQUEDA WEB INTELIGENTE MEJORADA (2024)**
- **Detección Contextual Avanzada**: Identifica preguntas laborales por contexto conversacional
- **Contexto Expandido**: Analiza hasta 10 mensajes previos (vs 4 anteriores)
- **Patrones de Seguimiento**: Reconoce "Y en Austria?", "What about...", "Qué tal..." en 10 idiomas
- **Búsqueda Automática Universal**: Cualquier país del mundo, no solo pre-programados
- **Fallback Inteligente**: Si no tiene información, busca automáticamente en web
- **Queries Nativas**: Búsquedas en idioma local (ES, EN, DE, FR, IT, PT, NL, TR, JA, RU)

### 5. **Exportación al Calendario**
- **Parseo Automático**: Convierte respuestas IA a datos estructurados
- **Integración Nativa**: Exporta directamente al calendario del dispositivo
- **Selección de Trabajo**: Asigna horarios a trabajos específicos del usuario
- **Validación de Datos**: Verificación antes de guardar en el sistema

### 6. **Gestión de Sesiones**
- **Historial Automático**: Guarda conversaciones al salir del chat
- **Máximo 10 Sesiones**: Limita almacenamiento local
- **Restauración**: Recupera conversaciones anteriores
- **Eliminación**: Gestión individual de sesiones guardadas

---

## 🔧 ARQUITECTURA TÉCNICA

### **Servicios Principales**

#### 1. **GoogleVisionService**
```typescript
// Funciones principales:
- analyzeImage(): OCR y detección de objetos
- extractTextOnly(): Solo extracción de texto
- analyzeImageWithGeminiVision(): Análisis con Gemini Vision
- analyzePDFDocument(): Procesamiento de PDFs
- analyzeWorkPlan(): Análisis híbrido de planes de trabajo
- getChatResponse(): Respuestas conversacionales
- getChatResponseWithContext(): Respuestas con historial
```

#### 2. **EnhancedAIService**
```typescript
// Funciones principales:
- sendMessage(): Orquestador principal de mensajes
- detectLaborQuestion(): Detección de preguntas laborales
- searchLaborInfo(): Búsqueda de información legal
- getUserCountry(): Detección automática del país
- analyzeImage(): Análisis inteligente de imágenes
- processPDF(): Procesamiento de documentos PDF
```

#### 3. **Sistema de Cache**
```typescript
// Características:
- TTL: 30 minutos para respuestas de chat
- Limpieza Automática: Elimina entradas expiradas
- Optimización: Reduce llamadas a APIs externas
- Claves Únicas: Hash de entrada + idioma + operación
```

### **Estados del Componente**

```typescript
interface ChatbotStates {
  messages: ChatMessageData[];                    // Mensajes de la conversación
  inputText: string;                             // Texto del input actual
  selectedImage: { uri: string } | undefined;   // Imagen seleccionada
  selectedDocument: DocumentData | undefined;   // Documento seleccionado
  isLoading: boolean;                           // Estado de carga
  showPremiumModal: boolean;                    // Modal premium
  jobs: Job[];                                  // Trabajos disponibles
  showHistoryModal: boolean;                    // Modal de historial
  historySessions: ChatSession[];               // Sesiones guardadas
  
  // Estados contextuales
  lastAnalyzedImage: { uri: string } | null;    // Última imagen analizada
  lastAnalyzedDocument: DocumentData | null;    // Último documento analizado
  waitingForPersonSelection: boolean;           // Esperando selección de persona
  waitingForClarification: boolean;             // Esperando clarificación
  searchingSources: WebSearchResult[];          // Fuentes web consultadas
  isSearching: boolean;                         // Estado de búsqueda web
}
```

---

## 🚀 FLUJO DE FUNCIONAMIENTO

### **1. Inicialización**
```typescript
useEffect(() => {
  loadJobs();                    // Cargar trabajos del usuario
  loadChatHistory();             // Cargar historial de sesiones
  registerHistoryHandler();      // Registrar handler global
}, []);
```

### **2. Envío de Mensaje (sendMessage)**

#### **Flujo Principal:**
1. **Validación**: Verifica suscripción premium para archivos
2. **Limpieza Inmediata**: Vacía el input inmediatamente
3. **Creación de Mensajes**: Usuario + mensaje de "pensando"
4. **Análisis de Contenido**: Determina tipo de procesamiento
5. **Procesamiento**: Ejecuta análisis específico
6. **Respuesta**: Genera respuesta final
7. **Actualización**: Actualiza lista de mensajes

#### **Tipos de Procesamiento:**
```typescript
// 1. Con Imagen/Documento
if (imageToAnalyze || documentToAnalyze) {
  // Análisis híbrido con GoogleVisionService
  result = await GoogleVisionService.analyzeWorkPlan(uri, prompt, language);
}

// 2. Selección de Persona
else if (waitingForPersonSelection) {
  // Re-análisis con persona específica
  result = await GoogleVisionService.analyzePDFDocument(uri, name, prompt, language);
}

// 3. Clarificación
else if (waitingForClarification) {
  // Re-análisis con información adicional
  result = await GoogleVisionService.analyzeWorkPlan(uri, clarification, language);
}

// 4. Solo Texto
else {
  // Búsqueda web inteligente + respuesta conversacional
  result = await EnhancedAIService.sendMessage(text, language, history);
}
```

### **3. Detección de Patrones**

#### **Selección de Personas:**
```typescript
const isAskingForPersonSelection = (text: string): boolean => {
  const patterns = [
    t('chatbot.detection_patterns.person_selection_question'),
    'varios nombres', 'several names', 'mehrere Namen'
  ];
  return patterns.some(pattern => text.includes(pattern));
};
```

#### **Petición de Clarificación:**
```typescript
const isAskingForClarification = (text: string): boolean => {
  const patterns = ['🤔', 'necesito aclarar', 'qué significa', 'antes de continuar'];
  return patterns.some(pattern => text.toLowerCase().includes(pattern.toLowerCase()));
};
```

### **4. Gestión de Archivos**

#### **Selección de Archivos:**
```typescript
const showFileOptions = () => {
  if (!isSubscribed) {
    setShowPremiumModal(true);
    return;
  }
  
  Alert.alert('Seleccionar archivo', 'Tipo de archivo', [
    { text: 'Foto/Galería', onPress: pickImage },
    { text: 'Tomar Foto', onPress: takePhoto },
    { text: 'Documento PDF', onPress: pickDocument },
    { text: 'Cancelar', style: 'cancel' }
  ]);
};
```

#### **Procesamiento de Imágenes:**
```typescript
const pickImage = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return;
  
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.7,
    base64: false,
  });
  
  if (!result.canceled) {
    setSelectedImage({ uri: result.assets[0].uri });
  }
};
```

---

## 🎨 COMPONENTES UI

### **1. ChatMessage Component**

#### **Funcionalidades:**
- **Renderizado Dinámico**: Mensajes de usuario vs bot
- **Soporte Multimedia**: Imágenes, documentos, texto
- **Animación de "Pensando"**: Puntos animados con Reanimated
- **Botón de Exportación**: Para horarios parseables
- **Selección Interactiva**: Botones para elegir personas
- **Timestamps**: Hora de envío de cada mensaje

#### **Detección Automática:**
```typescript
// Detecta si contiene datos de horarios
const hasWorkScheduleData = !message.isUser && 
  ChatDataParser.hasWorkScheduleData(message.text);

// Detecta selección interactiva
const detectInteractiveSelection = (text: string): SelectionData | null => {
  // Formato estructurado
  const structuredPattern = /\[INTERACTIVE_SELECTION\]([\s\S]*?)\[\/INTERACTIVE_SELECTION\]/;
  
  // Formato legacy
  const legacyPatterns = [
    'DETECCIÓN DE PERSONAS',
    'Múltiples personas detectadas',
    'varios nombres en este plan'
  ];
};
```

### **2. WelcomeMessage Component**

#### **Características:**
- **Animación de Entrada**: Fade + Scale con Animated API
- **Lista de Funcionalidades**: 6 características principales
- **Modal Informativo**: Guía de uso detallada
- **Responsive**: Se adapta al tema claro/oscuro
- **Multiidioma**: Soporta 5 idiomas

### **3. ChatHistoryModal Component**

#### **Funcionalidades:**
- **Lista de Sesiones**: Formato de tarjetas con blur
- **Metadatos**: Fecha, hora, número de mensajes
- **Acciones**: Restaurar o eliminar sesión
- **Confirmaciones**: Alertas antes de acciones destructivas
- **Estado Vacío**: Mensaje cuando no hay historial

---

## 🌍 SOPORTE MULTIIDIOMA

### **Idiomas Soportados:**
- **Español** (es) - Idioma principal
- **Inglés** (en) - Internacional
- **Alemán** (de) - Europa Central
- **Francés** (fr) - Francia y África francófona
- **Italiano** (it) - Italia y Suiza italiana

### **Traduciones Dinámicas:**
```typescript
// Ejemplos de uso
t('chatbot.permissions_needed')
t('chatbot.gallery_permission_message')
t('chatbot.extract_specific_person', { personName })
t('chatbot.pdf_context_message', { documentName })
t('chatbot.export_calendar.export_success_message', { count, personName })
```

### **Detección de País:**
```typescript
// En EnhancedAIService
const getUserCountry = async (language: SupportedLanguage): Promise<string> => {
  const userRegion = Localization.region; // "ES", "DE", "FR"
  const countryMap = {
    'ES': 'España', 'DE': 'Deutschland', 'FR': 'France',
    'IT': 'Italia', 'US': 'Estados Unidos'
  };
  return countryMap[userRegion] || countryByLanguage[language];
};
```

---

## 💰 MODELO DE SUSCRIPCIÓN

### **Características Premium:**
- **Análisis de Imágenes**: GPT-4 Vision + Gemini Vision
- **Procesamiento de PDFs**: Solo con suscripción
- **Exportación Automática**: Al calendario nativo
- **Búsqueda Web**: Información laboral actualizada
- **Historial Ilimitado**: Sin límite de sesiones guardadas
- **Análisis Multimodal**: Combinación de OCR + IA

### **Restricciones Gratuitas:**
- **Solo Texto**: Chat básico sin archivos
- **Sin Búsqueda Web**: Respuestas genéricas
- **Historial Limitado**: Máximo 5 sesiones
- **Sin Exportación**: No integración con calendario

### **Modal Premium:**
```typescript
// Se muestra cuando:
1. Usuario no suscrito intenta enviar archivo
2. Usuario no suscrito usa botón de adjuntar
3. Usuario no suscrito accede a funciones premium

// Características mostradas:
- Análisis de imágenes con IA
- Procesamiento de documentos PDF
- Exportación automática al calendario
- Análisis inteligente de horarios
```

---

## 🔍 ANÁLISIS DE DOCUMENTOS

### **Procesamiento de Imágenes:**

#### **Flujo Híbrido:**
1. **Análisis Interactivo** (solo español): Detección de ambigüedades
2. **Gemini Vision**: Análisis inteligente principal
3. **Vision API + Gemini**: Fallback con OCR + análisis

#### **Tipos de Análisis:**
```typescript
// 1. Extracción de Texto
if (inputText.includes('texto') || inputText.includes('leer') || inputText.includes('ocr')) {
  const extractedText = await GoogleVisionService.extractTextOnly(fileUri, language);
  response = await GoogleVisionService.getChatResponse(extractedText, language);
}

// 2. Análisis de Plan de Trabajo
else {
  response = await GoogleVisionService.analyzeWorkPlan(fileUri, inputText, language);
  
  // Detectar múltiples personas
  if (isAskingForPersonSelection(response)) {
    setWaitingForPersonSelection(true);
  }
  
  // Detectar ambigüedades
  if (isAskingForClarification(response)) {
    setWaitingForClarification(true);
  }
}
```

### **Procesamiento de PDFs:**

#### **Características:**
- **Solo Google Gemini**: OpenAI no soporta PDFs directamente
- **Análisis Completo**: Texto + imágenes + tablas
- **Contexto Preservado**: Mantiene estructura del documento
- **Análisis por Persona**: Extracción específica de horarios individuales

#### **Implementación:**
```typescript
static async analyzePDFDocument(
  documentUri: string,
  documentName: string,
  userMessage: string,
  language: SupportedLanguage
): Promise<string> {
  // Convertir PDF a base64
  const base64Document = await FileSystem.readAsStringAsync(documentUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  // Enviar a Gemini con MIME type application/pdf
  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "application/pdf", data: base64Document } }
      ]
    }]
  };
}
```

---

## 🌐 BÚSQUEDA WEB INTELIGENTE

### **Detección Automática:**

#### **Palabras Clave por Idioma:**
```typescript
const laborKeywords = {
  es: ['horas trabajo', 'salario mínimo', 'vacaciones', 'contrato', 'despido'],
  en: ['working hours', 'minimum wage', 'salary', 'vacation', 'contract'],
  de: ['arbeitsstunden', 'mindestlohn', 'gehalt', 'urlaub', 'vertrag'],
  fr: ['heures travail', 'salaire minimum', 'vacances', 'contrat'],
  it: ['ore lavoro', 'salario minimo', 'stipendio', 'ferie', 'contratto']
};
```

#### **Detección de Ubicación:**
```typescript
const locationKeywords = {
  es: ['país estoy', 'dónde estoy', 'qué país', 'mi ubicación'],
  en: ['what country', 'where am i', 'my location', 'my country'],
  de: ['welches land', 'wo bin ich', 'mein standort'],
  fr: ['quel pays', 'où suis-je', 'ma localisation'],
  it: ['che paese', 'dove sono', 'la mia posizione']
};
```

### **Información por País:**

#### **Países Soportados (15+):**
- **Europa**: España, Francia, Alemania, Italia, Portugal, Reino Unido, Países Bajos, Bélgica, Suiza, Austria
- **Américas**: Estados Unidos, Canadá, México, Argentina, Brasil, Chile, Colombia, Perú
- **Otros**: Rusia, Japón, Turquía

#### **Fuentes Oficiales:**
```typescript
// España
{ url: 'https://www.mites.gob.es', title: 'Ministerio de Trabajo España' }
{ url: 'https://www.sepe.es', title: 'SEPE - Servicio Público de Empleo' }

// Francia
{ url: 'https://travail-emploi.gouv.fr', title: 'Ministère du Travail France' }
{ url: 'https://www.service-public.fr', title: 'Service Public France' }

// Alemania
{ url: 'https://www.bmas.de', title: 'Bundesministerium für Arbeit' }
{ url: 'https://www.arbeitsagentur.de', title: 'Bundesagentur für Arbeit' }
```

#### **Información Específica:**
```typescript
// Ejemplo: España
getSpainLaborInfo(query: string): string {
  if (query.includes('salario') || query.includes('mínimo')) {
    return `
🏦 Salario Mínimo Interprofesional (SMI):
• €1.134 euros/mes (14 pagas)
• €15.876 euros/año
• Actualizado en 2024

📅 Jornada Laboral:
• Máximo: 40 horas semanales
• Descanso mínimo: 12 horas entre jornadas
• Máximo anual: 1.800 horas

🏖️ Vacaciones:
• Mínimo: 30 días naturales al año
    `;
  }
}
```

---

## 📊 PARSEO Y EXPORTACIÓN DE DATOS

### **ChatDataParser Service:**

#### **Detección de Horarios:**
```typescript
static hasWorkScheduleData(text: string): boolean {
  const patterns = [
    /👤\s*\*\*PERSONA:\*\*/,           // Formato con persona
    /📅\s*\*\*DÍAS DE TRABAJO:\*\*/,   // Formato con días
    /🕒\s*\*\*HORARIOS:\*\*/,          // Formato con horarios
    /📍\s*\*\*UBICACIÓN:\*\*/,         // Formato con ubicación
    /💰\s*\*\*TARIFA:\*\*/,            // Formato con tarifa
  ];
  
  return patterns.some(pattern => pattern.test(text));
}
```

#### **Parseo Estructurado:**
```typescript
static parseWorkSchedule(text: string): WorkScheduleData | null {
  const data: WorkScheduleData = {
    personName: '',
    workDays: [],
    schedule: '',
    location: '',
    rate: '',
    notes: ''
  };
  
  // Extraer persona
  const personMatch = text.match(/👤\s*\*\*PERSONA:\*\*\s*(.+?)(?=\n|$)/);
  if (personMatch) data.personName = personMatch[1].trim();
  
  // Extraer días de trabajo
  const daysMatch = text.match(/📅\s*\*\*DÍAS DE TRABAJO:\*\*([\s\S]*?)(?=🕒|\n\n|$)/);
  if (daysMatch) {
    data.workDays = this.parseDaysOfWeek(daysMatch[1]);
  }
  
  return data;
}
```

#### **Conversión a WorkDays:**
```typescript
static convertToWorkDays(parsedData: WorkScheduleData, jobId: string): WorkDay[] {
  const workDays: WorkDay[] = [];
  
  parsedData.workDays.forEach(dayInfo => {
    const workDay: WorkDay = {
      id: Date.now() + Math.random(),
      date: dayInfo.date,
      type: 'work',
      jobId: jobId,
      startTime: dayInfo.startTime,
      endTime: dayInfo.endTime,
      breakTime: dayInfo.breakDuration,
      notes: `${parsedData.personName} - ${dayInfo.notes || ''}`.trim(),
      location: parsedData.location,
      isAutoTimer: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    workDays.push(workDay);
  });
  
  return workDays;
}
```

---

## 💾 GESTIÓN DE CACHÉ Y PERSISTENCIA

### **Sistema de Cache (EnhancedAIService):**

#### **Configuración:**
```typescript
private static cache = new Map<string, { data: string; timestamp: number; ttl: number }>();
private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutos

// Generación de claves
private static generateCacheKey(operation: string, input: string, language: string): string {
  const hash = this.simpleHash(input);
  return `${operation}:${language}:${hash}`;
}
```

#### **Operaciones:**
```typescript
// Obtener de cache
private static getFromCache(key: string): string | null {
  const cached = this.cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  if (cached) this.cache.delete(key); // Limpiar expirado
  return null;
}

// Guardar en cache
private static setInCache(key: string, data: string, ttl: number): void {
  this.cache.set(key, { data, timestamp: Date.now(), ttl });
  if (this.cache.size > 100) this.cleanupCache();
}
```

### **Persistencia de Historial:**

#### **AsyncStorage Keys:**
```typescript
const CHAT_HISTORY_KEY = 'chatbot_history_sessions';
const MAX_SESSIONS = 10;

interface ChatSession {
  id: string;
  date: Date;
  messages: ChatMessageData[];
  preview?: string;
}
```

#### **Operaciones:**
```typescript
// Cargar historial
const loadChatHistory = async () => {
  const storedSessions = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
  if (storedSessions) {
    const sessions = JSON.parse(storedSessions);
    const parsedSessions = sessions.map(session => ({
      ...session,
      date: new Date(session.date), // Convertir strings a Date
    }));
    setHistorySessions(parsedSessions);
  }
};

// Guardar sesión
const saveChatSession = async () => {
  if (messages.length === 0) return;
  
  const newSession: ChatSession = {
    id: Date.now().toString(),
    date: new Date(),
    messages: messages,
    preview: messages[0]?.text || '',
  };
  
  const updatedSessions = [newSession, ...historySessions].slice(0, MAX_SESSIONS);
  await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedSessions));
};
```

---

## 🔐 SEGURIDAD Y PRIVACIDAD

### **API Keys y Proxy:**

#### **Configuración Segura:**
```typescript
// GoogleVisionService y EnhancedAIService
private static readonly PROXY_URL = process.env.EXPO_PUBLIC_LOGIN_URL!;

// Las API keys están en el servidor, no en el cliente
const response = await fetch(this.PROXY_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    service: 'gemini', // o 'vision', 'openai'
    action: 'generateContent',
    model: 'gemini-1.5-pro',
    data: requestBody
  }),
});
```

### **Validación de Archivos:**

#### **Restricciones de Imágenes:**
```typescript
// En ImageOptimizationService (referenciado)
static async validateImage(imageUri: string): Promise<ValidationResult> {
  // Límite de 4MB por imagen
  // Formatos soportados: JPG, PNG, GIF
  // Compresión automática con calidad 0.7
  // Conversión a JPEG si es necesario
}
```

#### **Permisos de Sistema:**
```typescript
// Cámara
const { status } = await ImagePicker.requestCameraPermissionsAsync();
if (status !== 'granted') {
  Alert.alert(t('chatbot.permissions_needed'), t('chatbot.camera_permission_message'));
  return;
}

// Galería
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (status !== 'granted') {
  Alert.alert(t('chatbot.permissions_needed'), t('chatbot.gallery_permission_message'));
  return;
}
```

---

## ⚡ OPTIMIZACIONES Y RENDIMIENTO

### **Lazy Loading y Componentes:**
- **Renderizado Condicional**: Solo componentes visibles
- **FlatList Optimizada**: Para listas de mensajes largas
- **Memorización**: Evita re-renders innecesarios
- **Animaciones Nativas**: Reanimated para 60fps

### **Gestión de Memoria:**
```typescript
// Limpieza en desmontaje
useEffect(() => {
  return () => {
    if (messages.length > 0) {
      saveChatSession(); // Guardar sesión antes de salir
    }
    delete globalThis.chatbotScreenHistoryHandler; // Limpiar handler global
  };
}, [messages]);
```

### **Optimización de Imágenes:**
```typescript
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images' as MediaType],
  allowsEditing: false,
  quality: 0.7,        // Compresión automática
  base64: false,       // Solo URI, no base64 innecesario
});
```

### **Batch Updates:**
```typescript
// Agregar mensaje de usuario + mensaje de "pensando" en una operación
setMessages(prev => [...prev, userMessage, thinkingMessage]);

// Reemplazar mensaje de "pensando" con respuesta
setMessages(prev => prev.filter(msg => !msg.isThinking).concat(botMessage));
```

---

## 🧪 CASOS DE USO Y EJEMPLOS

### **1. Análisis de Plan de Trabajo:**

#### **Input del Usuario:**
- Foto de un horario semanal
- "Analiza este plan de trabajo"

#### **Procesamiento:**
1. GoogleVisionService.analyzeWorkPlan()
2. Detecta múltiples personas: "Juan", "María", "Carlos"
3. Genera botones interactivos de selección
4. Usuario selecciona "María"
5. Re-análisis específico para María
6. Respuesta estructurada con horarios de María

#### **Output Esperado:**
```
👤 **PERSONA:** María González

📅 **DÍAS DE TRABAJO:**
• Lunes: 09:00 - 17:00 (8 horas)
• Martes: 09:00 - 17:00 (8 horas)
• Miércoles: 09:00 - 17:00 (8 horas)
• Jueves: 09:00 - 17:00 (8 horas)
• Viernes: 09:00 - 15:00 (6 horas)

🕒 **HORARIOS:**
Jornada completa de lunes a jueves, viernes intensivo

📍 **UBICACIÓN:**
Oficina Central - Madrid

💰 **TARIFA:**
€15.50/hora

[Botón: Exportar al Calendario]
```

### **2. Consulta Legal Laboral:**

#### **Input del Usuario:**
- "¿Cuál es el salario mínimo en España?"

#### **Procesamiento:**
1. EnhancedAIService.detectLaborQuestion() → true
2. Detecta país: "España" (automático o del mensaje)
3. searchLaborInfo() con fuentes oficiales españolas
4. Genera respuesta con información actualizada

#### **Output Esperado:**
```
📊 **INFORMACIÓN LABORAL DE ESPAÑA** (2024)

🏦 **Salario Mínimo Interprofesional (SMI)**:
• €1.134 euros/mes (14 pagas)
• €15.876 euros/año
• Actualizado en 2024

📅 **Jornada Laboral**:
• Máximo: 40 horas semanales
• Descanso mínimo: 12 horas entre jornadas

🏖️ **Vacaciones**:
• Mínimo: 30 días naturales al año

⏰ **Horas Extra**:
• Límite: 80 horas anuales
• Compensación: +75% sobre salario base

Fuente: Ministerio de Trabajo y Economía Social de España (2024)
```

### **3. Procesamiento de PDF:**

#### **Input del Usuario:**
- Documento PDF con horarios
- "Extrae los horarios de este documento"

#### **Procesamiento:**
1. Verificación de suscripción premium
2. GoogleVisionService.analyzePDFDocument()
3. Conversión PDF a base64
4. Análisis con Gemini Vision
5. Respuesta estructurada

### **4. Conversación Contextual:**

#### **Secuencia de Mensajes:**
```
Usuario: [Envía imagen de horario]
Bot: "Veo varios nombres: Ana, Luis, Carmen. ¿De cuál quieres los horarios?"
Usuario: "Ana"
Bot: [Respuesta específica para Ana]
Usuario: "¿Y los domingos trabaja?"
Bot: [Respuesta contextual basada en la imagen anterior de Ana]
```

---

## 🔮 CASOS EDGE Y MANEJO DE ERRORES

### **Errores de Red:**
```typescript
try {
  const result = await GoogleVisionService.analyzeWorkPlan(imageUri, prompt, language);
} catch (error) {
  const errorMessage: ChatMessageData = {
    id: Date.now() + 1,
    text: t('chatbot.error_processing_request'),
    isUser: false,
    timestamp: new Date(),
  };
  setMessages(prev => prev.filter(msg => !msg.isThinking).concat(errorMessage));
}
```

### **Archivos Corruptos:**
- Validación previa con ImageOptimizationService
- Mensajes de error específicos por idioma
- Fallback a diferentes métodos de análisis

### **Respuestas Vacías:**
```typescript
if (!responseText || responseText.includes('Error')) {
  return VisionPrompts.getErrorMessage('noResponse', language);
}
```

### **Límites de API:**
- Cache inteligente para reducir llamadas
- Rotación automática entre proveedores
- Mensajes informativos sobre límites alcanzados

---

## 📈 MÉTRICAS Y ANALYTICS

### **AIAnalyticsService Integration:**
```typescript
// Tracking automático en EnhancedAIService
const insights = await AIAnalyticsService.getPerformanceInsights();
const stats = await AIAnalyticsService.getUsageStats();

// Métricas rastreadas:
- Tiempo de respuesta promedio
- Tasa de éxito por proveedor
- Costos por request
- Errores más comunes
- Uso de cache vs API calls
```

### **Reportes de Salud:**
```typescript
static async getServiceHealth(): Promise<{
  overallHealth: 'excellent' | 'good' | 'degraded' | 'poor';
  providers: Record<string, { available: boolean; latency: number; reliability: number }>;
  recommendations: string[];
  costEfficiency: { totalSpent: number; averageCost: number; trend: string };
}> {
  // Análisis automático de rendimiento y recomendaciones
}
```

---

## 🚧 LIMITACIONES Y CONSIDERACIONES

### **Limitaciones Técnicas:**
1. **Tamaño de Archivo**: Máximo 4MB por imagen
2. **Formatos**: Solo JPG, PNG, GIF para imágenes; solo PDF para documentos
3. **Idiomas OCR**: Mejor rendimiento en idiomas latinos
4. **Contexto**: Máximo 10 mensajes de historial por conversación

### **Limitaciones de Suscripción:**
1. **Usuarios Gratuitos**: Solo chat de texto, sin archivos
2. **Rate Limits**: Límites de API por minuto/día
3. **Países Soportados**: 15+ países para información laboral
4. **Almacenamiento**: Máximo 10 sesiones de chat guardadas

### **Consideraciones de Privacidad:**
1. **Almacenamiento Local**: Todo el historial se guarda localmente
2. **Sin Servidor**: No se almacenan conversaciones en servidores propios
3. **APIs Externas**: Las imágenes/PDFs se envían a Google/OpenAI temporalmente
4. **Limpieza Automática**: Cache se limpia automáticamente

---

## 🔄 CICLO DE VIDA Y ESTADOS

### **Estados de la Conversación:**
```typescript
enum ConversationState {
  IDLE = 'idle',                    // Estado inicial
  PROCESSING = 'processing',        // Procesando respuesta
  WAITING_PERSON = 'waiting_person', // Esperando selección de persona
  WAITING_CLARIFICATION = 'waiting_clarification', // Esperando clarificación
  SEARCHING = 'searching'           // Buscando información web
}
```

### **Transiciones de Estado:**
```typescript
// IDLE → PROCESSING (usuario envía mensaje)
setIsLoading(true);
setMessages(prev => [...prev, userMessage, thinkingMessage]);

// PROCESSING → WAITING_PERSON (bot detecta múltiples personas)
if (isAskingForPersonSelection(responseText)) {
  setWaitingForPersonSelection(true);
}

// WAITING_PERSON → PROCESSING (usuario selecciona persona)
setWaitingForPersonSelection(false);
setIsLoading(true);

// PROCESSING → IDLE (respuesta completada)
setIsLoading(false);
setMessages(prev => prev.filter(msg => !msg.isThinking).concat(botMessage));
```

---

## 📱 RESPONSIVE DESIGN Y ACCESIBILIDAD

### **Adaptación Visual:**
```typescript
const styles = getStyles(colors, isDark); // Estilos dinámicos por tema

// Tema claro/oscuro automático
botMessage: {
  backgroundColor: isDark ? colors.surface : '#F2F2F7',
}

// Adaptación de colores
imageButton: {
  backgroundColor: isDark ? colors.primary + '30' : colors.primary + '15',
}
```

### **Características de Accesibilidad:**
- **Contraste Alto**: Cumple WCAG AA
- **Tamaños de Fuente**: Escalables según configuración del sistema
- **Feedback Háptico**: Confirmaciones táctiles
- **Lectores de Pantalla**: Compatible con TalkBack/VoiceOver
- **Navegación por Teclado**: Soporte completo en componentes

---

## 🛠️ **MEJORAS TÉCNICAS IMPLEMENTADAS (2024)**

### **💡 Detección Contextual Avanzada**
```typescript
// Nueva función de detección con contexto conversacional
private static detectLaborQuestion(
  message: string, 
  conversationHistory: any[] = [] // ← NUEVO: Historial de conversación
): {
  isLaborQuestion: boolean;
  isLocationQuestion?: boolean;
  country?: string;
  topics?: string[];
}

// Análisis contextual mejorado
if (!isLaborQuestion && conversationHistory.length > 0) {
  const recentMessages = conversationHistory.slice(-10); // ← 10 vs 4 anterior
  
  // Patrones de seguimiento multiidioma
  const followUpPatterns = [
    /^(y|and)\s+(en|in|dans|in|на|で)\s+/i, // "Y en...", "And in..."
    /^(qué\s+tal|what\s+about|et\s+pour)/i, // "Qué tal...", "What about..."
    /^(también|also|aussi|auch|также)/i     // "También...", "Also..."
  ];
}
```

### **🌐 Sistema de Búsqueda Web Universal**
```typescript
// Búsqueda automática para cualquier país
if (!hasProgrammedInfo && country) {
  console.log(`🌐 [AUTO-SEARCH] No programmed info for ${country}, searching web...`);
  realInfo = await this.performRealWebSearch(query, country, language);
}

// Queries multiidioma nativas
const searchQueries: Record<SupportedLanguage, string> = {
  es: `legislación laboral ${country} salario mínimo horario trabajo 2024`,
  en: `labor law ${country} minimum wage working hours 2024`,
  de: `arbeitsrecht ${country} mindestlohn arbeitszeit 2024`,
  fr: `droit travail ${country} salaire minimum temps travail 2024`,
  it: `diritto lavoro ${country} salario minimo orario lavoro 2024`,
  pt: `legislação trabalhista ${country} salário mínimo horário trabalho 2024`,
  nl: `arbeidsrecht ${country} minimumloon werkuren 2024`,
  tr: `çalışma hukuku ${country} asgari ücret çalışma saatleri 2024`,
  ja: `労働法 ${country} 最低賃金 労働時間 2024`,
  ru: `трудовое право ${country} минимальная зарплата рабочее время 2024`
};
```

### **🗣️ Prompts Localizados Completos**
```typescript
// Sistema completo de prompts multiidioma
private static getLocalizedPrompts(language: SupportedLanguage): {
  expertPrompt: string;
  userContext: string;
  autoDetected: string;
  byLanguage: string;
  instructions: string;
  locationFound: string;
  locationExplanation: string;
  locationQuestion: string;
  locationNotFound: string;
  locationHelp: string;
  locationAsk: string;
}

// Ejemplo para japonés:
ja: {
  expertPrompt: "あなたは国際労働法の専門家です。",
  userContext: "ユーザーのコンテキスト: ユーザーは",
  instructions: `指示:
- 提供された検索情報で直接回答してください
- 更新された情報にアクセスできないとは言わないでください`
}
```

### **⚡ Flujo Mejorado de Inteligencia**
```typescript
// Flujo completo mejorado:
1. detectLaborQuestion(message, conversationHistory) // ← Con historial
2. if (hasRecentLaborContext && detectedCountry) → isLaborQuestion = true
3. if (!hasProgrammedInfo) → performRealWebSearch()
4. enhancedMessage = localPrompts.expertPrompt + searchResult.info
5. result = await AI.getChatResponseWithContext(enhancedMessage, history)
```

---

## 🎯 CONCLUSIONES

### **Fortalezas del Sistema:**
1. **Arquitectura Modular**: Servicios bien separados y reutilizables
2. **Multimodalidad**: Soporte completo para texto, imágenes y PDFs  
3. **🆕 Inteligencia Contextual Avanzada**: Mantiene contexto de 10 mensajes con inferencia inteligente
4. **🆕 Internacionalización Completa**: 10 idiomas con prompts nativos (ES, EN, DE, FR, IT, PT, NL, TR, JA, RU)
5. **Integración Profunda**: Exportación directa al sistema de calendario
6. **Rendimiento Optimizado**: Cache, lazy loading, animaciones nativas
7. **🆕 Búsqueda Web Universal**: Cualquier país del mundo con auto-búsqueda inteligente

### **Innovaciones Destacables:**
1. **🆕 Detección Contextual Revolucionaria**: Comprende preguntas sin palabras clave por contexto conversacional
2. **🆕 Búsqueda Legal Universal**: Cualquier país del mundo con auto-búsqueda si no tiene información
3. **Análisis Híbrido**: Combinación de múltiples servicios de IA (OpenAI + Google)
4. **Selección Interactiva**: Botones dinámicos para múltiples opciones  
5. **Parseo Inteligente**: Conversión automática de respuestas IA a datos estructurados
6. **Gestión de Estados**: Flujos complejos de conversación multi-turno
7. **🆕 Patrones de Seguimiento**: Reconoce "Y en Austria?" como pregunta laboral por contexto
8. **🆕 Prompts Nativos**: Instrucciones IA completamente traducidas en 10 idiomas

### **Casos de Uso Principales:**
1. **Análisis de Horarios**: Para managers y empleados
2. **Consultas Legales**: Para trabajadores y empresarios
3. **Procesamiento de Documentos**: Para automatización de tareas administrativas
4. **Extracción de Datos**: Para migración de información legacy
5. **Asistente Virtual**: Para dudas laborales generales

Este chatbot representa una implementación completa y sofisticada de IA conversacional multimodal, optimizada específicamente para el contexto laboral y la gestión de tiempo de trabajo, con capacidades avanzadas de análisis de documentos y búsqueda de información legal actualizada.

---

**📅 Documento actualizado**: Agosto 2024  
**🚀 Mejoras implementadas**: Inteligencia contextual avanzada, búsqueda web universal, soporte 10 idiomas  
**✨ Estado**: Chatbot completamente optimizado y funcional