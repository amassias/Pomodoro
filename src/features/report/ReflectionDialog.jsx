import React, { useRef, useState } from 'react';
import { useUserData } from '../../providers/UserDataProvider.jsx';
import { getLocalDateKey } from '../../lib/date';
import { useDialogFocus } from '../../hooks/useDialogFocus';

// Stays mounted between sessions so the last chosen answers are kept as defaults.
const ReflectionDialog = ({ reflection, onClose }) => {
  const reflectionRef = useRef(null);
  const [reflectionResult, setReflectionResult] = useState('completed');
  const [reflectionDifficulty, setReflectionDifficulty] = useState('3');
  const [reflectionInterruptions, setReflectionInterruptions] = useState('0');
  const [reflectionNotes, setReflectionNotes] = useState('');
  const { setPomodoroHistory } = useUserData();

  useDialogFocus({ open: Boolean(reflection), onClose, dialogRef: reflectionRef });

  const saveReflection = (event) => {
    event.preventDefault();
    if (!reflection) return;
    setPomodoroHistory((prevHistory) => {
      const history = prevHistory && typeof prevHistory === 'object' ? { ...prevHistory } : {};
      const today = getLocalDateKey();
      const sessions = Array.isArray(history[today]) ? history[today] : [];
      history[today] = sessions.map((session) => session.sessionId === reflection.sessionId ? {
        ...session,
        result: reflectionResult,
        difficulty: Number(reflectionDifficulty),
        interruptions: Number(reflectionInterruptions),
        notes: reflectionNotes.trim() || undefined,
      } : session);
      return history;
    });
    onClose();
    setReflectionNotes('');
  };

  if (!reflection) return null;

  return (
    <div className="reflection-overlay" onClick={onClose}>
      <form ref={reflectionRef} className="reflection-modal glass-panel" onSubmit={saveReflection} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="reflection-title">
        <h2 id="reflection-title">Close your focus session</h2>
        <p>{reflection.taskName ? `How did “${reflection.taskName}” go?` : 'A few seconds of reflection makes your reports useful.'}</p>
        <label>Result<select value={reflectionResult} onChange={(event) => setReflectionResult(event.target.value)}><option value="completed">Completed</option><option value="partial">Partly completed</option><option value="blocked">Blocked</option></select></label>
        <label>Difficulty<select value={reflectionDifficulty} onChange={(event) => setReflectionDifficulty(event.target.value)}><option value="1">1 — Easy</option><option value="2">2</option><option value="3">3 — Balanced</option><option value="4">4</option><option value="5">5 — Hard</option></select></label>
        <label>Interruptions<input type="number" min="0" max="99" value={reflectionInterruptions} onChange={(event) => setReflectionInterruptions(event.target.value)} /></label>
        <label>Notes<textarea value={reflectionNotes} onChange={(event) => setReflectionNotes(event.target.value)} placeholder="What helped? What got in the way?" /></label>
        <div><button type="button" onClick={onClose}>Skip</button><button type="submit">Save reflection</button></div>
      </form>
    </div>
  );
};

export default ReflectionDialog;
