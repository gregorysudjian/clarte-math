"use client";

import { useMemo, useState } from "react";
import { Icon, type IconName } from "../components/icons";
import type { Session } from "./data";
import { dayKey, formatDate, formatTime, label, money } from "./format";
import { Badge, Empty, Person, Row, Table, Toolbar, activeClients, matches, stateOf, useHq, type RecordState } from "./ui";

const balance = (s: Session) => Math.max(0, s.amount_due_cents - s.amount_paid_cents);
const live = (s: Session) => !s.deleted_at && !s.archived_at;

function useFilters() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<RecordState>("current");
  return { query, setQuery, status, setStatus, view, setView };
}

function countStates<T>(rows: T[], state: (row: T) => RecordState) {
  const counts = { current: 0, archived: 0, deleted: 0 };
  for (const row of rows) counts[state(row)]++;
  return counts;
}

// ---------- Overview ----------

export function Overview() {
  const { data, open } = useHq();
  const [now] = useState(() => Date.now());
  const sessions = data.sessions.filter(live);
  const newRequests = data.bookings.filter((b) => b.status === "new" && stateOf(b) === "current");
  const upcoming = sessions.filter((s) => s.status === "scheduled" && +new Date(s.starts_at) >= now).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const weekEnd = now + 7 * 864e5;
  const thisMonth = dayKey(now).slice(0, 7);
  const collected = sessions.filter((s) => s.paid_at && dayKey(s.paid_at).startsWith(thisMonth)).reduce((n, s) => n + s.amount_paid_cents, 0);
  const unpaid = sessions.filter((s) => s.status === "completed" && balance(s) > 0 && s.payment_status !== "waived");
  const followUps = data.notes.filter((n) => n.follow_up_at && +new Date(n.follow_up_at) <= now + 864e5);

  const stats: [string, string | number, IconName][] = [
    ["New requests", newRequests.length, "inbox"],
    ["Lessons next 7 days", upcoming.filter((s) => +new Date(s.starts_at) < weekEnd).length, "calendar"],
    ["Active clients", data.clients.filter((c) => c.status === "active" && !c.deleted_at).length, "users"],
    ["Outstanding", money(unpaid.reduce((n, s) => n + balance(s), 0)), "clock"],
    ["Collected this month", money(collected), "wallet"],
  ];

  const attention = [
    ...newRequests.map((b) => ({ key: `r${b.id}`, tag: "new", title: b.name, meta: `${b.grade} · ${formatDate(b.created_at, false)}`, onOpen: () => open({ kind: "request", item: b }) })),
    ...followUps.map((n) => ({ key: `n${n.id}`, tag: "follow_up", title: n.title || n.clients?.full_name || "Follow-up", meta: `${n.clients?.full_name ?? ""} · ${formatDate(n.follow_up_at!, false)}`, onOpen: () => open({ kind: "note", item: n }) })),
    ...unpaid.map((s) => ({ key: `p${s.id}`, tag: "unpaid", title: s.clients?.full_name || "Lesson", meta: `${money(balance(s))} · ${formatDate(s.starts_at, false)}`, onOpen: () => open({ kind: "payment", item: s }) })),
  ];

  return (
    <>
      <section className="hq-kpis">
        {stats.map(([name, value, icon]) => (
          <article key={name}>
            <i><Icon name={icon} /></i>
            <span>{name}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className="hq-overview">
        <article className="hq-card">
          <h2>Upcoming lessons</h2>
          {upcoming.length ? (
            <div className="hq-list">
              {upcoming.slice(0, 8).map((s) => (
                <button key={s.id} onClick={() => open({ kind: "lesson", item: s })}>
                  <time>{formatDate(s.starts_at)}</time>
                  <b>{s.clients?.full_name}</b>
                  <small>{s.duration_minutes} min · {label(s.lesson_format)}</small>
                </button>
              ))}
            </div>
          ) : (
            <Empty text="No lessons scheduled." action={<button className="hq-secondary" onClick={() => open({ kind: "lesson" })}>Schedule a lesson</button>} />
          )}
        </article>
        <article className="hq-card">
          <h2>Needs attention</h2>
          {attention.length ? (
            <div className="hq-list">
              {attention.slice(0, 10).map((item) => (
                <button key={item.key} onClick={item.onOpen}>
                  <Badge value={item.tag} />
                  <b>{item.title}</b>
                  <small>{item.meta}</small>
                </button>
              ))}
            </div>
          ) : (
            <Empty text="All caught up." />
          )}
        </article>
      </section>
    </>
  );
}

// ---------- Requests ----------

export function Requests() {
  const { data, open } = useHq();
  const f = useFilters();
  const rows = data.bookings.filter(
    (b) => stateOf(b) === f.view && (f.status === "all" || b.status === f.status) && matches(f.query, b.name, b.email, b.phone, b.grade, b.subject, b.admin_notes),
  );
  return (
    <>
      <Toolbar {...f} statuses={f.view === "current" ? ["new", "contacted", "scheduled", "closed"] : []} counts={countStates(data.bookings, (b) => stateOf(b))} />
      <Table
        headers={["Received", "Name", "Contact", "Grade", "Need", "Preference", "Status"]}
        empty="No requests here."
        rows={rows.map((b) => (
          <Row key={b.id} onOpen={() => open({ kind: "request", item: b })}>
            <td>{formatDate(b.created_at, false)}</td>
            <td><Person name={b.name} sub={label(b.requester)} /></td>
            <td>{b.email}<small>{b.phone}</small></td>
            <td>{b.grade}</td>
            <td>{b.subject}</td>
            <td>{b.lesson_format}<small>{b.preferred_time}</small></td>
            <td><Badge value={b.status} /></td>
          </Row>
        ))}
      />
    </>
  );
}

// ---------- Clients ----------

export function Clients() {
  const { data, open } = useHq();
  const f = useFilters();
  const rows = data.clients.filter(
    (c) => stateOf(c, true) === f.view && (f.status === "all" || c.status === f.status) && matches(f.query, c.full_name, c.guardian_name, c.email, c.phone, c.grade, c.notes),
  );
  return (
    <>
      <Toolbar {...f} statuses={f.view === "current" ? ["lead", "active", "paused"] : []} counts={countStates(data.clients, (c) => stateOf(c, true))} />
      <Table
        headers={["Client", "Contact", "Grade", "Rate", "Lessons", "Balance", "Status"]}
        empty="No clients here."
        rows={rows.map((c) => {
          const lessons = data.sessions.filter((s) => s.client_id === c.id && live(s));
          return (
            <Row key={c.id} onOpen={() => open({ kind: "client", item: c })}>
              <td><Person name={c.full_name} sub={c.guardian_name && `Parent: ${c.guardian_name}`} /></td>
              <td>{c.email || "—"}<small>{c.phone}</small></td>
              <td>{c.grade || "—"}</td>
              <td>{c.hourly_rate_cents ? `${money(c.hourly_rate_cents)}/h` : "—"}</td>
              <td>{lessons.length}</td>
              <td>{money(lessons.reduce((n, s) => n + (s.payment_status === "waived" ? 0 : balance(s)), 0))}</td>
              <td><Badge value={c.deleted_at ? "deleted" : c.status} /></td>
            </Row>
          );
        })}
      />
    </>
  );
}

// ---------- Lessons ----------

export function Lessons() {
  const [mode, setMode] = useState<"week" | "month" | "list">("week");
  return (
    <>
      <div className="hq-segment hq-mode" role="group" aria-label="Lesson view">
        {(["week", "month", "list"] as const).map((m) => (
          <button key={m} className={mode === m ? "active" : ""} aria-pressed={mode === m} onClick={() => setMode(m)}>{label(m)}</button>
        ))}
      </div>
      {mode === "list" ? <LessonList /> : <Calendar mode={mode} />}
    </>
  );
}

function LessonList() {
  const { data, open } = useHq();
  const f = useFilters();
  const rows = data.sessions.filter(
    (s) => stateOf(s) === f.view && (f.status === "all" || s.status === f.status) && matches(f.query, s.clients?.full_name, s.subject, s.location_or_link),
  );
  return (
    <>
      <Toolbar {...f} statuses={f.view === "current" ? ["scheduled", "completed", "cancelled", "no_show"] : []} counts={countStates(data.sessions, (s) => stateOf(s))} />
      <Table
        headers={["Date", "Client", "Subject", "Format", "Length", "Status", "Payment"]}
        empty="No lessons here."
        rows={rows.map((s) => (
          <Row key={s.id} onOpen={() => open({ kind: "lesson", item: s })}>
            <td>{formatDate(s.starts_at)}</td>
            <td><Person name={s.clients?.full_name || "Client"} /></td>
            <td>{s.subject || "Mathematics"}</td>
            <td>{label(s.lesson_format)}<small>{s.location_or_link}</small></td>
            <td>{s.duration_minutes} min</td>
            <td><Badge value={s.status} /></td>
            <td><Badge value={s.payment_status} /></td>
          </Row>
        ))}
      />
    </>
  );
}

const addDays = (key: string, days: number) => {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const weekday = (key: string) => (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
const fmtKey = (key: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-CA", { ...options, timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));

function Calendar({ mode }: { mode: "week" | "month" }) {
  const { data, open } = useHq();
  const [today] = useState(() => dayKey(Date.now()));
  const [cursor, setCursor] = useState(today);

  const days = useMemo(() => {
    if (mode === "week") {
      const start = addDays(cursor, -weekday(cursor));
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = `${cursor.slice(0, 7)}-01`;
    const start = addDays(first, -weekday(first));
    const weeks = Math.ceil((weekday(first) + new Date(Date.UTC(+cursor.slice(0, 4), +cursor.slice(5, 7), 0)).getUTCDate()) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  }, [mode, cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of data.sessions.filter(live).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))) {
      const key = dayKey(s.starts_at);
      map.set(key, [...(map.get(key) || []), s]);
    }
    return map;
  }, [data.sessions]);

  const shift = (direction: number) =>
    setCursor((key) => {
      if (mode === "week") return addDays(key, direction * 7);
      const d = new Date(`${key.slice(0, 7)}-15T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + direction);
      return d.toISOString().slice(0, 10);
    });

  const heading = mode === "month" ? fmtKey(cursor, { month: "long", year: "numeric" }) : `${fmtKey(days[0], { month: "short", day: "numeric" })} – ${fmtKey(days[6], { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <>
      <div className="hq-calendar-nav">
        <button onClick={() => shift(-1)} aria-label="Previous">‹</button>
        <strong>{heading}</strong>
        <button onClick={() => shift(1)} aria-label="Next">›</button>
        <button className="hq-secondary" onClick={() => setCursor(today)}>Today</button>
      </div>
      <div className={`hq-calendar hq-calendar-${mode}`}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="hq-calendar-weekday">{d}</div>)}
        {days.map((key) => (
          <section
            key={key}
            className={[key === today && "today", mode === "month" && key.slice(0, 7) !== cursor.slice(0, 7) && "muted"].filter(Boolean).join(" ")}
            onClick={() => open({ kind: "lesson", startsAt: `${key}T17:00` })}
            title="Add a lesson"
          >
            <header>{mode === "week" ? fmtKey(key, { weekday: "short", day: "numeric" }) : +key.slice(8)}</header>
            {(byDay.get(key) || []).map((s) => (
              <button key={s.id} className={`hq-event hq-event-${s.status}`} onClick={(e) => { e.stopPropagation(); open({ kind: "lesson", item: s }); }}>
                <time>{formatTime(s.starts_at)}</time>
                <b>{s.clients?.full_name}</b>
              </button>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}

// ---------- Payments ----------

export function Payments() {
  const { data, open } = useHq();
  const f = useFilters();
  const sessions = data.sessions.filter((s) => !s.deleted_at);
  const rows = sessions.filter((s) => (f.status === "all" || s.payment_status === f.status) && matches(f.query, s.clients?.full_name, s.subject, s.payment_method));
  const counted = sessions.filter((s) => s.payment_status !== "waived");
  const charged = counted.reduce((n, s) => n + s.amount_due_cents, 0);
  const paid = counted.reduce((n, s) => n + s.amount_paid_cents, 0);
  return (
    <>
      <section className="hq-kpis hq-kpis-3">
        <article><span>Charged</span><strong>{money(charged)}</strong></article>
        <article><span>Collected</span><strong>{money(paid)}</strong></article>
        <article><span>Outstanding</span><strong>{money(counted.reduce((n, s) => n + balance(s), 0))}</strong></article>
      </section>
      <Toolbar {...f} statuses={["unpaid", "partial", "paid", "waived"]} />
      <Table
        headers={["Lesson", "Client", "Charged", "Paid", "Balance", "Method", "Status"]}
        empty="No payments here."
        rows={rows.map((s) => (
          <Row key={s.id} onOpen={() => open({ kind: "payment", item: s })}>
            <td>{formatDate(s.starts_at, false)}</td>
            <td><Person name={s.clients?.full_name || "Client"} /></td>
            <td>{money(s.amount_due_cents)}</td>
            <td>{money(s.amount_paid_cents)}{s.paid_at && <small>{formatDate(s.paid_at, false)}</small>}</td>
            <td>{s.payment_status === "waived" ? "—" : money(balance(s))}</td>
            <td>{s.payment_method ? label(s.payment_method) : "—"}</td>
            <td><Badge value={s.payment_status} /></td>
          </Row>
        ))}
      />
    </>
  );
}

// ---------- Notes ----------

export function Notes() {
  const { data, open } = useHq();
  const f = useFilters();
  const rows = data.notes.filter((n) => (f.status === "all" || n.note_type === f.status) && matches(f.query, n.clients?.full_name, n.title, n.body));
  return (
    <>
      <Toolbar {...f} statuses={["general", "lesson", "progress", "email", "phone", "payment"]} />
      {rows.length ? (
        <div className="hq-notes">
          {rows.map((n) => (
            <button key={n.id} onClick={() => open({ kind: "note", item: n })}>
              <header>
                <Badge value={n.note_type} />
                <b>{n.clients?.full_name || "Client"}</b>
                <time>{formatDate(n.created_at, false)}</time>
                {n.follow_up_at && <em>Follow up {formatDate(n.follow_up_at, false)}</em>}
              </header>
              {n.title && <h3>{n.title}</h3>}
              <p>{n.body}</p>
            </button>
          ))}
        </div>
      ) : (
        <Empty text="No notes yet." action={activeClients(data.clients).length ? <button className="hq-secondary" onClick={() => open({ kind: "note" })}>Add a note</button> : undefined} />
      )}
    </>
  );
}
