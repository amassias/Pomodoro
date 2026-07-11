import React, { useState, useEffect, useCallback } from 'react';

const TOUR_STEPS = [
  {
    target: '.timer-container',
    title: 'The Pomodoro Timer',
    description: 'Your focus command center. Start a 25-minute focus session, or switch to short/long breaks. Press Space to start!',
    position: 'right',
  },
  {
    target: '.task-list-container',
    title: 'Task List',
    description: 'Add tasks to stay organized. Check them off as you complete them — they\'ll be archived automatically.',
    position: 'left',
  },
  {
    target: '.top-widget-area',
    title: 'Daily Progress',
    description: 'Track your focus time. The ring fills up as you work toward your daily goal (customizable in settings).',
    position: 'bottom',
  },
  {
    target: '.bottom-bar',
    title: 'Live Backgrounds',
    description: 'Tap to expand and choose from beautiful live streams around the world — Tokyo streets, Northern Lights, cozy cafés, and more.',
    position: 'top',
    align: 'left',
  },
  {
    target: '.settings-btn',
    title: 'Settings',
    description: 'Customize timer durations, sounds, daily goals, and connect Spotify for your own playlists.',
    position: 'left',
  },
];

const OnboardingTour = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  const updateTargetPosition = useCallback(() => {
    if (!step?.target) return;
    
    const element = document.querySelector(step.target);
    if (!element) {
      // Element not found, skip to next or complete
      if (isLastStep) {
        onComplete();
      } else {
        setCurrentStep(prev => prev + 1);
      }
      return;
    }

    const rect = element.getBoundingClientRect();
    setTargetRect(rect);

    // Calculate tooltip position
    const padding = 16;
    const tooltipWidth = Math.min(320, window.innerWidth - 32);
    const tooltipHeight = 180; // Approximate
    
    let top, left;
    
    switch (step.position) {
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + padding;
        // If tooltip goes off screen, position below instead
        if (left + tooltipWidth > window.innerWidth - padding) {
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          top = rect.bottom + padding;
        }
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - padding;
        // If tooltip goes off screen, position below instead
        if (left < padding) {
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          top = rect.bottom + padding;
        }
        break;
      case 'top':
      {
        // For wide elements (like bottom bar), position tooltip higher with more gap
        const extraPadding = rect.width > window.innerWidth * 0.7 ? 24 : 0;
        top = rect.top - tooltipHeight - padding - extraPadding;
        // For wide elements (like bottom bar) or explicit left align, position tooltip to the far left
        if (step.align === 'left') {
          left = padding;
        } else if (rect.width > window.innerWidth * 0.7) {
          left = padding;
          // Also position vertically centered on the left side of screen
          top = window.innerHeight / 2 - tooltipHeight / 2;
        } else {
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
        }
        // If tooltip goes off screen vertically, position below instead
        if (top < padding) {
          top = rect.bottom + padding;
        }
        break;
      }
      case 'bottom':
      default:
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
    }

    // Clamp to viewport
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

    setTooltipStyle({ top, left, width: tooltipWidth });
  }, [step, isLastStep, onComplete]);

  useEffect(() => {
    const rafId = requestAnimationFrame(updateTargetPosition);
    
    const handleResize = () => updateTargetPosition();
    const handleScroll = () => updateTargetPosition();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [updateTargetPosition]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onComplete();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLastStep) {
          onComplete();
        } else {
          setCurrentStep(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isLastStep, onComplete]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="tour-overlay">
      {/* Spotlight cutout using box-shadow */}
      {targetRect && (
        <div 
          className="spotlight"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Tooltip */}
      <div className="tour-tooltip glass-panel" style={tooltipStyle}>
        <div className="tooltip-header">
          <span className="step-indicator">{currentStep + 1} / {TOUR_STEPS.length}</span>
          <button className="skip-btn" onClick={handleSkip}>Skip tour</button>
        </div>

        <h3>{step?.title}</h3>
        <p>{step?.description}</p>

        <div className="tooltip-actions">
          <button 
            className="prev-btn" 
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            ← Back
          </button>
          <button className="next-btn" onClick={handleNext}>
            {isLastStep ? 'Get Started' : 'Next →'}
          </button>
        </div>

        <div className="progress-dots">
          {TOUR_STEPS.map((_, index) => (
            <div 
              key={index} 
              className={`dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>
      </div>

      <style>{`
        .tour-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          pointer-events: none;
        }

        .spotlight {
          position: fixed;
          border-radius: 16px;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75);
          border: 2px solid rgba(255, 255, 255, 0.8);
          pointer-events: none;
          transition: all 0.3s ease;
          z-index: 998;
        }

        .tour-tooltip {
          position: fixed;
          padding: 1.25rem;
          background: rgba(25, 25, 25, 0.95);
          border-radius: 16px;
          z-index: 1000;
          pointer-events: auto;
          animation: tooltipIn 0.3s ease;
        }

        @keyframes tooltipIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .step-indicator {
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 99px;
        }

        .skip-btn {
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          transition: color 0.2s;
        }

        .skip-btn:hover {
          color: #fff;
        }

        h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        p {
          margin: 0 0 1rem 0;
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .tooltip-actions {
          display: flex;
          gap: 0.75rem;
        }

        .prev-btn, .next-btn {
          flex: 1;
          padding: 0.6rem 1rem;
          border-radius: 99px;
          font-weight: 500;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .prev-btn {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
        }

        .prev-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
        }

        .prev-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .next-btn {
          background: #fff;
          color: #000;
        }

        .next-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
        }

        .progress-dots {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: all 0.2s;
        }

        .dot:hover {
          background: rgba(255, 255, 255, 0.4);
        }

        .dot.active {
          background: #fff;
          transform: scale(1.2);
        }

        .dot.completed {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default OnboardingTour;
