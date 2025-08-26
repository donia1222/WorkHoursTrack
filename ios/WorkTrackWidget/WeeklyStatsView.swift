//
//  WeeklyStatsView.swift
//  WorkTrackWidget
//
//  Component for showing weekly statistics in widgets
//

import SwiftUI
import WidgetKit

// MARK: - Weekly Stats Model
struct WeeklyStats: Codable {
    let totalHours: Double
    let totalDays: Int
    let avgHoursPerDay: Double
    let overtimeHours: Double
    
    init() {
        self.totalHours = 0
        self.totalDays = 0
        self.avgHoursPerDay = 0
        self.overtimeHours = 0
    }
}

// MARK: - Weekly Stats View
struct WeeklyStatsView: View {
    let stats: WeeklyStats
    let isCompact: Bool // true for medium widget, false for large
    
    private func formatHours(_ hours: Double) -> String {
        let hours = max(0, hours)
        let wholeHours = Int(hours)
        let minutes = Int((hours - Double(wholeHours)) * 60)
        
        if hours < 1 {
            return minutes > 0 ? "\(minutes)m" : "0h"
        }
        
        if minutes == 0 {
            return "\(wholeHours)h"
        }
        
        return "\(wholeHours)h \(minutes)m"
    }
    
    var body: some View {
        if isCompact {
            // Compact layout for medium widget
            CompactStatsView(stats: stats, formatHours: formatHours)
        } else {
            // Full layout for large widget  
            FullStatsView(stats: stats, formatHours: formatHours)
        }
    }
}

// MARK: - Compact Stats (Medium Widget)
struct CompactStatsView: View {
    let stats: WeeklyStats
    let formatHours: (Double) -> String
    
    var body: some View {
        VStack(spacing: 8) {
            // Header
            HStack(spacing: 6) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color(red: 0.3, green: 0.7, blue: 1.0))
                
                Text("Last 7 Days")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white.opacity(0.9))
                
                Spacer()
            }
            
            // Stats in horizontal layout
            HStack(spacing: 12) {
                // Total Hours
                StatItemCompact(
                    icon: "clock.fill",
                    value: formatHours(stats.totalHours),
                    label: "Hours",
                    color: Color(red: 0.2, green: 0.8, blue: 0.4)
                )
                
                // Days Worked
                StatItemCompact(
                    icon: "calendar",
                    value: "\(stats.totalDays)",
                    label: "Days",
                    color: Color(red: 0.3, green: 0.6, blue: 1.0)
                )
                
                // Average
                StatItemCompact(
                    icon: "chart.bar.fill",
                    value: formatHours(stats.avgHoursPerDay),
                    label: "Avg",
                    color: Color(red: 1.0, green: 0.7, blue: 0.3)
                )
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(Color.white.opacity(0.15), lineWidth: 1)
                )
        )
    }
}

// MARK: - Full Stats (Large Widget)
struct FullStatsView: View {
    let stats: WeeklyStats
    let formatHours: (Double) -> String
    
    var body: some View {
        VStack(spacing: 10) {
            // Header with icon and title
            HStack(spacing: 8) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Color(red: 0.3, green: 0.7, blue: 1.0))
                
                Text("Weekly Stats")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white.opacity(0.9))
                
                Spacer()
                
                Text("Last 7 Days")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.6))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(
                        Capsule()
                            .fill(Color.white.opacity(0.1))
                    )
            }
            
            // Stats in 2x2 grid
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    // Total Hours
                    StatItemFull(
                        icon: "clock.fill",
                        value: formatHours(stats.totalHours),
                        label: "Total Hours",
                        color: Color(red: 0.2, green: 0.8, blue: 0.4),
                        isHighlighted: true
                    )
                    
                    // Days Worked
                    StatItemFull(
                        icon: "calendar",
                        value: "\(stats.totalDays)",
                        label: "Days",
                        color: Color(red: 0.3, green: 0.6, blue: 1.0)
                    )
                }
                
                HStack(spacing: 8) {
                    // Average per day
                    StatItemFull(
                        icon: "chart.bar.fill",
                        value: formatHours(stats.avgHoursPerDay),
                        label: "Avg/Day",
                        color: Color(red: 1.0, green: 0.7, blue: 0.3)
                    )
                    
                    // Overtime (if any)
                    if stats.overtimeHours > 0 {
                        StatItemFull(
                            icon: "clock.badge.plus",
                            value: formatHours(stats.overtimeHours),
                            label: "Overtime",
                            color: Color(red: 1.0, green: 0.5, blue: 0.3)
                        )
                    } else {
                        // Placeholder for consistent layout
                        StatItemFull(
                            icon: "checkmark.circle.fill",
                            value: "✓",
                            label: "On Time",
                            color: Color(red: 0.2, green: 0.8, blue: 0.4)
                        )
                    }
                }
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0.12),
                            Color.white.opacity(0.06)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .strokeBorder(Color.white.opacity(0.2), lineWidth: 1)
                )
        )
    }
}

// MARK: - Stat Item Components
struct StatItemCompact: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            // Icon
            Image(systemName: icon)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(color)
                .frame(width: 20, height: 20)
            
            // Value
            Text(value)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            
            // Label
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.white.opacity(0.7))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }
}

struct StatItemFull: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    var isHighlighted: Bool = false
    
    var body: some View {
        VStack(spacing: 6) {
            // Icon with colored background
            ZStack {
                Circle()
                    .fill(color.opacity(0.2))
                    .frame(width: 32, height: 32)
                
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(color)
            }
            
            // Value
            Text(value)
                .font(.system(size: isHighlighted ? 18 : 16, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            
            // Label
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.white.opacity(0.75))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(
                    isHighlighted ? 
                    Color.white.opacity(0.1) : 
                    Color.white.opacity(0.05)
                )
        )
    }
}

// MARK: - Stats Data Manager
class WeeklyStatsDataManager {
    private static let appGroupIdentifier = "group.com.roberto.worktrack"
    private static let statsDataKey = "WorkTrack.WeeklyStats"
    
    static func readWeeklyStats() -> WeeklyStats {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier),
              let data = sharedDefaults.data(forKey: statsDataKey) else {
            print("❌ No weekly stats data found, returning empty stats")
            return WeeklyStats()
        }
        
        do {
            let decoder = JSONDecoder()
            let stats = try decoder.decode(WeeklyStats.self, from: data)
            print("✅ Weekly stats loaded: \(stats.totalHours)h, \(stats.totalDays) days")
            return stats
        } catch {
            print("❌ Failed to decode weekly stats: \(error)")
            return WeeklyStats()
        }
    }
    
    static func saveWeeklyStats(_ stats: WeeklyStats) {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            print("❌ Failed to access shared UserDefaults for stats")
            return
        }
        
        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(stats)
            sharedDefaults.set(data, forKey: statsDataKey)
            sharedDefaults.synchronize()
            
            print("✅ Weekly stats saved: \(stats.totalHours)h, \(stats.totalDays) days")
            
            // Trigger widget update
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            print("❌ Failed to encode weekly stats: \(error)")
        }
    }
}