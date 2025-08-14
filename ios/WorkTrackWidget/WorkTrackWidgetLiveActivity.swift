//
//  WorkTrackWidgetLiveActivity.swift
//  WorkTrackWidget
//
//  Created by roberto on 12/8/25.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct WorkTrackWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkTrackWidgetAttributes.self) { context in
            // Lock screen/banner UI goes here - Diseño mejorado
            VStack(spacing: 0) {
                // Header con nombre de app
                HStack {
                    Image(systemName: "mappin.circle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.blue)
                    Text("WorkTrack")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.blue)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 4)
                
                Divider()
                    .background(Color.gray.opacity(0.2))
                
                // Contenido principal
                HStack(spacing: 16) {
                    // Ícono principal con fondo
                    ZStack {
                        Circle()
                            .fill(Color.blue.opacity(0.15))
                            .frame(width: 45, height: 45)
                        Image(systemName: "timer")
                            .font(.system(size: 22))
                            .foregroundColor(.blue)
                    }
                    
                    // Información del trabajo
                    VStack(alignment: .leading, spacing: 4) {
                        Text(context.attributes.jobName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.primary)
                            .lineLimit(1)
                        
                        HStack(spacing: 4) {
                            Image(systemName: "location.fill")
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                            Text(context.attributes.location)
                                .font(.system(size: 12))
                                .foregroundColor(.gray)
                                .lineLimit(1)
                        }
                    }
                    
                    Spacer()
                    
                    // Mostrar hora de inicio o parada
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("AutoTimer")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.gray)
                        HStack(spacing: 2) {
                            Text(context.state.isStopped ? "Stopped at" : "Started at")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(context.state.isStopped ? .red : .gray)
                            // Add a visual indicator when stopped
                            if context.state.isStopped {
                                Image(systemName: "stop.circle.fill")
                                    .font(.system(size: 8))
                                    .foregroundColor(.red)
                            }
                        }
                        // Mostrar la hora
                        Text(context.attributes.startTime, style: .time)
                            .multilineTextAlignment(.trailing)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(context.state.isStopped ? .red : .blue)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            }
            .activityBackgroundTint(Color(UIColor.systemBackground))
            .activitySystemActionForegroundColor(Color.blue)
            // Add opacity animation when stopped to help with visibility
            .opacity(context.state.isStopped ? 0.8 : 1.0)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Image(systemName: "timer")
                            .foregroundColor(.blue)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.jobName)
                                .font(.caption)
                                .lineLimit(1)
                            Text(context.attributes.location)
                                .font(.caption2)
                                .foregroundColor(.gray)
                                .lineLimit(1)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(context.state.isStopped ? "AutoTimer stopped at" : "AutoTimer started at")
                            .font(.caption)
                            .foregroundColor(context.state.isStopped ? .red : .gray)
                        Text(context.attributes.startTime, style: .time)
                            .font(.system(.title2, weight: .bold))
                            .foregroundColor(context.state.isStopped ? .red : .blue)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    // Vacío - ya mostramos la info arriba
                    EmptyView()
                }
            } compactLeading: {
                HStack(spacing: 2) {
                    Image(systemName: context.state.isStopped ? "stop.circle" : "timer")
                        .font(.system(size: 11))
                        .foregroundColor(context.state.isStopped ? .red : .blue)
                }
            } compactTrailing: {
                // Mostrar hora de inicio con indicador de estado
                Text(context.attributes.startTime, style: .time)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(context.state.isStopped ? .red : .blue)
            } minimal: {
                Image(systemName: "timer.circle.fill")
                    .font(.system(size: 10))
                    .foregroundColor(.blue)
            }
            .widgetURL(URL(string: "worktrack://timer"))
            .keylineTint(context.state.isStopped ? Color.red : Color.blue)
        }
    }
}

// Previews para desarrollo
extension WorkTrackWidgetAttributes {
    static var preview: WorkTrackWidgetAttributes {
        WorkTrackWidgetAttributes(
            jobName: "Oficina Principal",
            location: "Calle Mayor 123",
            startTime: Date()
        )
    }
}

extension WorkTrackWidgetAttributes.ContentState {
    static var running: WorkTrackWidgetAttributes.ContentState {
        WorkTrackWidgetAttributes.ContentState(isStopped: false)
    }
    
    static var stopped: WorkTrackWidgetAttributes.ContentState {
        WorkTrackWidgetAttributes.ContentState(isStopped: true)
    }
}

#Preview("Notification", as: .content, using: WorkTrackWidgetAttributes.preview) {
   WorkTrackWidgetLiveActivity()
} contentStates: {
    WorkTrackWidgetAttributes.ContentState.running
    WorkTrackWidgetAttributes.ContentState.stopped
}