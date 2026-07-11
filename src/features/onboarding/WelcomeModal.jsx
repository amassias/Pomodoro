import React, { useRef } from 'react';
import { useDialogFocus } from '../../shared/ui/useDialogFocus';

const WelcomeModal = ({ onStartTour, onSkip }) => {
  const dialogRef = useRef(null);
  useDialogFocus({ open: true, onClose: onSkip, dialogRef });
  return (
    <div className="welcome-overlay" role="presentation">
      <div ref={dialogRef} className="welcome-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <div className="welcome-kicker"><span></span> Your focus space</div>
        <h1 id="welcome-title">Welcome to World Focus</h1>
        <p className="welcome-description">
          A calm place to do one meaningful thing at a time. Set the timer, choose your atmosphere, and begin.
        </p>
        
        <div className="welcome-features">
          <div className="feature">
            <span className="feature-number">01</span>
            <span><strong>Set your rhythm</strong><small>Focus sessions and intentional breaks</small></span>
          </div>
          <div className="feature">
            <span className="feature-number">02</span>
            <span><strong>Choose one task</strong><small>Keep your attention anchored</small></span>
          </div>
          <div className="feature">
            <span className="feature-number">03</span>
            <span><strong>Shape the atmosphere</strong><small>Live places and ambient sound</small></span>
          </div>
        </div>

        <div className="welcome-actions">
          <button className="tour-btn" onClick={onStartTour} autoFocus>
            <span>Show me around</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button className="skip-btn" onClick={onSkip}>
            Start without the tour
          </button>
        </div>

        <p className="welcome-hint">
          <kbd>Space</kbd> to start/pause • <kbd>R</kbd> to reset • <kbd>M</kbd> to mute
        </p>
      </div>

      <style>{`
        .welcome-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.78);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          overflow-y: auto;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .welcome-modal {
          max-width: 500px;
          width: 100%;
          padding: 2.5rem;
          text-align: left;
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

        .welcome-kicker { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: var(--accent-color); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.16em; }
        .welcome-kicker span { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-color); box-shadow: 0 0 14px var(--accent-color); }

        h1 {
          font-size: clamp(1.8rem, 6vw, 2.6rem);
          font-weight: 600;
          margin: 0 0 0.75rem 0;
          letter-spacing: -0.04em;
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
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          font-size: 0.9rem;
        }

        .feature-number { color: var(--accent-color); font-variant-numeric: tabular-nums; font-size: 0.7rem; }
        .feature > span:last-child { display: flex; flex-direction: column; gap: 0.15rem; }
        .feature strong { font-size: 0.86rem; }
        .feature small { color: var(--text-muted); font-size: 0.72rem; }

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
          background: var(--accent-color);
          color: #1a0807;
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
          text-align: center;
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

          .welcome-hint { display: none; }
        }
      `}</style>
    </div>
  );
};

export default WelcomeModal;
