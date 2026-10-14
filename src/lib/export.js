import { normalizeHistory } from './userState';

export const generateCSV = (history) => {
  const rows = [['Date', 'Session Duration (min)', 'Task Name', 'Completed', 'Timestamp']];
  const normalized = normalizeHistory(history);
  for (const date of Object.keys(normalized).sort()) {
    for (const session of normalized[date]) {
      const parsedTimestamp = new Date(session.timestamp);
      const timestamp = session.timestamp && !Number.isNaN(parsedTimestamp.valueOf()) ? parsedTimestamp.toISOString() : date;
      let taskName = String(session.taskName || '-');
      if (taskName !== '-' && /^[\s]*[=+@-]/.test(taskName)) taskName = `'${taskName}`;
      rows.push([date, session.duration, `"${taskName.replaceAll('"', '""')}"`, session.completed === true ? 'Yes' : session.completed === false ? 'No' : 'Unknown', timestamp]);
    }
  }
  return rows.map(row => row.join(',')).join('\n');
};

export const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
