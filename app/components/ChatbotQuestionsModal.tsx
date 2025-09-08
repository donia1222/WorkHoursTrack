import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectCountryFromCoordinates, getLocalizedCountryName } from '@/app/services/ChatbotWidgetService';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ChatbotQuestionsModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToChatbot: () => void;
  onQuestionSelect?: (question: string) => void;
  userLocation?: { latitude: number; longitude: number } | null;
}

interface QuestionSection {
  id: string;
  titleKey: string;
  icon: string;
  color: string;
  questions: string[];
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: screenHeight * 0.85,
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.separator,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
    opacity: 0.5,
  },
  sectionContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: isDark ? colors.border : colors.separator,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: isDark ? colors.primary + '15' : colors.primary + '08',
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.8,
  
  },
  expandIcon: {
    transform: [{ rotate: '0deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  questionsContainer: {
    backgroundColor: colors.surface,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  questionIcon: {
    marginLeft: 12,
    opacity: 0.6,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default function ChatbotQuestionsModal({
  visible,
  onClose,
  onNavigateToChatbot,
  onQuestionSelect,
  userLocation,
}: ChatbotQuestionsModalProps) {
  const { colors, isDark } = useTheme();
  const { language, t } = useLanguage();
  const styles = getStyles(colors, isDark);
  
  const [expandedSections, setExpandedSections] = useState<string[]>(['work_plans']);
  const [questionSections, setQuestionSections] = useState<QuestionSection[]>([]);
  
  // Animation values for drag gesture
  const translateY = useSharedValue(0);
  const modalOpacity = useSharedValue(1);

  // Reset animation when modal opens
  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      modalOpacity.value = 1;
    }
  }, [visible]);

  // Pan gesture for drag to close
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow downward dragging
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        // Fade out as user drags down
        modalOpacity.value = interpolate(
          event.translationY,
          [0, 150],
          [1, 0.5],
          Extrapolate.CLAMP
        );
      }
    })
    .onEnd((event) => {
      // If dragged down enough or velocity is high, close modal
      if (event.translationY > 100 || event.velocityY > 500) {
        // Close modal
        translateY.value = withSpring(screenHeight);
        modalOpacity.value = withSpring(0);
        runOnJS(onClose)();
      } else {
        // Snap back to original position
        translateY.value = withSpring(0);
        modalOpacity.value = withSpring(1);
      }
    });

  // Animated styles
  const animatedModalStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: modalOpacity.value,
    };
  });

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: modalOpacity.value,
    };
  });

  // Define question sections based on current language
  useEffect(() => {
    const loadQuestionSections = () => {
      // Categorized questions by section
      const sections: QuestionSection[] = [
        {
          id: 'work_plans',
          titleKey: 'chatbot.sections.work_plans',
          icon: 'document-text',
          color: colors.primary,
          questions: [
            t('chatbot.questions.analyze_pdf_schedule'),
            t('chatbot.questions.detect_multiple_people'),
            t('chatbot.questions.identify_free_days'),
            t('chatbot.questions.analyze_multiple_employees'),
          ],
        },
        {
          id: 'labor_queries',
          titleKey: 'chatbot.sections.labor_queries',
          icon: 'business',
          color: '#FF6B6B',
          questions: [
            t('chatbot.questions.minimum_wage_france'),
            t('chatbot.questions.labor_information_search'),
            t('chatbot.questions.legal_queries_work'),
            t('chatbot.questions.labor_legislation_italy'),
            t('chatbot.questions.official_sources_labor'),
            t('chatbot.questions.countries_labor_rights'),
            t('chatbot.questions.maximum_work_hours_spain'),
            t('chatbot.questions.collective_agreements'),
          ],
        },
        {
          id: 'my_work',
          titleKey: 'chatbot.sections.my_work',
          icon: 'person-circle',
          color: '#4ECDC4',
          questions: [
            t('chatbot.questions.find_work_country'),
            t('chatbot.questions.find_work_chef'),
            t('chatbot.questions.labor_laws_countries'),
            t('chatbot.questions.infer_intentions'),
          ],
        },
        {
          id: 'app_features',
          titleKey: 'chatbot.sections.app_features',
          icon: 'cog',
          color: '#45B7D1',
          questions: [
            t('chatbot.questions.sync_native_calendar'),
            t('chatbot.questions.export_app_calendar'),
            t('chatbot.questions.remember_context'),
          ],
        },
      ];

      setQuestionSections(sections);
    };

    if (visible) {
      loadQuestionSections();
    }
  }, [visible, language, colors.primary, t]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleQuestionSelect = async (question: string) => {
    try {
      // If we have a question callback (meaning we're already in chatbot), use it
      if (onQuestionSelect) {
        onQuestionSelect(question);
        onClose();
        return;
      }

      // Otherwise, store for navigation (original behavior)
      // Store the selected question
      await AsyncStorage.setItem('chatbot_initial_question', question);

      // Store location context if available
      if (userLocation) {
        try {
          const detectedCountry = await detectCountryFromCoordinates(
            userLocation.latitude, 
            userLocation.longitude
          );
          const localizedCountry = getLocalizedCountryName(detectedCountry, language);
          
          const contextMessages = {
            es: `[Contexto: Usuario ubicado en ${localizedCountry}. Si la pregunta es sobre legislación laboral o información específica de país, proporciona información relevante para ${localizedCountry}.]`,
            en: `[Context: User located in ${localizedCountry}. If the question is about labor legislation or country-specific information, provide relevant information for ${localizedCountry}.]`,
            de: `[Kontext: Benutzer befindet sich in ${localizedCountry}. Bei Fragen zur Arbeitsgesetzgebung oder länderspezifischen Informationen relevante Informationen für ${localizedCountry} bereitstellen.]`,
            fr: `[Contexte: Utilisateur situé en ${localizedCountry}. Si la question concerne la législation du travail ou des informations spécifiques au pays, fournir des informations pertinentes pour ${localizedCountry}.]`,
            it: `[Contesto: Utente situato in ${localizedCountry}. Se la domanda riguarda la legislazione del lavoro o informazioni specifiche del paese, fornire informazioni rilevanti per ${localizedCountry}.]`,
          };
          
          const contextMessage = contextMessages[language as keyof typeof contextMessages] || contextMessages['en'];
          
          await AsyncStorage.setItem('chatbot_user_location', JSON.stringify({
            country: detectedCountry,
            localizedCountry: localizedCountry,
            coordinates: userLocation,
            contextMessage: contextMessage,
          }));
        } catch (locationError) {
          console.warn('Failed to process location context:', locationError);
        }
      }

      // Close modal and navigate to chatbot
      onClose();
      onNavigateToChatbot();
      
    } catch (error) {
      console.warn('Failed to store selected question:', error);
      // Still navigate even if storage fails
      onClose();
      onNavigateToChatbot();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, animatedOverlayStyle]}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={{ flex: 1 }}>
              {/* Drag handle */}
              <View style={styles.dragHandle} />
              
              <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
                  <Ionicons name="chatbubbles" size={24} color={colors.primary} style={{ marginTop: 2 }} />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={[styles.title, { textAlign: 'left', fontSize: 18, }]}>Vix-Chat</Text>
                    <Text style={[styles.sectionSubtitle, { textAlign: 'left', fontSize: 12,  }]}>
                      {t('chatbot.modal.title')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {questionSections.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="chatbubble-ellipses" size={30} color={colors.primary} />
                </View>
                <Text style={styles.emptyStateTitle}>{t('chatbot.modal.loading')}</Text>
                <Text style={styles.emptyStateText}>{t('chatbot.modal.loading_desc')}</Text>
              </View>
            ) : (
              questionSections.map((section) => (
                <View key={section.id} style={styles.sectionContainer}>
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => toggleSection(section.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sectionIcon, { backgroundColor: section.color + '20' }]}>
                      <Ionicons name={section.icon as any} size={22} color={section.color} />
                    </View>
                    <View style={styles.sectionTitleContainer}>
                      <Text style={styles.sectionTitle}>{t(section.titleKey)}</Text>
                      <Text style={styles.sectionSubtitle}>
                        {section.questions.length} {t('chatbot.modal.questions')}
                      </Text>
                    </View>
                    <Animated.View style={expandedSections.includes(section.id) ? styles.expandIconRotated : styles.expandIcon}>
                      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </Animated.View>
                  </TouchableOpacity>

                  {expandedSections.includes(section.id) && (
                    <View style={styles.questionsContainer}>
                      {section.questions.map((question, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.questionItem}
                          onPress={() => handleQuestionSelect(question)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.questionText}>{question}</Text>
                          <Ionicons 
                            name="arrow-forward" 
                            size={16} 
                            color={colors.textSecondary} 
                            style={styles.questionIcon}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
            </BlurView>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Modal>
  );
}