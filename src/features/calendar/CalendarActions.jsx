import { useMemo } from 'react';
import { buildGoogleCalendarUrl, buildIcs, buildOutlookCalendarUrl, createFocusCalendarEvent } from '../../lib/calendar';
import { downloadFile } from '../../lib/export';
import { useSharedSession } from '../../providers/SharedSessionProvider';
import { useUserData } from '../../providers/UserDataProvider';

const CalendarActions = () => {
  const { settings, activeTask } = useUserData();
  const { shareUrl } = useSharedSession();
  const event = useMemo(() => createFocusCalendarEvent({ durationMinutes: settings.focusDuration, taskName: activeTask?.text, shareUrl }), [settings.focusDuration, activeTask?.text, shareUrl]);
  const googleUrl = buildGoogleCalendarUrl(event);
  const outlookUrl = buildOutlookCalendarUrl(event);

  return (
    <div className="calendar-actions" aria-label="Add focus block to calendar">
      <a href={googleUrl} target="_blank" rel="noreferrer">Google Calendar</a>
      <a href={outlookUrl} target="_blank" rel="noreferrer">Outlook</a>
      <button onClick={() => downloadFile(buildIcs(event), 'world-focus-session.ics', 'text/calendar;charset=utf-8')}>.ics</button>
    </div>
  );
};

export default CalendarActions;
