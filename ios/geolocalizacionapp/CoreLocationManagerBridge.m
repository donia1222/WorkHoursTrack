#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

/**
 * Bridge para exponer CoreLocationManager (Swift) a React Native
 */

@interface RCT_EXTERN_MODULE(CoreLocationManager, NSObject)

// Métodos expuestos a React Native
RCT_EXTERN_METHOD(startMonitoring:(NSArray *)jobs
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopMonitoring:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getCurrentState:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Marcar como módulo que no requiere cola principal
+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

@end

/**
 * Event Emitter para enviar eventos desde Swift a React Native
 */

@interface CoreLocationEventEmitter : RCTEventEmitter <RCTBridgeModule>
@end

@implementation CoreLocationEventEmitter

RCT_EXPORT_MODULE();

- (NSArray<NSString *> *)supportedEvents {
    return @[
        @"TimerStarted",
        @"TimerStopped",
        @"RegionEntered",
        @"RegionExited",
        @"LocationUpdated",
        @"GeofenceStateChanged"
    ];
}

- (void)startObserving {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleCoreLocationEvent:)
                                                 name:@"CoreLocationEvent"
                                               object:nil];
}

- (void)stopObserving {
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)handleCoreLocationEvent:(NSNotification *)notification {
    NSDictionary *userInfo = notification.userInfo;
    NSString *eventName = userInfo[@"name"];
    id eventBody = userInfo[@"body"];
    
    if (eventName && [self.supportedEvents containsObject:eventName]) {
        [self sendEventWithName:eventName body:eventBody];
    }
}

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

@end