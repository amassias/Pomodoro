import { afterEach, expect, it, vi } from 'vitest';
import handler from './validate';
const response = () => ({ headers: {}, setHeader(k,v) { this.headers[k]=v; }, end(body) { this.body=JSON.parse(body); }, statusCode: 0 });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('validates a mixed upstream response and deduplicates IDs', async () => {
  vi.stubEnv('YOUTUBE_API_KEY','test-only');
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ ok:true, json:async()=>({items:[{id:'abcdefghijk',status:{embeddable:true},snippet:{liveBroadcastContent:'live'}},{id:'12345678901',status:{embeddable:true},snippet:{liveBroadcastContent:'none'}}]}) }));
  const res=response();
  await handler({method:'POST',body:{videoIds:['abcdefghijk','12345678901','abcdefghijk']}},res);
  expect(res.statusCode).toBe(200);
  expect(res.body.validIds).toEqual(['abcdefghijk']);
  expect(res.body.invalidIds).toEqual(['12345678901']);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('rejects unsupported methods and excessive or malformed input without calling YouTube', async () => {
  vi.stubEnv('YOUTUBE_API_KEY','test-only');
  vi.stubGlobal('fetch',vi.fn());
  for(const [req,status] of [[{method:'DELETE'},405],[{method:'POST',body:{videoIds:['not-valid']}},400],[{method:'POST',body:{videoIds:Array.from({length:201},(_,i)=>String(i).padStart(11,'0'))}},400]]){
    const res=response(); await handler(req,res); expect(res.statusCode).toBe(status);
  }
  expect(fetch).not.toHaveBeenCalled();
});
