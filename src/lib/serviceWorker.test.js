import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';
const workerSource=readFileSync(new URL('../../public/sw.js',import.meta.url),'utf8');
const setup=()=>{
  const listeners={};
  const caches={keys:async()=>['unrelated-cache','world-focus-old-a','world-focus-old-b','world-focus-v3-__BUILD_ID__'],delete:vi.fn().mockResolvedValue(true),open:async()=>({match:async()=>new Response('current shell')}),match:async()=>new Response('old shell')};
  const scope={self:{addEventListener:(name,fn)=>{listeners[name]=fn;},location:{origin:'https://app.example'},clients:{claim:vi.fn()},skipWaiting:vi.fn()},caches,fetch:vi.fn().mockRejectedValue(new Error('Offline')),URL,Response};
  runInNewContext(workerSource,scope);
  return {listeners,caches};
};
it('keeps the previous app cache for already-open pages and leaves unrelated caches alone',async()=>{
  const {listeners,caches}=setup(); let promise;
  listeners.activate({waitUntil:p=>{promise=p;}}); await promise;
  expect(caches.delete).toHaveBeenCalledExactlyOnceWith('world-focus-old-a');
});
it('serves the current app shell on offline navigation instead of an older cached shell',async()=>{
  const {listeners}=setup();let response;
  listeners.fetch({request:{method:'GET',url:'https://app.example/',mode:'navigate'},respondWith:p=>{response=p;},waitUntil:vi.fn()});
  expect(await (await response).text()).toBe('current shell');
});
