import React, { useState, useRef } from 'react';
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

export default function ChatbotScreen() {
  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: 0,
      text: '¡Hola! Soy tu asistente especializado en análisis de planes de trabajo. Puedo:\n\n📅 Analizar imágenes y documentos PDF de horarios laborales\n🔍 Extraer días de trabajo, horarios y turnos\n🏖️ Identificar días libres y vacaciones\n👥 Detectar múltiples personas y preguntar de quién extraer datos\n🧠 Recordar el contexto de nuestra conversación\n📊 Organizar la información de forma clara\n\n📸 Envía una foto o 📄 documento PDF de tu plan de trabajo.\n💡 Escribe "reset" para empezar de nuevo.',
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | undefined>(undefined);
  const [selectedDocument, setSelectedDocument] = useState<{ uri: string; name: string; type: string } | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Estado para mantener contexto de la última imagen/documento analizado
  const [lastAnalyzedImage, setLastAnalyzedImage] = useState<{ uri: string } | null>(null);
  const [lastAnalyzedDocument, setLastAnalyzedDocument] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [waitingForPersonSelection, setWaitingForPersonSelection] = useState(false);
  
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
        Alert.alert('Permisos necesarios', 'Necesitamos permisos para acceder a tu galería de fotos.');
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
      Alert.alert('Error al seleccionar imagen', `${(error as Error).message || 'Error desconocido'}`);
    }
  };

  const takePhoto = async () => {
    try {
      console.log('📸 Iniciando captura de foto...');

      // Solicitar permisos para cámara
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos necesarios', 'Necesitamos permisos para acceder a tu cámara.');
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
      Alert.alert('Error al tomar foto', `${(error as Error).message || 'Error desconocido'}`);
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
      Alert.alert('Error al seleccionar documento', `${(error as Error).message || 'Error desconocido'}`);
    }
  };

  const showFileOptions = () => {
    Alert.alert(
      'Seleccionar archivo',
      '¿Qué tipo de archivo quieres analizar?',
      [
        { text: 'Galería de fotos', onPress: pickImage },
        { text: 'Tomar foto', onPress: takePhoto },
        { text: 'Documento PDF', onPress: pickDocument },
        { text: 'Cancelar', style: 'cancel' },
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
            responseText = await GoogleVisionService.getChatResponse(`El usuario subió un documento PDF llamado "${documentToAnalyze.name}" y quiere extraer texto. Los PDFs no se pueden procesar directamente para OCR. Sugiere convertir el PDF a imagen o usar herramientas especializadas.`);
          } else {
            // Procesamiento de imagen
            const extractedText = await GoogleVisionService.extractTextOnly(fileUri!);
            console.log('📄 [CHAT] Texto extraído:', extractedText);
            
            if (!extractedText || extractedText === 'No se detectó texto en la imagen') {
              console.log('⚠️ [CHAT] No se detectó texto, enviando mensaje de error');
              responseText = await GoogleVisionService.getChatResponse('No encontré texto legible en esta imagen de plan de trabajo. ¿Puedes intentar con una imagen más clara?');
            } else {
              console.log('✅ [CHAT] Texto extraído exitosamente, analizando...');
              responseText = await GoogleVisionService.getChatResponse(`📝 TEXTO EXTRAÍDO DEL PLAN DE TRABAJO:\n\n"${extractedText}"\n\n${inputText}\n\nAhora analizo este texto para identificar días de trabajo, horarios y vacaciones.`);
            }
          }
        } else {
          console.log('🔍 [CHAT] Análisis híbrido de plan de trabajo');
          
          if (isDocument) {
            console.log('📄 [CHAT] Analizando documento PDF con Gemini');
            responseText = await GoogleVisionService.analyzePDFDocument(
              fileUri!,
              documentToAnalyze.name,
              inputText || 'Analiza este documento PDF de plan de trabajo y extrae los días laborales, días libres y vacaciones'
            );
          } else {
            console.log('🖼️ [CHAT] Analizando imagen con Gemini Vision');
            responseText = await GoogleVisionService.analyzeWorkPlan(
              fileUri!, 
              inputText || 'Analiza este plan de trabajo y extrae los días laborales, días libres y vacaciones'
            );
          }
          
          // Detectar si el bot preguntó por múltiples nombres
          if (responseText.includes('¿De cuál persona quieres que extraiga los horarios?')) {
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
            `Extrae los horarios específicamente de "${inputText}". ${inputText}`
          );
        } else if (lastAnalyzedImage) {
          console.log('🖼️ [CHAT] Analizando imagen con persona seleccionada');
          responseText = await GoogleVisionService.analyzeWorkPlan(
            lastAnalyzedImage.uri,
            `Extrae los horarios específicamente de "${inputText}". ${inputText}`
          );
        }
        
        // Limpiar solo el estado de espera, mantener el archivo activo
        setWaitingForPersonSelection(false);
        
      } else {
        console.log('💬 [CHAT] Solo texto, sin imagen');
        
        // Comandos especiales
        if (inputText.toLowerCase().includes('limpiar contexto') || inputText.toLowerCase().includes('reset') || inputText.toLowerCase().includes('nueva imagen')) {
          console.log('🧹 [CHAT] Limpiando contexto por comando del usuario');
          setLastAnalyzedImage(null);
          setLastAnalyzedDocument(null);
          setWaitingForPersonSelection(false);
          responseText = '✅ Contexto limpiado. Ahora puedes enviar una nueva imagen o documento PDF de plan de trabajo o hacer consultas generales.';
        } else {
          // Obtener historial de conversación
          const history = getConversationHistory();
          
          // Si hay archivo activo (imagen o documento), usar contexto conversacional
          if (lastAnalyzedImage) {
            console.log('🧠 [CHAT] Usando contexto conversacional con imagen activa');
            responseText = await GoogleVisionService.getChatResponseWithContext(
              inputText, 
              history, 
              lastAnalyzedImage.uri
            );
          } else if (lastAnalyzedDocument) {
            console.log('🧠 [CHAT] Usando contexto conversacional con documento PDF activo');
            responseText = await GoogleVisionService.getChatResponseWithContext(
              inputText + `\n\nContexto: Hay un documento PDF activo llamado "${lastAnalyzedDocument.name}" que fue analizado previamente.`, 
              history
            );
          } else {
            console.log('💬 [CHAT] Respuesta simple sin contexto de archivo');
            responseText = await GoogleVisionService.getChatResponseWithContext(
              inputText, 
              history
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
        text: 'Lo siento, hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.',
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


  const renderMessage = ({ item }: { item: ChatMessageData }) => (
    <ChatMessage message={item} />
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
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
            <Ionicons name="document" size={24} color="#007AFF" />
            <Text style={styles.documentName}>{selectedDocument.name}</Text>
            <TouchableOpacity 
              onPress={() => setSelectedDocument(undefined)}
              style={styles.removeButton}
            >
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity 
          onPress={showFileOptions} 
          style={styles.imageButton}
          activeOpacity={0.7}
        >
          <Ionicons name="attach" size={24} color="#007AFF" />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={waitingForPersonSelection ? "Escribe el nombre de la persona..." : "Escribe tu mensaje aquí..."}
          placeholderTextColor="#666666"
          multiline
          maxLength={500}
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
              color={(!inputText.trim() && !selectedImage && !selectedDocument) ? '#CCCCCC' : '#FFFFFF'} 
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  imageButton: {
    padding: 12,
    marginRight: 12,
    marginBottom: 4,
    borderRadius: 25,
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  textInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    maxHeight: 120,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sendButton: {
    padding: 12,
    marginLeft: 12,
    marginBottom: 4,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  sendButtonDisabled: {
    display: 'none',
  },
  documentPreview: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginLeft: 8,
  },
  removeButton: {
    padding: 4,
  },
});