import * as QuickActions from 'expo-quick-actions';
import { Platform, Linking, NativeModules } from 'react-native';
import { EventEmitter } from 'events';

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

class SimpleQuickActionsManager extends EventEmitter {
  private static instance: SimpleQuickActionsManager;
  private isInitialized = false;
  private pendingAction: QuickActionType | null = null;
  private navigationReady = false;

  private constructor() {
    super();
  }

  static getInstance(): SimpleQuickActionsManager {
    if (!this.instance) {
      this.instance = new SimpleQuickActionsManager();
    }
    return this.instance;
  }

  async initialize(initialProps?: any) {
    if (this.isInitialized || Platform.OS !== 'ios') return;

    try {
      console.log('🚀 Initializing Simple Quick Actions Manager');
      
      // Try to get initial props from native module
      let shortcutType = initialProps?.shortcutType;
      
      // If no initial props, try to get from the root tag properties
      if (!shortcutType && NativeModules.RNQuickActions) {
        try {
          const initialAction = await NativeModules.RNQuickActions.getInitialAction();
          if (initialAction) {
            shortcutType = initialAction.type || initialAction.id;
            console.log('📱 Got initial action from native module:', shortcutType);
          }
        } catch (e) {
          console.log('📱 No RNQuickActions module available');
        }
      }

      console.log('📱 Initial props/shortcut:', shortcutType);

      // Configure the quick action items
      await this.setupQuickActions();

      // Set up listener for quick actions (this also checks for initial action)
      this.setupQuickActionListener();

      // Check if app was launched with a quick action from native props
      if (shortcutType) {
        console.log('🚀 App launched with Quick Action from native props:', shortcutType);
        // Delay to ensure navigation is ready
        setTimeout(() => {
          this.handleQuickAction(shortcutType as QuickActionType);
        }, 1000);
      }

      this.isInitialized = true;
      console.log('✅ Simple Quick Actions Manager initialized');
    } catch (error) {
      console.error('❌ Error initializing Simple Quick Actions Manager:', error);
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
          params: { screen: 'timer' },
        },
        {
          id: 'com.worktrack.reports',
          title: 'Reportes',
          subtitle: 'Ver resumen',
          icon: 'symbol:doc.text',
          params: { screen: 'reports' },
        },
        {
          id: 'com.worktrack.calendar',
          title: 'Calendario',
          subtitle: 'Días trabajados',
          icon: 'symbol:calendar',
          params: { screen: 'calendar' },
        },
        {
          id: 'com.worktrack.chat',
          title: 'Chat IA',
          subtitle: 'Asistente',
          icon: 'symbol:message',
          params: { screen: 'chatbot' },
        },
      ]);
      console.log('✅ Quick Actions configured');
    } catch (error) {
      console.error('❌ Error setting up quick actions:', error);
    }
  }

  private setupQuickActionListener() {
    console.log('🎯 Setting up Quick Action listener...');
    
    // Listen for quick actions when app is running
    const removeListener = QuickActions.addListener((action: any) => {
      console.log('📱 Quick Action received (listener):', JSON.stringify(action));
      // Try different properties to get the action type
      const actionType = (action?.id || action?.type || action?.params?.type) as QuickActionType;
      console.log('📱 Extracted action type:', actionType);
      if (actionType) {
        this.handleQuickAction(actionType);
      } else {
        console.warn('⚠️ Could not extract action type from:', action);
      }
    });
    
    console.log('🎯 Quick Action listener setup complete');
    
    // Also check if there's an initial action available
    this.checkForInitialAction();
  }
  
  private async checkForInitialAction() {
    try {
      // Try to get initial action from expo-quick-actions
      const initialAction = QuickActions.initial;
      console.log('🔍 Checking for initial Quick Action:', initialAction);
      
      if (initialAction) {
        console.log('🚀 Initial Quick Action detected:', initialAction);
        const actionType = initialAction.id as QuickActionType;
        if (actionType) {
          setTimeout(() => {
            this.handleQuickAction(actionType);
          }, 1500);
        }
      } else {
        console.log('📱 No initial Quick Action available');
      }
    } catch (error) {
      console.log('📱 Error checking initial Quick Action:', error);
    }
  }

  private handleQuickAction(actionType: QuickActionType) {
    console.log('🎯 Handling quick action:', actionType);
    const screen = ACTION_TO_SCREEN_MAP[actionType];
    
    if (!screen) {
      console.warn('⚠️ Unknown quick action type:', actionType);
      return;
    }

    console.log('🎯 Mapped to screen:', screen);

    if (this.navigationReady) {
      // Navigation is ready, emit the event immediately
      console.log('✅ Navigation ready, emitting quick action:', screen);
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
}

export default SimpleQuickActionsManager.getInstance();