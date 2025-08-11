import Foundation
import ActivityKit
import React

@available(iOS 16.2, *)
@objc(LiveActivityModule)
class LiveActivityModule: NSObject {
    
    private var currentActivity: Activity<WorkTrackWidgetAttributes>?
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    func startLiveActivity(_ jobName: String, 
                          location: String,
                          resolver: @escaping RCTPromiseResolveBlock,
                          rejecter: @escaping RCTPromiseRejectBlock) {
        
        // Verificar versión de iOS
        if #available(iOS 16.2, *) {
            DispatchQueue.main.async {
                // Verificar si Live Activities están disponibles
                guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                    rejecter("LIVE_ACTIVITY_ERROR", "Live Activities are not enabled", nil)
                    return
                }
            
            // Crear los atributos del Live Activity
            let attributes = WorkTrackWidgetAttributes(
                jobName: jobName,
                location: location,
                startTime: Date()
            )
            
            // Estado inicial
            let initialState = WorkTrackWidgetAttributes.ContentState(
                elapsedSeconds: 0,
                isRunning: true
            )
            
            do {
                // Iniciar el Live Activity
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: initialState, staleDate: nil),
                    pushType: nil
                )
                
                self.currentActivity = activity
                resolver(activity.id)
                
                print("✅ Live Activity started with ID: \(activity.id)")
                
            } catch {
                rejecter("LIVE_ACTIVITY_ERROR", "Failed to start Live Activity: \(error.localizedDescription)", error)
            }
            }
        } else {
            rejecter("LIVE_ACTIVITY_ERROR", "Live Activities require iOS 16.2 or newer", nil)
        }
    }
    
    @objc
    func updateLiveActivity(_ elapsedSeconds: NSNumber,
                           resolver: @escaping RCTPromiseResolveBlock,
                           rejecter: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 16.2, *) {
            DispatchQueue.main.async {
            guard let activity = self.currentActivity else {
                rejecter("LIVE_ACTIVITY_ERROR", "No active Live Activity", nil)
                return
            }
            
            let updatedState = WorkTrackWidgetAttributes.ContentState(
                elapsedSeconds: elapsedSeconds.intValue,
                isRunning: true
            )
            
            Task {
                await activity.update(
                    ActivityContent(
                        state: updatedState,
                        staleDate: nil
                    )
                )
                resolver(true)
            }
            }
        } else {
            rejecter("LIVE_ACTIVITY_ERROR", "Live Activities require iOS 16.2 or newer", nil)
        }
    }
    
    @objc
    func endLiveActivity(_ finalElapsedSeconds: NSNumber,
                        resolver: @escaping RCTPromiseResolveBlock,
                        rejecter: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 16.2, *) {
            DispatchQueue.main.async {
            guard let activity = self.currentActivity else {
                rejecter("LIVE_ACTIVITY_ERROR", "No active Live Activity", nil)
                return
            }
            
            let finalState = WorkTrackWidgetAttributes.ContentState(
                elapsedSeconds: finalElapsedSeconds.intValue,
                isRunning: false
            )
            
            Task {
                await activity.end(
                    ActivityContent(
                        state: finalState,
                        staleDate: nil
                    ),
                    dismissalPolicy: .default
                )
                
                self.currentActivity = nil
                resolver(true)
                print("✅ Live Activity ended")
            }
            }
        } else {
            rejecter("LIVE_ACTIVITY_ERROR", "Live Activities require iOS 16.2 or newer", nil)
        }
    }
}

// Necesitamos también definir las estructuras en el target principal
@available(iOS 16.2, *)
struct WorkTrackWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var elapsedSeconds: Int
        var isRunning: Bool
    }
    
    var jobName: String
    var location: String
    var startTime: Date
}