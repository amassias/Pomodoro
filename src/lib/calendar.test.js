import { describe, expect, it } from 'vitest';
import { buildGoogleCalendarUrl, buildIcs, buildOutlookCalendarUrl, createFocusCalendarEvent } from './calendar';

describe('calendar integrations', () => {
  const event = createFocusCalendarEvent({ start: new Date('2026-07-11T10:00:00.000Z'), durationMinutes: 50, taskName: 'Roadmap', shareUrl: 'https://example.com/?room=12345678' });

  it('builds an exact focus event window', () => {
    expect(event.title).toBe('Focus: Roadmap');
    expect(event.end.toISOString()).toBe('2026-07-11T10:50:00.000Z');
    expect(event.details).toContain('room=12345678');
  });

  it('builds Google and Outlook compose links', () => {
    const google = new URL(buildGoogleCalendarUrl(event));
    const outlook = new URL(buildOutlookCalendarUrl(event));
    expect(google.searchParams.get('dates')).toBe('20260711T100000Z/20260711T105000Z');
    expect(google.searchParams.get('text')).toBe('Focus: Roadmap');
    expect(outlook.searchParams.get('startdt')).toBe('2026-07-11T10:00:00.000Z');
    expect(outlook.searchParams.get('subject')).toBe('Focus: Roadmap');
  });

  it('generates a portable ICS event', () => {
    const ics = buildIcs(event, 'test-id');
    expect(ics).toContain('UID:test-id@world-focus');
    expect(ics).toContain('DTEND:20260711T105000Z');
    expect(ics).toContain('SUMMARY:Focus: Roadmap');
  });
});
