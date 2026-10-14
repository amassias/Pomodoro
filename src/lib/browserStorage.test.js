import { expect, it } from 'vitest';
import { createResilientStorage } from './browserStorage';
it('keeps reads and writes usable when the browser refuses access', () => {
  const storage=createResilientStorage(()=>{throw new Error('Denied');},'test');
  expect(storage.getItem('tasks')).toBeNull();
  storage.setItem('tasks','saved in this page');
  expect(storage.getItem('tasks')).toBe('saved in this page');
  expect(storage.persistent).toBe(false);
  storage.removeItem('tasks');expect(storage.getItem('tasks')).toBeNull();
});
it('retains a newer value on quota failure and persists it once storage recovers', () => {
  let full=true;const native=new Map([['tasks','old']]);
  const storage=createResilientStorage(()=>({getItem:k=>native.get(k)??null,setItem:(k,v)=>{if(full)throw new Error('Quota');native.set(k,v);},removeItem:k=>native.delete(k)}),'test');
  storage.setItem('tasks','new');expect(storage.getItem('tasks')).toBe('new');
  full=false;expect(storage.getItem('tasks')).toBe('new');expect(native.get('tasks')).toBe('new');expect(storage.persistent).toBe(true);
});
