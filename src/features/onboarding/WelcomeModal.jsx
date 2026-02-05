import React from 'react';

const WelcomeModal = ({ onStartTour, onSkip }) => {
  return (
    <div className="welcome-overlay">
      <div className="welcome-modal glass-panel">
        <div className="welcome-icon">🍅</div>
        <h1>Welcome to Pomodoro Focus</h1>
        <p className="welcome-description">
          A beautiful timer to help you stay focused using the Pomodoro Technique — 
          work in focused sprints, take short breaks, and accomplish more.
        </p>
        
        <div className="welcome-features">
          <div className="feature">
            <span className="feature-icon">⏱️</span>
            <span>25-minute focus sessions</span>
          </div>
          <div className="feature">
            <span className="feature-icon">☕</span>
            <span>Refreshing short & long breaks</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🎵</span>
            <span>Ambient music & live backgrounds</span>
          </div>
          <div className="feature">
            <span className="feature-icon">✅</span>
            <span>Task tracking & daily goals</span>
          </div>
        </div>

        <div className="welcome-actions">
          <button className="tour-btn" onClick={onStartTour}>
            <span>Take a Quick Tour</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button className="skip-btn" onClick={onSkip}>
            Skip, I'll explore myself
          </button>
        </div>

        <p className="welcome-hint">
          <kbd>Space</kbd> to start/pause • <kbd>R</kbd> to reset • <kbd>M</kbd> to mute
        </p>
      </div>

      <style jsx>{`
        .welcome-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .welcome-modal {
          max-width: 480px;
          width: 100%;
          padding: 2.5rem;
          text-align: center;
          animation: slideUp 0.4s ease;
        }

        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        .welcome-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: bounce 1s ease infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        h1 {
          font-size: 1.75rem;
          font-weight: 600;
          margin: 0 0 0.75rem 0;
          background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .welcome-description {
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0 0 1.5rem 0;
          font-size: 0.95rem;
        }

        .welcome-features {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 2rem;
          text-align: left;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .feature-icon {
          font-size: 1.1rem;
        }

        .welcome-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .tour-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: #fff;
          color: #000;
          padding: 0.9rem 1.5rem;
          border-radius: 99px;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .tour-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
        }

        .skip-btn {
          background: transparent;
          color: var(--text-secondary);
          padding: 0.75rem;
          font-size: 0.9rem;
          transition: color 0.2s;
        }

        .skip-btn:hover {
          color: #fff;
        }

        .welcome-hint {
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          opacity: 0.7;
        }

        kbd {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          padding: 0.2rem 0.4rem;
          font-family: inherit;
          font-size: 0.75rem;
        }

        @media (max-width: 480px) {
          .welcome-modal {
            padding: 1.5rem;
          }

          h1 {
            font-size: 1.5rem;
          }

          .welcome-icon {
            font-size: 3rem;
          }
        }
      `}</style>
    </div>
  );
};

export default WelcomeModal;
