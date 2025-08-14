//
//  MiniCalendarView.swift
//  WorkTrackWidget
//
//  Mini calendar view showing worked days for the widget
//

import SwiftUI
import WidgetKit

// MARK: - Work Day Model
struct WorkDayInfo: Codable {
    let date: Date
    let type: WorkDayType
    let jobName: String?
    let jobColor: String?
    let hours: Double?
    
    enum WorkDayType: String, Codable {
        case work = "work"
        case vacation = "vacation"
        case sick = "sick"
        case free = "free"
        case scheduled = "scheduled"
    }
}

// MARK: - Mini Calendar View
struct MiniCalendarView: View {
    let days: [WorkDayInfo]
    let isCompact: Bool // true for small/medium widget, false for large
    var daysCount: Int? = nil // Optional override for days to show
    
    private var daysToShow: Int {
        if let count = daysCount {
            return count
        }
        return isCompact ? 7 : 14  // 7 days for medium, 14 for large
    }
    
    private var visibleDays: [WorkDayInfo] {
        // Get upcoming days (including today)
        let today = Date()
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: today)
        
        // Filter days from today onwards and sort by date ascending
        let upcomingDays = days.filter { 
            calendar.startOfDay(for: $0.date) >= startOfToday 
        }.sorted { $0.date < $1.date }
        
        // If not enough upcoming days, generate placeholder days
        var resultDays = upcomingDays
        if resultDays.count < daysToShow {
            let lastDate = resultDays.last?.date ?? today
            for i in 1...(daysToShow - resultDays.count) {
                if let nextDate = calendar.date(byAdding: .day, value: i, to: lastDate) {
                    resultDays.append(WorkDayInfo(
                        date: nextDate,
                        type: .free,
                        jobName: nil,
                        jobColor: nil,
                        hours: nil
                    ))
                }
            }
        }
        
        return Array(resultDays.prefix(daysToShow))
    }
    
    var body: some View {
        if daysToShow <= 3 {
            // Small widget: 3 upcoming days in one row with larger circles
            HStack(spacing: 6) {
                ForEach(visibleDays, id: \.date) { day in
                    DayView(dayInfo: day, isCompact: true, isSmallWidget: true)
                }
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.white.opacity(0.08))
            )
        } else if isCompact {
            // Medium widget: 7 upcoming days in one row
            HStack(spacing: 3) {
                ForEach(visibleDays, id: \.date) { day in
                    DayView(dayInfo: day, isCompact: isCompact)
                }
            }
            .padding(.horizontal, 2)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.white.opacity(0.08))
            )
        } else {
            // Large widget: 14 upcoming days in two rows (7 days each)
            VStack(spacing: 4) {
                let halfCount = visibleDays.count / 2
                let firstWeek = Array(visibleDays.prefix(halfCount))
                let secondWeek = Array(visibleDays.suffix(halfCount))
                
                HStack(spacing: 4) {
                    ForEach(firstWeek, id: \.date) { day in
                        DayView(dayInfo: day, isCompact: isCompact)
                    }
                }
                
                HStack(spacing: 4) {
                    ForEach(secondWeek, id: \.date) { day in
                        DayView(dayInfo: day, isCompact: isCompact)
                    }
                }
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.white.opacity(0.08))
            )
        }
    }
}

// MARK: - Single Day View
struct DayView: View {
    let dayInfo: WorkDayInfo
    let isCompact: Bool
    var isSmallWidget: Bool = false
    
    private var dayColor: Color {
        switch dayInfo.type {
        case .work:
            if let hexColor = dayInfo.jobColor {
                return Color(hex: hexColor) ?? .green
            }
            return .green
        case .vacation:
            return .orange
        case .sick:
            return .red
        case .free:
            return .gray.opacity(0.3)
        case .scheduled:
            return .blue.opacity(0.5)
        }
    }
    
