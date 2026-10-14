const pad = (value) => String(value).padStart(2, '0');

export const formatUtcCompact = (date) => `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

export const createFocusCalendarEvent = ({ start = new Date(), durationMinutes = 25, taskName, shareUrl } = {}) => {
  const safeDuration = Number.isFinite(Number(durationMinutes)) && Number(durationMinutes) > 0 ? Number(durationMinutes) : 25;
  const end = new Date(start.getTime() + safeDuration * 60 * 1000);
  const title = taskName ? `Focus: ${taskName}` : 'World Focus session';
  const details = [`A ${safeDuration}-minute focus block created with World Focus.`, shareUrl ? `Join the shared session: ${shareUrl}` : null].filter(Boolean).join('\n\n');
  return { start, end, title, details };
};

export const buildGoogleCalendarUrl = (event) => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatUtcCompact(event.start)}/${formatUtcCompact(event.end)}`,
    details: event.details,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
};

export const buildOutlookCalendarUrl = (event) => {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    allday: 'false',
    subject: event.title,
    startdt: event.start.toISOString(),
    enddt: event.end.toISOString(),
    body: event.details,
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params}`;
};

const escapeIcs = (value) => String(value).replaceAll('\\', '\\\\').replace(/\r\n|\r|\n/g, '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');

// Fold at Unicode boundaries so each physical line stays within 75 UTF-8 octets.
const foldIcsLine = (line) => {
  const encoder = new TextEncoder();
  let result = '', current = '', bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      result += current + '\r\n';
      current = ' ';
      bytes = 1;
    }
    current += character;
    bytes += size;
  }
  return result + current;
};

export const buildIcs = (event, uid = crypto.randomUUID()) => [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//World Focus//Calendar Event//EN',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
  'BEGIN:VEVENT',
  `UID:${uid}@world-focus`,
  `DTSTAMP:${formatUtcCompact(new Date())}`,
  `DTSTART:${formatUtcCompact(event.start)}`,
  `DTEND:${formatUtcCompact(event.end)}`,
  `SUMMARY:${escapeIcs(event.title)}`,
  `DESCRIPTION:${escapeIcs(event.details)}`,
  'END:VEVENT',
  'END:VCALENDAR',
  '',
].map(foldIcsLine).join('\r\n');
