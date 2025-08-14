#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"main";

  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  
  // Clean up any stale Live Activities on app launch
  if (@available(iOS 16.2, *)) {
    dispatch_async(dispatch_get_main_queue(), ^{
      NSLog(@"🚀 App launched - will clean up stale Live Activities");
      // The LiveActivityModule will handle cleanup in its init method
    });
  }

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (void)applicationWillTerminate:(UIApplication *)application
{
  // Widget refresh is handled by LiveActivityModule
  // WidgetCenter cannot be called directly from Objective-C++
  NSLog(@"🛑 App terminating");
  
  // Terminar todos los Live Activities cuando la app se cierra
  if (@available(iOS 16.2, *)) {
    [[NSNotificationCenter defaultCenter] postNotificationName:@"StopLiveActivity" object:nil];
    NSLog(@"🛑 App terminating - ending all Live Activities");
  }
  [super applicationWillTerminate:application];
}

- (void)applicationDidBecomeActive:(UIApplication *)application
{
  // Force widget refresh when app becomes active
  if (@available(iOS 14.0, *)) {
    NSLog(@"📱 App became active - forcing widget refresh");
    
    // Force synchronization of shared data
    NSUserDefaults *sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:@"group.com.roberto.worktrack"];
    if (sharedDefaults) {
      // Increment version to force cache invalidation
      NSInteger currentVersion = [sharedDefaults integerForKey:@"WorkTrack.DataVersion"];
      [sharedDefaults setInteger:currentVersion + 1 forKey:@"WorkTrack.DataVersion"];
      [sharedDefaults synchronize];
      CFPreferencesAppSynchronize(CFSTR("group.com.roberto.worktrack"));
    }
    
    // Widget refresh is handled by JavaScript side
  }
  
  // Clean up stale activities when app becomes active
  if (@available(iOS 16.2, *)) {
    NSLog(@"📱 App became active - checking for stale Live Activities");
  }
  [super applicationDidBecomeActive:application];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Linking API
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [super application:application openURL:url options:options] || [RCTLinkingManager application:application openURL:url options:options];
}

// Universal Links
- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  BOOL result = [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
  return [super application:application continueUserActivity:userActivity restorationHandler:restorationHandler] || result;
}

- (void)applicationDidEnterBackground:(UIApplication *)application
{
  // Force widget refresh when app enters background
  if (@available(iOS 14.0, *)) {
    NSLog(@"📱 App entering background - forcing widget refresh");
    
    // Force synchronization of shared data
    NSUserDefaults *sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:@"group.com.roberto.worktrack"];
    if (sharedDefaults) {
      // Increment version to force cache invalidation
      NSInteger currentVersion = [sharedDefaults integerForKey:@"WorkTrack.DataVersion"];
      [sharedDefaults setInteger:currentVersion + 1 forKey:@"WorkTrack.DataVersion"];
      [sharedDefaults synchronize];
      CFPreferencesAppSynchronize(CFSTR("group.com.roberto.worktrack"));
    }
    
    // Widget refresh is handled by JavaScript side
  }
  [super applicationDidEnterBackground:application];
}

- (void)applicationWillEnterForeground:(UIApplication *)application 
{
  // Force widget refresh when app is about to enter foreground
  // Widget refresh is handled by JavaScript side when app resumes
  NSLog(@"📱 App will enter foreground");
  [super applicationWillEnterForeground:application];
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  return [super application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  return [super application:application didFailToRegisterForRemoteNotificationsWithError:error];
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  // Manejar comandos para Live Activity
  NSString *command = userInfo[@"command"];
  if ([command isEqualToString:@"STOP_LIVE_ACTIVITY"]) {
    NSLog(@"📱 Received STOP command for Live Activity");
    
    // Publicar notificación interna para que el módulo la maneje
    [[NSNotificationCenter defaultCenter] postNotificationName:@"StopLiveActivity" object:nil];
    
    completionHandler(UIBackgroundFetchResultNewData);
    return;
  }
  
  return [super application:application didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}

@end
