import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';

type Props = {
  message: string;
  onDismiss: () => void;
};

export default function AutoTimerBanner({ message, onDismiss }: Props) {
  return (
    <View 
      style={{
        position: 'absolute',
        top: 95,             // debajo del Header
        left: 12,
        right: 12,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 149, 0, 0.98)',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        shadowColor: '#FF9500',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        minHeight: 140,
      }}
    >
      {/* decor */}
      <View style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
      <View style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 16, padding: 12, marginRight: 14 }}>
          <IconSymbol size={32} name="location.slash.fill" color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500', lineHeight: 18 }}>
            {message}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 14,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onDismiss}
        >
          <Text style={{ fontSize: 14, color: '#FF9500', fontWeight: '700' }}>
            OK, entendido
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
