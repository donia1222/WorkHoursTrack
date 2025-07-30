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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MediaType } from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { GoogleVisionService } from '@/app/services/GoogleVisionService';
import ChatMessage, { ChatMessageData } from '@/app/components/ChatMessage';
import ImagePreview from '@/app/components/ImagePreview';
import WelcomeMessage from '@/app/components/WelcomeMessage';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useTheme, ThemeColors } from '@/app/contexts/ThemeContext';
import { useNavigation } from '@/app/context/NavigationContext';
import { JobService } from '@/app/services/JobService';

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: isDark ? 0.05 : 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  imageButton: {
    padding: 12,
    marginRight: 12,
    marginBottom: 4,
    borderRadius: 25,
    backgroundColor: isDark ? colors.primary + '20' : '#F0F8FF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  textInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
    maxHeight: 120,
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: isDark ? 0.1 : 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
});

export default function ChatbotScreen() {
  const { language, t } = useLanguage(); // Obtener idioma actual y función de traducción
  const { colors, isDark } = useTheme(); // Obtener colores del tema actual
  const { exportToCalendar } = useNavigation(); // Obtener función de exportación
  const styles = getStyles(colors, isDark); // Generar estilos dinámicos
  
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | undefined>(undefined);
  const [selectedDocument, setSelectedDocument] = useState<{ uri: string; name: string; type: string } | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  
  // Estado para mantener contexto de la última imagen/documento analizado
  const [lastAnalyzedImage, setLastAnalyzedImage] = useState<{ uri: string } | null>(null);
  const [lastAnalyzedDocument, setLastAnalyzedDocument] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [waitingForPersonSelection, setWaitingForPersonSelection] = useState(false);

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
  }, []);
  
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
  
  // Función para obtener historial de conversación (últimos 10 mensajes)
  const getConversationHistory = () => {
    return messages.slice(-10).map(msg => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.text,
      hasImage: !!msg.image,
      hasDocument: !!msg.document
    }));
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

  const sendMessage = async () => {
    console.log('💬 [CHAT] Iniciando sendMessage...');
    console.log('📝 [CHAT] Input text:', inputText);
    console.log('🖼️ [CHAT] Selected image:', selectedImage ? 'Sí' : 'No');
    console.log('📄 [CHAT] Selected document:', selectedDocument ? 'Sí' : 'No');
    
    if (!inputText.trim() && !selectedImage && !selectedDocument) {
      console.log('⚠️ [CHAT] No hay contenido para enviar, cancelando...');
      return;
    }

    const userMessage: ChatMessageData = {
      id: Date.now(),
      text: inputText,
      image: selectedImage,
      document: selectedDocument,
      isUser: true,
      timestamp: new Date(),
    };

    console.log('👤 [CHAT] Mensaje de usuario creado:', userMessage);
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInputText('');
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
            console.log('💬 [CHAT] Respuesta simple sin contexto de archivo');
            responseText = await GoogleVisionService.getChatResponseWithContext(
              inputText, 
              history,
              undefined,
              language // 🔥 AGREGADO: idioma actual
            );
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
      setMessages(prev => [...prev, botMessage]);
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
      setMessages(prev => [...prev, errorMessage]);
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
    <KeyboardAvoidingView 
      style={styles.container} 
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
            />
          );
        }}
        keyExtractor={(item, index) => messages.length === 0 ? 'welcome' : item.id.toString()}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

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

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              {selectedImage || selectedDocument 
                ? t('chatbot.analyzing_document')
                : t('chatbot.generating_response')
              }
            </Text>
          </View>
        </View>
      )}

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
          placeholder={waitingForPersonSelection ? t('chatbot.placeholder_waiting') : t('chatbot.placeholder_default')}
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
          editable={!isLoading}
        />

        <TouchableOpacity 
          onPress={sendMessage} 
          style={[
            styles.sendButton,
            (isLoading || (!inputText.trim() && !selectedImage && !selectedDocument)) && styles.sendButtonDisabled
          ]}
          disabled={isLoading || (!inputText.trim() && !selectedImage && !selectedDocument)}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons 
              name="send" 
              size={20} 
              color={(!inputText.trim() && !selectedImage && !selectedDocument) ? colors.textTertiary : '#FFFFFF'} 
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

