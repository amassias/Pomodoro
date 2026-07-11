import React, { useMemo } from 'react';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, getUnlockedAchievements, getAchievementsByCategory } from '../../lib/achievements';

const Achievements = ({ history }) => {
    const unlocked = useMemo(() => {
        const unlockedList = getUnlockedAchievements(history);
        return new Set(unlockedList.map(a => a.id));
    }, [history]);

    const unlockedCount = unlocked.size;
    const totalCount = ACHIEVEMENTS.length;
    const nextAchievement = ACHIEVEMENTS.find(achievement => !unlocked.has(achievement.id));

    return (
        <div className="achievements-container">
            <div className="achievements-header">
                <h3>Achievements</h3>
                <span className="achievements-progress">
                    {unlockedCount}/{totalCount} unlocked
                </span>
            </div>
            {nextAchievement && (
                <div className="next-achievement">
                    <span>Next milestone</span>
                    <strong>{nextAchievement.icon} {nextAchievement.title}</strong>
                    <small>{nextAchievement.description}</small>
                </div>
            )}

            {ACHIEVEMENT_CATEGORIES.map(category => {
                const categoryAchievements = getAchievementsByCategory(category.id);
                const categoryUnlocked = categoryAchievements.filter(a => unlocked.has(a.id)).length;

                return (
                    <div key={category.id} className="achievement-category">
                        <div className="category-header">
                            <span className="category-title">{category.title}</span>
                            <span className="category-progress">
                                {categoryUnlocked}/{categoryAchievements.length}
                            </span>
                        </div>
                        <div className="achievements-grid">
                            {categoryAchievements.map(achievement => {
                                const isUnlocked = unlocked.has(achievement.id);
                                return (
                                    <div
                                        key={achievement.id}
                                        className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                                        title={isUnlocked ? 'Unlocked!' : 'Locked'}
                                    >
                                        <div className="achievement-icon">
                                            {isUnlocked ? achievement.icon : '🔒'}
                                        </div>
                                        <div className="achievement-details">
                                            <div className="achievement-title">{achievement.title}</div>
                                            <div className="achievement-desc">{achievement.description}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            <style>{`
        .achievements-container {
          margin-top: 2rem;
          width: 100%;
        }

        .achievements-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .achievements-header h3 {
          margin: 0;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        .achievements-progress {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.1);
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
        }
        .next-achievement { display: grid; gap: 0.2rem; margin: -0.5rem 0 1.25rem; padding: 0.85rem 1rem; border-left: 3px solid var(--accent-color); border-radius: 0 12px 12px 0; background: var(--accent-soft); }
        .next-achievement span { color: var(--accent-color); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.12em; }
        .next-achievement strong { font-size: 0.9rem; }
        .next-achievement small { color: var(--text-secondary); }

        .achievement-category {
          margin-bottom: 1.5rem;
        }

        .category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .category-title {
          font-size: 0.95rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
        }

        .category-progress {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.75rem;
        }

        .achievement-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          transition: all 0.3s ease;
        }

        .achievement-card.unlocked {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .achievement-card.locked {
          opacity: 0.5;
          filter: grayscale(1);
        }

        .achievement-icon {
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
        }

        .achievement-details {
          flex: 1;
          min-width: 0;
        }

        .achievement-title {
          font-weight: 600;
          font-size: 0.85rem;
          margin-bottom: 0.15rem;
          color: rgba(255, 255, 255, 0.95);
        }

        .achievement-desc {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.3;
        }
      `}</style>
        </div>
    );
};

export default Achievements;
