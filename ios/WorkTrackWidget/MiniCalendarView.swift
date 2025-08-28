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
    var useModernStyle: Bool = true // New modern styling
    
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
    
    private func getDayLabel(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        formatter.locale = Locale(identifier: "en_US")
        return String(formatter.string(from: date).prefix(1))
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
        return isCompact ? 7 : 21  // Default: 7 days for medium, 21 for large (3 weeks)
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
        } else if isCompact {
            // Medium widget: 7 days in a clean, compact layout
            VStack(spacing: useModernStyle ? 6 : 8) {
                // Days of week labels - smaller
                HStack(spacing: 2) {
                    ForEach(visibleDays, id: \.date) { day in
                        Text(getDayLabel(for: day.date))
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.5))
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(.bottom, useModernStyle ? 2 : 0)
                
                // Day numbers with work indicators - more compact
                HStack(spacing: 2) {
                    ForEach(visibleDays, id: \.date) { day in
                        CompactMediumDayView(dayInfo: day)
                    }
                }
            }
        } else {
            // Large widget: 21 days in three rows (3 weeks)
            VStack(spacing: 6) {
                // Header with month name
                HStack {
                    Image(systemName: "calendar")
                        .font(.system(size: 12, weight: .semibold))
                    Text(getCurrentMonthYear())
                        .font(.system(size: 12, weight: .semibold))
                    Spacer()
                }
                .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.5))
                
                // Three weeks grid
                VStack(spacing: 4) {
                    let weekSize = 7
                    let firstWeek = Array(visibleDays.prefix(weekSize))
                    let secondWeek = Array(visibleDays.dropFirst(weekSize).prefix(weekSize))
                    let thirdWeek = Array(visibleDays.dropFirst(weekSize * 2).prefix(weekSize))
                    
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
                }
            }
            .padding(.horizontal, 6)
            .padding(.vertical, 8)
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
                // Use job color but ensure it's vibrant enough
                return Color(hex: hexColor) ?? Color(red: 0.3, green: 0.6, blue: 1.0)
            }
            return Color(red: 0.3, green: 0.6, blue: 1.0) // Default light blue for work days
        case .vacation:
            return Color(red: 1.0, green: 0.7, blue: 0.3).opacity(0.9)
        case .sick:
            return Color(red: 1.0, green: 0.4, blue: 0.4).opacity(0.9)
        case .free:
            return Color.white.opacity(0.15)
        case .scheduled:
            return Color.white.opacity(0.4)
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
                .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.5))
            
            // Day number with work indicator
            ZStack {
                // All widgets now use transparent background
                Circle()
                    .fill(Color(red: 0.85, green: 0.88, blue: 0.95).opacity(0.4))
                    .frame(width: circleSize, height: circleSize)
                
                if isToday {
                    Circle()
                        .strokeBorder(Color(red: 0.15, green: 0.25, blue: 0.45), lineWidth: 2.5)
                        .frame(width: circleSize, height: circleSize)
                }
                
                Text(dayNumber)
                    .font(.system(size: fontSize, weight: .bold))
                    .foregroundColor(Color(red: 0.15, green: 0.25, blue: 0.45))
            }
            
            // Icon for all widgets - always show to maintain alignment
            if dayInfo.type != .free {
                Image(systemName: iconName)
                    .font(.system(size: iconSize, weight: .semibold))
                    .foregroundColor(iconColor)
            } else {
                // Invisible icon for free days to maintain alignment
                Image(systemName: "circle")
                    .font(.system(size: iconSize, weight: .semibold))
                    .foregroundColor(.clear)
            }
        }
        .frame(width: isLargeWidget ? 40 : nil)
    }
    
    private var iconName: String {
        switch dayInfo.type {
        case .work:
            return "briefcase.fill"  // Blue briefcase for work
        case .vacation:
            return "sun.max.fill"     // Yellow sun for vacation
        case .sick:
            return "cross.fill"       // Red cross for sick
        case .free:
            return "house.fill"       // Blue house for free day
        case .scheduled:
            return "calendar.badge.clock"  // Calendar for scheduled
        }
    }
    
    private var iconColor: Color {
        switch dayInfo.type {
        case .work:
            return Color(red: 0.15, green: 0.25, blue: 0.5)  // Dark blue
        case .vacation:
            return Color(red: 1.0, green: 0.7, blue: 0.2)  // Orange
        case .sick:
            return Color(red: 1.0, green: 0.3, blue: 0.3)  // Red
        case .free:
            return Color(red: 0.3, green: 0.6, blue: 1.0)  // Blue
        case .scheduled:
            return Color.white.opacity(0.7)
        }
    }
    
    private var iconSize: CGFloat {
        if isSmallWidget { return 11 }
        if isMediumWidget { return 12 }
        return 10
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

// MARK: - Medium Day View for better calendar in medium widget
struct MediumDayView: View {
    let dayInfo: WorkDayInfo
    
    private var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: dayInfo.date)
    }
    
    private var isToday: Bool {
        Calendar.current.isDateInToday(dayInfo.date)
    }
    
    private var dayColor: Color {
        switch dayInfo.type {
        case .work:
            if let hexColor = dayInfo.jobColor {
                return Color(hex: hexColor) ?? Color(red: 0.4, green: 0.7, blue: 1.0)
            }
            return Color(red: 0.4, green: 0.7, blue: 1.0)
        case .vacation:
            return Color(red: 1.0, green: 0.6, blue: 0.2)
        case .sick:
            return Color(red: 0.9, green: 0.3, blue: 0.3)
        case .free:
            return Color.white.opacity(0.15)
        case .scheduled:
            return Color.white.opacity(0.3)
        }
    }
    
    var body: some View {
        VStack(spacing: 2) {
            // Day number circle - white background for work days
            ZStack {
                Circle()
                    .fill(dayInfo.type == .free ? 
                          Color(red: 0.85, green: 0.88, blue: 0.95).opacity(0.5) : 
                          Color.white.opacity(0.9))
                    .frame(width: 28, height: 28)
                
                if isToday {
                    Circle()
                        .stroke(Color(red: 0.15, green: 0.25, blue: 0.45), lineWidth: 2)
                        .frame(width: 28, height: 28)
                }
                
                Text(dayNumber)
                    .font(.system(size: 13, weight: isToday ? .bold : .semibold, design: .rounded))
                    .foregroundColor(Color(red: 0.15, green: 0.25, blue: 0.45))
            }
            
            // Icon below the number - larger for better visibility
            if dayInfo.type != .free {
                Image(systemName: iconName)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(iconColor.opacity(0.8))
            } else {
                // Empty space for free days to maintain alignment
                Circle()
                    .fill(Color.clear)
                    .frame(width: 12, height: 12)
            }
        }
        .frame(maxWidth: .infinity)
    }
    
    private var iconName: String {
        switch dayInfo.type {
        case .work:
            return "briefcase.fill"  // Blue briefcase for work
        case .vacation:
            return "sun.max.fill"     // Yellow sun for vacation
        case .sick:
            return "cross.fill"       // Red cross for sick
        case .free:
            return "house.fill"       // Blue house for free day
        case .scheduled:
            return "calendar.badge.clock"  // Calendar for scheduled
        }
    }
    
    private var iconColor: Color {
        switch dayInfo.type {
        case .work:
            return Color(red: 0.15, green: 0.25, blue: 0.5)  // Dark blue
        case .vacation:
            return Color(red: 1.0, green: 0.7, blue: 0.2)  // Orange
        case .sick:
            return Color(red: 1.0, green: 0.3, blue: 0.3)  // Red
        case .free:
            return Color(red: 0.3, green: 0.6, blue: 1.0)  // Blue
        case .scheduled:
            return Color.white.opacity(0.7)
        }
    }
}

