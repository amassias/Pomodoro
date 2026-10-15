import { browserSessionStorage as storage } from "../../lib/browserStorage";
const endpoints = {
  google: "https://www.googleapis.com/calendar/v3",
  outlook: "https://graph.microsoft.com/v1.0/me",
};
const api = async (provider, token, path, options = {}, request = fetch) => {
  const response = await request(endpoints[provider] + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (
    response.status === 409 &&
    provider === "google" &&
    options.method === "POST"
  ) {
    const id = JSON.parse(options.body).id;
    return api(provider, token, path + "/" + id, {}, request);
  }
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "Session expired. Reconnect your calendar."
        : `Calendar request failed (${response.status}). Try again.`,
    );
  return response.status === 204 ? null : response.json();
};
export const readCalendars = async (provider, token) => {
  const data = await api(
    provider,
    token,
    provider === "google"
      ? "/users/me/calendarList?minAccessRole=writer"
      : "/calendars?$select=id,name,canEdit",
  );
  return provider === "google"
    ? data.items.map((c) => ({ id: c.id, name: c.summary }))
    : data.value
        .filter((c) => c.canEdit)
        .map((c) => ({ id: c.id, name: c.name }));
};
export const readCalendarEvents = async (
  provider,
  token,
  calendar,
  request = fetch,
) => {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 86400000);
  const path =
    provider === "google"
      ? `/calendars/${encodeURIComponent(calendar)}/events?singleEvents=true&orderBy=startTime&maxResults=50&timeMin=${now.toISOString()}&timeMax=${end.toISOString()}`
      : `/calendars/${encodeURIComponent(calendar)}/calendarView?startDateTime=${now.toISOString()}&endDateTime=${end.toISOString()}&$top=50&$orderby=start/dateTime`;
  const data = await api(provider, token, path, {}, request);
  return (data.items || data.value || [])
    .filter((e) => e.status !== "cancelled" && !e.isCancelled)
    .map((e) => ({
      id: e.id,
      title: e.summary || e.subject || "Busy",
      allDay: !e.start?.dateTime || e.isAllDay === true,
      start: e.start?.dateTime
        ? e.start.timeZone === "UTC" &&
          !/Z$|[+-]\d\d:\d\d$/.test(e.start.dateTime)
          ? e.start.dateTime + "Z"
          : e.start.dateTime
        : e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      url: e.htmlLink || e.webLink,
    }));
};
export const writeCalendarEvent = (
  provider,
  token,
  calendar,
  event,
  transactionId,
  request = fetch,
) => {
  const body =
    provider === "google"
      ? {
          id: transactionId.replaceAll("-", ""),
          summary: event.title,
          description: event.details,
          start: { dateTime: event.start.toISOString() },
          end: { dateTime: event.end.toISOString() },
        }
      : {
          subject: event.title,
          body: { contentType: "text", content: event.details },
          start: {
            dateTime: event.start.toISOString().slice(0, -1),
            timeZone: "UTC",
          },
          end: {
            dateTime: event.end.toISOString().slice(0, -1),
            timeZone: "UTC",
          },
          transactionId,
        };
  return api(
    provider,
    token,
    `/calendars/${encodeURIComponent(calendar)}/events`,
    { method: "POST", body: JSON.stringify(body) },
    request,
  );
};
let googleLoad;
export const loadGoogleIdentity = () => {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!googleLoad)
    googleLoad = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        googleLoad = null;
        script.remove();
        reject(new Error("Google sign-in could not load."));
      };
      document.head.appendChild(script);
    });
  return googleLoad;
};
export const connectGoogle = (clientId) =>
  new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google sign-in is loading. Try again."));
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope:
        "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly",
      callback: (r) =>
        r.access_token
          ? resolve(r.access_token)
          : reject(new Error("Calendar consent was not granted.")),
      error_callback: () =>
        reject(new Error("Sign-in was closed or blocked. Try again.")),
    });
    client.requestAccessToken();
  });
const base64 = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
export const connectOutlook = async (clientId) => {
  const popup = window.open(
    "about:blank",
    "world-focus-calendar",
    "width=520,height=700",
  );
  if (!popup) throw new Error("Allow the sign-in window and try again.");
  const state = crypto.randomUUID();
  const verifier = base64(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = base64(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  const redirect = new URL("/calendar-callback.html", location.origin).href;
  storage.setItem("calendar-oauth-state", state);
  return new Promise((resolve, reject) => {
    const finish = (error) => {
      clearInterval(watch);
      clearTimeout(timeout);
      window.removeEventListener("message", receive);
      storage.removeItem("calendar-oauth-state");
      if (error) reject(error);
    };
    const receive = async (event) => {
      if (
        event.origin !== location.origin ||
        event.source !== popup ||
        event.data?.type !== "calendar-oauth"
      )
        return;
      if (
        event.data.state !== state ||
        storage.getItem("calendar-oauth-state") !== state
      ) {
        finish(new Error("Sign-in state mismatch."));
        return;
      }
      finish();
      try {
        if (!event.data.code)
          throw new Error("Calendar consent was not granted.");
        const response = await fetch(
          "https://login.microsoftonline.com/common/oauth2/v2.0/token",
          {
            method: "POST",
            body: new URLSearchParams({
              client_id: clientId,
              grant_type: "authorization_code",
              code: event.data.code,
              redirect_uri: redirect,
              code_verifier: verifier,
            }),
            signal: AbortSignal.timeout(15000),
          },
        );
        const data = await response.json();
        if (!response.ok || !data.access_token)
          throw new Error(
            "Microsoft sign-in failed. Check the app configuration.",
          );
        resolve(data.access_token);
      } catch (error) {
        reject(error);
      }
    };
    window.addEventListener("message", receive);
    const watch = setInterval(() => {
      if (popup.closed) finish(new Error("Sign-in window closed."));
    }, 500);
    const timeout = setTimeout(() => {
      popup.close();
      finish(new Error("Sign-in timed out."));
    }, 120000);
    popup.location.href =
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" +
      new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirect,
        response_mode: "query",
        scope: "Calendars.ReadWrite",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
      });
  });
};
