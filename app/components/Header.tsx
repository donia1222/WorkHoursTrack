import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';

interface HeaderProps {
  title: string | React.ReactNode;
  onProfilePress: () => void;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  showBackButton?: boolean;
}

export default function Header({ title, onProfilePress, onMenuPress, onBackPress, showBackButton }: HeaderProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <BlurView intensity={95} tint="extraLight" style={styles.blurContainer}>
        <View style={styles.container}>
          {showBackButton && onBackPress ? (
            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
              <View style={styles.backButtonInner}>
                <IconSymbol size={20} name="chevron.left" color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ) : onMenuPress ? (
            <TouchableOpacity onPress={onMenuPress} style={styles.profileButton}>
     
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}
          
          <View style={styles.titleContainer}>
            {typeof title === 'string' ? (
              <Text style={styles.title}>{title}</Text>
            ) : (
              title
            )}
            <View style={styles.titleUnderline} />
          </View>
          
          <TouchableOpacity  onPress={onMenuPress} style={styles.profileButton}>
             <View style={styles.menuButtonInner}>
               <IconSymbol size={20} name="line.3.horizontal" color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </BlurView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f7f7f7ff',
  },
  blurContainer: {


    elevation: 3,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  menuButton: {
    padding: 4,
    marginRight: 12,
  },
  menuButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF9500',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  spacer: {
    width: 48,
  },
  titleContainer: {
    flex: 1,

  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  titleUnderline: {
    width: 30,
    height: 3,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  profileButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});