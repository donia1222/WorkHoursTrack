import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from './useSubscription';

export const useSubscriptionGuard = (
  requireSubscription: boolean = false,
  customMessage?: string
) => {
  const { isSubscribed, isLoading, getSubscriptionStatus } = useSubscription();
  const router = useRouter();
  const [canAccess, setCanAccess] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!requireSubscription) {
        setCanAccess(true);
        return;
      }

      if (isLoading) {
        return; // Wait for loading to complete
      }

      // Check both current state and stored state
      const storedSubscription = await getSubscriptionStatus();
      const hasAccess = isSubscribed || storedSubscription;

      setCanAccess(hasAccess);

      if (!hasAccess) {
        showSubscriptionAlert();
      }
    };

    checkAccess();
  }, [isSubscribed, isLoading, requireSubscription]);

  const showSubscriptionAlert = () => {
    const message = customMessage || 
      'Esta función requiere una suscripción premium. ¿Te gustaría suscribirte ahora?';

    Alert.alert(
      'Suscripción Requerida',
      message,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Suscribirse',
          onPress: () => {
            // Navigate to subscription screen
            router.push('/subscription' as any);
          },
        },
      ]
    );
  };

  const checkFeatureAccess = (featureName?: string) => {
    if (!requireSubscription) return true;
    
    if (!isSubscribed) {
      const message = featureName 
        ? `La función "${featureName}" requiere una suscripción premium.`
        : 'Esta función requiere una suscripción premium.';
      
      showSubscriptionAlert();
      return false;
    }
    
    return true;
  };

  return {
    canAccess,
    isSubscribed,
    isLoading,
    checkFeatureAccess,
    showSubscriptionAlert,
  };
};

// Type for checking subscription access
export type SubscriptionCheck = {
  canAccess: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  checkFeatureAccess: (featureName?: string) => boolean;
  showSubscriptionAlert: () => void;
};