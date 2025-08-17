import * as QuickActions from 'expo-quick-actions';
import { Platform, Linking, NativeModules } from 'react-native';
import { EventEmitter } from 'events';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

// Import translation files directly to avoid conflicts with main app i18n
import es from '../locales/es.json';
import en from '../locales/en.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import it from '../locales/it.json';

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
  private currentLanguage: string = 'en';
  private i18n: I18n;

  private constructor() {
    super();
    
    // Initialize local i18n instance for Quick Actions
    this.i18n = new I18n({
      es,
      en,
      de,
      fr,
      it,
    });
    
    this.i18n.enableFallback = true;
    this.i18n.defaultLocale = 'en';
  }

  static getInstance(): SimpleQuickActionsManager {
    if (!this.instance) {
      this.instance = new SimpleQuickActionsManager();
    }
    return this.instance;
  }

  async initialize(initialProps?: any) {
    if (Platform.OS !== 'ios') return;
    
    // Force update even if already initialized to refresh translations
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
      // Initialize i18n with device locale
      const deviceLocale = Localization.locale.split('-')[0]; // Get language code (e.g., 'es' from 'es-ES')
      const supportedLanguages = ['es', 'en', 'de', 'fr', 'it'];
      const language = supportedLanguages.includes(deviceLocale) ? deviceLocale : 'en';
      
      // Save current language
      this.currentLanguage = language;
      
      // Configure i18n locale
      this.i18n.locale = language;
      console.log('📱 Device locale:', deviceLocale, '→ Using language:', language);
      
      // FORCE CLEAR FIRST to ensure iOS updates the cache
      await QuickActions.setItems([]);
      
      // Small delay to ensure iOS processes the clear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now set the new items with translations
      await QuickActions.setItems([
        {
          id: 'com.worktrack.timer',
          title: this.i18n.t('quickActions.timer.title'),
          subtitle: this.i18n.t('quickActions.timer.subtitle'),
          icon: 'symbol:clock',
          params: { screen: 'timer' },
        },
        {
          id: 'com.worktrack.reports',
          title: this.i18n.t('quickActions.reports.title'),
          subtitle: this.i18n.t('quickActions.reports.subtitle'),
          icon: 'symbol:doc.text',
          params: { screen: 'reports' },
        },
        {
          id: 'com.worktrack.calendar',
          title: this.i18n.t('quickActions.calendar.title'),
          subtitle: this.i18n.t('quickActions.calendar.subtitle'),
          icon: 'symbol:calendar',
          params: { screen: 'calendar' },
        },
        {
          id: 'com.worktrack.chat',
          title: this.i18n.t('quickActions.chat.title'),
          subtitle: this.i18n.t('quickActions.chat.subtitle'),
          icon: 'symbol:message',
          params: { screen: 'chatbot' },
        },
      ]);
      console.log('✅ Quick Actions configured with locale:', language);
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
    console.log('🎯 Navigation ready status:', this.navigationReady);
    console.log('🎯 Current listeners count:', this.listenerCount('quickAction'));

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
    console.log('🔄 Setting navigation ready:', ready);
    console.log('🔄 Pending action:', this.pendingAction);
    console.log('🔄 Listeners count:', this.listenerCount('quickAction'));
    
    this.navigationReady = ready;
    
    if (ready && this.pendingAction) {
      // Process pending action
      const screen = ACTION_TO_SCREEN_MAP[this.pendingAction];
      if (screen) {
        console.log('✅ Processing pending quick action:', screen);
        // Small delay to ensure navigation is fully ready
        setTimeout(() => {
          console.log('🚀 Emitting pending quick action now:', screen);
          this.emit('quickAction', screen);
        }, 500); // Increased delay to ensure navigation is ready
      }
      this.pendingAction = null;
    }
  }

  // Update Quick Actions language
  async updateLanguage(language: string) {
    if (Platform.OS !== 'ios') return;
    
    const supportedLanguages = ['es', 'en', 'de', 'fr', 'it'];
    const languageToUse = supportedLanguages.includes(language) ? language : 'en';
    
    if (this.currentLanguage === languageToUse) {
      console.log('📱 Quick Actions already in language:', languageToUse);
      return;
    }
    
    console.log('🔄 Updating Quick Actions language from', this.currentLanguage, 'to', languageToUse);
    await this.setupQuickActions(languageToUse);
  }

  // Force refresh Quick Actions (useful for debugging caching issues)
  async refreshQuickActions(language?: string) {
    if (Platform.OS !== 'ios') return;
    
    try {
      console.log('🔄 Force refreshing Quick Actions...');
      
      // Clear first to force iOS to refresh
      await QuickActions.setItems([]);
      
      // Small delay to ensure iOS processes the clear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Re-setup with current or provided language
      const languageToUse = language || this.currentLanguage;
      await this.setupQuickActions(languageToUse);
      
      console.log('✅ Quick Actions force refreshed');
    } catch (error) {
      console.error('❌ Error force refreshing quick actions:', error);
    }
  }

  // Get current language
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  // Update quick actions with specific language
  async updateLanguage(language: string) {
    if (Platform.OS !== 'ios') return;
    
    try {
      const supportedLanguages = ['es', 'en', 'de', 'fr', 'it'];
      const languageToUse = supportedLanguages.includes(language) ? language : 'en';
      
      this.currentLanguage = languageToUse;
      this.i18n.locale = languageToUse;
      
      console.log('🔄 Updating Quick Actions to language:', languageToUse);
      await this.setupQuickActions();
    } catch (error) {
      console.error('❌ Error updating quick actions language:', error);
    }
  }
  
  // Update quick actions with current language
  async updateQuickActions() {
    if (Platform.OS !== 'ios') return;
    
    try {
      console.log('🔄 Updating Quick Actions with current language');
      await this.setupQuickActions();
    } catch (error) {
      console.error('❌ Error updating quick actions:', error);
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