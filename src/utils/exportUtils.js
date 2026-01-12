export const generateCSV = (history) => {
    // History is an object: { "YYYY-MM-DD": [{ duration: 25, timestamp: ... }, ...], ... }

    // Flatten to rows
    const rows = [];
    // Header
    rows.push(['Date', 'Session Duration (min)', 'Task Name', 'Completed', 'Timestamp']);

    const sortedDates = Object.keys(history).sort();

    sortedDates.forEach(date => {
        const sessions = history[date];
        if (Array.isArray(sessions)) {
            sessions.forEach(session => {
                const duration = session.duration || 0;
                const timestamp = session.timestamp ? new Date(session.timestamp).toISOString() : date;
                // session might not have task info if it was a simple timer, but let's check
                // Assuming session structure might evolve, but for now mostly duration.
                // If we tracked task IDs, we'd need to lookup content, but simple export is fine.
                const taskName = session.taskName || '-';
                const completed = session.completed ? 'Yes' : 'No';

                rows.push([
                    date,
                    duration,
                    `"${taskName.replace(/"/g, '""')}"`, // Escape quotes
                    completed,
                    timestamp
                ]);
            });
        }
    });

    return rows.map(r => r.join(',')).join('\n');
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
