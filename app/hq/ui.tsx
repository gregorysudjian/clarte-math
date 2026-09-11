"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { Booking, Client, HqData, Note, Session } from "./data";
import { label } from "./format";
import type { Result } from "./actions";

export type Panel =
  | { kind: "request"; item: Booking }
  | { kind: "client"; item?: Client }
  | { kind: "lesson"; item?: Session; clientId?: number; startsAt?: string }
  | { kind: "payment"; item: Session }
  | { kind: "note"; item?: Note; clientId?: number }
  | { kind: "email"; to: string; subject: string; message: string; requestId?: number; clientId?: number; back: Panel };

type Hq = { data: HqData; open: (panel: Panel) => void; close: () => void; notify: (result: Result) => void };

export const HqContext = createContext<Hq | null>(null);
export function useHq() {
  const value = useContext(HqContext);
  if (!value) throw new Error("useHq must be used inside the HQ workspace");
  return value;
}

export type RecordState = "current" | "archived" | "deleted";
export const stateOf = (row: { deleted_at: string | null; archived_at?: string | null; status?: string }, isClient = false): RecordState =>
  row.deleted_at ? "deleted" : (isClient ? row.status === "archived" : row.archived_at) ? "archived" : "current";

export const matches = (query: string, ...fields: (string | null | undefined)[]) =>
  !query || fields.some((field) => String(field || "").toLowerCase().includes(query.toLowerCase()));

export const activeClients = (clients: Client[]) => clients.filter((c) => !c.deleted_at && c.status !== "archived");

export function Person({ name, sub }: { name: string; sub?: ReactNode }) {
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="hq-person">
      <span className="hq-avatar" aria-hidden="true">{initials}</span>
      <div><b>{name}</b>{sub && <small>{sub}</small>}</div>
    </div>
  );
}

export function Badge({ value }: { value: string }) {
  return <span className={`hq-badge hq-badge-${value}`}>{label(value)}</span>;
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="hq-empty">
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Table({ headers, rows, empty }: { headers: string[]; rows: ReactNode[]; empty: string }) {
  return (
    <div className="hq-table">
      <table>
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      {rows.length === 0 && <Empty text={empty} />}
    </div>
  );
}

/** A clickable, keyboard-accessible table row. */
export function Row({ onOpen, children }: { onOpen: () => void; children: ReactNode }) {
  return (
    <tr tabIndex={0} onClick={onOpen} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}>
      {children}
    </tr>
  );
}

export function Toolbar({
  query, setQuery, status, setStatus, statuses, view, setView, counts,
}: {
  query: string; setQuery: (v: string) => void;
  status: string; setStatus: (v: string) => void; statuses: string[];
  view?: RecordState; setView?: (v: RecordState) => void; counts?: Record<RecordState, number>;
}) {
  return (
    <div className="hq-toolbar">
      <input className="hq-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" aria-label="Search" />
      {statuses.length > 0 && (
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
      )}
      {view && setView && counts && (
        <div className="hq-segment" role="group" aria-label="Records">
          {(["current", "archived", "deleted"] as const).map((v) => (
            <button key={v} type="button" className={view === v ? "active" : ""} aria-pressed={view === v} onClick={() => { setView(v); setStatus("all"); }}>
              {label(v)} <span>{counts[v]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Field({ label: text, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={wide ? "hq-field hq-wide" : "hq-field"}>
      <span>{text}</span>
      {children}
    </label>
  );
}

export function Options({ values }: { values: string[] }) {
  return <>{values.map((v) => <option key={v} value={v}>{label(v)}</option>)}</>;
}

export function Money({ name, defaultValue, placeholder }: { name: string; defaultValue?: string; placeholder?: string }) {
  return (
    <span className="hq-money">
      <input type="number" min="0" step="0.01" inputMode="decimal" name={name} defaultValue={defaultValue} placeholder={placeholder} />
      <i>$</i>
    </span>
  );
}

export function Submit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return <button className="hq-primary" disabled={pending}>{pending ? "Working…" : children}</button>;
}
