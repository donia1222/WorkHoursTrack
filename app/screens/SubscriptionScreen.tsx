import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
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

export default function SubscriptionScreen() {
  const router = useRouter();
  const { navigateTo } = useNavigation();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { isSubscribed, isLoading, offerings, customerInfo, purchaseSubscription, restorePurchases, checkSubscriptionStatus } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);

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
            ? ['rgba(59, 130, 246, 0.08)', 'rgba(99, 102, 241, 0.06)', 'rgba(139, 92, 246, 0.04)'] 
            : ['rgba(59, 130, 246, 0.05)', 'rgba(99, 102, 241, 0.04)', 'rgba(139, 92, 246, 0.03)']
          }
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>{t('subscription.loading')}</Text>
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
                  {/* Header con gradiente */}
        <View style={[styles.premiumHeader, { backgroundColor: colors.primary }]}>
          
          <View style={styles.headerContent}>
            <View style={styles.premiumBadge}>
              <IconSymbol size={24} name="crown.fill" color="#FFD700" />
              <Text style={styles.premiumBadgeText}>{t('subscription.success.premium_badge')}</Text>
            </View>
            <Text style={styles.premiumTitle}>{t('subscription.success.premium_title')}</Text>
            <Text style={styles.premiumSubtitle}>
              {t('subscription.success.premium_subtitle')}
            </Text>
          </View>
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
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.heroCard}>
          <LinearGradient
            colors={isDark 
              ? ['rgba(255, 215, 0, 0.12)', 'rgba(255, 165, 0, 0.08)', 'transparent'] 
              : ['rgba(255, 215, 0, 0.08)', 'rgba(255, 165, 0, 0.06)', 'transparent']
            }
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.premiumIconContainer}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.premiumIconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <IconSymbol size={48} name="crown.fill" color="#000" />
            </LinearGradient>
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
                  
                  <Text style={[styles.packageDescription, { color: colors.textSecondary }]}>{pkg.product.description}</Text>
                  
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
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.purchasingText, { color: colors.text }]}>{t('subscription.processing')}</Text>
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },

  // Premium Header Styles
  premiumHeader: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    position: 'relative',
    marginBottom: 40,
    marginTop: -20,
    borderRadius: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  premiumBadgeText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },
  premiumTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  premiumSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchasingText: {
    marginTop: 10,
    fontSize: 16,
  },

  // New Modern Styles
  heroCard: {
    borderRadius: 24,
    margin: 16,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  premiumIconContainer: {
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  premiumIconGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
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