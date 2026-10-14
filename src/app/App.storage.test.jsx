// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const originalLocal=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
const originalSession=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.unstubAllEnvs();Object.defineProperty(globalThis,'localStorage',originalLocal);Object.defineProperty(globalThis,'sessionStorage',originalSession);});
it('renders the complete local workspace and lets a user add a task when browser storage is blocked',async()=>{
  vi.resetModules();vi.stubEnv('VITE_SUPABASE_URL','');vi.stubEnv('VITE_SUPABASE_ANON_KEY','');
  for(const name of ['localStorage','sessionStorage'])Object.defineProperty(globalThis,name,{configurable:true,get:()=>{throw new Error('Storage denied');}});
  vi.stubGlobal('Audio',class extends EventTarget { paused=true;volume=.5;src='';load(){}pause(){this.paused=true;}play(){return Promise.reject(new Error('Offline'));} });
  const [{default:App},{AuthProvider},{UserDataProvider},{SharedSessionProvider},{ToastProvider}]=await Promise.all([import('./App'),import('../providers/AuthProvider'),import('../providers/UserDataProvider'),import('../providers/SharedSessionProvider'),import('../components/ui/Toast')]);
  render(<AuthProvider><ToastProvider><UserDataProvider><SharedSessionProvider><App /></SharedSessionProvider></UserDataProvider></ToastProvider></AuthProvider>);
  expect(await screen.findByText('Temporary data')).toBeTruthy();
  fireEvent.click(await screen.findByRole('button',{name:'Start without the tour'}));
  expect(screen.getByRole('button',{name:'Start focus'})).toBeTruthy();
  fireEvent.change(screen.getByPlaceholderText('Add a task...'),{target:{value:'Memory-only task'}});
  fireEvent.click(screen.getByRole('button',{name:'Add task'}));
  expect(await screen.findByText('Memory-only task')).toBeTruthy();
  expect(screen.queryByText('Something went wrong')).toBeNull();
});
