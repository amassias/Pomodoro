// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { UserDataProvider, useUserData } from './UserDataProvider';
const backend=vi.hoisted(()=>({userId:'one',callbacks:[]}));
vi.mock('./AuthProvider.jsx',()=>({useAuth:()=>({user:{id:backend.userId}})}));
vi.mock('../lib/supabase',()=>({supabase:{
  from:()=>{let id;const query={select:()=>query,eq:(_key,value)=>{id=value;return query;},abortSignal:()=>query,maybeSingle:async()=>({data:{user_id:id,tasks:[{id,text:id==='one'?'One':'Two'}],archived_tasks:[],pomodoro_history:{},settings:{},updated_at:'initial'},error:null}),upsert:async()=>({error:null})};return query;},
  channel:()=>{const channel={on:(_type,_filter,callback)=>{backend.callbacks.push(callback);return channel;},subscribe:()=>channel};return channel;},removeChannel:vi.fn(),
}}));
const Harness=()=>{const {tasks,loading}=useUserData();return <p>{loading?'Loading':tasks[0]?.text}</p>;};
afterEach(()=>{cleanup();localStorage.clear();});
it('ignores a late realtime callback from the previous account after switching users',async()=>{
  backend.userId='one';backend.callbacks=[];
  const view=render(<UserDataProvider><Harness /></UserDataProvider>);
  await screen.findByText('One');
  const oldCallback=backend.callbacks[0];
  backend.userId='two';view.rerender(<UserDataProvider><Harness /></UserDataProvider>);
  await screen.findByText('Two');
  act(()=>oldCallback({new:{updated_at:'late',tasks:[{id:'old',text:'Old account'}],archived_tasks:[],pomodoro_history:{},settings:{}}}));
  expect(screen.getByText('Two')).toBeTruthy();
});
