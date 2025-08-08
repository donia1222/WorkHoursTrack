import React, { createContext, useContext, useEffect, useState } from 'react';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubscriptionState {
  isSubscribed: boolean;
  isLoading: boolean;
  offerings: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  isInitialized: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  purchaseSubscription: (packageToPurchase: any) => Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }>;
  checkSubscriptionStatus: () => Promise<void>;
  getSubscriptionStatus: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [state, setState] = useState<SubscriptionState>({
    isSubscribed: false,
    isLoading: true,
    offerings: null,
    customerInfo: null,
    isInitialized: false,
  });

  useEffect(() => {
    initializePurchases();
  }, []);

  // Listener para detectar cambios de estado automáticamente
  useEffect(() => {
    if (!state.isInitialized) return;

    const setupListener = () => {
      try {
        const customerInfoUpdateListener = (info: CustomerInfo) => {
          console.log('🔔 CustomerInfo actualizado automáticamente');
          const hasActiveEntitlements = Object.keys(info.entitlements.active || {}).length > 0;
          const hasActiveSubscriptions = Object.keys(info.activeSubscriptions || {}).length > 0;
          const isSubscribed = hasActiveEntitlements || hasActiveSubscriptions;
          
          setState(prev => ({
            ...prev,
            isSubscribed,
            customerInfo: info,
          }));

          // Persistir en AsyncStorage
          AsyncStorage.setItem('isSubscribed', JSON.stringify(isSubscribed));
          console.log(`🔔 Estado actualizado automáticamente: ${isSubscribed ? '✅ SUSCRITO' : '❌ NO SUSCRITO'}`);
        };

        Purchases.addCustomerInfoUpdateListener(customerInfoUpdateListener);
        
        return () => {
          Purchases.removeCustomerInfoUpdateListener(customerInfoUpdateListener);
        };
      } catch (error) {
        console.error('❌ Error configurando listener:', error);
      }
    };

    const cleanup = setupListener();
    return cleanup;
  }, [state.isInitialized]);

  const initializePurchases = async () => {
    try {
      // Solo inicializar una vez
      if (state.isInitialized) {
        console.log('🔄 RevenueCat ya está inicializado, saltando...');
        return;
      }

      console.log('🚀 Inicializando RevenueCat...');
      
      await Purchases.configure({
        apiKey: 'appl_QZiBEvsooXdbhkjQuKjzDQKEEIf',
        appUserID: undefined,
      });

      setState(prev => ({ ...prev, isInitialized: true }));
      console.log('✅ RevenueCat inicializado correctamente');

      await checkSubscriptionStatus();
      await loadOfferings();
    } catch (error) {
      console.error('❌ Error inicializando RevenueCat:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      console.log('🔍 Verificando estado de suscripción...');
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Debug: Mostrar toda la información disponible (con verificaciones de seguridad)
      console.log('📊 CustomerInfo disponible:', {
        userId: customerInfo.originalAppUserId || 'No disponible',
        hasEntitlements: !!customerInfo.entitlements,
        hasActiveEntitlements: !!(customerInfo.entitlements && customerInfo.entitlements.active),
        hasActiveSubscriptions: !!customerInfo.activeSubscriptions,
        hasNonSubscriptions: !!customerInfo.nonSubscriptionTransactions,
      });

      // Verificar entitlements activos de forma más segura
      let activeEntitlements = {};
      try {
        activeEntitlements = customerInfo?.entitlements?.active || {};
        if (typeof activeEntitlements !== 'object') {
          activeEntitlements = {};
        }
        console.log('🎫 Entitlements activos encontrados:', Object.keys(activeEntitlements));
      } catch (error) {
        console.error('❌ Error procesando entitlements:', error);
        activeEntitlements = {};
      }
      
      // Verificar suscripciones activas de forma más segura
      let activeSubscriptions = {};
      try {
        activeSubscriptions = customerInfo?.activeSubscriptions || {};
        if (typeof activeSubscriptions !== 'object') {
          activeSubscriptions = {};
        }
        console.log('📱 Suscripciones activas encontradas:', Object.keys(activeSubscriptions));
      } catch (error) {
        console.error('❌ Error procesando suscripciones:', error);
        activeSubscriptions = {};
      }

      // Debug adicional: mostrar detalles si hay suscripciones
      try {
        if (Object.keys(activeSubscriptions).length > 0) {
          console.log('📋 Detalles de suscripciones:', activeSubscriptions);
        }
        
        if (Object.keys(activeEntitlements).length > 0) {
          console.log('📋 Detalles de entitlements:', activeEntitlements);
        }
      } catch (error) {
        console.error('❌ Error mostrando detalles:', error);
      }

      // Verificar tanto entitlements como suscripciones activas
      let hasActiveEntitlements = false;
      let hasActiveSubscriptions = false;
      let isSubscribed = false;
      
      try {
        hasActiveEntitlements = Object.keys(activeEntitlements).length > 0;
        hasActiveSubscriptions = Object.keys(activeSubscriptions).length > 0;
        isSubscribed = hasActiveEntitlements || hasActiveSubscriptions;
        
        console.log(`🔍 Verificación: Entitlements=${hasActiveEntitlements}, Subscriptions=${hasActiveSubscriptions}`);
      } catch (error) {
        console.error('❌ Error en verificación final:', error);
        isSubscribed = false;
      }
      
      setState(prev => ({
        ...prev,
        isSubscribed,
        customerInfo,
        isLoading: false,
      }));

      // Guardar estado en AsyncStorage
      await AsyncStorage.setItem('isSubscribed', JSON.stringify(isSubscribed));
      
      console.log(`📱 Estado final: ${isSubscribed ? '✅ SUSCRITO' : '❌ NO SUSCRITO'}`);
    } catch (error) {
      console.error('❌ Error verificando suscripción:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const loadOfferings = async () => {
    try {
      console.log('📦 Cargando offerings...');
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      
      setState(prev => ({
        ...prev,
        offerings: currentOffering,
      }));

      if (currentOffering) {
        console.log(`✅ Offerings cargados: ${currentOffering.availablePackages.length} productos`);
      } else {
        console.log('⚠️ No hay offerings disponibles');
      }
    } catch (error) {
      console.error('❌ Error cargando offerings:', error);
    }
  };

  const purchaseSubscription = async (packageToPurchase: any) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      console.log('💳 Iniciando compra...');
      
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      const isSubscribed = Object.keys(customerInfo.entitlements.active).length > 0;
      
      setState(prev => ({
        ...prev,
        isSubscribed,
        customerInfo,
        isLoading: false,
      }));

      await AsyncStorage.setItem('isSubscribed', JSON.stringify(isSubscribed));
      console.log('✅ Compra exitosa');
      
      return { success: true, customerInfo };
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      
      if (error.userCancelled) {
        console.log('🚫 Compra cancelada por el usuario');
        return { success: false, error: 'User cancelled' };
      }
      
      console.error('❌ Error en compra:', error);
      return { success: false, error: error.message };
    }
  };

  const restorePurchases = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      console.log('🔄 Restaurando compras...');
      
      const customerInfo = await Purchases.restorePurchases();
      const isSubscribed = Object.keys(customerInfo.entitlements.active).length > 0;
      
      setState(prev => ({
        ...prev,
        isSubscribed,
        customerInfo,
        isLoading: false,
      }));

      await AsyncStorage.setItem('isSubscribed', JSON.stringify(isSubscribed));
      console.log('✅ Compras restauradas');
      
      return { success: true, customerInfo };
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      console.error('❌ Error restaurando compras:', error);
      return { success: false, error: error.message };
    }
  };

  const getSubscriptionStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem('isSubscribed');
      return stored ? JSON.parse(stored) : false;
    } catch (error) {
      return false;
    }
  };

  const value: SubscriptionContextType = {
    ...state,
    purchaseSubscription,
    restorePurchases,
    checkSubscriptionStatus,
    getSubscriptionStatus,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription debe usarse dentro de un SubscriptionProvider');
  }
  return context;
}