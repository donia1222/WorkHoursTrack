import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  SafeAreaView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as ImagePicker from 'expo-image-picker';
import { MediaType } from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { GoogleVisionService } from '@/app/services/GoogleVisionService';
import { EnhancedAIService, WebSearchResult } from '@/app/services/EnhancedAIService';
import ChatMessage, { ChatMessageData } from '@/app/components/ChatMessage';
import ImagePreview from '@/app/components/ImagePreview';
import WelcomeMessage from '@/app/components/WelcomeMessage';
import { useLanguage, SupportedLanguage } from '@/app/contexts/LanguageContext';
import { useTheme, ThemeColors } from '@/app/contexts/ThemeContext';
import { useNavigation, useBackNavigation } from '@/app/context/NavigationContext';
import { useSubscription } from '@/app/hooks/useSubscription';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHapticFeedback } from '@/app/hooks/useHapticFeedback';
import { JobService } from '@/app/services/JobService';
import { LinearGradient } from 'expo-linear-gradient';
import ChatHistoryModal, { ChatSession } from '@/app/components/ChatHistoryModal';

const CHAT_HISTORY_KEY = 'chatbot_history_sessions';
const MAX_SESSIONS = 10;

// Función para detectar automáticamente el idioma del mensaje
const detectLanguageFromText = (text: string): SupportedLanguage => {
  const lowerText = text.toLowerCase();
  
  // Palabras clave por idioma para detección básica
  const languageKeywords = {
    'es': ['trabajo', 'empleo', 'buscar', 'donde', 'país', 'salario', 'laboral', 'sueldo', 'empresa', 'jefe', 'horario'],
    'en': ['work', 'job', 'employment', 'where', 'country', 'salary', 'labor', 'company', 'boss', 'schedule', 'how', 'can', 'check', 'minimum', 'wage', 'france', 'spain', 'germany', 'find', 'search', 'looking', 'what', 'when', 'why', 'which', 'hours', 'pay', 'rate', 'contract', 'employee', 'employer', 'workplace', 'office', 'career', 'position'],
    'de': ['arbeit', 'job', 'beschäftigung', 'wo', 'land', 'gehalt', 'arbeits', 'unternehmen', 'chef', 'zeitplan', 'kann', 'ich', 'mein', 'meinem'],
    'fr': ['travail', 'emploi', 'où', 'pays', 'salaire', 'entreprise', 'patron', 'horaire'],
    'it': ['lavoro', 'impiego', 'dove', 'paese', 'stipendio', 'azienda', 'capo', 'orario'],
    'pt': ['trabalho', 'emprego', 'onde', 'país', 'salário', 'empresa', 'chefe', 'horário'],
    'nl': ['werk', 'baan', 'waar', 'land', 'salaris', 'bedrijf', 'baas', 'schema'],
    'tr': ['iş', 'çalışma', 'nerede', 'ülke', 'maaş', 'şirket', 'patron', 'program'],
    'ja': ['仕事', '就職', 'どこ', '国', '給料', '会社', '上司', 'スケジュール'],
    'ru': ['работа', 'работу', 'где', 'страна', 'зарплата', 'компания', 'начальник', 'график']
  };
  
  const scores: Record<SupportedLanguage, number> = {
    'es': 0, 'en': 0, 'de': 0, 'fr': 0, 'it': 0, 'pt': 0, 'nl': 0, 'tr': 0, 'ja': 0, 'ru': 0
  };
  
  // Contar coincidencias para cada idioma
  for (const [lang, keywords] of Object.entries(languageKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        scores[lang as SupportedLanguage]++;
      }
    }
  }
  
  // Encontrar el idioma con más coincidencias
  let maxScore = 0;
  let detectedLanguage: SupportedLanguage = 'es'; // fallback por defecto
  
  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLanguage = lang as SupportedLanguage;
    }
  }
  
  console.log(`🔍 [LANGUAGE-DETECTION] Text: "${text}" -> Detected: ${detectedLanguage} (score: ${maxScore})`);
  
  return detectedLanguage;
};

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,

    marginBottom: 75,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 24,
  },
  backButton: {
    position: 'absolute',
    left: 24,
    padding: 8,
  },
  headerText: {
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    color: colors.text,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,

    marginBottom: -10,
  },
  imageButton: {
    padding: 12,
    marginRight: 12,

    borderRadius: 25,
    backgroundColor: isDark ? colors.primary + '30' : colors.primary + '15',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  textInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 3,
    fontWeight: '400',
    color: colors.text,
    maxHeight: 110,
    backgroundColor: colors.surface,
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: isDark ? 0.05 : 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sendButton: {
    padding: 12,
    marginLeft: 12,
    marginBottom: 4,
    borderRadius: 25,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  sendButtonDisabled: {
    display: 'none',
  },
  documentPreview: {
    padding: 16,
    backgroundColor: isDark ? colors.card : '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 8,
  },
  removeButton: {
    padding: 4,
  },
  // Premium Modal Styles
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  premiumModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  premiumModalHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  premiumIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  premiumModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  premiumModalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  premiumModalContent: {
    padding: 24,
  },
  premiumFeaturesList: {
    marginBottom: 24,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  premiumFeatureText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    fontWeight: '500',
  },
  premiumModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  premiumCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  premiumCancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  premiumSubscribeButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    elevation: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  premiumSubscribeButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  searchIndicator: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  searchSources: {
    gap: 6,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  searchLoader: {
    marginTop: 8,
  },
});

export default function ChatbotScreen() {
  const { language, t } = useLanguage(); // Obtener idioma actual y función de traducción
  const { colors, isDark } = useTheme(); // Obtener colores del tema actual
  const { exportToCalendar, navigateTo } = useNavigation(); // Obtener función de exportación
  const { isSubscribed } = useSubscription(); // Obtener estado de suscripción
  const { handleBack } = useBackNavigation(); // Hook de navegación hacia atrás
  const { triggerHaptic } = useHapticFeedback(); // Hook de feedback háptico
  const styles = getStyles(colors, isDark); // Generar estilos dinámicos
  
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | undefined>(undefined);
  const [selectedDocument, setSelectedDocument] = useState<{ uri: string; name: string; type: string } | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySessions, setHistorySessions] = useState<ChatSession[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const locationContextRef = useRef<any>(null);
  
  // Estado para mantener contexto de la última imagen/documento analizado
  const [lastAnalyzedImage, setLastAnalyzedImage] = useState<{ uri: string } | null>(null);
  const [lastAnalyzedDocument, setLastAnalyzedDocument] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [waitingForPersonSelection, setWaitingForPersonSelection] = useState(false);
  const [waitingForClarification, setWaitingForClarification] = useState(false);
  const [searchingSources, setSearchingSources] = useState<WebSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Cargar trabajos al inicializar
  useEffect(() => {
    const loadJobs = async () => {
      try {
        const loadedJobs = await JobService.getJobs();
        setJobs(loadedJobs);
      } catch (error) {
        console.error('Error loading jobs:', error);
      }
    };
    
    loadJobs();
    loadChatHistory();
  }, []);

  // Check for initial question from dynamic widget
  useEffect(() => {
    const checkInitialQuestion = async () => {
      try {
        const initialQuestion = await AsyncStorage.getItem('chatbot_initial_question');
        if (initialQuestion) {
          setInputText(initialQuestion);
          // Clear the stored question
          await AsyncStorage.removeItem('chatbot_initial_question');
        }

        // Also check for user location data for context
        const userLocation = await AsyncStorage.getItem('chatbot_user_location');
        if (userLocation) {
          try {
            const locationData = JSON.parse(userLocation);
            console.log('User location context loaded:', locationData);
            // Store location context in a ref for AI requests (invisible to user)
            locationContextRef.current = locationData;
          } catch (parseError) {
            console.warn('Error parsing user location data:', parseError);
          }
          // Clear the stored location
          await AsyncStorage.removeItem('chatbot_user_location');
        }
      } catch (error) {
        console.warn('Error checking initial question:', error);
      }
    };

    checkInitialQuestion();
  }, []);

  // Register header history button handler
  useEffect(() => {
    // Register the history handler globally
    globalThis.chatbotScreenHistoryHandler = () => {
      setShowHistoryModal(true);
    };

    // Cleanup on unmount
    return () => {
      // Save current session if it has messages
      if (messages.length > 0) {
        saveChatSession();
      }
      delete globalThis.chatbotScreenHistoryHandler;
    };
  }, [messages]);
  
  // Función para detectar si el bot está preguntando por múltiples nombres (multiidioma)
  const isAskingForPersonSelection = (text: string): boolean => {
    // Usar las traducciones dinámicas para los patrones de detección
    const patterns = [
      t('chatbot.detection_patterns.person_selection_question'), // Pregunta principal
      t('chatbot.detection_patterns.multiple_names'), // "varios nombres" en idioma actual
      // Patrones adicionales para compatibilidad con otros idiomas
      'mehrere Namen', 'several names', 'plusieurs noms', 'diversi nomi', 'varios nombres'
    ];
    
    return patterns.some(pattern => text.includes(pattern));
  };

  // Función para detectar si el bot está pidiendo clarificación sobre ambigüedades
  const isAskingForClarification = (text: string): boolean => {
    const patterns = [
      '🤔', // Emoji de clarificación
      'necesito aclarar',
      'qué significa',
      'antes de continuar',
      'no entiendo',
      'podrías explicar',
      '¿qué quiere decir'
    ];
    
    return patterns.some(pattern => text.toLowerCase().includes(pattern.toLowerCase()));
  };
  
  // Función para obtener historial de conversación (últimos 10 mensajes)
  const getConversationHistory = () => {
    return messages.slice(-10).map(msg => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.text,
      hasImage: !!msg.image,
      hasDocument: !!msg.document
    }));
  };

  // Load chat history from AsyncStorage
  const loadChatHistory = async () => {
    try {
      const storedSessions = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (storedSessions) {
        const sessions = JSON.parse(storedSessions);
        // Convert date strings back to Date objects
        const parsedSessions = sessions.map((session: any) => ({
          ...session,
          date: new Date(session.date),
        }));
        setHistorySessions(parsedSessions);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Save current chat session
  const saveChatSession = async () => {
    try {
      if (messages.length === 0) return;

      const newSession: ChatSession = {
        id: Date.now().toString(),
        date: new Date(),
        messages: messages,
        preview: messages[0]?.text || '',
      };

      const updatedSessions = [newSession, ...historySessions].slice(0, MAX_SESSIONS);
      
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedSessions));
      setHistorySessions(updatedSessions);
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  };

  // Restore a chat session
  const restoreSession = (session: ChatSession) => {
    // Convert timestamp strings back to Date objects
    const messagesWithDates = session.messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
    setMessages(messagesWithDates);
    triggerHaptic('success');
  };

  // Delete a chat session
  const deleteSession = async (sessionId: string) => {
    try {
      const updatedSessions = historySessions.filter(s => s.id !== sessionId);
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedSessions));
      setHistorySessions(updatedSessions);
      triggerHaptic('success');
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const pickImage = async () => {
    try {
      console.log('🖼️ Iniciando selección de imagen...');

      // Solicitar permisos para galería
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('chatbot.permissions_needed'), t('chatbot.gallery_permission_message'));
        return;
      }

      // Abrir galería directamente con configuración mínima
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images' as MediaType],
        allowsEditing: false,
        quality: 0.7,
        base64: false,
      });

      console.log('📸 Resultado:', result);

      if (!result.canceled && result.assets?.[0]) {
        console.log('✅ Imagen seleccionada:', result.assets[0].uri);
        setSelectedImage({ uri: result.assets[0].uri });
      }
    } catch (error) {
      console.error('💥 Error:', error);
      Alert.alert(t('chatbot.error_selecting_image'), `${(error as Error).message || t('chatbot.unknown_error')}`);
    }
  };

  const takePhoto = async () => {
    try {
      console.log('📸 Iniciando captura de foto...');

      // Solicitar permisos para cámara
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('chatbot.permissions_needed'), t('chatbot.camera_permission_message'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images' as MediaType],
        allowsEditing: false,
        quality: 0.7,
        base64: false,
      });

      console.log('📸 Resultado:', result);

      if (!result.canceled && result.assets?.[0]) {
        console.log('✅ Foto capturada:', result.assets[0].uri);
        setSelectedImage({ uri: result.assets[0].uri });
      }
    } catch (error) {
      console.error('💥 Error:', error);
      Alert.alert(t('chatbot.error_taking_photo'), `${(error as Error).message || t('chatbot.unknown_error')}`);
    }
  };

  const pickDocument = async () => {
    try {
      console.log('📄 [DOCS] Iniciando selección de documento...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      console.log('📄 [DOCS] Resultado:', result);

      if (!result.canceled && result.assets?.[0]) {
        const doc = result.assets[0];
        console.log('✅ [DOCS] Documento seleccionado:', doc);
        
        if (doc.mimeType?.startsWith('image/')) {
          // Es una imagen, tratarla como imagen
          setSelectedImage({ uri: doc.uri });
        } else if (doc.mimeType === 'application/pdf') {
          // Es un PDF
          setSelectedDocument({ 
            uri: doc.uri, 
            name: doc.name || 'documento.pdf',
            type: doc.mimeType || 'application/pdf'
          });
        }
      }
    } catch (error) {
      console.error('💥 [DOCS] Error:', error);
      Alert.alert(t('chatbot.error_selecting_document'), `${(error as Error).message || t('chatbot.unknown_error')}`);
    }
  };

  const showFileOptions = () => {
    // Verificar si está suscrito
    if (!isSubscribed) {
      setShowPremiumModal(true);
      return;
    }

    Alert.alert(
      t('chatbot.select_file'),
      t('chatbot.file_type_question'),
      [
        { text: t('chatbot.photo_gallery'), onPress: pickImage },
        { text: t('chatbot.take_photo'), onPress: takePhoto },
        { text: t('chatbot.pdf_document'), onPress: pickDocument },
        { text: t('chatbot.cancel'), style: 'cancel' },
      ]
    );
  };

  const handlePersonSelection = async (personName: string) => {
    console.log('👤 [CHAT] Persona seleccionada mediante botón:', personName);
    
    // Crear mensaje del usuario
    const userMessage: ChatMessageData = {
      id: Date.now(),
      text: personName,
      image: undefined,
      document: undefined,
      isUser: true,
      timestamp: new Date(),
    };

    // Add thinking message
    const thinkingMessage: ChatMessageData = {
      id: Date.now() + 1,
      text: '',
      isUser: false,
      timestamp: new Date(),
      isThinking: true,
    };

    setMessages(prev => [...prev, userMessage, thinkingMessage]);
    setIsLoading(true);

    // Procesar la selección de persona
    try {
      let responseText = '';
      
      if (lastAnalyzedDocument) {
        console.log('📄 [CHAT] Analizando documento PDF con persona seleccionada:', personName);
        responseText = await GoogleVisionService.analyzePDFDocument(
          lastAnalyzedDocument.uri,
          lastAnalyzedDocument.name,
          t('chatbot.extract_specific_person', { personName }),
          language
        );
      } else if (lastAnalyzedImage) {
        console.log('🖼️ [CHAT] Analizando imagen con persona seleccionada:', personName);
        responseText = await GoogleVisionService.analyzeWorkPlan(
          lastAnalyzedImage.uri,
          t('chatbot.extract_specific_person', { personName }),
          language
        );
      }
      
      // Limpiar estado de espera
      setWaitingForPersonSelection(false);
      
      const botMessage: ChatMessageData = {
        id: Date.now() + 1,
        text: responseText,
        isUser: false,
        timestamp: new Date(),
      };

      // Remove thinking message and add bot response
      setMessages(prev => prev.filter(msg => !msg.isThinking).concat(botMessage));
      
    } catch (error) {
      console.error('❌ [CHAT] Error procesando selección de persona:', error);
      const errorMessage: ChatMessageData = {
        id: Date.now() + 1,
        text: t('chatbot.error_processing_request'),
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => prev.filter(msg => !msg.isThinking).concat(errorMessage));
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const sendMessage = async () => {

        if (!isSubscribed) {
      setShowPremiumModal(true);
      return;
    }
    console.log('💬 [CHAT] Iniciando sendMessage...');
    console.log('📝 [CHAT] Input text:', inputText);
    console.log('🖼️ [CHAT] Selected image:', selectedImage ? 'Sí' : 'No');
    console.log('📄 [CHAT] Selected document:', selectedDocument ? 'Sí' : 'No');
    
    if (!inputText.trim() && !selectedImage && !selectedDocument) {
      console.log('⚠️ [CHAT] No hay contenido para enviar, cancelando...');
      return;
    }

    // Verificar si está suscrito y tiene archivos adjuntos
    if (!isSubscribed && (selectedImage || selectedDocument)) {
      console.log('🔒 [CHAT] Usuario no suscrito intentando enviar archivo, mostrando modal premium');
      setShowPremiumModal(true);
      return;
    }

    // Guardar el texto antes de limpiarlo
    const messageText = inputText;
    
    // Limpiar el input INMEDIATAMENTE
    setInputText('');
    
    const userMessage: ChatMessageData = {
      id: Date.now(),
      text: messageText,
      image: selectedImage,
      document: selectedDocument,
      isUser: true,
      timestamp: new Date(),
    };

    // Add thinking message
    const thinkingMessage: ChatMessageData = {
      id: Date.now() + 1,
      text: '',
      isUser: false,
      timestamp: new Date(),
      isThinking: true,
    };

    console.log('👤 [CHAT] Mensaje de usuario creado:', userMessage);
    setMessages(prev => [...prev, userMessage, thinkingMessage]);
    setIsLoading(true);
    const imageToAnalyze = selectedImage;
    const documentToAnalyze = selectedDocument;
    setSelectedImage(undefined);
    setSelectedDocument(undefined);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      console.log('🔄 [CHAT] Procesando respuesta...');
      let responseText = '';

      if (imageToAnalyze || documentToAnalyze) {
        console.log('🖼️ [CHAT] Hay archivo para analizar');
        
        // Guardar para contexto futuro
        if (imageToAnalyze) {
          setLastAnalyzedImage({ uri: imageToAnalyze.uri });
          setLastAnalyzedDocument(null);
        } else if (documentToAnalyze) {
          setLastAnalyzedDocument({ 
            uri: documentToAnalyze.uri, 
            name: documentToAnalyze.name, 
            type: documentToAnalyze.type 
          });
          setLastAnalyzedImage(null);
        }
        
        const fileUri = imageToAnalyze?.uri || documentToAnalyze?.uri;
        const isDocument = !!documentToAnalyze;
        
        if (inputText.toLowerCase().includes('texto') || inputText.toLowerCase().includes('leer') || inputText.toLowerCase().includes('ocr')) {
          console.log('📝 [CHAT] Usuario pidió extracción de texto específicamente');
          
          if (isDocument) {
            console.log('📄 [CHAT] Procesando documento PDF para extracción de texto');
            responseText = await GoogleVisionService.getChatResponse(t('chatbot.pdf_not_supported', { documentName: documentToAnalyze.name }), language);
          } else {
            // Procesamiento de imagen
            const extractedText = await GoogleVisionService.extractTextOnly(fileUri!, language);
            console.log('📄 [CHAT] Texto extraído:', extractedText);
            
            if (!extractedText || extractedText === 'No se detectó texto en la imagen') {
              console.log('⚠️ [CHAT] No se detectó texto, enviando mensaje de error');
              responseText = await GoogleVisionService.getChatResponse(t('chatbot.error_no_text'), language);
            } else {
              console.log('✅ [CHAT] Texto extraído exitosamente, analizando...');
              responseText = await GoogleVisionService.getChatResponse(t('chatbot.text_extracted_message', { extractedText, inputText }), language);
            }
          }
        } else {
          console.log('🔍 [CHAT] Análisis híbrido de plan de trabajo');
          
          if (isDocument) {
            console.log('📄 [CHAT] Analizando documento PDF con Gemini');
            responseText = await GoogleVisionService.analyzePDFDocument(
              fileUri!,
              documentToAnalyze.name,
              inputText || t('chatbot.pdf_analysis_default'),
              language // 🔥 AGREGADO: idioma actual
            );
          } else {
            console.log('🖼️ [CHAT] Analizando imagen con Gemini Vision');
            responseText = await GoogleVisionService.analyzeWorkPlan(
              fileUri!, 
              inputText || t('chatbot.image_analysis_default'),
              language // 🔥 AGREGADO: idioma actual
            );
          }
          
          // Detectar si el bot preguntó por múltiples nombres (multiidioma)
          if (isAskingForPersonSelection(responseText)) {
            console.log('👥 [CHAT] Bot detectó múltiples nombres, activando modo de selección');
            setWaitingForPersonSelection(true);
          }
          
          // Detectar si el bot está pidiendo clarificación sobre ambigüedades
          if (isAskingForClarification(responseText)) {
            console.log('❓ [CHAT] Bot detectó ambigüedades, activando modo de clarificación');
            setWaitingForClarification(true);
          }
        }
      } else if (waitingForPersonSelection && (lastAnalyzedImage || lastAnalyzedDocument)) {
        console.log('👤 [CHAT] Usuario seleccionó persona, analizando con contexto');
        // El usuario está respondiendo a la pregunta de selección de persona
        
        if (lastAnalyzedDocument) {
          console.log('📄 [CHAT] Analizando documento PDF con persona seleccionada');
          responseText = await GoogleVisionService.analyzePDFDocument(
            lastAnalyzedDocument.uri,
            lastAnalyzedDocument.name,
            t('chatbot.extract_specific_person', { personName: inputText }),
            language // 🔥 AGREGADO: idioma actual
          );
        } else if (lastAnalyzedImage) {
          console.log('🖼️ [CHAT] Analizando imagen con persona seleccionada');
          responseText = await GoogleVisionService.analyzeWorkPlan(
            lastAnalyzedImage.uri,
            t('chatbot.extract_specific_person', { personName: inputText }),
            language // 🔥 AGREGADO: idioma actual
          );
        }
        
        // Limpiar solo el estado de espera, mantener el archivo activo
        setWaitingForPersonSelection(false);
        
      } else if (waitingForClarification && (lastAnalyzedImage || lastAnalyzedDocument)) {
        console.log('🔍 [CHAT] Usuario respondió clarificación, re-analizando con información adicional');
        // El usuario está respondiendo a la pregunta de clarificación
        
        const clarificationMessage = `Información adicional: ${inputText}. 

Ahora analiza el plan de trabajo completo con esta información. IMPORTANTE: Usa el formato exacto con emojis, separadores y estructura que especifica responseFormat.`;
        
        if (lastAnalyzedDocument) {
          console.log('📄 [CHAT] Re-analizando documento PDF con clarificación');
          responseText = await GoogleVisionService.analyzePDFDocument(
            lastAnalyzedDocument.uri,
            lastAnalyzedDocument.name,
            clarificationMessage,
            language
          );
        } else if (lastAnalyzedImage) {
          console.log('🖼️ [CHAT] Re-analizando imagen con clarificación');
          responseText = await GoogleVisionService.analyzeWorkPlan(
            lastAnalyzedImage.uri,
            clarificationMessage,
            language
          );
        }
        
        // Limpiar el estado de espera de clarificación
        setWaitingForClarification(false);
        
      } else {
        console.log('💬 [CHAT] Solo texto, sin imagen');
        
        // Comandos especiales (usar traducciones del idioma actual)
        const resetCommands = t('chatbot.reset_commands') as unknown as string[];
        const isResetCommand = resetCommands.some(cmd => inputText.toLowerCase().includes(cmd.toLowerCase()));
        
        if (isResetCommand) {
          console.log('🧹 [CHAT] Limpiando contexto por comando del usuario');
          setLastAnalyzedImage(null);
          setLastAnalyzedDocument(null);
          setWaitingForPersonSelection(false);
          setWaitingForClarification(false);
          responseText = t('chatbot.context_cleared');
        } else {
          // Obtener historial de conversación
          const history = getConversationHistory();
          
          // Si hay archivo activo (imagen o documento), usar contexto conversacional
          if (lastAnalyzedImage) {
            console.log('🧠 [CHAT] Usando contexto conversacional con imagen activa');
            responseText = await GoogleVisionService.getChatResponseWithContext(
              inputText, 
              history, 
              lastAnalyzedImage.uri,
              language // 🔥 AGREGADO: idioma actual
            );
          } else if (lastAnalyzedDocument) {
            console.log('🧠 [CHAT] Usando contexto conversacional con documento PDF activo');
            responseText = await GoogleVisionService.getChatResponseWithContext(
              inputText + t('chatbot.pdf_context_message', { documentName: lastAnalyzedDocument.name }), 
              history,
              undefined,
              language // 🔥 AGREGADO: idioma actual
            );
          } else {
            console.log('💬 [CHAT] Respuesta con EnhancedAIService');
            // Usar EnhancedAIService - solo muestra búsqueda si es pregunta laboral
            setSearchingSources([]);
            
            // First check if this is a labor question before adding location context
            const detectionResult = EnhancedAIService.detectQuestionType(inputText, history);
            
            // Check if user specified a country in their message - be more precise
            const hasCountryInMessage = detectionResult.country || 
              // Major cities that clearly indicate a specific country
              /(new york|nueva york|los angeles|san francisco|chicago|miami|boston|seattle|philadelphia|houston|dallas|atlanta|phoenix|denver|las vegas|detroit|minneapolis|cleveland|orlando|tampa|pittsburgh|baltimore|washington dc|nashville|charlotte|memphis|milwaukee|columbus|indianapolis|kansas city|virginia beach|sacramento|jacksonville|san diego|san jose|austin|fort worth|cincinnati|cleveland|tucson|tulsa|oakland|louisville|portland|oklahoma city|raleigh|miami|richmond|new orleans|birmingham|salt lake city|rochester|spokane|anchorage|honolulu)/i.test(inputText) ||
              /(london|londres|manchester|birmingham|liverpool|glasgow|edinburgh|cardiff|belfast|bristol|leeds|sheffield|nottingham|cambridge|oxford)/i.test(inputText) ||
              /(paris|parís|lyon|marseille|toulouse|nice|strasbourg|nantes|montpellier|bordeaux|lille|rennes|reims|toulon|saint-étienne|le havre|grenoble|dijon|angers|villeurbanne)/i.test(inputText) ||
              /(madrid|barcelona|sevilla|valencia|bilbao|málaga|murcia|palma|las palmas|valladolid|córdoba|vigo|gijón|hospitalet|vitoria|coruña|elche|oviedo|badalona|cartagena)/i.test(inputText) ||
              /(berlin|berlín|hamburg|munich|múnich|cologne|frankfurt|stuttgart|düsseldorf|dortmund|essen|leipzig|bremen|dresden|hannover|nürnberg|duisburg|bochum|wuppertal|bielefeld)/i.test(inputText) ||
              /(tokyo|tokio|osaka|kyoto|yokohama|nagoya|kobe|fukuoka|kawasaki|saitama|hiroshima|sendai|kitakyushu|chiba|sakai|niigata|hamamatsu|shizuoka|sagamihara|okayama)/i.test(inputText) ||
              /(sydney|melbourne|brisbane|perth|adelaide|canberra|darwin|hobart|townsville|cairns|toowoomba|ballarat|bendigo|albury|launceston|mackay|rockhampton|bundaberg|coffs harbour|wagga wagga)/i.test(inputText) ||
              /(toronto|montreal|vancouver|calgary|edmonton|ottawa|winnipeg|quebec city|hamilton|london|kitchener|halifax|victoria|windsor|oshawa|saskatoon|regina|sherbrooke|barrie|kelowna)/i.test(inputText) ||
              /(zurich|geneva|basel|bern|lausanne|winterthur|lucerne|st\. gallen|lugano|biel|thun|köniz|la chaux-de-fonds|fribourg|schaffhausen|chur|vernier|neuchâtel|uster|sion)/i.test(inputText) ||
              /(vienna|salzburg|innsbruck|graz|linz|klagenfurt|villach|wels|sankt pölten|dornbirn|steyr|wiener neustadt|feldkirch|bregenz|leonding|krems|traun|amstetten|kapfenberg|hallein)/i.test(inputText);
            
            // Add location context only if it's a labor question, we have location data, it's NOT asking about multiple countries, AND user didn't specify a country
            const messageToSend = (locationContextRef.current && detectionResult.isLaborQuestion && !detectionResult.isMultipleCountriesQuestion && !hasCountryInMessage) 
              ? `${inputText}\n\n${locationContextRef.current.contextMessage}`
              : inputText;
            
            // Detect the language from the user's message instead of using app language
            const detectedLanguage = detectLanguageFromText(inputText);
            const responseLanguage = detectedLanguage;
            
            const response = await EnhancedAIService.sendMessage(
              messageToSend,
              responseLanguage,
              history,
              (sources) => {
                // Solo mostrar indicador de búsqueda si hay fuentes
                if (sources && sources.length > 0) {
                  setIsSearching(true);
                  setSearchingSources(sources);
                  console.log('🔍 [CHAT] Buscando en:', sources.map(s => s.title));
                }
              }
            );
            
            // Clear location context after first use only if it was actually used
            if (detectionResult.isLaborQuestion && !detectionResult.isMultipleCountriesQuestion && locationContextRef.current) {
              locationContextRef.current = null;
            }
            
            setIsSearching(false);
            
            if (response.success) {
              responseText = response.data || '';
              if (response.searchingSources) {
                setSearchingSources(response.searchingSources);
              }
            } else {
              responseText = response.error || t('chatbot.error_processing_request');
            }
          }
        }
      }

      console.log('🤖 [CHAT] Respuesta generada:', responseText);

      const botMessage: ChatMessageData = {
        id: Date.now() + 1,
        text: responseText,
        isUser: false,
        timestamp: new Date(),
      };

      console.log('🤖 [CHAT] Mensaje del bot creado:', botMessage);
      // Remove thinking message and add bot response
      setMessages(prev => prev.filter(msg => !msg.isThinking).concat(botMessage));
      console.log('✅ [CHAT] Mensaje agregado a la lista');
      
    } catch (error) {
      console.error('❌ [CHAT] Error en sendMessage:', error);

      
      const errorMessage: ChatMessageData = {
        id: Date.now() + 1,
        text: t('chatbot.error_processing_request'),
        isUser: false,
        timestamp: new Date(),
      };
      
      console.log('⚠️ [CHAT] Mensaje de error creado:', errorMessage);
      // Remove thinking message and add error message
      setMessages(prev => prev.filter(msg => !msg.isThinking).concat(errorMessage));
    } finally {
      console.log('🔄 [CHAT] Finalizando sendMessage...');
      setIsLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      console.log('✅ [CHAT] sendMessage completado');
    }
  };


  const renderMessage = ({ item, index }: { item: ChatMessageData; index: number }) => {
    // Mostrar el mensaje de bienvenida como primer elemento si no hay mensajes
    if (messages.length === 0 && index === 0) {
      return <WelcomeMessage />;
    }
    return (
      <ChatMessage 
        message={item} 
        jobs={jobs} 
        onExportToCalendar={exportToCalendar}
      />
    );
  };

  const renderWelcomeHeader = () => {
    if (messages.length === 0) {
      return <WelcomeMessage />;
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      
    

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 0}
      >
      <FlatList
        ref={flatListRef}
        data={messages.length === 0 ? [{ id: -1, text: '', isUser: false, timestamp: new Date() }] : messages}
        renderItem={({ item, index }) => {
          if (messages.length === 0) {
            return <WelcomeMessage />;
          }
          return (
            <ChatMessage 
              message={item} 
              jobs={jobs} 
              onExportToCalendar={exportToCalendar}
              onSelectPerson={handlePersonSelection}
            />
          );
        }}
        keyExtractor={(item, index) => messages.length === 0 ? 'welcome' : item.id.toString()}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Web Search Indicator */}
      {(isSearching || searchingSources.length > 0) && (
        <View style={styles.searchIndicator}>
          <View style={styles.searchHeader}>
            <Ionicons name="search" size={16} color={colors.primary} />
            <Text style={styles.searchTitle}>
              {isSearching ? t('chatbot.searching_web') : t('chatbot.sources_consulted')}
            </Text>
          </View>
          {searchingSources.length > 0 && (
            <View style={styles.searchSources}>
              {searchingSources.map((source, index) => (
                <View key={index} style={styles.sourceItem}>
                  <Ionicons name="globe-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.sourceText} numberOfLines={1}>
                    {source.title || source.url}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {isSearching && (
            <ActivityIndicator 
              size="small" 
              color={colors.primary} 
              style={styles.searchLoader}
            />
          )}
        </View>
      )}

      {selectedImage && (
        <ImagePreview 
          image={selectedImage} 
          onRemove={() => setSelectedImage(undefined)} 
        />
      )}

      {selectedDocument && (
        <View style={styles.documentPreview}>
          <View style={styles.documentInfo}>
            <Ionicons name="document" size={24} color={colors.primary} />
            <Text style={styles.documentName}>{selectedDocument.name}</Text>
            <TouchableOpacity 
              onPress={() => setSelectedDocument(undefined)}
              style={styles.removeButton}
            >
              <Ionicons name="close-circle" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      )}


      {!isLoading && (
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            onPress={showFileOptions} 
            style={styles.imageButton}
            activeOpacity={0.7}
          >
            <Ionicons name="attach" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              waitingForPersonSelection ? t('chatbot.placeholder_waiting') : 
              waitingForClarification ? 'Explain to me what it means...' : 
              t('chatbot.placeholder_default')
            }
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
          />

          <TouchableOpacity 
            onPress={sendMessage} 
            style={[
              styles.sendButton,
              (!inputText.trim() && !selectedImage && !selectedDocument) && styles.sendButtonDisabled
            ]}
            disabled={!inputText.trim() && !selectedImage && !selectedDocument}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={(!inputText.trim() && !selectedImage && !selectedDocument) ? colors.textTertiary : '#FFFFFF'} 
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Premium Modal */}
      <Modal
        visible={showPremiumModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.premiumModalContainer}>
            <View style={styles.premiumModalHeader}>
              <View style={styles.premiumIcon}>
                <IconSymbol size={40} name="crown.fill" color="#000" />
              </View>
              <Text style={styles.premiumModalTitle}>
                {(() => {
                  switch (language) {
                    case 'es': return 'Chat Premium';
                    case 'en': return 'Premium Chat';
                    case 'de': return 'Premium Chat';
                    case 'fr': return 'Chat Premium';
                    case 'it': return 'Chat Premium';
                    default: return 'Premium Chat';
                  }
                })()}
              </Text>
              <Text style={styles.premiumModalSubtitle}>
                {(() => {
                  switch (language) {
                    case 'es': return 'Desbloquea funciones avanzadas de chat';
                    case 'en': return 'Unlock advanced chat features';
                    case 'de': return 'Erweiterte Chat-Funktionen freischalten';
                    case 'fr': return 'Débloquez les fonctionnalités de chat avancées';
                    case 'it': return 'Sblocca le funzionalità di chat avanzate';
                    default: return 'Unlock advanced chat features';
                  }
                })()}
              </Text>
            </View>

            <View style={styles.premiumModalContent}>
              <View style={styles.premiumFeaturesList}>
                <View style={styles.premiumFeatureItem}>
                  <View style={styles.premiumFeatureIcon}>
                    <IconSymbol size={18} name="photo.fill" color={colors.primary} />
                  </View>
                  <Text style={styles.premiumFeatureText}>
                    {(() => {
                      switch (language) {
                        case 'es': return 'Análisis de imágenes con IA';
                        case 'en': return 'AI image analysis';
                        case 'de': return 'KI-Bildanalyse';
                        case 'fr': return 'Analyse d\'images par IA';
                        case 'it': return 'Analisi delle immagini con IA';
                        default: return 'AI image analysis';
                      }
                    })()}
                  </Text>
                </View>
                
                <View style={styles.premiumFeatureItem}>
                  <View style={styles.premiumFeatureIcon}>
                    <IconSymbol size={18} name="doc.fill" color={colors.primary} />
                  </View>
                  <Text style={styles.premiumFeatureText}>
                    {(() => {
                      switch (language) {
                        case 'es': return 'Procesamiento de documentos PDF';
                        case 'en': return 'PDF document processing';
                        case 'de': return 'PDF-Dokumentenverarbeitung';
                        case 'fr': return 'Traitement de documents PDF';
                        case 'it': return 'Elaborazione di documenti PDF';
                        default: return 'PDF document processing';
                      }
                    })()}
                  </Text>
                </View>

                <View style={styles.premiumFeatureItem}>
                  <View style={styles.premiumFeatureIcon}>
                    <IconSymbol size={18} name="calendar.badge.plus" color={colors.primary} />
                  </View>
                  <Text style={styles.premiumFeatureText}>
                    {(() => {
                      switch (language) {
                        case 'es': return 'Exportación automática al calendario';
                        case 'en': return 'Automatic calendar export';
                        case 'de': return 'Automatischer Kalenderexport';
                        case 'fr': return 'Export automatique vers le calendrier';
                        case 'it': return 'Esportazione automatica del calendario';
                        default: return 'Automatic calendar export';
                      }
                    })()}
                  </Text>
                </View>

                <View style={styles.premiumFeatureItem}>
                  <View style={styles.premiumFeatureIcon}>
                    <IconSymbol size={18} name="wand.and.stars" color={colors.primary} />
                  </View>
                  <Text style={styles.premiumFeatureText}>
                    {(() => {
                      switch (language) {
                        case 'es': return 'Análisis inteligente de horarios';
                        case 'en': return 'Smart schedule analysis';
                        case 'de': return 'Intelligente Zeitplananalyse';
                        case 'fr': return 'Analyse intelligente des horaires';
                        case 'it': return 'Analisi intelligente degli orari';
                        default: return 'Smart schedule analysis';
                      }
                    })()}
                  </Text>
                </View>
              </View>

              <View style={styles.premiumModalActions}>
                <TouchableOpacity 
                  style={styles.premiumCancelButton}
                  onPress={() => setShowPremiumModal(false)}
                >
                  <Text style={styles.premiumCancelButtonText}>
                    {(() => {
                      switch (language) {
                        case 'es': return 'Cancelar';
                        case 'en': return 'Cancel';
                        case 'de': return 'Abbrechen';
                        case 'fr': return 'Annuler';
                        case 'it': return 'Annulla';
                        default: return 'Cancel';
                      }
                    })()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.premiumSubscribeButton}
                  onPress={() => {
                    setShowPremiumModal(false);
                    navigateTo('subscription');
                  }}
                >
                  <Text style={styles.premiumSubscribeButtonText}>
                    {(() => {
                      switch (language) {
                        case 'es': return 'Suscribirse';
                        case 'en': return 'Subscribe';
                        case 'de': return 'Abonnieren';
                        case 'fr': return 'S\'abonner';
                        case 'it': return 'Iscriviti';
                        default: return 'Subscribe';
                      }
                    })()}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Chat History Modal */}
      <ChatHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        sessions={historySessions}
        onRestoreSession={restoreSession}
        onDeleteSession={deleteSession}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
