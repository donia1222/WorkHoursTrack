import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Job } from '../types/WorkTypes';
import { useLanguage } from '../contexts/LanguageContext';
import { ParsedWorkData } from '../services/ChatDataParser';

export type ScreenName = 'mapa' | 'timer' | 'reports' | 'calendar' | 'settings' | 'subscription' | 'chatbot';

interface NavigationContextType {
  currentScreen: ScreenName;
  navigationHistory: ScreenName[];
  selectedJob: Job | null;
  navigateTo: (screen: ScreenName, job?: Job) => void;
  navigateBack: () => ScreenName;
  canGoBack: () => boolean;
  getPreviousScreen: () => ScreenName | null;
  setSelectedJob: (job: Job | null) => void;
  // Chat export functionality
  exportToCalendar: (jobId: string, parsedData: ParsedWorkData) => void;
  onExportToCalendar?: (jobId: string, parsedData: ParsedWorkData) => void;
  setOnExportToCalendar: (callback?: (jobId: string, parsedData: ParsedWorkData) => void) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('mapa');
  const [navigationHistory, setNavigationHistory] = useState<ScreenName[]>(['mapa']);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [onExportToCalendar, setOnExportToCalendar] = useState<((jobId: string, parsedData: ParsedWorkData) => void) | undefined>(undefined);

  const navigateTo = (screen: ScreenName, job?: Job) => {
    if (screen !== currentScreen) {
      setNavigationHistory(prev => {
        // Remove the screen from history if it already exists to avoid duplicates
        const filteredHistory = prev.filter(s => s !== screen);
        // Add current screen to history before navigating
        return [...filteredHistory, currentScreen];
      });
      setCurrentScreen(screen);
      
      // Call screen-specific focus handlers when navigating
      if (screen === 'reports' && globalThis.reportsScreenFocusHandler) {
        // Use setTimeout to call after the screen renders
        setTimeout(() => {
          globalThis.reportsScreenFocusHandler?.();
        }, 100);
      }
    }
    
    // Set selected job if provided
    if (job !== undefined) {
      setSelectedJob(job);
    }
  };

  const navigateBack = (): ScreenName => {
    if (navigationHistory.length > 0) {
      const previousScreen = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentScreen(previousScreen);
      return previousScreen;
    } else {
      // Fallback to mapa if no history
      setCurrentScreen('mapa');
      return 'mapa';
    }
  };

  const canGoBack = (): boolean => {
    return navigationHistory.length > 0;
  };

  const getPreviousScreen = (): ScreenName | null => {
    return navigationHistory.length > 0 ? navigationHistory[navigationHistory.length - 1] : null;
  };

  const exportToCalendar = (jobId: string, parsedData: ParsedWorkData) => {
    if (onExportToCalendar) {
      onExportToCalendar(jobId, parsedData);
    } else {
      console.warn('No export handler registered');
    }
  };

  const value: NavigationContextType = {
    currentScreen,
    navigationHistory,
    selectedJob,
    navigateTo,
    navigateBack,
    canGoBack,
    getPreviousScreen,
    setSelectedJob,
    exportToCalendar,
    onExportToCalendar,
    setOnExportToCalendar,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

// Hook for getting the appropriate back action
export function useBackNavigation() {
  const { navigateBack, canGoBack, getPreviousScreen } = useNavigation();
  const { t } = useLanguage();

  const handleBack = () => {
    if (canGoBack()) {
      return navigateBack();
    } else {
      // Fallback to mapa
      return 'mapa';
    }
  };

  const getBackButtonLabel = () => {
    const previousScreen = getPreviousScreen();
    if (!previousScreen) return t('navigation.home');

    const screenKey = `navigation.screens.${previousScreen}`;
    return t(screenKey);
  };

  return {
    handleBack,
    canGoBack: canGoBack(),
    backButtonLabel: getBackButtonLabel(),
    previousScreen: getPreviousScreen(),
  };
}