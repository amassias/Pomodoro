// Helper function to calculate max streak from history
const calculateMaxStreak = (history) => {
    const dates = Object.keys(history || {}).sort();
    if (dates.length === 0) return 0;

    const sortedDates = dates.map(d => new Date(d)).sort((a, b) => a - b);
    let currentStreak = 1;
    let maxStreak = 1;

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

    return maxStreak;
};

// Helper function to get total sessions
const getTotalSessions = (history) => {
    return Object.values(history || {}).reduce((sum, sessions) => sum + sessions.length, 0);
};

// Achievement categories for visual grouping
export const ACHIEVEMENT_CATEGORIES = [
    {
        id: 'milestones',
        title: '🎯 Milestones',
        description: 'Session count achievements'
    },
    {
        id: 'streaks',
        title: '🔥 Streaks',
        description: 'Consistency achievements'
    },
    {
        id: 'daily',
        title: '📅 Daily',
        description: 'Single-day achievements'
    },
    {
        id: 'time_based',
        title: '🕐 Time-Based',
        description: 'Time of day achievements'
    }
];

export const ACHIEVEMENTS = [
    // ========== MILESTONES ==========
    {
        id: 'first_step',
        title: 'First Step',
        description: 'Complete your first focus session',
        icon: '🌱',
        category: 'milestones',
        check: (history) => {
            const dates = Object.keys(history || {});
            return dates.length > 0 && history[dates[0]].length > 0;
        }
    },
    {
        id: 'dedication',
        title: 'Dedication',
        description: 'Complete 50 total lifetime sessions',
        icon: '⭐',
        category: 'milestones',
        check: (history) => getTotalSessions(history) >= 50
    },
    {
        id: 'century',
        title: 'Century',
        description: 'Complete 100 total lifetime sessions',
        icon: '💯',
        category: 'milestones',
        check: (history) => getTotalSessions(history) >= 100
    },
    {
        id: 'veteran',
        title: 'Veteran',
        description: 'Complete 500 total lifetime sessions',
        icon: '🎖️',
        category: 'milestones',
        check: (history) => getTotalSessions(history) >= 500
    },
    {
        id: 'legend',
        title: 'Legend',
        description: 'Complete 1000 total lifetime sessions',
        icon: '🏆',
        category: 'milestones',
        check: (history) => getTotalSessions(history) >= 1000
    },

    // ========== STREAKS ==========
    {
        id: 'streak_starter',
        title: 'Streak Starter',
        description: 'Maintain a 3-day streak',
        icon: '🔥',
        category: 'streaks',
        check: (history) => calculateMaxStreak(history) >= 3
    },
    {
        id: 'streak_master',
        title: 'Streak Master',
        description: 'Maintain a 7-day streak',
        icon: '🔥',
        category: 'streaks',
        check: (history) => calculateMaxStreak(history) >= 7
    },
    {
        id: 'two_week_warrior',
        title: 'Two Week Warrior',
        description: 'Maintain a 14-day streak',
        icon: '⚔️',
        category: 'streaks',
        check: (history) => calculateMaxStreak(history) >= 14
    },
    {
        id: 'monthly_master',
        title: 'Monthly Master',
        description: 'Maintain a 30-day streak',
        icon: '📆',
        category: 'streaks',
        check: (history) => calculateMaxStreak(history) >= 30
    },
    {
        id: 'unstoppable',
        title: 'Unstoppable',
        description: 'Maintain a 100-day streak',
        icon: '💎',
        category: 'streaks',
        check: (history) => calculateMaxStreak(history) >= 100
    },

    // ========== DAILY ==========
    {
        id: 'marathoner',
        title: 'Marathoner',
        description: 'Focus for 4+ hours in a single day',
        icon: '🏃',
        category: 'daily',
        check: (history) => {
            return Object.values(history || {}).some(sessions => {
                const dailyMinutes = sessions.reduce((sum, s) => sum + (s.duration || 25), 0);
                return dailyMinutes >= 4 * 60;
            });
        }
    },
    {
        id: 'full_workday',
        title: 'Full Workday',
        description: 'Focus for 8+ hours in a single day',
        icon: '💼',
        category: 'daily',
        check: (history) => {
            return Object.values(history || {}).some(sessions => {
                const dailyMinutes = sessions.reduce((sum, s) => sum + (s.duration || 25), 0);
                return dailyMinutes >= 8 * 60;
            });
        }
    },
    {
        id: 'power_session',
        title: 'Power Session',
        description: 'Complete 10+ sessions in a single day',
        icon: '⚡',
        category: 'daily',
        check: (history) => {
            return Object.values(history || {}).some(sessions => sessions.length >= 10);
        }
    },
    {
        id: 'super_focused',
        title: 'Super Focused',
        description: 'Complete 15+ sessions in a single day',
        icon: '🚀',
        category: 'daily',
        check: (history) => {
            return Object.values(history || {}).some(sessions => sessions.length >= 15);
        }
    },

    // ========== TIME-BASED ==========
    {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Complete a session between 4 AM and 8 AM',
        icon: '🌅',
        category: 'time_based',
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
        category: 'time_based',
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
        id: 'lunchtime_learner',
        title: 'Lunchtime Learner',
        description: 'Complete a session between 12 PM and 1 PM',
        icon: '🍽️',
        category: 'time_based',
        check: (history) => {
            return Object.values(history || {}).some(sessions =>
                sessions.some(s => {
                    const date = new Date(s.timestamp);
                    const hour = date.getHours();
                    return hour >= 12 && hour < 13;
                })
            );
        }
    },
    {
        id: 'weekend_warrior',
        title: 'Weekend Warrior',
        description: 'Complete a session on Saturday or Sunday',
        icon: '🎉',
        category: 'time_based',
        check: (history) => {
            return Object.values(history || {}).some(sessions =>
                sessions.some(s => {
                    const date = new Date(s.timestamp);
                    const day = date.getDay();
                    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
                })
            );
        }
    },
    {
        id: 'after_hours',
        title: 'After Hours',
        description: 'Complete a session between 8 PM and 12 AM',
        icon: '🌙',
        category: 'time_based',
        check: (history) => {
            return Object.values(history || {}).some(sessions =>
                sessions.some(s => {
                    const date = new Date(s.timestamp);
                    const hour = date.getHours();
                    return hour >= 20 && hour < 24;
                })
            );
        }
    }
];

export const getUnlockedAchievements = (history) => {
    return ACHIEVEMENTS.filter(achievement => achievement.check(history));
};

export const getAchievementsByCategory = (categoryId) => {
    return ACHIEVEMENTS.filter(achievement => achievement.category === categoryId);
};
