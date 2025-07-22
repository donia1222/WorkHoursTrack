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
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface WelcomeModalProps {
  visible: boolean;
  onClose: () => void;
}

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  color: string;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
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
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  stepHeader: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '90%',
  },
  indicatorsContainer: {
    alignItems: 'center',
    marginVertical: 20,
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
    marginVertical: 16,
    borderRadius: 16,
    padding: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  tipsCard: {
    marginVertical: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    flex: 1,
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    borderTopWidth: 1,
  },
  navigationButton: {
    flex: 1,
  },
  navigationButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
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
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
});

const getOnboardingSteps = (colors: ThemeColors, t: (key: string) => string): OnboardingStep[] => [
  {
    title: t('onboarding.steps.jobs.title'),
    description: t('onboarding.steps.jobs.description'),
    icon: 'briefcase.fill',
    color: colors.primary,
  },
  {
    title: t('onboarding.steps.timer.title'),
    description: t('onboarding.steps.timer.description'),
    icon: 'clock.fill',
    color: colors.success,
  },
  {
    title: t('onboarding.steps.location.title'),
    description: t('onboarding.steps.location.description'),
    icon: 'location.fill',
    color: colors.warning,
  },
  {
    title: t('onboarding.steps.reports.title'),
    description: t('onboarding.steps.reports.description'),
    icon: 'chart.bar.fill',
    color: colors.error,
  },
];

export default function WelcomeModal({ visible, onClose }: WelcomeModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const onboardingSteps = getOnboardingSteps(colors, t);
  const screenWidth = Dimensions.get('window').width;
  
  const styles = getStyles(colors, isDark);

  // Reset to first step when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
    }
  }, [visible]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
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
        <View style={[styles.header, { borderBottomColor: colors.border }]}>

 
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.stepContainer}>
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.stepCard, { backgroundColor: colors.surface }]}>
              <View style={styles.stepHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${currentStepData.color}20` }]}>
                  <IconSymbol 
                    size={48} 
                    name={currentStepData.icon as any} 
                    color={currentStepData.color} 
                  />
                </View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>{currentStepData.title}</Text>
                <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>{currentStepData.description}</Text>
              </View>
            </BlurView>
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
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.featuresCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.featuresTitle, { color: colors.text }]}>{t('onboarding.features.title')}</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{t('onboarding.features.smart_timer')}</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{t('onboarding.features.visual_calendar')}</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{t('onboarding.features.interactive_map')}</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{t('onboarding.features.detailed_stats')}</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{t('onboarding.features.data_export')}</Text>
              </View>
            </View>
          </BlurView>

          {/* Tips card */}
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.tipsCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>{t('onboarding.tips.title')}</Text>
            <View style={styles.tipItem}>
              <IconSymbol size={16} name="hand.tap" color={colors.primary} />
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                {t('onboarding.tips.long_press')}
              </Text>
            </View>
            <View style={styles.tipItem}>
              <IconSymbol size={16} name="square.and.arrow.up" color={colors.primary} />
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                {t('onboarding.tips.share_stats')}
              </Text>
            </View>
            <View style={styles.tipItem}>
              <IconSymbol size={16} name="arrow.down" color={colors.primary} />
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                {t('onboarding.tips.swipe_close')}
              </Text>
            </View>
          </BlurView>
        </ScrollView>

        {/* Navigation buttons */}
        <View style={[styles.navigationContainer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.navigationButton, styles.previousButton]}
            onPress={handlePrevious}
            disabled={currentStep === 0}
          >
            <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={[styles.navigationButtonInner, { backgroundColor: colors.surface }]}>
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
            <View style={[styles.nextButtonInner, { backgroundColor: colors.primary }]}>
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
    </Modal>
  );
}

