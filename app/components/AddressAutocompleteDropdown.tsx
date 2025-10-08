import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Theme } from '../constants/Theme';
import * as Location from 'expo-location';

interface AddressResult {
  description: string;
  street: string;
  city: string;
  postalCode: string;
  country?: string;
  fullAddress: string;
  latitude?: number;
  longitude?: number;
}

interface AddressAutocompleteDropdownProps {
  isOpen: boolean;
  onSelectAddress: (address: AddressResult) => void;
  onClose: () => void;
  currentAddress?: string;
}

export default function AddressAutocompleteDropdown({
  isOpen,
  onSelectAddress,
  onClose,
  currentAddress,
}: AddressAutocompleteDropdownProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(0));
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isOpen) {
      // Animar apertura
      Animated.parallel([
        Animated.timing(animatedHeight, {
          toValue: 350,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
      
      if (currentAddress) {
        setSearchText(currentAddress);
      }
    } else {
      // Animar cierre
      Animated.parallel([
        Animated.timing(animatedHeight, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isOpen]);

  useEffect(() => {
    const searchAddresses = async () => {
      if (searchText.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        // Usar geocodificación de Expo Location
        const results = await Location.geocodeAsync(searchText);
        
        if (results && results.length > 0) {
          // Generar sugerencias basadas en los resultados
          const addressSuggestions = await Promise.all(
            results.slice(0, 5).map(async (result) => {
              try {
                // Obtener información detallada de la dirección
                const reverseResult = await Location.reverseGeocodeAsync({
                  latitude: result.latitude,
                  longitude: result.longitude,
                });

                if (reverseResult && reverseResult.length > 0) {
                  const addr = reverseResult[0];
                  const street = `${addr.street || ''} ${addr.streetNumber || ''}`.trim();
                  const city = addr.city || '';
                  const postalCode = addr.postalCode || '';
                  const country = addr.country || '';

                  const fullAddress = [
                    street,
                    city,
                    postalCode,
                    country,
                  ].filter(Boolean).join(', ');

                  return {
                    description: fullAddress,
                    street,
                    city,
                    postalCode,
                    country,
                    fullAddress,
                    latitude: result.latitude,
                    longitude: result.longitude,
                  };
                }
              } catch (error) {
                console.log('Error getting reverse geocode:', error);
              }
              
              return null;
            })
          );

          setSuggestions(addressSuggestions.filter(Boolean) as AddressResult[]);
        } else {
          // Si no hay resultados de geocodificación, crear sugerencias basadas en el texto
          setSuggestions([
            {
              description: searchText,
              street: searchText,
              city: '',
              postalCode: '',
              fullAddress: searchText,
            }
          ]);
        }
      } catch (error) {
        console.error('Error searching addresses:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchAddresses, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchText]);

  const handleSelectAddress = (address: AddressResult) => {
    onSelectAddress(address);
    setSearchText('');
    setSuggestions([]);
    onClose();
    Keyboard.dismiss();
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: Theme.borderRadius.lg,
      marginTop: Theme.spacing.sm,
      borderWidth: 1,
      borderColor: colors.separator,
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
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
    },
    searchIcon: {
      marginRight: Theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      ...Theme.typography.body,
      color: colors.text,
      paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    },
    closeButton: {
      padding: Theme.spacing.xs,
      marginLeft: Theme.spacing.sm,
    },
    loadingContainer: {
      padding: Theme.spacing.lg,
      alignItems: 'center',
    },
    loadingText: {
      ...Theme.typography.footnote,
      color: colors.textSecondary,
      marginTop: Theme.spacing.sm,
    },
    suggestionsList: {
      maxHeight: 250,
    },
    suggestionItem: {
      padding: Theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
    },
    suggestionItemPressed: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    },
    suggestionText: {
      ...Theme.typography.body,
      color: colors.text,
      marginBottom: 2,
    },
    suggestionDetail: {
      ...Theme.typography.caption2,
      color: colors.textSecondary,
    },
    emptyContainer: {
      padding: Theme.spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      ...Theme.typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    helperText: {
      ...Theme.typography.caption2,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
  });

  if (!isOpen) return null;

  return (
    <Animated.View style={[styles.container, { height: animatedHeight, opacity }]}>
      <View style={styles.searchContainer}>
        <IconSymbol
          name="magnifyingglass"
          size={20}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder={t('address_search.search_placeholder')}
          placeholderTextColor={colors.textTertiary}
          autoFocus
          autoCorrect={false}
          autoCapitalize="words"
        />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            setSearchText('');
            setSuggestions([]);
            onClose();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <IconSymbol
            name="xmark.circle.fill"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>{t('address_search.searching')}</Text>
        </View>
      ) : suggestions.length > 0 ? (
        <FlatList
          data={suggestions}
          keyExtractor={(item, index) => `${item.description}-${index}`}
          style={styles.suggestionsList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => handleSelectAddress(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText} numberOfLines={1}>
                {item.description}
              </Text>
              {item.city && (
                <Text style={styles.suggestionDetail}>
                  {[item.city, item.postalCode].filter(Boolean).join(' • ')}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      ) : searchText.length >= 3 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol
            name="location.slash"
            size={32}
            color={colors.textTertiary}
          />
          <Text style={styles.emptyText}>
            {t('address_search.no_results')}
          </Text>
          <Text style={styles.helperText}>
            {t('address_search.no_results_hint')}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t('address_search.min_chars')}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}