import ConnectedCalendars from './ConnectedCalendars';
import { buildGoogleCalendarUrl, buildIcs, buildOutlookCalendarUrl, createFocusCalendarEvent } from '../../lib/calendar';
import { downloadFile } from '../../lib/export';
import { useSharedSession } from '../../providers/SharedSessionProvider';
import { useUserData } from '../../providers/UserDataProvider';

const CalendarActions = ({ labelledBy }) => {
  const { settings, activeTask } = useUserData();
  const { shareUrl } = useSharedSession();
  const createEvent = () => createFocusCalendarEvent({ durationMinutes: settings.focusDuration, taskName: activeTask?.text, shareUrl });
  const event = createEvent();
  const refreshLink = (interaction, buildUrl) => { interaction.currentTarget.href = buildUrl(createEvent()); };
  const googleUrl = buildGoogleCalendarUrl(event);
  const outlookUrl = buildOutlookCalendarUrl(event);

  return (
    <div className="calendar-actions" role="group" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : 'Add focus block to calendar'}>
      <a onPointerDown={interaction => refreshLink(interaction, buildGoogleCalendarUrl)} onClick={interaction => refreshLink(interaction, buildGoogleCalendarUrl)} onContextMenu={interaction => refreshLink(interaction, buildGoogleCalendarUrl)} href={googleUrl} target="_blank" rel="noreferrer">Google Calendar</a>
      <a onPointerDown={interaction => refreshLink(interaction, buildOutlookCalendarUrl)} onClick={interaction => refreshLink(interaction, buildOutlookCalendarUrl)} onContextMenu={interaction => refreshLink(interaction, buildOutlookCalendarUrl)} href={outlookUrl} target="_blank" rel="noreferrer">Outlook</a>
      <button onClick={() => downloadFile(buildIcs(createEvent()), 'world-focus-session.ics', 'text/calendar;charset=utf-8')}>.ics</button>
      <ConnectedCalendars createEvent={createEvent} />
    </div>
  );
};

export default CalendarActions;
