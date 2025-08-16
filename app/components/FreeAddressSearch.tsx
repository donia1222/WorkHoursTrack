import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface AddressResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
    country?: string;
  };
}

interface FreeAddressSearchProps {
  visible: boolean;
  onClose: () => void;
  onSelectAddress: (address: {
    fullAddress: string;
    street: string;
    city: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  currentAddress?: string;
}

export const FreeAddressSearch: React.FC<FreeAddressSearchProps> = ({
  visible,
  onClose,
  onSelectAddress,
  currentAddress,
}) => {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const [searchText, setSearchText] = useState(currentAddress || '');
  const [results, setResults] = useState<AddressResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Theme.spacing.lg,
      paddingVertical: Theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    headerTitle: {
      ...Theme.typography.headline,
      color: colors.text,
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      padding: Theme.spacing.sm,
    },
    searchContainer: {
      paddingHorizontal: Theme.spacing.lg,
      paddingVertical: Theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: Theme.borderRadius.md,
      paddingHorizontal: Theme.spacing.md,
      height: 48,
      borderWidth: 1,
      borderColor: colors.separator,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
    },
    searchButton: {
      padding: Theme.spacing.sm,
    },
    resultItem: {
      paddingVertical: Theme.spacing.md,
      paddingHorizontal: Theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    resultText: {
      ...Theme.typography.body,
      color: colors.text,
      marginBottom: Theme.spacing.xs,
    },
    resultSubtext: {
      ...Theme.typography.caption1,
      color: colors.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Theme.spacing.xl,
    },
    emptyText: {
      ...Theme.typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    freeServiceNote: {
      paddingHorizontal: Theme.spacing.lg,
      paddingVertical: Theme.spacing.sm,
      backgroundColor: colors.success + '10',
    },
    freeServiceText: {
      ...Theme.typography.caption1,
      color: colors.success,
      textAlign: 'center',
    },
  });

  const searchAddresses = async () => {
    if (!searchText.trim()) {
      Alert.alert(
        t('common.error'),
        t('job_form.basic.search_placeholder')
      );
      return;
    }

    setIsSearching(true);
    try {
      // Usar Nominatim de OpenStreetMap (gratuito)
      const languageCode = language === 'es' ? 'es' : 
                          language === 'de' ? 'de' : 
                          language === 'fr' ? 'fr' : 
                          language === 'it' ? 'it' : 'en';
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchText)}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=10&` +
        `accept-language=${languageCode}`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Address search error:', error);
      Alert.alert(
        t('common.error'),
        t('common.error_occurred')
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAddress = (result: AddressResult) => {
    const address = result.address || {};
    const street = address.road ? 
      `${address.road}${address.house_number ? ' ' + address.house_number : ''}` : '';
    const city = address.city || address.town || address.village || '';
    const postalCode = address.postcode || '';

    onSelectAddress({
      fullAddress: result.display_name,
      street,
      city,
      postalCode,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    });
    handleClose();
  };

  const handleClose = () => {
    setSearchText('');
    setResults([]);
    onClose();
  };

  const renderResultItem = ({ item }: { item: AddressResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectAddress(item)}
    >
      <Text style={styles.resultText} numberOfLines={2}>
        {item.display_name}
      </Text>
      {item.address && (
        <Text style={styles.resultSubtext}>
          {[
            item.address.road,
            item.address.city || item.address.town,
            item.address.postcode,
            item.address.country,
          ].filter(Boolean).join(', ')}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>
            {t('job_form.basic.search_address')}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <IconSymbol
              name="xmark.circle.fill"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.freeServiceNote}>
          <Text style={styles.freeServiceText}>
            100% gratuito - Powered by OpenStreetMap
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder={t('job_form.basic.search_placeholder')}
              placeholderTextColor={colors.textTertiary}
              returnKeyType="search"
              onSubmitEditing={searchAddresses}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={searchAddresses}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <IconSymbol
                  name="magnifyingglass"
                  size={20}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            renderItem={renderResultItem}
            keyExtractor={(item, index) => `${item.lat}-${item.lon}-${index}`}
            contentContainerStyle={{ paddingBottom: Theme.spacing.xl }}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <IconSymbol
              name="magnifyingglass"
              size={48}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyText}>
              {searchText ? 
                t('common.no_results') : 
                t('job_form.basic.search_placeholder')}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};