// MARK: - Compact Medium Day View for tight spaces
struct CompactMediumDayView: View {
    let dayInfo: WorkDayInfo
    
    private var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: dayInfo.date)
    }
    
    private var isToday: Bool {
        Calendar.current.isDateInToday(dayInfo.date)
    }
    
    private var dayColor: Color {
        switch dayInfo.type {
        case .work:
            if let hexColor = dayInfo.jobColor {
                return Color(hex: hexColor) ?? Color(red: 0.4, green: 0.7, blue: 1.0)
            }
            return Color(red: 0.4, green: 0.7, blue: 1.0)
        case .vacation:
            return Color(red: 1.0, green: 0.6, blue: 0.2)
        case .sick:
            return Color(red: 0.9, green: 0.3, blue: 0.3)
        case .free:
            return Color.white.opacity(0.08)
        case .scheduled:
            return Color.white.opacity(0.20)
        }
    }
    
    var body: some View {
        VStack(spacing: 1) {
            // Smaller day number circle
            ZStack {
                // Background - white for all days
                Circle()
                    .fill(dayInfo.type == .free ? 
                          Color(red: 0.85, green: 0.88, blue: 0.95).opacity(0.5) : 
                          Color.white.opacity(0.9))
                    .frame(width: 22, height: 22)
                
                // Today indicator - thinner
                if isToday {
                    Circle()
                        .strokeBorder(Color(red: 0.15, green: 0.25, blue: 0.45), lineWidth: 2)
                        .frame(width: 22, height: 22)
                }
                
                // Day number - dark blue
                Text(dayNumber)
                    .font(.system(size: 10, weight: isToday ? .bold : .semibold, design: .rounded))
                    .foregroundColor(Color(red: 0.15, green: 0.25, blue: 0.45))
            }
            
            // Icon for work types - larger for medium widget (increased by 2px)
            if dayInfo.type != .free {
                Image(systemName: iconName)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(iconColor)
            } else {
                // Invisible spacer for consistent layout
                Circle()
                    .fill(Color.clear)
                    .frame(width: 10, height: 10)
            }
        }
        .frame(maxWidth: .infinity)
    }
    
    private var iconName: String {
        switch dayInfo.type {
        case .work:
            return "briefcase.fill"
        case .vacation:
            return "sun.max.fill"
        case .sick:
            return "cross.fill"
        case .free:
            return "house.fill"
        case .scheduled:
            return "calendar"
        }
    }
    
    private var iconColor: Color {
        switch dayInfo.type {
        case .work:
            return Color(red: 0.15, green: 0.25, blue: 0.5)  // Dark blue
        case .vacation:
            return Color(red: 1.0, green: 0.7, blue: 0.2)  // Orange
        case .sick:
            return Color(red: 1.0, green: 0.3, blue: 0.3)  // Red
        case .free:
            return Color(red: 0.3, green: 0.5, blue: 0.8)  // Blue
        case .scheduled:
            return Color(red: 0.5, green: 0.5, blue: 0.7)
        }
    }
}

