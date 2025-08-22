//
//  Use this file to import your target's public headers that you would like to expose to Swift.
//  Bridging Header para permitir comunicación entre Swift y Objective-C
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTLog.h>
#import <React/RCTUtils.h>
#import <React/RCTConvert.h>

// React Native Promise blocks
typedef void (^RCTPromiseResolveBlock)(id result);
typedef void (^RCTPromiseRejectBlock)(NSString *code, NSString *message, NSError *error);
