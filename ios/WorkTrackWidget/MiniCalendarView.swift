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
    
    private var monthTitle: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: visibleDays.first?.date ?? Date())
    }
    
    private func getCurrentMonthYear() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: Date())
    }
    
    // Get weeks grid for month view
    private func getWeeksGrid() -> [[WorkDayInfo?]] {
        guard !isCompact, let firstDay = visibleDays.first else {
            return []
        }
        
        let calendar = Calendar.current
        let firstDayOfMonth = firstDay.date
        let weekday = calendar.component(.weekday, from: firstDayOfMonth) - 1 // 0 = Sunday
        
        var weeks: [[WorkDayInfo?]] = []
        var currentWeek: [WorkDayInfo?] = []
        
        // Add empty days at the beginning
        for _ in 0..<weekday {
            currentWeek.append(nil)
        }
        
        // Add all days of the month
        for day in visibleDays {
            currentWeek.append(day)
            
            if currentWeek.count == 7 {
                weeks.append(currentWeek)
                currentWeek = []
            }
        }
        
        // Add empty days at the end if needed
        if !currentWeek.isEmpty {
            while currentWeek.count < 7 {
                currentWeek.append(nil)
            }
            weeks.append(currentWeek)
        }
        
        return weeks
    }
    
    private var daysToShow: Int {
        if let count = daysCount {
            return count
        }
        return isCompact ? 7 : 28  // 7 days for medium, 28 for large (4 weeks/month)
    }
    
    private var visibleDays: [WorkDayInfo] {
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
            HStack(spacing: 4) {
                ForEach(visibleDays, id: \.date) { day in
                    DayView(dayInfo: day, isCompact: isCompact, isMediumWidget: true)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.white.opacity(0.08))
            )
        } else {
            // Large widget: 28 days in four rows (full month)
            VStack(spacing: 6) {
                // Header with month name
                HStack {
                    Image(systemName: "calendar")
                        .font(.system(size: 12, weight: .semibold))
                    Text(getCurrentMonthYear())
                        .font(.system(size: 12, weight: .semibold))
                    Spacer()
                    Text("Full Month")
                        .font(.system(size: 11, weight: .regular))
                }
                .foregroundColor(.white.opacity(0.8))
                
                // Four weeks grid
                VStack(spacing: 4) {
                    let weekSize = 7
                    let firstWeek = Array(visibleDays.prefix(weekSize))
                    let secondWeek = Array(visibleDays.dropFirst(weekSize).prefix(weekSize))
                    let thirdWeek = Array(visibleDays.dropFirst(weekSize * 2).prefix(weekSize))
                    let fourthWeek = Array(visibleDays.dropFirst(weekSize * 3))
                    
                    HStack(spacing: 3) {
                        ForEach(firstWeek, id: \.date) { day in
                            DayView(dayInfo: day, isCompact: false, isLargeWidget: true)
                        }
                    }
                    
                    HStack(spacing: 3) {
                        ForEach(secondWeek, id: \.date) { day in
                            DayView(dayInfo: day, isCompact: false, isLargeWidget: true)
                        }
                    }
                    
                    HStack(spacing: 3) {
                        ForEach(thirdWeek, id: \.date) { day in
                            DayView(dayInfo: day, isCompact: false, isLargeWidget: true)
                        }
                    }
                    
                    HStack(spacing: 3) {
                        ForEach(fourthWeek, id: \.date) { day in
                            DayView(dayInfo: day, isCompact: false, isLargeWidget: true)
                        }
                    }
                }
            }
            .padding(.horizontal, 6)
            .padding(.vertical, 8)
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
    var isMediumWidget: Bool = false
    var isLargeWidget: Bool = false
    
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
                .font(.system(size: isSmallWidget ? 10 : (isMediumWidget ? 11 : (isLargeWidget ? 10 : 10)), weight: .medium))
                .foregroundColor(.white.opacity(0.6))
            
            // Day number with work indicator
            ZStack {
                Circle()
                    .fill(dayColor)
                    .frame(width: circleSize, height: circleSize)
                
                if isToday {
                    Circle()
                        .strokeBorder(Color.white, lineWidth: 2)
                        .frame(width: circleSize, height: circleSize)
                }
                
                Text(dayNumber)
                    .font(.system(size: fontSize, weight: .bold))
                    .foregroundColor(dayInfo.type == .free ? .white.opacity(0.4) : .white)
            }
            
            // Hours worked (if applicable)
            if let hours = dayInfo.hours, dayInfo.type == .work {
                Text("\(String(format: "%.1f", hours))h")
                    .font(.system(size: hoursSize, weight: .medium))
                    .foregroundColor(.white.opacity(0.7))
            } else if !isLargeWidget {
                Text(" ")
                    .font(.system(size: hoursSize))
            }
        }
        .frame(width: isLargeWidget ? 40 : nil)
    }
    
    private var circleSize: CGFloat {
        if isSmallWidget { return 32 }
        if isMediumWidget { return 30 }
        if isLargeWidget { return 32 }
        return 30
    }
    
    private var fontSize: CGFloat {
        if isSmallWidget { return 14 }
        if isMediumWidget { return 13 }
        if isLargeWidget { return 13 }
        return 13
    }
    
    private var hoursSize: CGFloat {
        if isSmallWidget { return 9 }
        if isMediumWidget { return 9 }
        if isLargeWidget { return 9 }
        return 8
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
            // Configure decoder to handle dates properly with local timezone
            let localFormatter = DateFormatter()
            localFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
            localFormatter.timeZone = TimeZone.current
            decoder.dateDecodingStrategy = .formatted(localFormatter)
            var workDays = try decoder.decode([WorkDayInfo].self, from: data)
            
            // Fix date offset issue - add 1 day to each date
            let calendar = Calendar.current
            workDays = workDays.compactMap { day in
                guard let adjustedDate = calendar.date(byAdding: .day, value: 1, to: day.date) else {
                    return day
                }
                return WorkDayInfo(
                    date: adjustedDate,
                    type: day.type,
                    jobName: day.jobName,
                    jobColor: day.jobColor,
                    hours: day.hours
                )
            }
            
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
        
        // Generate next 28 days - ALL FREE, no fake data
        for i in 0...27 {
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
