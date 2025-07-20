import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { Theme } from '../constants/Theme';
import * as Location from 'expo-location';

interface OnboardingScreenProps {
  onDone: () => Promise<void>;
}

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  color: string;
  requiresLocation?: boolean;
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
    requiresLocation: true,
  },
  {
    title: 'Analiza Estadísticas',
    description: 'Revisa reportes detallados, estadísticas por trabajo y exporta tus datos cuando los necesites.',
    icon: 'chart.bar.fill',
    color: Theme.colors.error,
  },
];

export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [locationPermissionRequested, setLocationPermissionRequested] = useState(false);
  const onboardingSteps = getOnboardingSteps(Theme.colors);
  const screenWidth = Dimensions.get('window').width;

  const requestLocationPermission = async () => {
    try {
      setLocationPermissionRequested(true);
      
      // Solicitar permisos de ubicación
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permisos de Ubicación',
          'Los permisos de ubicación son necesarios para mostrar tus trabajos en el mapa y navegar a las ubicaciones. Puedes habilitar los permisos más tarde en la configuración de la app.',
          [{ text: 'Entendido', style: 'default' }]
        );
      }
      
      // Continuar al siguiente paso independientemente del resultado
      proceedToNextStep();
    } catch (error) {
      console.log('Error requesting location permission:', error);
      proceedToNextStep();
    }
  };

  const proceedToNextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onDone();
    }
  };

  const handleNext = () => {
    const currentStepData = onboardingSteps[currentStep];
    
    // Si este paso requiere permisos de ubicación y no se han solicitado
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

  const handleSkip = () => {
    onDone();
  };

  const currentStepData = onboardingSteps[currentStep];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: Theme.colors.border }]}>

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
                
                {/* Mostrar aviso de permisos de ubicación si es necesario */}
                {currentStepData.requiresLocation && !locationPermissionRequested && (
                  <View style={[styles.permissionNotice, { backgroundColor: `${Theme.colors.warning}15`, borderColor: `${Theme.colors.warning}30` }]}>
                    <IconSymbol size={20} name="exclamationmark.triangle.fill" color={Theme.colors.warning} />
                    <Text style={[styles.permissionNoticeText, { color: Theme.colors.text }]}>
                      Para usar esta función necesitaremos acceso a tu ubicación
                    </Text>
                  </View>
                )}
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
                {currentStep === onboardingSteps.length - 1 ? 'Comenzar' : 
                 currentStepData.requiresLocation && !locationPermissionRequested ? 'Permitir Ubicación' : 'Siguiente'}
              </Text>
              <IconSymbol 
                size={20} 
                name={currentStep === onboardingSteps.length - 1 ? 'checkmark' : 
                     currentStepData.requiresLocation && !locationPermissionRequested ? 'location.fill' : 'chevron.right'} 
                color="#FFFFFF" 
              />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
  permissionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    maxWidth: '100%',
  },
  permissionNoticeText: {
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
    fontWeight: '500',
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