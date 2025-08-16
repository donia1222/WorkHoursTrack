import * as QuickActions from 'expo-quick-actions';
import { Platform, AppState } from 'react-native';
import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for Quick Actions
type QuickActionType = 'com.worktrack.timer' | 'com.worktrack.reports' | 'com.worktrack.calendar' | 'com.worktrack.chat';
type NavigationScreen = 'timer' | 'reports' | 'calendar' | 'chatbot';

// Mapping from Quick Action types to navigation screens
const ACTION_TO_SCREEN_MAP: Record<QuickActionType, NavigationScreen> = {
  'com.worktrack.timer': 'timer',
  'com.worktrack.reports': 'reports',
  'com.worktrack.calendar': 'calendar',
  'com.worktrack.chat': 'chatbot',
};

class QuickActionsManager extends EventEmitter {
  private static instance: QuickActionsManager;
  private isInitialized = false;
  private pendingAction: QuickActionType | null = null;
  private navigationReady = false;

  private constructor() {
    super();
    this.setupNativeListener();
  }

  static getInstance(): QuickActionsManager {
    if (!this.instance) {
      this.instance = new QuickActionsManager();
    }
    return this.instance;
  }

  private setupNativeListener() {
    if (Platform.OS !== 'ios') return;

    // Poll UserDefaults for Quick Action events
    // This is a fallback method when native module is not available
    const checkForQuickAction = async () => {
      try {
        // Check if there's a pending quick action in UserDefaults
        const quickActionData = await AsyncStorage.getItem('QuickActionPerformed');
        if (quickActionData) {
          const data = JSON.parse(quickActionData);
          console.log('📱 Quick Action detected from UserDefaults:', data.type);
          this.handleQuickAction(data.type as QuickActionType);
          // Clear after handling
          await AsyncStorage.removeItem('QuickActionPerformed');
        }
      } catch (error) {
        console.warn('Error checking for quick action:', error);
      }
    };

    // Check on app state changes
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkForQuickAction();
      }
    });

    // Initial check
    checkForQuickAction();
  }

  async initialize() {
    if (this.isInitialized || Platform.OS !== 'ios') return;

    try {
      console.log('🚀 Initializing Quick Actions Manager');

      // Configure the quick action items
      await this.setupQuickActions();

      // Set up listener for quick actions
      this.setupQuickActionListener();

      // Check for initial quick action (app launched from shortcut)
      await this.checkInitialAction();

      this.isInitialized = true;
      console.log('✅ Quick Actions Manager initialized');
    } catch (error) {
      console.error('❌ Error initializing Quick Actions Manager:', error);
    }
  }

  private async setupQuickActions() {
    try {
      await QuickActions.setItems([
        {
          id: 'com.worktrack.timer',
          title: 'Timer',
          subtitle: 'Gestionar tiempo',
          icon: 'symbol:clock',
          params: { type: 'com.worktrack.timer' },
        },
        {
          id: 'com.worktrack.reports',
          title: 'Reportes',
          subtitle: 'Ver resumen',
          icon: 'symbol:doc.text',
          params: { type: 'com.worktrack.reports' },
        },
        {
          id: 'com.worktrack.calendar',
          title: 'Calendario',
          subtitle: 'Días trabajados',
          icon: 'symbol:calendar',
          params: { type: 'com.worktrack.calendar' },
        },
        {
          id: 'com.worktrack.chat',
          title: 'Chat IA',
          subtitle: 'Asistente',
          icon: 'symbol:message',
          params: { type: 'com.worktrack.chat' },
        },
      ]);
      console.log('✅ Quick Actions configured');
    } catch (error) {
      console.error('❌ Error setting up quick actions:', error);
    }
  }

  private setupQuickActionListener() {
    // Listen for quick actions when app is running
    QuickActions.addListener((action: any) => {
      console.log('📱 Quick Action received (running):', action);
      // Use the id directly as it's the action type
      const actionType = action?.id as QuickActionType;
      if (actionType) {
        this.handleQuickAction(actionType);
      }
    });

    // No native event emitter needed with expo-quick-actions
  }

  private async checkInitialAction() {
    try {
      // Check for launch options stored by AppDelegate
      const launchOptions = await AsyncStorage.getItem('QuickActionLaunchOptions');
      if (launchOptions) {
        const data = JSON.parse(launchOptions);
        console.log('🚀 App launched with Quick Action:', data.type);
        this.handleQuickAction(data.type as QuickActionType);
        // Clear after handling
        await AsyncStorage.removeItem('QuickActionLaunchOptions');
      } else {
        console.log('📱 Quick Actions initialized, waiting for actions...');
      }
    } catch (error) {
      console.error('❌ Error checking initial quick action:', error);
    }
  }

  private handleQuickAction(actionType: QuickActionType) {
    const screen = ACTION_TO_SCREEN_MAP[actionType];
    
    if (!screen) {
      console.warn('⚠️ Unknown quick action type:', actionType);
      return;
    }

    if (this.navigationReady) {
      // Navigation is ready, emit the event immediately
      console.log('✅ Emitting quick action:', screen);
      this.emit('quickAction', screen);
    } else {
      // Navigation not ready yet, store the action
      console.log('⏳ Navigation not ready, storing action:', screen);
      this.pendingAction = actionType;
    }
  }

  setNavigationReady(ready: boolean) {
    this.navigationReady = ready;
    
    if (ready && this.pendingAction) {
      // Process pending action
      const screen = ACTION_TO_SCREEN_MAP[this.pendingAction];
      if (screen) {
        console.log('✅ Processing pending quick action:', screen);
        // Small delay to ensure navigation is fully ready
        setTimeout(() => {
          this.emit('quickAction', screen);
        }, 100);
      }
      this.pendingAction = null;
    }
  }

  // Clear all quick actions (useful for resetting state)
  async clearQuickActions() {
    if (Platform.OS !== 'ios') return;
    
    try {
      await QuickActions.setItems([]);
      console.log('✅ Quick Actions cleared');
    } catch (error) {
      console.error('❌ Error clearing quick actions:', error);
    }
  }

  // Update quick actions dynamically
  async updateQuickActions(items: Array<{ id: string; title: string; subtitle?: string; icon?: string; params?: any }>) {
    if (Platform.OS !== 'ios') return;
    
    try {
      await QuickActions.setItems(items);
      console.log('✅ Quick Actions updated');
    } catch (error) {
      console.error('❌ Error updating quick actions:', error);
    }
  }
}

export default QuickActionsManager.getInstance();