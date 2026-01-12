export const ACHIEVEMENTS = [
    {
        id: 'first_step',
        title: 'First Step',
        description: 'Complete your first focus session',
        icon: '🌱',
        check: (history) => {
            const dates = Object.keys(history || {});
            return dates.length > 0 && history[dates[0]].length > 0;
        }
    },
    {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Complete a session between 4 AM and 8 AM',
        icon: '🌅',
        check: (history) => {
            return Object.values(history || {}).some(sessions =>
                sessions.some(s => {
                    const date = new Date(s.timestamp);
                    const hour = date.getHours();
                    return hour >= 4 && hour < 8;
                })
            );
        }
    },
    {
        id: 'night_owl',
        title: 'Night Owl',
        description: 'Complete a session between 12 AM and 4 AM',
        icon: '🦉',
        check: (history) => {
            return Object.values(history || {}).some(sessions =>
                sessions.some(s => {
                    const date = new Date(s.timestamp);
                    const hour = date.getHours();
                    return hour >= 0 && hour < 4;
                })
            );
        }
    },
    {
        id: 'marathoner',
        title: 'Marathoner',
        description: 'Focus for 4+ hours in a single day',
        icon: '🏃',
        check: (history) => {
            return Object.values(history || {}).some(sessions => {
                const dailyMinutes = sessions.reduce((sum, s) => sum + (s.duration || 25), 0);
                return dailyMinutes >= 4 * 60;
            });
        }
    },
    {
        id: 'streak_master',
        title: 'Streak Master',
        description: 'Maintain a 7-day streak',
        icon: '🔥',
        check: (history) => {
            const dates = Object.keys(history || {}).sort();
            if (dates.length < 7) return false;

            let maxStreak = 0;
            let currentStreak = 0;
            let lastDate = null;

            // Simple streak calculation (assumes dates are sorted strings YYYY-MM-DD)
            // This is a rough check; for robust streaks we'd parse dates.
            // Given the dates are keys, let's just check daily continuity.

            // We need to actually parse them to check for continuity
            const sortedDates = dates.map(d => new Date(d)).sort((a, b) => a - b);

            if (sortedDates.length === 0) return false;

            currentStreak = 1;
            maxStreak = 1;

            for (let i = 1; i < sortedDates.length; i++) {
                const prev = sortedDates[i - 1];
                const curr = sortedDates[i];
                const diffTime = Math.abs(curr - prev);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    currentStreak++;
                } else if (diffDays > 1) {
                    currentStreak = 1;
                }
                maxStreak = Math.max(maxStreak, currentStreak);
            }

            return maxStreak >= 7;
        }
    },
    {
        id: 'dedication',
        title: 'Dedication',
        description: 'Complete 50 total lifetime sessions',
        icon: '🏆',
        check: (history) => {
            const total = Object.values(history || {}).reduce((sum, sessions) => sum + sessions.length, 0);
            return total >= 50;
        }
    }
];

export const getUnlockedAchievements = (history) => {
    return ACHIEVEMENTS.filter(achievement => achievement.check(history));
};