    private var dayLabel: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: dayInfo.date).prefix(2).uppercased()
    }
    
    private var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: dayInfo.date)
    }
    
    private var isToday: Bool {
        Calendar.current.isDateInToday(dayInfo.date)
    }
    
    var body: some View {
        VStack(spacing: 2) {
            // Day label (Mon, Tue, etc.)
            Text(dayLabel)
                .font(.system(size: isSmallWidget ? 10 : (isCompact ? 9 : 10), weight: .medium))
                .foregroundColor(.white.opacity(0.6))
            
            // Day number with work indicator
            ZStack {
                Circle()
                    .fill(dayColor)
                    .frame(width: isSmallWidget ? 32 : (isCompact ? 28 : 32), 
                           height: isSmallWidget ? 32 : (isCompact ? 28 : 32))
                
                if isToday {
                    Circle()
                        .strokeBorder(Color.white, lineWidth: 2)
                        .frame(width: isSmallWidget ? 32 : (isCompact ? 28 : 32), 
                               height: isSmallWidget ? 32 : (isCompact ? 28 : 32))
                }
                
                Text(dayNumber)
                    .font(.system(size: isSmallWidget ? 14 : (isCompact ? 13 : 14), weight: .bold))
                    .foregroundColor(dayInfo.type == .free ? .white.opacity(0.4) : .white)
            }
            
            // Hours worked (if applicable)
            if let hours = dayInfo.hours, dayInfo.type == .work {
                Text("\(String(format: "%.1f", hours))h")
                    .font(.system(size: isSmallWidget ? 9 : (isCompact ? 8 : 9), weight: .medium))
                    .foregroundColor(.white.opacity(0.7))
            } else {
                Text(" ")
                    .font(.system(size: isSmallWidget ? 9 : (isCompact ? 8 : 9)))
            }
        }
    }
}

// MARK: - Calendar Data Manager
class MiniCalendarDataManager {
    private static let appGroupIdentifier = "group.com.roberto.worktrack"
    private static let calendarDataKey = "WorkTrack.CalendarData"
    private static let dataVersionKey = "WorkTrack.DataVersion"
    
    /// Force cache invalidation for fresh data
    private static func invalidateCache() {
        // Simple synchronization
        UserDefaults.standard.synchronize()
    }
    
    /// Read calendar data from shared storage
    static func readCalendarData() -> [WorkDayInfo] {
        // Force fresh read from disk
        invalidateCache()
        
        guard let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            print("❌ Failed to access shared UserDefaults for calendar")
            return generateMockData()
        }
        
        guard let data = sharedDefaults.data(forKey: calendarDataKey) else {
            print("ℹ️ No calendar data found, using mock data")
            return generateMockData()
        }
        
        do {
            let decoder = JSONDecoder()
            // Configure decoder to handle dates properly
            decoder.dateDecodingStrategy = .iso8601
            let workDays = try decoder.decode([WorkDayInfo].self, from: data)
            return workDays
        } catch {
            print("❌ Failed to decode calendar data: \(error)")
            return generateMockData()
        }
    }
    
    /// Save calendar data to shared storage (called from main app)
    static func saveCalendarData(_ days: [WorkDayInfo]) {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            print("❌ Failed to access shared UserDefaults for calendar")
            return
        }
        
        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(days)
            sharedDefaults.set(data, forKey: calendarDataKey)
            sharedDefaults.synchronize()
            
            print("✅ Calendar data saved to shared storage: \(days.count) days")
            
            // Trigger widget update
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            print("❌ Failed to encode calendar data: \(error)")
        }
    }
    
    /// Generate mock data for preview - NO hardcoded data
    private static func generateMockData() -> [WorkDayInfo] {
        let calendar = Calendar.current
        let today = Date()
        var days: [WorkDayInfo] = []
        
        // Generate next 14 days - ALL FREE, no fake data
        for i in 0...13 {
            if let date = calendar.date(byAdding: .day, value: i, to: today) {
                // All days are free until real data is synced
                days.append(WorkDayInfo(
                    date: date,
                    type: .free,
                    jobName: nil,
                    jobColor: nil,
                    hours: nil
                ))
            }
        }
        
        return days
    }
}

// MARK: - Color Extension
extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }
        
        let red = Double((rgb & 0xFF0000) >> 16) / 255.0
        let green = Double((rgb & 0x00FF00) >> 8) / 255.0
        let blue = Double(rgb & 0x0000FF) / 255.0
        
        self.init(red: red, green: green, blue: blue)
    }
}