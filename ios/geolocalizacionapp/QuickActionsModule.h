#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface QuickActionsModule : RCTEventEmitter <RCTBridgeModule>

+ (void)handleQuickActionWithType:(NSString *)type;

@end