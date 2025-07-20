import React, { useState } from 'react';
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

const getOnboardingSteps = (colors: any): OnboardingStep[] => [
  {
    title: 'Gestiona tus Trabajos',
    description: 'Crea y organiza todos tus trabajos con información detallada, horarios, tarifas y ubicaciones.',
    icon: 'briefcase.fill',
    color: Theme.colors.primary,
  },
  {
    title: 'Registra tu Tiempo',
    description: 'Usa el timer para medir las horas trabajadas o registra manualmente en el calendario.',
    icon: 'clock.fill',
    color: Theme.colors.success,
  },
  {
    title: 'Localiza en el Mapa',
    description: 'Ve tus trabajos en el mapa, navega a sus ubicaciones y gestiona todo desde un solo lugar.',
    icon: 'location.fill',
    color: Theme.colors.warning,
  },
  {
    title: 'Analiza Estadísticas',
    description: 'Revisa reportes detallados, estadísticas por trabajo y exporta tus datos cuando los necesites.',
    icon: 'chart.bar.fill',
    color: Theme.colors.error,
  },
];

export default function WelcomeModal({ visible, onClose }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const onboardingSteps = getOnboardingSteps(Theme.colors);
  const screenWidth = Dimensions.get('window').width;

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

  const handleSkip = () => {
    onClose();
  };

  const currentStepData = onboardingSteps[currentStep];

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet" 
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: Theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: Theme.colors.border }]}>
          <View style={styles.headerContent}>
            <View style={styles.placeholder} />
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: Theme.colors.text }]}>¡Bienvenido!</Text>
              <Text style={[styles.headerSubtitle, { color: Theme.colors.textSecondary }]}>
                Aprende a usar la app en {onboardingSteps.length} pasos
              </Text>
            </View>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={[styles.skipButtonText, { color: Theme.colors.primary }]}>Saltar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.stepContainer}>
            <BlurView intensity={95} tint={Theme.colors.surface === '#FFFFFF' ? 'light' : 'dark'} style={[styles.stepCard, { backgroundColor: Theme.colors.surface }]}>
              <View style={styles.stepHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${currentStepData.color}20` }]}>
                  <IconSymbol 
                    size={48} 
                    name={currentStepData.icon as any} 
                    color={currentStepData.color} 
                  />
                </View>
                <Text style={[styles.stepTitle, { color: Theme.colors.text }]}>{currentStepData.title}</Text>
                <Text style={[styles.stepDescription, { color: Theme.colors.textSecondary }]}>{currentStepData.description}</Text>
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
                    { backgroundColor: Theme.colors.separator },
                    index === currentStep && [styles.indicatorActive, { backgroundColor: Theme.colors.primary }],
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.stepCounter, { color: Theme.colors.textSecondary }]}>
              {currentStep + 1} de {onboardingSteps.length}
            </Text>
          </View>

          {/* Features overview */}
          <BlurView intensity={95} tint={Theme.colors.surface === '#FFFFFF' ? 'light' : 'dark'} style={[styles.featuresCard, { backgroundColor: Theme.colors.surface }]}>
            <Text style={[styles.featuresTitle, { color: Theme.colors.text }]}>Características principales</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <IconSymbol size={16} name="checkmark.circle.fill" color={Theme.colors.success} />
                <Text style={[styles.featureText, { color: Theme.colors.textSecondary }]}>Timer automático con redondeo inteligente</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol size={16} name="checkmark.circle.fill" color={Theme.colors.success} />
                <Text style={[styles.featureText, { color: Theme.colors.textSecondary }]}>Calendario visual con tipos de días</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol size={16} name="checkmark.circle.fill" color={Theme.colors.success} />
                <Text style={[styles.featureText, { color: Theme.colors.textSecondary }]}>Mapa interactivo con ubicaciones</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol size={16} name="checkmark.circle.fill" color={Theme.colors.success} />
                <Text style={[styles.featureText, { color: Theme.colors.textSecondary }]}>Estadísticas y reportes detallados</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol size={16} name="checkmark.circle.fill" color={Theme.colors.success} />
                <Text style={[styles.featureText, { color: Theme.colors.textSecondary }]}>Exportación de datos</Text>
              </View>
            </View>
          </BlurView>

          {/* Tips card */}
          <BlurView intensity={95} tint={Theme.colors.surface === '#FFFFFF' ? 'light' : 'dark'} style={[styles.tipsCard, { backgroundColor: Theme.colors.surface }]}>
            <Text style={[styles.tipsTitle, { color: Theme.colors.text }]}>💡 Consejos rápidos</Text>
            <View style={styles.tipItem}>
              <IconSymbol size={16} name="hand.tap" color={Theme.colors.primary} />
              <Text style={[styles.tipText, { color: Theme.colors.textSecondary }]}>
                Mantén presionado elementos para más opciones
              </Text>
            </View>
            <View style={styles.tipItem}>
              <IconSymbol size={16} name="square.and.arrow.up" color={Theme.colors.primary} />
              <Text style={[styles.tipText, { color: Theme.colors.textSecondary }]}>
                Comparte tus estadísticas desde cualquier modal
              </Text>
            </View>
            <View style={styles.tipItem}>
              <IconSymbol size={16} name="arrow.down" color={Theme.colors.primary} />
              <Text style={[styles.tipText, { color: Theme.colors.textSecondary }]}>
                Desliza hacia abajo para cerrar modales
              </Text>
            </View>
          </BlurView>
        </ScrollView>

        {/* Navigation buttons */}
        <View style={[styles.navigationContainer, { borderTopColor: Theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.navigationButton, styles.previousButton]}
            onPress={handlePrevious}
            disabled={currentStep === 0}
          >
            <BlurView intensity={90} tint={Theme.colors.surface === '#FFFFFF' ? 'light' : 'dark'} style={[styles.navigationButtonInner, { backgroundColor: Theme.colors.surface }]}>
              <IconSymbol 
                size={20} 
                name="chevron.left" 
                color={currentStep === 0 ? Theme.colors.textTertiary : Theme.colors.primary} 
              />
              <Text 
                style={[
                  styles.navigationButtonText,
                  { color: currentStep === 0 ? Theme.colors.textTertiary : Theme.colors.primary }
                ]}
              >
                Anterior
              </Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navigationButton, styles.nextButton]}
            onPress={handleNext}
          >
            <View style={[styles.nextButtonInner, { backgroundColor: Theme.colors.primary }]}>
              <Text style={[styles.nextButtonText, { color: '#FFFFFF' }]}>
                {currentStep === onboardingSteps.length - 1 ? 'Comenzar' : 'Siguiente'}
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

const styles = StyleSheet.create({
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