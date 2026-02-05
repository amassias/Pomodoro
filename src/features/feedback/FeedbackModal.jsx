import React, { useCallback, useState } from 'react';
import { supabase } from '../../lib/supabase';

const FeedbackModal = ({ open, onClose, currentStreamId, currentStreamName }) => {
  const [feedbackType, setFeedbackType] = useState('stream_bug');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // stream_bug fields
  const [problemType, setProblemType] = useState('');
  const [sinceWhen, setSinceWhen] = useState('');
  const [bugMessage, setBugMessage] = useState('');

  // stream_suggestion fields
  const [youtubeLinks, setYoutubeLinks] = useState('');
  const [ambience, setAmbience] = useState('');
  const [city, setCity] = useState('');
  const [suggestionMessage, setSuggestionMessage] = useState('');

  // other fields
  const [otherTopic, setOtherTopic] = useState('');
  const [otherMessage, setOtherMessage] = useState('');

  const resetForm = useCallback(() => {
    setFeedbackType('stream_bug');
    setProblemType('');
    setSinceWhen('');
    setBugMessage('');
    setYoutubeLinks('');
    setAmbience('');
    setCity('');
    setSuggestionMessage('');
    setOtherTopic('');
    setOtherMessage('');
    setSubmitError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [open, handleClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const session = await supabase.auth.getSession();
      const userId = session?.data?.session?.user?.id || null;

      const metadata = {
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      let feedbackData = {
        user_id: userId,
        type: feedbackType,
        stream_id: currentStreamId || null,
        stream_name: currentStreamName || null,
        metadata,
        status: 'open',
      };

      if (feedbackType === 'stream_bug') {
        feedbackData = {
          ...feedbackData,
          problem_type: problemType || null,
          since_when: sinceWhen || null,
          message: bugMessage || null,
        };
      } else if (feedbackType === 'stream_suggestion') {
        const links = youtubeLinks
          .split('\n')
          .map((link) => link.trim())
          .filter(Boolean);

        feedbackData = {
          ...feedbackData,
          youtube_links: links.length > 0 ? links : null,
          ambience: ambience || null,
          city: city || null,
          message: suggestionMessage || null,
        };
      } else if (feedbackType === 'other') {
        feedbackData = {
          ...feedbackData,
          problem_type: otherTopic || null,
          message: otherMessage || null,
        };
      }

      const { error } = await supabase.from('feedback').insert([feedbackData]);

      if (error) {
        throw error;
      }

      setIsSubmitting(false);
      alert('Thanks! Your feedback has been sent.');
      handleClose();
    } catch (err) {
      console.error('Feedback submission error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit feedback');
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="feedback-modal-overlay" onClick={handleClose}>
      <div className="feedback-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <h2>Send Feedback</h2>
          <button
            className="feedback-modal-close"
            onClick={handleClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="form-group">
            <label>Type of feedback</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="feedbackType"
                  value="stream_bug"
                  checked={feedbackType === 'stream_bug'}
                  onChange={(e) => {
                    setFeedbackType(e.target.value);
                    setProblemType('');
                    setSinceWhen('');
                  }}
                  disabled={isSubmitting}
                />
                A stream is not working
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="feedbackType"
                  value="stream_suggestion"
                  checked={feedbackType === 'stream_suggestion'}
                  onChange={(e) => {
                    setFeedbackType(e.target.value);
                    setYoutubeLinks('');
                    setAmbience('');
                    setCity('');
                  }}
                  disabled={isSubmitting}
                />
                Suggest a new stream
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="feedbackType"
                  value="other"
                  checked={feedbackType === 'other'}
                  onChange={(e) => {
                    setFeedbackType(e.target.value);
                    setOtherTopic('');
                  }}
                  disabled={isSubmitting}
                />
                Other
              </label>
            </div>
          </div>

          {feedbackType === 'stream_bug' && (
            <>
              <div className="form-group">
                <label htmlFor="problemType">What is the issue?</label>
                <select
                  id="problemType"
                  value={problemType}
                  onChange={(e) => setProblemType(e.target.value)}
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Select an issue…</option>
                  <option value="does_not_start">The stream does not start</option>
                  <option value="buffering_looping">The stream keeps buffering or looping</option>
                  <option value="no_sound">No sound / very low sound</option>
                  <option value="offline">Stream is offline</option>
                  <option value="other_issue">Other issue</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="sinceWhen">Since when?</label>
                <select
                  id="sinceWhen"
                  value={sinceWhen}
                  onChange={(e) => setSinceWhen(e.target.value)}
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Select…</option>
                  <option value="just_now">Just now</option>
                  <option value="since_today">Since today</option>
                  <option value="several_days">For several days</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="bugMessage">Anything to add? (optional)</label>
                <textarea
                  id="bugMessage"
                  value={bugMessage}
                  onChange={(e) => setBugMessage(e.target.value)}
                  placeholder="Any additional details…"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          {feedbackType === 'stream_suggestion' && (
            <>
              <div className="form-group">
                <label htmlFor="youtubeLinks">YouTube links (one per line)</label>
                <textarea
                  id="youtubeLinks"
                  value={youtubeLinks}
                  onChange={(e) => setYoutubeLinks(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  rows={3}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="ambience">Ambience</label>
                <select
                  id="ambience"
                  value={ambience}
                  onChange={(e) => setAmbience(e.target.value)}
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Select ambience…</option>
                  <option value="city_skyline">City live / skyline</option>
                  <option value="bridge_river">Bridge / river</option>
                  <option value="rain_cozy">Rain / cozy weather</option>
                  <option value="lofi_study">Lofi / study mix</option>
                  <option value="nature_ocean">Nature / ocean</option>
                  <option value="other_ambience">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="city">City / Country</label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Tokyo, Paris, Rio de Janeiro…"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="suggestionMessage">Why do you recommend this stream? (optional)</label>
                <textarea
                  id="suggestionMessage"
                  value={suggestionMessage}
                  onChange={(e) => setSuggestionMessage(e.target.value)}
                  placeholder="Any details about why this stream would fit…"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          {feedbackType === 'other' && (
            <>
              <div className="form-group">
                <label htmlFor="otherTopic">Topic</label>
                <select
                  id="otherTopic"
                  value={otherTopic}
                  onChange={(e) => setOtherTopic(e.target.value)}
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Select topic…</option>
                  <option value="general_bug">General bug</option>
                  <option value="feature_idea">Feature idea</option>
                  <option value="ui_design">UI / design issue</option>
                  <option value="other_topic">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="otherMessage">Message</label>
                <textarea
                  id="otherMessage"
                  value={otherMessage}
                  onChange={(e) => setOtherMessage(e.target.value)}
                  placeholder="Tell us what's on your mind…"
                  rows={4}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </>
          )}

          {submitError && (
            <div className="feedback-error">
              Error: {submitError}
            </div>
          )}

          <div className="feedback-form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending…' : 'Send feedback'}
            </button>
          </div>
        </form>

        <style jsx>{`
          .feedback-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }

          .feedback-modal-content {
            background: #1a1a1a;
            border-radius: 12px;
            padding: 2rem;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            color: #fff;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
          }

          .feedback-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }

          .feedback-modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 400;
            letter-spacing: 1px;
          }

          .feedback-modal-close {
            background: transparent;
            border: none;
            color: #aaa;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
          }

          .feedback-modal-close:hover:not(:disabled) {
            color: #fff;
          }

          .feedback-modal-close:disabled {
            cursor: not-allowed;
            opacity: 0.5;
          }

          .feedback-form {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .form-group label {
            font-size: 0.9rem;
            font-weight: 500;
            letter-spacing: 0.5px;
            color: #fff;
          }

          .radio-group {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .radio-label {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            cursor: pointer;
            font-size: 0.95rem;
            color: #ccc;
            transition: color 0.2s;
          }

          .radio-label:hover {
            color: #fff;
          }

          .radio-label input[type='radio'] {
            cursor: pointer;
          }

          .form-group select,
          .form-group input,
          .form-group textarea {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            padding: 0.75rem;
            border-radius: 6px;
            font-size: 0.95rem;
            font-family: inherit;
            transition: border-color 0.2s, background-color 0.2s;
          }

          .form-group select:focus,
          .form-group input:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: rgba(255, 107, 107, 0.6);
            background: rgba(255, 255, 255, 0.12);
          }

          .form-group select:disabled,
          .form-group input:disabled,
          .form-group textarea:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .form-group select option {
            background: #1a1a1a;
            color: #fff;
          }

          .feedback-error {
            background: rgba(255, 59, 48, 0.15);
            border: 1px solid rgba(255, 59, 48, 0.3);
            color: #ff6b6b;
            padding: 0.75rem;
            border-radius: 6px;
            font-size: 0.9rem;
          }

          .feedback-form-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }

          .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            letter-spacing: 0.5px;
          }

          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .btn-primary {
            background: rgba(255, 107, 107, 0.9);
            color: #fff;
          }

          .btn-primary:hover:not(:disabled) {
            background: rgba(255, 107, 107, 1);
            box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
          }

          .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .btn-secondary:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
          }

          @media (max-width: 600px) {
            .feedback-modal-content {
              padding: 1.5rem;
              max-height: 95vh;
            }

            .feedback-modal-header h2 {
              font-size: 1.25rem;
            }

            .feedback-form-actions {
              flex-direction: column-reverse;
            }

            .btn {
              width: 100%;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default FeedbackModal;
