import React, { useMemo } from 'react';
import { ACHIEVEMENTS, getUnlockedAchievements } from '../utils/achievements';

const Achievements = ({ history }) => {
    const unlocked = useMemo(() => {
        const unlockedList = getUnlockedAchievements(history);
        return new Set(unlockedList.map(a => a.id));
    }, [history]);

    return (
        <div className="achievements-container">
            <h3>Achievements</h3>
            <div className="achievements-grid">
                {ACHIEVEMENTS.map(achievement => {
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

            <style jsx>{`
        .achievements-container {
          margin-top: 2rem;
          width: 100%;
        }

        .achievements-container h3 {
          margin-bottom: 1rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1rem;
        }

        .achievement-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
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
          font-size: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
        }

        .achievement-details {
          flex: 1;
        }

        .achievement-title {
          font-weight: 600;
          font-size: 0.95rem;
          margin-bottom: 0.2rem;
          color: rgba(255, 255, 255, 0.95);
        }

        .achievement-desc {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.3;
        }
      `}</style>
        </div>
    );
};

export default Achievements;
