// Keep completion events until the lazy-loaded report has installed its listener.
const pending = [];
let listenerCount = 0;

export const emitFocusCompletion = detail => {
  if (listenerCount === 0) pending.push(detail);
  window.dispatchEvent(new CustomEvent('pomodoroCompleted', { detail }));
};

export const listenFocusCompletion = handler => {
  listenerCount += 1;
  window.addEventListener('pomodoroCompleted', handler);
  for (const detail of pending.splice(0)) handler({ detail });
  return () => {
    listenerCount -= 1;
    window.removeEventListener('pomodoroCompleted', handler);
  };
};
