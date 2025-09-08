import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNavigation } from '../context/NavigationContext';
import { useSubscription } from '../hooks/useSubscription';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
// Removed animations to prevent freezing
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import TermsOfServiceScreen from './TermsOfServiceScreen';
import EULAScreen from './EULAScreen';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SubscriptionScreen() {
  const router = useRouter();
  const { navigateTo } = useNavigation();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { isSubscribed, isLoading, offerings, allOfferings, customerInfo, purchaseSubscription, restorePurchases, checkSubscriptionStatus } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [showEULA, setShowEULA] = useState(false);
  
  // Log detallado cuando se carga la pantalla
  useEffect(() => {
    console.log('🔍 === SUBSCRIPTION SCREEN CARGADA ===');
    console.log('📊 Estado actual:');
    console.log(`  └─ isLoading: ${isLoading}`);
    console.log(`  └─ isSubscribed: ${isSubscribed}`);
    console.log(`  └─ offerings disponibles: ${offerings ? 'SÍ' : 'NO'}`);
    
    if (allOfferings && Object.keys(allOfferings).length > 0) {
      console.log(`📦 TODAS las Offerings en SubscriptionScreen:`);
      console.log(`  └─ Total offerings disponibles: ${Object.keys(allOfferings).length}`);
      
      Object.entries(allOfferings).forEach(([key, offering]) => {
        console.log(`    🎯 OFFERING "${key}":`);
        console.log(`      └─ Descripción: ${offering.serverDescription || 'Sin descripción'}`);
        console.log(`      └─ Productos: ${offering.availablePackages.length}`);
        
        offering.availablePackages.forEach((pkg, index) => {
          console.log(`        🛍️ Producto ${index + 1}:`);
          console.log(`          └─ Package ID: ${pkg.identifier}`);
          console.log(`          └─ Product ID: ${pkg.product.identifier}`);
          console.log(`          └─ Título: ${pkg.product.title}`);
          console.log(`          └─ Precio: ${pkg.product.priceString}`);
          
          // Identificar específicamente cada producto
          if (pkg.product.identifier === '1981') {
            console.log(`          └─ 🎯 CONFIRMADO: ESTE ES ENTE1 (1981) - 3 MESES`);
          } else if (pkg.product.identifier === 'ente2') {
            console.log(`          └─ 🎯 CONFIRMADO: ESTE ES ENTE2 - 6 MESES`);
          } else if (pkg.product.identifier === 'ente3') {
            console.log(`          └─ 🎯 CONFIRMADO: ESTE ES ENTE3 - 1 AÑO`);
          }
        });
      });
    } else {
      console.log('❌ No hay allOfferings disponibles en SubscriptionScreen');
    }
    
    if (customerInfo) {
      console.log(`👤 CustomerInfo en SubscriptionScreen:`);
      console.log(`  └─ User ID: ${customerInfo.originalAppUserId}`);
      console.log(`  └─ Suscripciones activas: ${Object.keys(customerInfo.activeSubscriptions || {}).length}`);
      console.log(`  └─ Entitlements activos: ${Object.keys(customerInfo.entitlements?.active || {}).length}`);
    }
    
    console.log('🏁 === FIN LOG SUBSCRIPTION SCREEN ===\n');
  }, [isLoading, isSubscribed, offerings, allOfferings, customerInfo]);
  
  // Removed all animations to prevent freezing

  const handlePurchase = async (packageToPurchase: any) => {
    console.log('🛍️ Iniciando handlePurchase');
    // Validar que el paquete tiene la información necesaria
    if (!packageToPurchase?.product?.identifier) {
      console.error('❌ Paquete inválido:', packageToPurchase);
      Alert.alert(
        t('subscription.error.title') || 'Error',
        'Producto no disponible. Por favor intenta más tarde.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log('📝 Iniciando compra del producto:', {
      identifier: packageToPurchase.product.identifier,
      price: packageToPurchase.product.priceString,
      title: packageToPurchase.product.title,
    });
    
    console.log('🔄 Estableciendo estado purchasing a true');
    setPurchasing(true);
    
    console.log('📡 Llamando a purchaseSubscription...');
    const purchaseStartTime = Date.now();
    const result = await purchaseSubscription(packageToPurchase);
    const purchaseEndTime = Date.now();
    console.log(`🕰️ purchaseSubscription retornó en ${purchaseEndTime - purchaseStartTime}ms`);
    console.log('📋 Resultado de compra:', result.success ? 'EXITOSO' : 'FALLIDO');
    
    console.log('🔄 Estableciendo estado purchasing a false');
    setPurchasing(false);

    if (result.success) {
      console.log('🎆 Iniciando verificación adicional de suscripción...');
      // Forzar una verificación adicional del estado de suscripción
      await checkSubscriptionStatus();
      console.log('✅ Verificación adicional completada');
      
      console.log('📢 Mostrando alerta de éxito...');
      Alert.alert(
        t('subscription.success.title'),
        t('subscription.success.message'),
        [
          {
            text: t('subscription.buttons.continue'),
            onPress: () => {
              console.log('👤 Usuario presionó continuar en alerta de éxito');
              navigateTo('mapa');
            },
          },
        ]
      );
    } else {
      console.log('❌ Error en compra:', result.error);
      if (result.error !== 'User cancelled') {
        Alert.alert('Error', t('subscription.errors.purchase_failed'));
      }
    }
  };

  const handleRestore = async () => {
    // Si ya está suscrito, mostrar mensaje diferente
    if (isSubscribed) {
      Alert.alert(
        'Already Premium',
        'You already have an active subscription. Enjoy all premium features!',
        [
          {
            text: 'OK',
            onPress: () => navigateTo('mapa'),
          },
        ]
      );
      return;
    }
    
    setPurchasing(true);
    const result = await restorePurchases();
    setPurchasing(false);

    if (result.success) {
      // Forzar una verificación adicional del estado de suscripción
      await checkSubscriptionStatus();
      
      // Verificar si realmente hay una suscripción activa después de restaurar
      const customerInfo = result.customerInfo;
      const hasActiveSubscription = !!customerInfo?.entitlements?.active?.['premium'] || 
                                    Object.keys(customerInfo?.activeSubscriptions || {}).length > 0;
      
      if (hasActiveSubscription) {
        // Se restauraron compras exitosamente
        Alert.alert(
          t('subscription.restore_success.title'),
          t('subscription.restore_success.message'),
          [
            {
              text: 'OK',
              onPress: () => navigateTo('mapa'),
            },
          ]
        );
      } else {
        // No se encontraron compras para restaurar
        Alert.alert(
          t('subscription.restore_no_purchases.title') || 'No Purchases Found',
          t('subscription.restore_no_purchases.message') || 'No previous purchases found to restore. Please make a purchase to unlock premium features.',
          [
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );
      }
    } else {
      Alert.alert('Error', 'Failed to connect to the store. Please try again later.');
    }
  };

  const openEmail = async () => {
    // Obtener información del usuario y suscripción
    const userInfo = [];
    
    // Estado de suscripción
    userInfo.push(`Subscription Status: ${isSubscribed ? 'PREMIUM ✓' : 'FREE'}`);
    
    // ID de usuario
    if (customerInfo?.originalAppUserId) {
      userInfo.push(`User ID: ${customerInfo.originalAppUserId}`);
    }
    
    // Fecha de primera compra si está suscrito
    if (isSubscribed && customerInfo?.firstSeen) {
      const firstPurchaseDate = new Date(customerInfo.firstSeen).toLocaleDateString();
      userInfo.push(`Customer Since: ${firstPurchaseDate}`);
    }
    
    // Si tiene suscripción activa, mostrar fecha de expiración
    if (isSubscribed && customerInfo?.entitlements?.active?.['premium']) {
      const premium = customerInfo.entitlements.active['premium'];
      if (premium.expirationDate) {
        const expirationDate = new Date(premium.expirationDate).toLocaleDateString();
        userInfo.push(`Expires: ${expirationDate}`);
      }
      if (premium.willRenew !== undefined) {
        userInfo.push(`Auto-Renewal: ${premium.willRenew ? 'ON' : 'OFF'}`);
      }
    }
    
    // Información del dispositivo
    userInfo.push(`Platform: ${Platform.OS} ${Platform.Version}`);
    userInfo.push(`App Version: 1.0.0`);
    
    // Construir el body del email
    const emailBody = `

--------------------
Support Information:
--------------------
${userInfo.join('\n')}
--------------------

Please describe your issue below:


`;
    
    // Crear el URL del email con la información
    const subject = encodeURIComponent('VixTime Support Request');
    const body = encodeURIComponent(emailBody);
    const emailUrl = `mailto:info@lweb.ch?subject=${subject}&body=${body}`;
    
    Linking.openURL(emailUrl);
  };

  const openTerms = () => {
    setShowTermsOfService(true);
  };

  const openPrivacy = () => {
    setShowPrivacyPolicy(true);
  };

  const openEULA = () => {
    setShowEULA(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={isDark 
            ? ['#0A0A0B', '#1A1A2E', '#16213E', '#0F3460'] 
            : ['#F8FAFF', '#E8F2FF', '#D4EDFF', '#C0E7FF']
          }
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.loadingContainer}>
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.loadingCard}>
            <LinearGradient
              colors={isDark 
                ? ['rgba(59, 130, 246, 0.15)', 'rgba(99, 102, 241, 0.10)', 'transparent'] 
                : ['rgba(59, 130, 246, 0.12)', 'rgba(99, 102, 241, 0.08)', 'transparent']
              }
              style={styles.loadingCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={[styles.loadingIconContainer, { backgroundColor: colors.primary + '20' }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <Text style={[styles.loadingText, { color: colors.text }]}>{t('subscription.loading')}</Text>
          </BlurView>
        </View>
      </SafeAreaView>
    );
  }

  if (isSubscribed) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>



        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Enhanced Premium Header */}
          <View>
            <LinearGradient
              colors={isDark 
                ? ['#667eea', '#4f4ba2ff', '#93a4fbff', '#576ff5ff'] 
                : ['#667eea', '#4f4ba2ff', '#93a4fbff', '#576ff5ff']
              }
              style={styles.premiumHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.headerContent}>
                <View style={styles.premiumBadgeContainer}>
                  <BlurView intensity={80} tint={"light"} style={styles.premiumBadge}>
                    <View>
                      <IconSymbol size={28} name="crown.fill" color="#FFD700" />
                    </View>
                    <Text style={styles.premiumBadgeText}>{t('subscription.success.premium_badge')}</Text>
                  </BlurView>
                </View>
                <Text style={styles.premiumTitle}>{t('subscription.success.premium_title')}</Text>
                <Text style={styles.premiumSubtitle}>
                  {t('subscription.success.premium_subtitle')}
                </Text>
                <View style={styles.decorativeElements}>
                  {[...Array(3)].map((_, i) => (
                    <View 
                      key={i} 
                      style={[
                        styles.decorativeDot, 
                        { opacity: 0.7 - (i * 0.2) }
                      ]} 
                    />
                  ))}
                </View>
                
              </View>
            </LinearGradient>
          </View>
          {/* Tarjetas de información con diseño moderno */}
          {customerInfo && (
            <>
              {/* Estado actual */}
              <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.modernCard, { borderColor: colors.border }]}>
                <LinearGradient
                  colors={isDark 
                    ? ['rgba(34, 197, 94, 0.08)', 'rgba(34, 197, 94, 0.04)', 'transparent'] 
                    : ['rgba(34, 197, 94, 0.06)', 'rgba(34, 197, 94, 0.03)', 'transparent']
                  }
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24 }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={[styles.cardHeader, { borderBottomColor: colors.separator }]}>
                  
                  <View style={[styles.cardIconContainer, { backgroundColor: colors.success + '20' }]}>
                    <IconSymbol size={22} name="checkmark.circle.fill" color={colors.success} />
                  </View>
                  
                  <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>{t('subscription.active.account_status.title')}</Text>
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusIndicator, { backgroundColor: colors.success }]} />
                    <Text style={[styles.statusText, { color: colors.success }]}>{t('subscription.active.account_status.active')}</Text>
                  </View>
                  <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
                    {t('subscription.active.account_status.description')}
                  </Text>
                  
                </View>
              </BlurView>

              {/* Información del usuario */}
              <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.modernCard, { borderColor: colors.border }]}>
                <LinearGradient
                  colors={isDark 
                    ? ['rgba(59, 130, 246, 0.08)', 'rgba(59, 130, 246, 0.04)', 'transparent'] 
                    : ['rgba(59, 130, 246, 0.06)', 'rgba(59, 130, 246, 0.03)', 'transparent']
                  }
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24 }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={[styles.cardHeader, { borderBottomColor: colors.separator }]}>
                  <View style={[styles.cardIconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <IconSymbol size={22} name="person.circle.fill" color={colors.primary} />
                  </View>
                  <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>{t('subscription.active.user_info.title')}</Text>
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('subscription.active.user_info.user_id')}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{customerInfo.originalAppUserId}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('subscription.active.user_info.member_since')}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {new Date(customerInfo.firstSeen).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
              </BlurView>

              {/* Suscripciones activas */}
              {customerInfo.activeSubscriptions && Object.keys(customerInfo.activeSubscriptions).length > 0 && (
                <View style={[styles.modernCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.separator }]}>
                    <View style={[styles.cardIconContainer, { backgroundColor: colors.primary + '20' }]}>
                      <IconSymbol size={20} name="creditcard.fill" color={colors.primary} />
                    </View>
                    <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>{t('subscription.active.subscriptions.title')}</Text>
                  </View>
                  <View style={styles.cardContent}>
                       <Text style={[styles.cancellationText, { color: colors.textSecondary }]}>
              {t('subscription.cancellation_text')}
            </Text>
                    {Object.entries(customerInfo.activeSubscriptions).map(([key, productId]) => (
                      <View key={key} style={styles.subscriptionItem}>
                        <View style={styles.subscriptionInfo}>
                          <Text style={[styles.subscriptionName, { color: colors.text }]}>{t('subscription.active.subscriptions.premium_plan')}</Text>
                          <Text style={[styles.subscriptionId, { color: colors.textSecondary }]}>{productId}</Text>
                        </View>
                        <View style={[styles.subscriptionBadge, { backgroundColor: colors.success + '20' }]}>
                          <Text style={[styles.subscriptionBadgeText, { color: colors.success }]}>{t('subscription.active.subscriptions.status_active')}</Text>
                          
                        </View>
                        
                      </View>
                      
                    ))}
                  </View>
                  
                </View>
              )}

              {/* Entitlements */}
              {customerInfo.entitlements.active && Object.keys(customerInfo.entitlements.active).length > 0 && (
                <View style={[styles.modernCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.separator }]}>
                    <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(255, 215, 0, 0.2)' }]}>
                      <IconSymbol size={20} name="star.fill" color="#FFD700" />
                    </View>
                    <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>{t('subscription.active.features.title')}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    {Object.entries(customerInfo.entitlements.active).map(([key, entitlement]) => (
                      <View key={key} style={styles.entitlementItem}>
                        <View style={styles.entitlementHeader}>
                          <Text style={[styles.entitlementName, { color: colors.text }]}>{entitlement.identifier}</Text>
                          {entitlement.willRenew && (
                            <View style={[styles.renewalBadge, { backgroundColor: colors.primary + '20' }]}>
                              <Text style={[styles.renewalBadgeText, { color: colors.primary }]}>{t('subscription.active.features.auto_renewal')}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.entitlementDetails}>
                          <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('subscription.active.features.purchased')}</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>
                              {new Date(entitlement.latestPurchaseDate).toLocaleDateString()}
                            </Text>
                          </View>
                          {entitlement.expirationDate && (
                            <View style={styles.infoRow}>
                              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('subscription.active.features.expires')}</Text>
                              <Text style={[styles.infoValue, { color: colors.text }]}>
                                {new Date(entitlement.expirationDate).toLocaleDateString()}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Botón de acción */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigateTo('mapa')}
              >
                <IconSymbol size={20} name="arrow.right.circle.fill" color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>{t('subscription.buttons.continue')}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={isDark 
          ? ['rgba(59, 130, 246, 0.08)', 'rgba(99, 102, 241, 0.06)', 'rgba(139, 92, 246, 0.04)'] 
          : ['rgba(59, 130, 246, 0.05)', 'rgba(99, 102, 241, 0.04)', 'rgba(139, 92, 246, 0.03)']
        }
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View>
          {/* Enhanced Hero Section */}
       
          <Text style={[styles.heroTitle, { color: colors.textSecondary }]}>
            {t('subscription.subtitle')}
          </Text>

        {/* Subscription Packages - Horizontal Layout */}
        {allOfferings && Object.keys(allOfferings).length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
            style={styles.horizontalScrollContainer}
          >
            {Object.entries(allOfferings)
              .sort(([, offeringA], [, offeringB]) => {
                // Ordenar por precio: 3 meses, 6 meses, 1 año
                const priceA = offeringA.availablePackages[0]?.product?.price || 0;
                const priceB = offeringB.availablePackages[0]?.product?.price || 0;
                return priceA - priceB;
              })
              .map(([offeringKey, offering]) =>
                offering.availablePackages.map((pkg, index) => {
                  // Validar el paquete antes de renderizar
                  if (!pkg?.product?.identifier) {
                    console.warn('⚠️ Paquete sin identificador:', pkg);
                    return null;
                  }
                  
                  // Determinar el diseño según el producto
                  let iconColor = "#6366f1";
                  let gradientColors: [string, string] = ['rgba(99, 102, 241, 0.08)', 'rgba(99, 102, 241, 0.04)'];
                  let buttonGradient: [string, string] = ['rgba(99, 102, 241, 0.9)', 'rgba(79, 70, 229, 0.9)'];
                  let duration = '';
                  let isBestOption = false;
                  let cardStyle = styles.packageCardHorizontal;
                  let badgeText = '';
                  
                  if (pkg.product.identifier === '1981') {
                    iconColor = "#10b981";
                    gradientColors = ['rgba(16, 185, 129, 0.06)', 'rgba(16, 185, 129, 0.03)'];
                    buttonGradient = ['rgba(16, 185, 129, 0.9)', 'rgba(5, 150, 105, 0.9)'];
                    duration = '3 months';
                    badgeText = 'Basic';
                  } else if (pkg.product.identifier === 'ente2') {
                    iconColor = "#f59e0b";
                    gradientColors = ['rgba(245, 158, 11, 0.12)', 'rgba(245, 158, 11, 0.06)'];
                    buttonGradient = ['rgba(245, 158, 11, 0.95)', 'rgba(217, 119, 6, 0.95)'];
                    duration = '6 months';
                    isBestOption = true;
                    cardStyle = styles.packageCardBest;
                    badgeText = 'Best Value';
                  } else if (pkg.product.identifier === 'ente3') {
                    iconColor = "#8b5cf6";
                    gradientColors = ['rgba(139, 92, 246, 0.08)', 'rgba(139, 92, 246, 0.04)'];
                    buttonGradient = ['rgba(139, 92, 246, 0.9)', 'rgba(124, 58, 237, 0.9)'];
                    duration = '1 year';
                    badgeText = 'Premium';
                  }
                  
                  const uniqueKey = `${offeringKey}_${pkg.product.identifier}_${index}`;
                  
                  return (
                    <TouchableOpacity
                      key={uniqueKey}
                      style={[cardStyle, isBestOption && styles.bestOptionShadow]}
                      onPress={() => handlePurchase(pkg)}
                      disabled={purchasing}
                      activeOpacity={0.8}
                    >
                      <BlurView 
                        intensity={isBestOption ? 98 : 92} 
                        tint={isDark ? "dark" : "light"} 
                        style={styles.packageCardInnerHorizontal}
                      >
                        <LinearGradient
                          colors={gradientColors}
                          style={styles.packageGradientHorizontal}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                        
                        
                        {/* Badge de tipo */}
                        <View style={[styles.typeBadge, { backgroundColor: iconColor + '20' }]}>
                          <Text style={[styles.typeBadgeText, { color: iconColor }]}>{badgeText}</Text>
                        </View>
                        
                        <Text style={[styles.packageTitleHorizontal, { color: colors.text, marginTop: 16 }]}>{duration}</Text>
                     
                        
                        <View style={styles.packagePriceContainerHorizontal}>
                          <Text style={[styles.packagePriceHorizontal, { color: colors.text }]}>{pkg.product.priceString}</Text>
                          <Text style={[styles.packagePricePerMonth, { color: colors.textSecondary }]}>
                            {pkg.product.identifier === '1981' && '/3 months'}
                            {pkg.product.identifier === 'ente2' && '/6 months'}
                            {pkg.product.identifier === 'ente3' && '/year'}
                          </Text>
                        </View>
                        
                        <View style={styles.subscribeButtonContainerHorizontal}>
                          <LinearGradient
                            colors={buttonGradient as [string, string, ...string[]]}
                            style={styles.subscribeButtonGradientHorizontal}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={styles.subscribeButtonTextHorizontal}>
                              {isBestOption ? 'Choose Best' : 'Select Plan'}
                            </Text>
                          </LinearGradient>
                        </View>
                      </BlurView>
                    </TouchableOpacity>
                  );
                })
              )}
          </ScrollView>
        ) : (
          <View style={styles.noProductsContainer}>
            <Text style={[styles.noProductsText, { color: colors.textSecondary }]}>
              {isLoading ? 'Cargando productos...' : 'No hay productos disponibles en este momento'}
            </Text>
            {!isLoading && (
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={() => checkSubscriptionStatus()}
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Cancellation Info */}
        <BlurView intensity={85} tint={isDark ? "dark" : "light"} style={styles.cancellationContainer}>
          <LinearGradient
            colors={isDark 
              ? ['rgba(34, 197, 94, 0.08)', 'rgba(34, 197, 94, 0.04)', 'transparent'] 
              : ['rgba(34, 197, 94, 0.06)', 'rgba(34, 197, 94, 0.03)', 'transparent']
            }
            style={styles.cancellationGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.cancellationContent}>
            <View style={[styles.cancellationIconContainer, { backgroundColor: colors.success + '20' }]}>
              <IconSymbol size={16} name="checkmark.shield.fill" color={colors.success} />
            </View>
            <Text style={[styles.cancellationText, { color: colors.textSecondary }]}>
              {t('subscription.cancellation_text')}
            </Text>
          </View>
        </BlurView>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.restoreButtonWrapper}
            onPress={handleRestore}
            disabled={purchasing}
            activeOpacity={0.8}
          >
            <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.restoreButtonInner}>
              <View style={styles.restoreIconContainer}>
                <IconSymbol size={18} name="arrow.clockwise" color={colors.primary} />
              </View>
              <Text style={[styles.restoreButtonText, { color: colors.primary }]}>Restore</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButtonWrapper}
            onPress={() => navigateTo('mapa')}
            disabled={purchasing}
            activeOpacity={0.8}
          >
            <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.cancelButtonInner}>
              <View style={styles.cancelIconContainer}>
                <IconSymbol size={18} name="xmark" color={colors.textSecondary} />
              </View>
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('subscription.buttons.cancel')}</Text>
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Footer Links */}
        <View style={styles.footerLinksContainer}>
          {/* Botón de Privacidad */}
          <TouchableOpacity 
            style={[styles.footerButton, { backgroundColor: colors.card }]} 
            onPress={openPrivacy}
          >
            <IconSymbol name="lock.shield.fill" size={20} color={colors.primary} />
            <Text style={[styles.footerButtonText, { color: colors.text }]}>
              {t('help_support.legal.privacy')}
            </Text>
          </TouchableOpacity>
          
          {/* Botón de Términos */}
          <TouchableOpacity 
            style={[styles.footerButton, { backgroundColor: colors.card }]} 
            onPress={openTerms}
          >
            <IconSymbol name="doc.text.fill" size={20} color={colors.primary} />
            <Text style={[styles.footerButtonText, { color: colors.text }]}>
              {t('help_support.legal.terms')}
            </Text>
          </TouchableOpacity>

          {/* Botón de EULA */}
          <TouchableOpacity 
            style={[styles.footerButton, { backgroundColor: colors.card }]} 
            onPress={openEULA}
          >
            <IconSymbol name="doc.badge.gearshape" size={20} color={colors.primary} />
            <Text style={[styles.footerButtonText, { color: colors.text }]}>
              EULA
            </Text>
          </TouchableOpacity>
          
          {/* Botón de Email */}
          <TouchableOpacity 
            style={[styles.footerButton, { backgroundColor: colors.card }]} 
            onPress={openEmail}
          >
            <IconSymbol name="envelope.fill" size={20} color={colors.primary} />
            <Text style={[styles.footerButtonText, { color: colors.text }]}>
              {t('help_support.contact.email')}
            </Text>
          </TouchableOpacity>
        </View>

        {purchasing && (
            <View style={[styles.purchasingOverlay, { backgroundColor: colors.background + 'E6' }]}>
              <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.purchasingCard}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.purchasingText, { color: colors.text }]}>{t('subscription.processing')}</Text>
                <Text style={[styles.purchasingText, { color: colors.textSecondary, marginTop: 8, fontSize: 14, textAlign: 'center' }]}>
                  {t('subscription.processing_note') || 'Conectando con App Store...'}
                </Text>
              </BlurView>
            </View>
        )}
      </View>
    </ScrollView>

    {/* Privacy Policy Modal */}
    <Modal
        visible={showPrivacyPolicy}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowPrivacyPolicy(false)}
      >
        <PrivacyPolicyScreen onClose={() => setShowPrivacyPolicy(false)} />
    </Modal>
    
    {/* Terms of Service Modal */}
    <Modal
        visible={showTermsOfService}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowTermsOfService(false)}
      >
        <TermsOfServiceScreen onClose={() => setShowTermsOfService(false)} />
    </Modal>
    
    {/* EULA Modal */}
    <Modal
        visible={showEULA}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowEULA(false)}
      >
        <EULAScreen onClose={() => setShowEULA(false)} />
    </Modal>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 20,

  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  // Enhanced Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  loadingCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // Enhanced Premium Header Styles
  premiumHeader: {
    paddingTop: 40,
    paddingBottom: 40,
  
    position: 'relative',
    marginBottom: 32,
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.25,
        shadowRadius: 32,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  premiumBadgeContainer: {
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    overflow: 'hidden',
  },
  premiumBadgeText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  premiumTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
    }),
  },
  premiumSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  decorativeElements: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  decorativeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  // Scroll Container
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,

  },

  // Modern Card Styles
  modernCard: {
    borderRadius: 24,
    marginBottom: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    overflow: 'hidden',
    
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.2,
  },
  cardContent: {
    padding: 20,
    paddingTop: 16,
  },

  // Status Styles
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Info Row Styles
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },

  // Subscription Styles
  subscriptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subscriptionId: {
    fontSize: 12,
  },
  subscriptionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subscriptionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Entitlement Styles
  entitlementItem: {
    marginBottom: 16,
  },
  entitlementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entitlementName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  renewalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  renewalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  entitlementDetails: {
    paddingLeft: 12,
  },

  // Action Button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Purchase Screen Styles (conflicted with scroll styles above, fixed)
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: 30,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  feature: {
    marginBottom: 8,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
    flexWrap: 'wrap',
  },
  packagesContainer: {
    marginBottom: 30,
  },
  packageCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  packageDescription: {
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  packageDuration: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  buttonsContainer: {
    marginTop: 20,
  },
  restoreButton: {
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  restoreButtonText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    paddingVertical: 15,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  purchasingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  purchasingCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  purchasingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Enhanced Card Styles
  cardGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  statusCard: {
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  enhancedIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  iconGradientBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  headerTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusIndicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  // Enhanced Hero Section Styles
  heroCard: {
    borderRadius: 28,
        marginTop: -10,
    padding: 32,
    marginBottom: 20,
    alignItems: 'center',
    overflow: 'hidden',


  },
  heroGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  premiumIconContainer: {
    marginBottom: 28,

    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  premiumIconGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  premiumIconGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    zIndex: -1,
  },
  iconShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  heroTitle: {
    fontSize: 24,
    marginTop: -20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.8,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
    }),
  },
  heroSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 16,
    fontWeight: '400',
    marginTop: -20,
  },
  featuresCard: {
    borderRadius: 20,
    margin: 16,
    padding: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  noProductsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  noProductsText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  packageCardInner: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
  },
  packageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  packageIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  packagePriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  subscribeButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  subscribeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    minHeight: 44,
  },
  subscribeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  restoreButtonWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  restoreButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
    borderRadius: 16,
  },
  cancelButtonWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
    borderRadius: 16,
  },
  restoreIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',        
  },
  cancellationContainer: {
    marginHorizontal: 20,
    marginBottom: -20,
    borderRadius: 16,
    overflow: 'hidden',

  },
  cancellationGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  cancellationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cancellationIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cancellationText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    flex: 1,
  },
  footerLinksContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
    gap: 12,
    width: '100%',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  footerLinksBackground: {
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
  },
  footerLink: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    flex: 1,
    alignItems: 'center',
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerDivider: {
    fontSize: 14,
    marginHorizontal: 4,
    opacity: 0.4,
  },

  // Horizontal Layout Styles
  horizontalScrollContainer: {
    marginVertical: 16,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  packageCardHorizontal: {
    width: screenWidth * 0.72,
    marginRight: 16,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  packageCardBest: {
    width: screenWidth * 0.78,
    marginRight: 16,
    borderRadius: 32,
    overflow: 'hidden',
    transform: [{ scale: 1.05 }],
    ...Platform.select({
      ios: {
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  bestOptionShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3,
        shadowRadius: 32,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  packageCardInnerHorizontal: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  packageGradientHorizontal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  typeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',

  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  packageTitleHorizontal: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,

  },
  packageSubtitleHorizontal: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    opacity: 0.8,
  },
  packagePriceContainerHorizontal: {
    alignItems: 'center',
    marginBottom: 24,
  },
  packagePriceHorizontal: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1,
  },
  packagePricePerMonth: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.7,
  },
  subscribeButtonContainerHorizontal: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  subscribeButtonGradientHorizontal: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  subscribeButtonTextHorizontal: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});