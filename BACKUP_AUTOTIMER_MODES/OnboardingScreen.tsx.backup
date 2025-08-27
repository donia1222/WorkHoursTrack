import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TermsOfServiceModal from '../components/TermsOfServiceModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

interface WelcomeModalProps {
  visible: boolean;
  onClose: () => void;
  onDone?: () => Promise<void>;
  isOnboarding?: boolean;
}

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  color: string;
  requiresLocation?: boolean;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    paddingHorizontal: 20,

    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  placeholder: {
    width: 60,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  stepCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    marginHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    overflow: 'hidden',
    marginTop: -20,
  },
  stepCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  stepHeader: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  iconGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: '85%',
    letterSpacing: -0.2,
  },
  indicatorsContainer: {
    alignItems: 'center',
    marginVertical: -10,
  },
  indicators: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorActive: {
    width: 24,
  },
  stepCounter: {
    fontSize: 14,
    fontWeight: '600',
  },
  featuresCard: {
    marginVertical: 20,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  featuresCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  featureIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    flex: 1,
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  tipsCard: {
    marginVertical: 20,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 20,
    padding: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  tipsCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  tipIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  navigationButton: {
    flex: 1,
  },
  navigationButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  previousButton: {},
  nextButton: {},
  navigationButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  legalButtonsContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.1)', // Debug: red background to see if it renders
  },
  legalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  legalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});

const getOnboardingSteps = (colors: ThemeColors, t: (key: string) => string): OnboardingStep[] => [
  {
    title: t('onboarding.steps.location.title'),
    description: t('onboarding.steps.location.description'),
    icon: 'location.fill',
    color: colors.warning,
    requiresLocation: true,
  },
  {
    title: t('onboarding.steps.jobs.title'),
    description: t('onboarding.steps.jobs.description'),
    icon: 'briefcase.fill',
    color: colors.primary,
  },
  {
    title: t('onboarding.steps.calendar.title'),
    description: t('onboarding.steps.calendar.description'),
    icon: 'calendar',
    color: colors.success,
  },
  {
    title: t('onboarding.steps.timer.title'),
    description: t('onboarding.steps.timer.description'),
    icon: 'clock.fill',
    color: colors.success,
  },
  {
    title: t('onboarding.steps.statistics.title'),
    description: t('onboarding.steps.statistics.description'),
    icon: 'chart.bar.fill',
    color: colors.error,
  },
  {
    title: t('onboarding.steps.chatbot.title'),
    description: t('onboarding.steps.chatbot.description'),
    icon: 'message.fill',
    color: colors.primary,
  },
];

