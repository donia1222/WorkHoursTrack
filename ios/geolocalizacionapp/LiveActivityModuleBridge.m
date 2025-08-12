#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LiveActivityModule, NSObject)

RCT_EXTERN_METHOD(startLiveActivity:(NSString *)jobName 
                  location:(NSString *)location
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(updateLiveActivity:(nonnull NSNumber *)elapsedSeconds
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(endLiveActivity:(nonnull NSNumber *)finalElapsedSeconds
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(hasActiveLiveActivity:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(endAllLiveActivities:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end