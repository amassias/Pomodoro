// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import CalendarActions from './CalendarActions';
vi.mock('../../providers/UserDataProvider',()=>({useUserData:()=>({settings:{focusDuration:25},activeTask:{text:'Audit'}})}));
vi.mock('../../providers/SharedSessionProvider',()=>({useSharedSession:()=>({shareUrl:null})}));
afterEach(()=>{cleanup();vi.useRealTimers();});
it('builds a calendar block at the moment of interaction rather than page load',()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-15T10:00:00Z'));
  render(<CalendarActions />);vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));
  const link=screen.getByRole('link',{name:'Google Calendar'});fireEvent.pointerDown(link);
  expect(new URL(link.href).searchParams.get('dates')).toBe('20261015T120000Z/20261015T122500Z');
});