export default function WelcomeModal({ visible, onClose, onDone, isOnboarding = false }: WelcomeModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [locationPermissionRequested, setLocationPermissionRequested] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const onboardingSteps = getOnboardingSteps(colors, t);
  const screenWidth = Dimensions.get('window').width;
  
  const styles = getStyles(colors, isDark);

  // Reset to first step when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      console.log('🔍 OnboardingScreen: Reset to first step, currentStep = 0');
    }
  }, [visible]);

  // Debug current step
  useEffect(() => {
    console.log('🔍 OnboardingScreen: currentStep =', currentStep);
    console.log('🔍 OnboardingScreen: Should show legal buttons?', currentStep === 0);
  }, [currentStep]);

  const requestLocationPermission = async () => {
    try {
      setLocationPermissionRequested(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          t('onboarding.location.permission_title'),
          t('onboarding.location.permission_message'),
          [{ text: t('onboarding.location.permission_understood'), style: 'default' }]
        );
      }
      
      // Continue to next step regardless of result
      proceedToNextStep();
    } catch (error) {
      console.error('Error requesting location permission:', error);
      proceedToNextStep();
    }
  };

  const proceedToNextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (isOnboarding && onDone) {
      await onDone();
    } else {
      onClose();
    }
  };

  const handleNext = () => {
    const currentStepData = onboardingSteps[currentStep];
    
    // If this step requires location permissions and they haven't been requested
    if (currentStepData.requiresLocation && !locationPermissionRequested) {
      requestLocationPermission();
    } else {
      proceedToNextStep();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const openEmail = async () => {
    const email = 'info@lweb.ch';
    const subject = 'VixTime App - Contact';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        t('help_support.contact.email_error_title') || 'Email',
        email
      );
    }
  };

  const openTerms = () => {
    setShowTermsOfService(true);
  };

  const openPrivacy = () => {
    setShowPrivacyPolicy(true);
  };



  const currentStepData = onboardingSteps[currentStep];

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet" 
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Background Gradient */}
        <LinearGradient
          colors={isDark 
            ? ['rgba(99, 102, 241, 0.06)', 'rgba(139, 92, 246, 0.04)', 'rgba(59, 130, 246, 0.02)'] 
            : ['rgba(99, 102, 241, 0.04)', 'rgba(139, 92, 246, 0.03)', 'rgba(59, 130, 246, 0.02)']
          }
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Header with Close/Skip Button */}
        <View style={styles.header}>
          {!isOnboarding ? (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <IconSymbol size={20} name="xmark" color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.skipButton} onPress={handleComplete}>
              <Text style={[styles.skipButtonText, { color: colors.primary }]}>
                {t('onboarding.navigation.skip')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.stepContainer}>
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.stepCard}>
              <LinearGradient
                colors={isDark 
                  ? [`${currentStepData.color}15`, `${currentStepData.color}08`, 'transparent'] 
                  : [`${currentStepData.color}12`, `${currentStepData.color}06`, 'transparent']
                }
                style={styles.stepCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.stepHeader}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={[`${currentStepData.color}25`, `${currentStepData.color}15`]}
                    style={styles.iconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <IconSymbol 
                    size={56} 
                    name={currentStepData.icon as any} 
                    color={currentStepData.color} 
                  />
                </View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>{currentStepData.title}</Text>
                <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>{currentStepData.description}</Text>
              </View>
            </BlurView>
            
            {/* Legal buttons - Only show on location step (first step) */}
            {currentStep === 0 && (
              <View style={styles.legalButtonsContainer}>
                <Text style={{ color: 'red', fontSize: 18, textAlign: 'center' }}>DEBUG: LEGAL BUTTONS SHOULD BE HERE</Text>
                <TouchableOpacity 
                  style={[styles.legalButton, { 
                    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.08)',
                    borderColor: isDark ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.2)',
                  }]}
                  onPress={openEmail}
                >
                  <IconSymbol size={20} name="envelope.fill" color={colors.primary} />
                  <Text style={[styles.legalButtonText, { color: colors.primary }]}>
                    {t('help_support.contact.title')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.legalButton, { 
                    backgroundColor: isDark ? 'rgba(142, 142, 147, 0.1)' : 'rgba(142, 142, 147, 0.08)',
                    borderColor: isDark ? 'rgba(142, 142, 147, 0.3)' : 'rgba(142, 142, 147, 0.2)',
                  }]}
                  onPress={openTerms}
                >
                  <IconSymbol size={20} name="doc.text.fill" color={colors.textSecondary} />
                  <Text style={[styles.legalButtonText, { color: colors.textSecondary }]}>
                    {t('help_support.legal.terms')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.legalButton, { 
                    backgroundColor: isDark ? 'rgba(52, 199, 89, 0.1)' : 'rgba(52, 199, 89, 0.08)',
                    borderColor: isDark ? 'rgba(52, 199, 89, 0.3)' : 'rgba(52, 199, 89, 0.2)',
                  }]}
                  onPress={openPrivacy}
                >
                  <IconSymbol size={20} name="lock.fill" color={colors.success} />
                  <Text style={[styles.legalButtonText, { color: colors.success }]}>
                    {t('help_support.legal.privacy')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Step indicators */}
          <View style={styles.indicatorsContainer}>
            <View style={styles.indicators}>
              {onboardingSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    { backgroundColor: colors.separator },
                    index === currentStep && [styles.indicatorActive, { backgroundColor: colors.primary }],
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.stepCounter, { color: colors.textSecondary }]}>
              {t('onboarding.step_counter', { current: (currentStep + 1).toString(), total: onboardingSteps.length.toString() })}
            </Text>
          </View>

          {/* Features overview */}
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.featuresCard}>
            <LinearGradient
              colors={isDark 
                ? ['rgba(34, 197, 94, 0.08)', 'rgba(34, 197, 94, 0.04)', 'transparent'] 
                : ['rgba(34, 197, 94, 0.06)', 'rgba(34, 197, 94, 0.03)', 'transparent']
              }
              style={styles.featuresCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Text style={[styles.featuresTitle, { color: colors.text }]}>{t('onboarding.features.title')}</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <IconSymbol size={14} name="checkmark" color={colors.success} />
                </View>
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{t('onboarding.features.smart_timer')}</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <IconSymbol size={14} name="checkmark" color={colors.success} />
                </View>
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{t('onboarding.features.visual_calendar')}</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <IconSymbol size={14} name="checkmark" color={colors.success} />
                </View>
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{t('onboarding.features.interactive_map')}</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <IconSymbol size={14} name="checkmark" color={colors.success} />
                </View>
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{t('onboarding.features.detailed_stats')}</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <IconSymbol size={14} name="checkmark" color={colors.success} />
                </View>
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{t('onboarding.features.data_export')}</Text>
              </View>
            </View>
          </BlurView>

          {/* Tips card */}
         
        </ScrollView>

        {/* Navigation buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navigationButton, styles.previousButton]}
            onPress={handlePrevious}
            disabled={currentStep === 0}
          >
            <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.navigationButtonInner}>
              <IconSymbol 
                size={20} 
                name="chevron.left" 
                color={currentStep === 0 ? colors.textTertiary : colors.primary} 
              />
              <Text 
                style={[
                  styles.navigationButtonText,
                  { color: currentStep === 0 ? colors.textTertiary : colors.primary }
                ]}
              >
                {t('onboarding.navigation.previous')}
              </Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navigationButton, styles.nextButton]}
            onPress={handleNext}
          >
            <View style={styles.nextButtonInner}>
              <LinearGradient
                colors={['#007AFF', '#0056CC', '#003D99']}
                style={styles.nextButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={[styles.nextButtonText, { color: '#FFFFFF' }]}>
                {currentStep === onboardingSteps.length - 1 ? t('onboarding.navigation.start') : t('onboarding.navigation.next')}
              </Text>
              <IconSymbol 
                size={20} 
                name={currentStep === onboardingSteps.length - 1 ? 'checkmark' : 'chevron.right'} 
                color="#FFFFFF" 
              />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      
      {/* Terms of Service Modal */}
      <TermsOfServiceModal
        visible={showTermsOfService}
        onClose={() => setShowTermsOfService(false)}
      />
      
      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        visible={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
      />
    </Modal>
  );
}

