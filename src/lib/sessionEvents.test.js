// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { emitFocusCompletion, listenFocusCompletion } from './sessionEvents';
it('delivers an early completion once when the report is ready, then handles live events', () => {
  emitFocusCompletion({sessionId:'overdue',duration:25});
  const callback=vi.fn();
  const stop=listenFocusCompletion(callback);
  try {
    expect(callback).toHaveBeenCalledExactlyOnceWith({detail:{sessionId:'overdue',duration:25}});
    emitFocusCompletion({sessionId:'live',duration:50});
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[1][0].detail).toEqual({sessionId:'live',duration:50});
  } finally { stop(); }
});
