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
  resetSandboxSubscription: () => Promise<void>;
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
          
          // Verificación mejorada de suscripción
          const hasActiveSubscriptions = info?.activeSubscriptions && 
                                        Object.keys(info.activeSubscriptions).length > 0;
          const hasPremiumEntitlement = !!info?.entitlements?.active?.['premium'];
          const hasAnyEntitlement = info?.entitlements?.active && 
                                    Object.keys(info.entitlements.active).length > 0;
          
          const isSubscribed = hasActiveSubscriptions || hasPremiumEntitlement || hasAnyEntitlement;
          
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
      
      // Detectar si estamos en sandbox o producción
      const isTestEnvironment = __DEV__ || process.env.NODE_ENV === 'development';
      console.log(`🏗️ Entorno: ${isTestEnvironment ? 'SANDBOX/TEST' : 'PRODUCCIÓN'}`);
      
      // Recuperar o generar un User ID persistente
      let appUserId = await AsyncStorage.getItem('revenueCatUserId');
      
      if (!appUserId) {
        // Generar un ID único basado en timestamp y random
        appUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        await AsyncStorage.setItem('revenueCatUserId', appUserId);
        console.log('🆔 Nuevo User ID generado:', appUserId);
      } else {
        console.log('🆔 User ID recuperado:', appUserId);
      }
      
      // Configurar RevenueCat con opciones adicionales para debugging
      Purchases.configure({
        apiKey: 'appl_QZiBEvsooXdbhkjQuKjzDQKEEIf',
        appUserID: appUserId,
        useAmazon: false, // Explícitamente usar App Store
      });
      
      // Configurar modo debug en desarrollo
      if (isTestEnvironment) {
        await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        console.log('🐛 Modo debug activado para RevenueCat');
      }

      setState(prev => ({ ...prev, isInitialized: true }));
      console.log('✅ RevenueCat inicializado correctamente con User ID:', appUserId);

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
      
      // Mostrar el User ID actual
      const currentUserId = await Purchases.getAppUserID();
      console.log('🆔 Verificando suscripción para User ID:', currentUserId);
      
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Debug: Mostrar toda la información disponible (con verificaciones de seguridad)
      console.log('📊 CustomerInfo disponible:', {
        userId: customerInfo.originalAppUserId || 'No disponible',
        hasEntitlements: !!customerInfo.entitlements,
        hasActiveEntitlements: !!(customerInfo.entitlements && customerInfo.entitlements.active),
        hasActiveSubscriptions: !!customerInfo.activeSubscriptions,
        hasNonSubscriptions: !!customerInfo.nonSubscriptionTransactions,
      });
      
      // Debug completo del customerInfo
      console.log('🔍 CustomerInfo completo:', JSON.stringify(customerInfo, null, 2));

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

      // Verificar el entitlement 'premium' específicamente
      let isSubscribed = false;
      
      try {
        // Primero verificar suscripciones activas (más confiable en sandbox)
        const hasActiveSubscriptions = customerInfo?.activeSubscriptions && 
                                      Object.keys(customerInfo.activeSubscriptions).length > 0;
        
        // Luego verificar el entitlement 'premium' si está configurado
        const hasPremiumEntitlement = !!customerInfo?.entitlements?.active?.['premium'];
        
        // También verificar si hay algún entitlement activo
        const hasAnyEntitlement = customerInfo?.entitlements?.active && 
                                  Object.keys(customerInfo.entitlements.active).length > 0;
        
        // La suscripción es válida si tiene cualquiera de estas condiciones
        isSubscribed = hasActiveSubscriptions || hasPremiumEntitlement || hasAnyEntitlement;
        
        console.log(`🔍 Verificación de suscripción:`);
        console.log(`  - Suscripciones activas: ${hasActiveSubscriptions}`);
        console.log(`  - Entitlement 'premium': ${hasPremiumEntitlement}`);
        console.log(`  - Cualquier entitlement: ${hasAnyEntitlement}`);
        console.log(`  - Estado final: ${isSubscribed ? '✅ SUSCRITO' : '❌ NO SUSCRITO'}`);
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

  // Función para resetear sandbox (solo para testing)
  const resetSandboxSubscription = async () => {
    try {
      console.log('🔄 Reseteando suscripción de sandbox...');
      
      // 1. Borrar cache local
      await AsyncStorage.removeItem('isSubscribed');
      await AsyncStorage.removeItem('revenueCatUserId');
      
      // 2. Generar nuevo usuario ID
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      // 3. Logout del usuario actual
      await Purchases.logOut();
      
      // 4. Login con nuevo usuario
      await Purchases.logIn(newUserId);
      
      console.log('✅ Usuario de sandbox reseteado:', newUserId);
      
      // 5. Verificar estado
      await checkSubscriptionStatus();
      
    } catch (error) {
      console.error('❌ Error reseteando sandbox:', error);
    }
  };

  const purchaseSubscription = async (packageToPurchase: any, retryCount = 0) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      console.log('💳 Iniciando compra...');
      console.log('📦 Detalles del paquete:', {
        identifier: packageToPurchase?.identifier,
        productIdentifier: packageToPurchase?.product?.identifier,
        price: packageToPurchase?.product?.priceString,
      });
      
      console.log('⏳ Llamando a Purchases.purchasePackage...');
      const startTime = Date.now();
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      const endTime = Date.now();
      console.log(`✅ purchasePackage completado en ${endTime - startTime}ms`);
      
      // Verificación mejorada de suscripción
      const hasActiveSubscriptions = customerInfo?.activeSubscriptions && 
                                    Object.keys(customerInfo.activeSubscriptions).length > 0;
      const hasPremiumEntitlement = !!customerInfo?.entitlements?.active?.['premium'];
      const hasAnyEntitlement = customerInfo?.entitlements?.active && 
                                Object.keys(customerInfo.entitlements.active).length > 0;
      
      const isSubscribed = hasActiveSubscriptions || hasPremiumEntitlement || hasAnyEntitlement;
      
      console.log('📊 Actualizando estado de suscripción...');
      setState(prev => ({
        ...prev,
        isSubscribed,
        customerInfo,
        isLoading: false,
      }));

      console.log('💾 Guardando en AsyncStorage...');
      await AsyncStorage.setItem('isSubscribed', JSON.stringify(isSubscribed));
      console.log('✅ Compra exitosa y estado actualizado');
      
      return { success: true, customerInfo };
    } catch (error: any) {
      console.log('⚠️ Error capturado en purchaseSubscription');
      setState(prev => ({ ...prev, isLoading: false }));
      
      // Manejo detallado de errores
      const errorCode = error?.code || error?.userInfo?.readable_error_code;
      console.error('❌ Error en compra:', {
        message: error.message,
        code: errorCode,
        userInfo: error.userInfo,
      });
      
      if (error.userCancelled) {
        console.log('🚫 Compra cancelada por el usuario');
        return { success: false, error: 'Compra cancelada' };
      }
      
      // Errores específicos de StoreKit
      if (errorCode === 'STORE_PROBLEM' || error.message?.includes('App Store')) {
        console.log('🏪 Problema con App Store detectado');
        
        // Verificar si la suscripción se activó a pesar del error
        console.log('🔍 Verificando si la suscripción se activó a pesar del error...');
        try {
          const currentCustomerInfo = await Purchases.getCustomerInfo();
          const hasActiveSubscriptions = currentCustomerInfo?.activeSubscriptions && 
                                        Object.keys(currentCustomerInfo.activeSubscriptions).length > 0;
          const hasPremiumEntitlement = !!currentCustomerInfo?.entitlements?.active?.['premium'];
          const hasAnyEntitlement = currentCustomerInfo?.entitlements?.active && 
                                    Object.keys(currentCustomerInfo.entitlements.active).length > 0;
          
          const isAlreadySubscribed = hasActiveSubscriptions || hasPremiumEntitlement || hasAnyEntitlement;
          
          if (isAlreadySubscribed) {
            console.log('✅ La suscripción ya está activa, cancelando retry');
            setState(prev => ({
              ...prev,
              isSubscribed: true,
              customerInfo: currentCustomerInfo,
              isLoading: false,
            }));
            await AsyncStorage.setItem('isSubscribed', JSON.stringify(true));
            return { success: true, customerInfo: currentCustomerInfo };
          }
        } catch (verifyError) {
          console.error('❌ Error verificando estado después del error:', verifyError);
        }
        
        // Retry logic para errores temporales solo si no hay suscripción activa
        if (retryCount < 2) {
          console.log(`🔄 Reintentando compra (intento ${retryCount + 1}/2)...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
          return purchaseSubscription(packageToPurchase, retryCount + 1);
        }
        
        return { 
          success: false, 
          error: 'Error de App Store. Por favor verifica tu cuenta de sandbox o intenta más tarde.' 
        };
      }
      
      if (errorCode === 'PRODUCT_NOT_AVAILABLE') {
        return { 
          success: false, 
          error: 'Producto no disponible. Verifica la configuración en App Store Connect.' 
        };
      }
      
      if (errorCode === 'NETWORK_ERROR') {
        return { 
          success: false, 
          error: 'Error de conexión. Verifica tu conexión a internet.' 
        };
      }
      
      return { success: false, error: error.message || 'Error desconocido' };
    }
  };

  const restorePurchases = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      console.log('🔄 Restaurando compras...');
      
      // Obtener el User ID actual antes de restaurar
      const currentUserId = await Purchases.getAppUserID();
      console.log('🆔 User ID actual antes de restaurar:', currentUserId);
      
      const customerInfo = await Purchases.restorePurchases();
      
      // Verificar si el User ID cambió después de restaurar
      const newUserId = await Purchases.getAppUserID();
      if (currentUserId !== newUserId) {
        console.log('⚠️ User ID cambió después de restaurar:', newUserId);
        // Actualizar el User ID guardado si cambió
        await AsyncStorage.setItem('revenueCatUserId', newUserId);
      }
      
      // Verificación mejorada de suscripción
      const hasActiveSubscriptions = customerInfo?.activeSubscriptions && 
                                    Object.keys(customerInfo.activeSubscriptions).length > 0;
      const hasPremiumEntitlement = !!customerInfo?.entitlements?.active?.['premium'];
      const hasAnyEntitlement = customerInfo?.entitlements?.active && 
                                Object.keys(customerInfo.entitlements.active).length > 0;
      
      const isSubscribed = hasActiveSubscriptions || hasPremiumEntitlement || hasAnyEntitlement;
      
      setState(prev => ({
        ...prev,
        isSubscribed,
        customerInfo,
        isLoading: false,
      }));

      await AsyncStorage.setItem('isSubscribed', JSON.stringify(isSubscribed));
      // Verificar si realmente se restauraron compras
      if (!isSubscribed) {
        console.log('ℹ️ No se encontraron compras para restaurar');
        return { success: true, customerInfo, message: 'No se encontraron compras anteriores' };
      }
      
      console.log('✅ Compras restauradas exitosamente para User ID:', newUserId || currentUserId);
      
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
    resetSandboxSubscription,
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