declare global {
  var currentScreen: string | undefined;
  var lastCalendarLoad: number | undefined;
  var lastCalendarNavigation: number | undefined;
  var calendarScreenSyncHandler: (() => void) | undefined;
  var calendarScreenFocusHandler: (() => void) | undefined;
  var reportsScreenFocusHandler: (() => void) | undefined;
  var reportsScreenExportHandler: (() => void) | undefined;
  var timerScreenNotesHandler: (() => void) | undefined;
  var chatbotScreenHistoryHandler: (() => void) | undefined;
}

export {};