import ActivityKit
import Foundation

// Estructura de datos para el Live Activity
struct WorkTrackWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Tiempo transcurrido en segundos
        var elapsedSeconds: Int
        // Si el timer está activo o pausado
        var isRunning: Bool
    }
    
    // Información estática del trabajo
    var jobName: String
    var location: String
    var startTime: Date
}