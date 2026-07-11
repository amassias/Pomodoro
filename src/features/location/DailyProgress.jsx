import React from 'react';
import { useUserData } from '../../providers/UserDataProvider';

const DailyProgress = () => {
    const { settings, getTodayProgress } = useUserData();
    const todayProgress = getTodayProgress();
    const dailyGoal = settings.dailyGoal || 120; // Default 2 hours

    const percentage = Math.min(100, (todayProgress / dailyGoal) * 100);
    const isCompleted = percentage >= 100;

    const strokeDasharray = 2 * Math.PI * 18; // Radius 18
    const strokeDashoffset = strokeDasharray * ((100 - percentage) / 100);

    const formatHours = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    return (
        <div className="daily-progress" title={`Daily Goal: ${formatHours(todayProgress)} / ${formatHours(dailyGoal)}`} aria-label={`Daily goal: ${formatHours(todayProgress)} of ${formatHours(dailyGoal)}`}>
            <div className="progress-ring-wrapper">
                <svg className="progress-ring" width="44" height="44">
                    <circle
                        className="progress-ring__circle-bg"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="3"
                        fill="transparent"
                        r="18"
                        cx="22"
                        cy="22"
                    />
                    <circle
                        className="progress-ring__circle"
                        stroke={isCompleted ? '#ffd700' : 'var(--accent-color, #fff)'}
                        strokeWidth="3"
                        fill="transparent"
                        r="18"
                        cx="22"
                        cy="22"
                        style={{
                            strokeDasharray,
                            strokeDashoffset,
                            transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease'
                        }}
                    />
                </svg>
                <div className="progress-text">
                    {isCompleted ? '★' : `${Math.round(percentage)}%`}
                </div>
            </div>
            <div className="progress-copy">
                <span>Daily focus</span>
                <strong>{formatHours(todayProgress)} <small>/ {formatHours(dailyGoal)}</small></strong>
            </div>

            <style>{`
                .daily-progress {
                    display: flex;
                    align-items: center;
                    cursor: help;
                    gap: 0.65rem;
                    padding-right: 0.6rem;
                }

                .progress-ring-wrapper {
                    position: relative;
                    width: 44px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .progress-ring {
                    transform: rotate(-90deg);
                }

                .progress-text {
                    position: absolute;
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.9);
                    pointer-events: none;
                }

                .progress-copy { display: flex; flex-direction: column; gap: 0.1rem; }
                .progress-copy span { color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; }
                .progress-copy strong { font-size: 0.76rem; font-weight: 600; }
                .progress-copy small { color: var(--text-muted); font-weight: 400; }

                @media (max-width: 560px) { .progress-copy { display: none; } .daily-progress { padding-right: 0; } }
            `}</style>
        </div>
    );
};

export default DailyProgress;
