const parseVideoIds = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim());
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }
  return [];
};

const uniq = (items) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
};

const chunk = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const readJsonBody = async (req) => {
  if (req?.body && typeof req.body === 'object') return req.body;

  const raw = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunkData) => {
      data += chunkData;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const isCurrentlyLive = (item) => {
  const liveBroadcastContent = item?.snippet?.liveBroadcastContent;
  if (liveBroadcastContent === 'live') return true;

  const started = !!item?.liveStreamingDetails?.actualStartTime;
  const ended = !!item?.liveStreamingDetails?.actualEndTime;
  return started && !ended;
};

const isEmbeddableEnough = (item) => {
  if (item?.status?.embeddable !== true) return false;

  const privacy = item?.status?.privacyStatus;
  if (privacy === 'private') return false;

  return true;
};

export default async function handler(req, res) {
  try {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');

    const apiKey = globalThis?.process?.env?.YOUTUBE_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Missing YOUTUBE_API_KEY env var' }));
      return;
    }

    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const body = method === 'POST' ? await readJsonBody(req) : {};

    const requestedIds = uniq(
      parseVideoIds(body?.videoIds)
        .concat(parseVideoIds(req?.query?.videoIds))
        .concat(parseVideoIds(req?.query?.ids))
    );

    if (!requestedIds.length) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing videoIds' }));
      return;
    }

    const results = {};
    for (const id of requestedIds) {
      results[id] = { ok: false, reason: 'not_checked' };
    }

    const batches = chunk(requestedIds, 50);

    for (const ids of batches) {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('part', 'snippet,status,liveStreamingDetails');
      url.searchParams.set('id', ids.join(','));
      url.searchParams.set('key', apiKey);

      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        res.statusCode = 502;
        res.end(
          JSON.stringify({
            error: 'YouTube API request failed',
            status: response.status,
            details: text.slice(0, 1000),
          })
        );
        return;
      }

      const payload = await response.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];

      for (const item of items) {
        const id = item?.id;
        if (!id) continue;

        if (!isEmbeddableEnough(item)) {
          results[id] = { ok: false, reason: 'not_embeddable_or_private' };
          continue;
        }

        if (!isCurrentlyLive(item)) {
          results[id] = { ok: false, reason: 'not_live' };
          continue;
        }

        results[id] = { ok: true };
      }
    }

    for (const id of requestedIds) {
      if (results[id]?.reason === 'not_checked') {
        results[id] = { ok: false, reason: 'not_found' };
      }
    }

    const validIds = requestedIds.filter((id) => results[id]?.ok);
    const invalidIds = requestedIds.filter((id) => !results[id]?.ok);

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        fetchedAt: new Date().toISOString(),
        validIds,
        invalidIds,
        results,
      })
    );
  } catch (error) {
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: 'Unexpected error',
        message: error instanceof Error ? error.message : String(error),
      })
    );
  }
}
