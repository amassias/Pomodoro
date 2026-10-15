import process from "node:process";
const CHANNEL = "UCSJ4gkVC6NrvII8umztf0Ow";
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  const key = process.env.YOUTUBE_API_KEY;
  try {
    if (!key) throw new Error("Radio discovery unavailable");
    const get = async (path, params) => {
      const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
      url.search = new URLSearchParams({ ...params, key });
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("Upstream unavailable");
      return response.json();
    };
    const eligible = (videos) =>
      (videos.items || []).filter(
        (v) =>
          v.snippet?.channelId === CHANNEL &&
          v.status?.embeddable &&
          v.snippet?.liveBroadcastContent === "live" &&
          !v.liveStreamingDetails?.actualEndTime &&
          !v.contentDetails?.regionRestriction,
      );
    // Check the verified study radio first (one quota unit). Discover replacements when it ends.
    let live = eligible(
      await get("videos", {
        part: "snippet,status,liveStreamingDetails,contentDetails",
        id: "rFZHOHl-L8A",
      }),
    );
    if (!live.length) {
      const found = await get("search", {
        part: "snippet",
        channelId: CHANNEL,
        eventType: "live",
        type: "video",
        maxResults: "50",
        order: "date",
      });
      const ids = (found.items || [])
        .map((v) => v.id?.videoId)
        .filter((id) => /^[\w-]{11}$/.test(id));
      if (!ids.length) throw new Error("No live broadcast");
      live = eligible(
        await get("videos", {
          part: "snippet,status,liveStreamingDetails,contentDetails",
          id: ids.join(","),
        }),
      );
    }
    live.sort(
      (a, b) =>
        Number(/relax\/study/i.test(b.snippet.title)) -
        Number(/relax\/study/i.test(a.snippet.title)),
    );
    if (!live.length) throw new Error("No playable broadcast");
    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=3600, stale-while-revalidate=300",
    );
    res.statusCode = 200;
    res.end(
      JSON.stringify({ videoId: live[0].id, title: live[0].snippet.title }),
    );
  } catch {
    res.setHeader("Cache-Control", "s-maxage=60");
    res.statusCode = 503;
    res.end(
      JSON.stringify({
        error: "Official radio is temporarily unavailable. Try rain ambience.",
      }),
    );
  }
}
