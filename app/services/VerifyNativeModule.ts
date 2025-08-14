import { NativeModules, Platform } from 'react-native';

/**
 * Verify that all native module methods are available
 */
export function verifyLiveActivityModule(): void {
  if (Platform.OS !== 'ios') {
    console.log('⚠️ LiveActivityModule only available on iOS');
    return;
  }

  const { LiveActivityModule } = NativeModules;
  
  console.log('🔍 Verifying LiveActivityModule...');
  console.log('Module exists:', !!LiveActivityModule);
  
  if (!LiveActivityModule) {
    console.error('❌ LiveActivityModule is NULL!');
    return;
  }
  
  // List all available methods
  const methods = [
    'startLiveActivity',
    'updateLiveActivity', 
    'endLiveActivity',
    'hasActiveLiveActivity',
    'endAllLiveActivities',
    'saveCalendarData',
    'syncJobsToWidget',
    'syncCalendarToWidget'
  ];
  
  console.log('📋 Checking methods:');
  methods.forEach(method => {
    const exists = typeof LiveActivityModule[method] === 'function';
    console.log(`  ${exists ? '✅' : '❌'} ${method}: ${exists ? 'Available' : 'NOT FOUND'}`);
  });
  
  // Show all actual properties
  console.log('\n📦 All properties in LiveActivityModule:');
  Object.keys(LiveActivityModule).forEach(key => {
    console.log(`  - ${key}: ${typeof LiveActivityModule[key]}`);
  });
}