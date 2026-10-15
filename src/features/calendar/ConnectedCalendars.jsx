import { useEffect, useRef, useState } from "react";
import { readJson, writeJson } from "../../lib/storage";
import {
  connectGoogle,
  connectOutlook,
  loadGoogleIdentity,
  readCalendars,
  readCalendarEvents,
  writeCalendarEvent,
} from "./calendarConnectors";
const Provider = ({ provider, createEvent }) => {
  const name = provider === "google" ? "Google" : "Outlook";
  const [clientId, setClientId] = useState(
    () =>
      readJson(`calendar-client:${provider}`, "") ||
      (provider === "google"
        ? import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID
        : import.meta.env.VITE_MICROSOFT_CALENDAR_CLIENT_ID) ||
      "",
  );
  const [token, setToken] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [selected, setSelected] = useState("");
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const transaction = useRef(null);
  useEffect(() => {
    if (provider === "google")
      loadGoogleIdentity().catch(() =>
        setStatus("Google sign-in unavailable. Try reopening this section."),
      );
  }, [provider]);
  const connect = async () => {
    setBusy(true);
    setStatus("");
    try {
      const next = await (provider === "google"
        ? connectGoogle(clientId)
        : connectOutlook(clientId));
      setToken(next);
      const list = await readCalendars(provider, next);
      setCalendars(list);
      setSelected(list[0]?.id || "");
      setStatus(
        list.length
          ? "Connected. Choose a calendar and refresh."
          : "No editable calendars found.",
      );
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    setBusy(true);
    try {
      setEvents(await readCalendarEvents(provider, token, selected));
      setStatus("Upcoming 7 days refreshed.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    try {
      transaction.current ||= { id: crypto.randomUUID(), event: createEvent() };
      await writeCalendarEvent(
        provider,
        token,
        selected,
        transaction.current.event,
        transaction.current.id,
      );
      transaction.current = null;
      setStatus("Focus block saved.");
      try {
        setEvents(await readCalendarEvents(provider, token, selected));
      } catch {
        setStatus(
          "Focus block saved. Refresh events when the connection returns.",
        );
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <fieldset className="connected-calendar">
      <legend>{name}</legend>
      {!token ? (
        <>
          {!clientId && (
            <p>
              This calendar connection is not configured yet. The calendar links
              and ICS export remain available.
            </p>
          )}
          <details>
            <summary>Application setup</summary>
            <label>
              Application client ID
              <input
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value.trim());
                  writeJson(
                    `calendar-client:${provider}`,
                    e.target.value.trim(),
                  );
                }}
                autoComplete="off"
              />
            </label>
          </details>
          <button disabled={!clientId || busy} onClick={connect}>
            Connect {name}
          </button>
        </>
      ) : (
        <>
          <label>
            Calendar
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setEvents([]);
                transaction.current = null;
              }}
            >
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button disabled={!selected || busy} onClick={refresh}>
            Refresh events
          </button>
          <button disabled={!selected || busy} onClick={save}>
            Save focus block
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setToken(null);
              setEvents([]);
              transaction.current = null;
              setStatus("Disconnected from this tab.");
            }}
          >
            Disconnect
          </button>
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                {event.allDay
                  ? new Date(event.start + "T00:00:00").toLocaleDateString()
                  : new Date(event.start).toLocaleString()}{" "}
                — {event.title}
              </li>
            ))}
          </ul>
        </>
      )}
      {status && <p role="status">{status}</p>}
    </fieldset>
  );
};
export default function ConnectedCalendars({ createEvent }) {
  const [hasOpened, setHasOpened] = useState(false);
  return (
    <details
      className="calendar-connections"
      onToggle={(event) => {
        if (event.currentTarget.open) setHasOpened(true);
      }}
    >
      <summary>Connect calendars</summary>
      <p>
        Read upcoming events and save focus blocks. Connection permissions are
        requested separately for each provider. Tokens stay in this tab.
      </p>
      {hasOpened && (
        <>
          <Provider provider="google" createEvent={createEvent} />
          <Provider provider="outlook" createEvent={createEvent} />
        </>
      )}
    </details>
  );
}
