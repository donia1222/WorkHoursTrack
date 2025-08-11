import ActivityKit
import WidgetKit
import SwiftUI

struct WorkTrackWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkTrackWidgetAttributes.self) { context in
            // Vista para la pantalla de bloqueo
            LockScreenLiveActivityView(context: context)
                .padding()
                .background(Color(UIColor.systemBackground))
        } dynamicIsland: { context in
            DynamicIsland {
                // Vista expandida del Dynamic Island
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Image(systemName: "timer")
                            .foregroundColor(.blue)
                        Text("WorkTrack")
                            .font(.caption)
                    }
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.jobName)
                        .font(.headline)
                        .foregroundColor(.primary)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(formatTime(context.state.elapsedSeconds))
                        .font(.system(.title3, design: .monospaced))
                        .foregroundColor(.blue)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Image(systemName: "location.fill")
                            .font(.caption)
                        Text(context.attributes.location)
                            .font(.caption)
                            .lineLimit(1)
                    }
                    .foregroundColor(.secondary)
                }
            } compactLeading: {
                // Vista compacta izquierda
                Image(systemName: "timer")
                    .foregroundColor(.blue)
            } compactTrailing: {
                // Vista compacta derecha - tiempo
                Text(formatTimeCompact(context.state.elapsedSeconds))
                    .font(.system(.body, design: .monospaced))
                    .foregroundColor(.blue)
            } minimal: {
                // Vista mínima
                Image(systemName: "timer")
                    .foregroundColor(.blue)
            }
            .widgetURL(URL(string: "worktrack://timer"))
            .keylineTint(.blue)
        }
    }
    
    // Formatear tiempo para vista expandida
    func formatTime(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, secs)
    }
    
    // Formatear tiempo para vista compacta
    func formatTimeCompact(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        if hours > 0 {
            return String(format: "%dh %dm", hours, minutes)
        } else {
            return String(format: "%dm", minutes)
        }
    }
}

// Vista para la pantalla de bloqueo
struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<WorkTrackWidgetAttributes>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Image(systemName: "briefcase.fill")
                    .foregroundColor(.blue)
                Text("WorkTrack")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                if context.state.isRunning {
                    Image(systemName: "circle.fill")
                        .foregroundColor(.green)
                        .font(.caption2)
                } else {
                    Image(systemName: "pause.circle.fill")
                        .foregroundColor(.orange)
                        .font(.caption2)
                }
            }
            
            // Nombre del trabajo
            Text(context.attributes.jobName)
                .font(.headline)
                .foregroundColor(.primary)
            
            // Tiempo transcurrido
            HStack {
                Image(systemName: "timer")
                    .font(.title2)
                    .foregroundColor(.blue)
                Text(formatTime(context.state.elapsedSeconds))
                    .font(.system(.title2, design: .monospaced))
                    .foregroundColor(.primary)
                Spacer()
            }
            
            // Ubicación
            HStack {
                Image(systemName: "location.fill")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(context.attributes.location)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 4)
    }
    
    func formatTime(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, secs)
    }
}