import Foundation
import ActivityKit
import React

@available(iOS 16.2, *)
@objc(LiveActivityModule)
class LiveActivityModule: NSObject {
    
    // Usar static para que persista entre reinicios del módulo
    private static var currentActivity: Activity<WorkTrackWidgetAttributes>?
    
    private var currentActivity: Activity<WorkTrackWidgetAttributes>? {
        get { return LiveActivityModule.currentActivity }
        set { LiveActivityModule.currentActivity = newValue }
    }
    
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
                
                // SIEMPRE terminar TODAS las Live Activities existentes para evitar duplicados
                let existingActivities = Activity<WorkTrackWidgetAttributes>.activities
                print("🔍 Found \(existingActivities.count) existing Live Activities")
                
                if !existingActivities.isEmpty {
                    print("🧹 Cleaning up ALL existing Live Activities before creating new one")
                    
                    // Terminar todas y luego crear nueva
                    Task {
                        // Terminar TODAS las actividades existentes
                        for activity in existingActivities {
                            print("  Ending activity: \(activity.id), state: \(activity.activityState)")
                            await activity.end(
                                ActivityContent(
                                    state: WorkTrackWidgetAttributes.ContentState(
                                        elapsedSeconds: 0,
                                        isRunning: false
                                    ),
                                    staleDate: nil
                                ),
                                dismissalPolicy: .immediate
                            )
                        }
                        
                        // Limpiar referencia
                        self.currentActivity = nil
                        
                        // Esperar un momento para asegurar que se terminaron
                        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 segundos
                        
                        // Ahora crear nueva Live Activity limpia
                        print("✅ All Live Activities cleaned. Creating new one...")
                        self.createNewLiveActivity(jobName: jobName, location: location, resolver: resolver, rejecter: rejecter)
                    }
                    return
                }
                
                // No hay actividades existentes, crear nueva directamente
                print("✅ No existing Live Activities, creating new one")
                self.createNewLiveActivity(jobName: jobName, location: location, resolver: resolver, rejecter: rejecter)
            }
        } else {
            rejecter("LIVE_ACTIVITY_ERROR", "Live Activities require iOS 16.2 or newer", nil)
        }
    }
    
    private func createNewLiveActivity(jobName: String, location: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
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
    }
    
    @objc
    func updateLiveActivity(_ elapsedSeconds: NSNumber,
                           resolver: @escaping RCTPromiseResolveBlock,
                           rejecter: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 16.2, *) {
            DispatchQueue.main.async {
                // Si no tenemos referencia, buscar la activa
                if self.currentActivity == nil {
                    let existingActivities = Activity<WorkTrackWidgetAttributes>.activities
                    if let activeActivity = existingActivities.first(where: { $0.activityState == .active }) {
                        self.currentActivity = activeActivity
                        print("📱 Found active Live Activity to update: \(activeActivity.id)")
                    }
                }
                
                guard let activity = self.currentActivity else {
                    print("❌ No active Live Activity to update")
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
    
    @objc
    func hasActiveLiveActivity(_ resolver: @escaping RCTPromiseResolveBlock,
                               rejecter: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            DispatchQueue.main.async {
                // Verificar actividad en memoria
                if self.currentActivity != nil {
                    resolver(true)
                    return
                }
                
                // Verificar todas las actividades existentes
                let existingActivities = Activity<WorkTrackWidgetAttributes>.activities
                if !existingActivities.isEmpty {
                    // Guardar la primera actividad encontrada
                    self.currentActivity = existingActivities.first
                    resolver(true)
                } else {
                    resolver(false)
                }
            }
        } else {
            resolver(false)
        }
    }
    
    @objc
    func endAllLiveActivities(_ resolver: @escaping RCTPromiseResolveBlock,
                              rejecter: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            DispatchQueue.main.async {
                Task {
                    // Terminar todas las actividades existentes
                    let existingActivities = Activity<WorkTrackWidgetAttributes>.activities
                    for activity in existingActivities {
                        await activity.end(dismissalPolicy: .immediate)
                    }
                    
                    // Limpiar referencia local
                    self.currentActivity = nil
                    resolver(true)
                    print("✅ All Live Activities ended")
                }
            }
        } else {
            resolver(true)
        }
    }
}