// MARK: - Modern Medium Day View with enhanced styling
struct ModernMediumDayView: View {
    let dayInfo: WorkDayInfo
    
    private var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: dayInfo.date)
    }
    
    private var isToday: Bool {
        Calendar.current.isDateInToday(dayInfo.date)
    }
    
    private var dayColor: Color {
        switch dayInfo.type {
        case .work:
            if let hexColor = dayInfo.jobColor {
                return Color(hex: hexColor) ?? Color(red: 0.4, green: 0.7, blue: 1.0)
            }
            return Color(red: 0.4, green: 0.7, blue: 1.0)
        case .vacation:
            return Color(red: 1.0, green: 0.6, blue: 0.2)
        case .sick:
            return Color(red: 0.9, green: 0.3, blue: 0.3)
        case .free:
            return Color.white.opacity(0.12)
        case .scheduled:
            return Color.white.opacity(0.25)
        }
    }
    
    var body: some View {
        VStack(spacing: 4) {
            // Day number circle with enhanced design
            ZStack {
                // Background with gradient effect for work days
                if dayInfo.type != .free {
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [dayColor.opacity(0.8), dayColor.opacity(0.4)],
                                center: .center,
                                startRadius: 1,
                                endRadius: 18
                            )
                        )
                        .frame(width: 34, height: 34)
                        .overlay(
                            Circle()
                                .strokeBorder(dayColor.opacity(0.6), lineWidth: 1)
                        )
                } else {
                    // Free days with subtle styling
                    Circle()
                        .fill(Color.white.opacity(0.08))
                        .frame(width: 34, height: 34)
                        .overlay(
                            Circle()
                                .strokeBorder(Color.white.opacity(0.15), lineWidth: 1)
                        )
                }
                
                // Today indicator
                if isToday {
                    Circle()
                        .strokeBorder(Color.white, lineWidth: 2.5)
                        .frame(width: 34, height: 34)
                }
                
                // Day number
                Text(dayNumber)
                    .font(.system(size: 15, weight: isToday ? .bold : .semibold, design: .rounded))
                    .foregroundColor(dayInfo.type != .free ? .white : .white.opacity(0.7))
            }
            
            // Icon below with enhanced visibility
            if dayInfo.type != .free {
                ZStack {
                    // Background for icon
                    Circle()
                        .fill(iconBackgroundColor)
                        .frame(width: 18, height: 18)
                    
                    Image(systemName: iconName)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(iconColor)
                }
            } else {
                // Invisible spacer for consistent layout
                Circle()
                    .fill(Color.clear)
                    .frame(width: 18, height: 18)
            }
        }
        .frame(maxWidth: .infinity)
    }
    
    private var iconName: String {
        switch dayInfo.type {
        case .work:
            return "briefcase.fill"
        case .vacation:
            return "sun.max.fill"
        case .sick:
            return "cross.fill"
        case .free:
            return "house.fill"
        case .scheduled:
            return "calendar.badge.clock"
        }
    }
    
    private var iconColor: Color {
        switch dayInfo.type {
        case .work:
            return Color.white
        case .vacation:
            return Color.white
        case .sick:
            return Color.white
        case .free:
            return Color.white.opacity(0.6)
        case .scheduled:
            return Color.white
        }
    }
    
    private var iconBackgroundColor: Color {
        switch dayInfo.type {
        case .work:
            return Color(red: 0.15, green: 0.25, blue: 0.5).opacity(0.3)
        case .vacation:
            return Color(red: 1.0, green: 0.8, blue: 0.2).opacity(0.3)
        case .sick:
            return Color(red: 1.0, green: 0.3, blue: 0.3).opacity(0.3)
        case .free:
            return Color.clear
        case .scheduled:
            return Color.white.opacity(0.2)
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
