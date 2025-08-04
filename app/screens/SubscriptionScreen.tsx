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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SubscriptionScreen() {
  const router = useRouter();
  const { navigateTo } = useNavigation();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { isSubscribed, isLoading, offerings, customerInfo, purchaseSubscription, restorePurchases, checkSubscriptionStatus } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);
  
  // Animation values
  const fadeInValue = useSharedValue(0);
  const slideInValue = useSharedValue(50);
  const scaleValue = useSharedValue(0.9);
  const crownRotation = useSharedValue(0);
  
  useEffect(() => {
    // Entrance animations
    fadeInValue.value = withTiming(1, { duration: 800 });
    slideInValue.value = withSpring(0, { damping: 15, stiffness: 100 });
    scaleValue.value = withSpring(1, { damping: 12, stiffness: 120 });
    
    // Crown rotation animation
    const rotateCrown = () => {
      crownRotation.value = withTiming(360, { duration: 2500 }, () => {
        crownRotation.value = 0;
        runOnJS(rotateCrown)();
      });
    };
    rotateCrown();
  }, []);
  
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeInValue.value,
      transform: [
        { translateY: slideInValue.value },
        { scale: scaleValue.value },
      ],
    };
  });
  
  const crownAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${crownRotation.value}deg` }],
    };
  });

  const handlePurchase = async (packageToPurchase: any) => {
    setPurchasing(true);
    const result = await purchaseSubscription(packageToPurchase);
    setPurchasing(false);

    if (result.success) {
      // Forzar una verificación adicional del estado de suscripción
      await checkSubscriptionStatus();
      
      Alert.alert(
        t('subscription.success.title'),
        t('subscription.success.message'),
        [
          {
            text: t('subscription.buttons.continue'),
            onPress: () => navigateTo('mapa'),
          },
        ]
      );
    } else {
      if (result.error !== 'User cancelled') {
        Alert.alert('Error', t('subscription.errors.purchase_failed'));
      }
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    const result = await restorePurchases();
    setPurchasing(false);

    if (result.success) {
      // Forzar una verificación adicional del estado de suscripción
      await checkSubscriptionStatus();
      
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
      Alert.alert('Error', t('subscription.errors.restore_failed'));
    }
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
        <Animated.View style={[styles.loadingContainer, containerAnimatedStyle]}>
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
        </Animated.View>
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
          <Animated.View style={containerAnimatedStyle}>
            <LinearGradient
              colors={isDark 
                ? ['#667eea', '#764ba2', '#f093fb', '#f5576c'] 
                : ['#667eea', '#764ba2', '#f093fb', '#f5576c']
              }
              style={styles.premiumHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.headerContent}>
                <View style={styles.premiumBadgeContainer}>
                  <BlurView intensity={80} tint={"light"} style={styles.premiumBadge}>
                    <Animated.View style={crownAnimatedStyle}>
                      <IconSymbol size={28} name="crown.fill" color="#FFD700" />
                    </Animated.View>
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
          </Animated.View>
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
        <Animated.View style={containerAnimatedStyle}>
          {/* Enhanced Hero Section */}
          <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.heroCard}>
            <LinearGradient
              colors={isDark 
                ? ['rgba(255, 215, 0, 0.18)', 'rgba(255, 165, 0, 0.12)', 'rgba(255, 140, 0, 0.06)', 'transparent'] 
                : ['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.10)', 'rgba(255, 140, 0, 0.05)', 'transparent']
              }
              style={styles.heroGradientOverlay}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.premiumIconContainer}>
              <LinearGradient
                colors={['#FFD700', '#FF8C00', '#FF6347']}
                style={styles.premiumIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.iconShadow}>
                  <Animated.View style={crownAnimatedStyle}>
                    <IconSymbol size={52} name="crown.fill" color="#000" />
                  </Animated.View>
                </View>
              </LinearGradient>
              <View style={styles.premiumIconGlow} />
            </View>
          
          <Text style={[styles.heroTitle, { color: colors.text }]}>{t('subscription.title')}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {t('subscription.subtitle')}
          </Text>
        </BlurView>

        {/* Features Section */}
        <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.featuresCard}>
          <LinearGradient
            colors={isDark 
              ? ['rgba(99, 102, 241, 0.08)', 'rgba(139, 92, 246, 0.06)', 'transparent'] 
              : ['rgba(99, 102, 241, 0.06)', 'rgba(139, 92, 246, 0.04)', 'transparent']
            }
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={[styles.featuresTitle, { color: colors.text }]}>{t('subscription.features.title')}</Text>
          
          <View style={styles.premiumFeature}>
            <View style={styles.featureIconContainer}>
              <IconSymbol size={18} name="infinity" color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.text }]}>{t('subscription.features.unlimited_access')}</Text>
          </View>
          
          <View style={styles.premiumFeature}>
            <View style={styles.featureIconContainer}>
              <IconSymbol size={18} name="chart.bar.fill" color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.text }]}>{t('subscription.features.advanced_reports')}</Text>
          </View>
          
          <View style={styles.premiumFeature}>
            <View style={styles.featureIconContainer}>
              <IconSymbol size={18} name="square.and.arrow.up.fill" color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.text }]}>{t('subscription.features.data_export')}</Text>
          </View>
          
          <View style={styles.premiumFeature}>
            <View style={styles.featureIconContainer}>
              <IconSymbol size={18} name="eye.slash.fill" color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.text }]}>{t('subscription.features.no_ads')}</Text>
          </View>
          
          <View style={styles.premiumFeature}>
            <View style={styles.featureIconContainer}>
              <IconSymbol size={18} name="headphones" color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.text }]}>{t('subscription.features.priority_support')}</Text>
          </View>
        </BlurView>

        {/* Subscription Packages */}
        {offerings && offerings.availablePackages.length > 0 && (
          <View style={styles.packagesContainer}>
            {offerings.availablePackages.map((pkg, index) => (
              <TouchableOpacity
                key={index}
                style={styles.packageCard}
                onPress={() => handlePurchase(pkg)}
                disabled={purchasing}
                activeOpacity={0.8}
              >
                <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.packageCardInner}>
                  <LinearGradient
                    colors={isDark ? ['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.1)'] : ['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.05)']}
                    style={styles.packageGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  
                  <View style={styles.packageHeader}>
                    <View style={styles.packageIconContainer}>
                      <IconSymbol size={24} name="star.fill" color="#FFD700" />
                    </View>
                    <Text style={[styles.packageTitle, { color: colors.text }]}>{pkg.product.title}</Text>
                  </View>
                  
                    <Text style={[styles.packageDuration, { color: colors.textSecondary }]}>{t('subscription.duration')}</Text>
                  
                  <View style={styles.packagePriceContainer}>
                    <Text style={[styles.packagePrice, { color: colors.text }]}>{pkg.product.priceString}</Text>
          
                    <View style={styles.subscribeButtonContainer}>
                      <LinearGradient
                        colors={['#FFD700', '#FFA500']}
                        style={styles.subscribeButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <IconSymbol size={18} name="crown.fill" color="#000" />
                        <Text style={styles.subscribeButtonText}>{t('subscription.buttons.subscribe')}</Text>
                      </LinearGradient>
                    </View>
                  </View>
                </BlurView>
              </TouchableOpacity>
            ))}
          </View>
        )}

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

          {purchasing && (
            <View style={[styles.purchasingOverlay, { backgroundColor: colors.background + 'E6' }]}>
              <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.purchasingCard}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.purchasingText, { color: colors.text }]}>{t('subscription.processing')}</Text>
              </BlurView>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 80,

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
    fontSize: 32,
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
    margin: 20,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.2,
        shadowRadius: 32,
      },
      android: {
        elevation: 16,
      },
    }),
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
    fontSize: 36,
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
    fontSize: 20,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 16,
    fontWeight: '500',
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
});