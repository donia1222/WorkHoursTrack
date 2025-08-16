#import "QuickActionsModule.h"
#import <React/RCTLog.h>

@implementation QuickActionsModule
{
  bool hasListeners;
  NSString *pendingQuickAction;
}

RCT_EXPORT_MODULE(QuickActions);

// Override supportedEvents
- (NSArray<NSString *> *)supportedEvents
{
  return @[@"QuickActionPerformed"];
}

// Will be called when this module's first listener is added.
- (void)startObserving
{
  hasListeners = YES;
  // If we have a pending quick action, send it now
  if (pendingQuickAction) {
    [self sendEventWithName:@"QuickActionPerformed" body:@{@"type": pendingQuickAction}];
    pendingQuickAction = nil;
  }
}

// Will be called when this module's last listener is removed, or on dealloc.
- (void)stopObserving
{
  hasListeners = NO;
}

+ (void)handleQuickActionWithType:(NSString *)type
{
  RCTLogInfo(@"QuickActionsModule: Handling quick action type: %@", type);
  
  // Post notification that will be caught by the instance
  [[NSNotificationCenter defaultCenter] postNotificationName:@"QuickActionReceived" 
                                                      object:nil 
                                                    userInfo:@{@"type": type}];
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    // Listen for quick action notifications
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleQuickActionNotification:)
                                                 name:@"QuickActionReceived"
                                               object:nil];
  }
  return self;
}

- (void)handleQuickActionNotification:(NSNotification *)notification
{
  NSString *type = notification.userInfo[@"type"];
  if (type) {
    if (hasListeners) {
      // Send event immediately
      [self sendEventWithName:@"QuickActionPerformed" body:@{@"type": type}];
    } else {
      // Store for later when listeners are ready
      pendingQuickAction = type;
    }
  }
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

// Export method to get initial quick action (if app was launched with one)
RCT_EXPORT_METHOD(getInitialQuickAction:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  // This will be set by AppDelegate if app was launched with a quick action
  NSDictionary *launchOptions = [[NSUserDefaults standardUserDefaults] objectForKey:@"QuickActionLaunchOptions"];
  if (launchOptions) {
    resolve(launchOptions);
    // Clear it after reading
    [[NSUserDefaults standardUserDefaults] removeObjectForKey:@"QuickActionLaunchOptions"];
  } else {
    resolve([NSNull null]);
  }
}

@end