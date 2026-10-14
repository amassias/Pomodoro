// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import FeedbackModal from './FeedbackModal';
const backend = vi.hoisted(() => ({ insert: vi.fn(), toast: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({data:{session:null}}) }, from: () => ({ insert: backend.insert }) } }));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({toast:backend.toast}) }));
expect.extend(toHaveNoViolations);
afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); });
it('submits a report through the backend interface without leaking room invite parameters', async () => {
  window.history.replaceState({}, '', '/?room=private12&roomKey=secret&expires=123');
  backend.insert.mockResolvedValue({error:null});
  const close=vi.fn();
  const {container}=render(<FeedbackModal open onClose={close} currentStreamId="abcdefghijk" currentStreamName="Tokyo" />);
  expect(await axe(container)).toHaveNoViolations();
  fireEvent.submit(container.querySelector('form'));
  await waitFor(()=>expect(close).toHaveBeenCalled());
  expect(backend.insert.mock.calls[0][0][0]).toMatchObject({stream_id:'abcdefghijk',metadata:{url:'http://localhost:3000/'}});
  expect(JSON.stringify(backend.insert.mock.calls[0])).not.toContain('roomKey');
});
