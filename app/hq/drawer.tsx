"use client";

import { useEffect, useTransition, type ReactNode } from "react";
import { changeRecord, convertRequest, saveClient, saveLesson, saveNote, savePayment, saveRequest, sendMessage, type RecordKind, type RecordOp, type Result } from "./actions";
import type { Booking, Client, Note, Session } from "./data";
import { dollars, formatDate, label, localInput, money, phone } from "./format";
import { Badge, Field, Money, Options, Submit, activeClients, stateOf, useHq, type Panel, type RecordState } from "./ui";

const GRADES = [...Array.from({ length: 6 }, (_, i) => `Grade ${i + 1}`), ...Array.from({ length: 5 }, (_, i) => `Secondary ${i + 1}`), "CEGEP 1", "CEGEP 2"];
const SIGNATURE = "Best,\nGregory\nClarté Math";

const TITLES: Record<Panel["kind"], [string, string]> = {
  request: ["Request", "Request"],
  client: ["New client", "Client"],
  lesson: ["New lesson", "Lesson"],
  payment: ["Payment", "Payment"],
  note: ["New note", "Note"],
  email: ["Email", "Email"],
};

export function Drawer({ panel }: { panel: Panel }) {
  const { close } = useHq();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  const existing = "item" in panel && panel.item;
  return (
    <div className="hq-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <aside className="hq-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header>
          <h2 id="drawer-title">{TITLES[panel.kind][existing ? 1 : 0]}</h2>
          <button className="hq-close" onClick={close} aria-label="Close">×</button>
        </header>
        {panel.kind === "request" && <RequestPanel item={panel.item} />}
        {panel.kind === "client" && <ClientPanel item={panel.item} />}
        {panel.kind === "lesson" && <LessonPanel item={panel.item} clientId={panel.clientId} startsAt={panel.startsAt} />}
        {panel.kind === "payment" && <PaymentPanel item={panel.item} />}
        {panel.kind === "note" && <NotePanel item={panel.item} clientId={panel.clientId} />}
        {panel.kind === "email" && <EmailPanel panel={panel} />}
      </aside>
    </div>
  );
}

/** Wraps a server action so the drawer shows the result and closes on success. */
function useSubmit() {
  const { notify, close } = useHq();
  return (action: (form: FormData) => Promise<Result>) => async (form: FormData) => {
    const result = await action(form);
    notify(result);
    if (result.ok) close();
  };
}

function Info({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="hq-info">
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function RecordActions({ kind, id, state }: { kind: RecordKind; id: number; state: RecordState }) {
  const { notify, close } = useHq();
  const [pending, start] = useTransition();
  const act = (op: RecordOp, question?: string) => {
    if (question && !confirm(question)) return;
    start(async () => {
      const result = await changeRecord(op, kind, id);
      notify(result);
      if (result.ok) close();
    });
  };

  if (kind === "note") {
    return <div className="hq-record-actions"><button type="button" className="hq-danger" disabled={pending} onClick={() => act("delete", "Delete this note? This cannot be undone.")}>Delete note</button></div>;
  }
  return (
    <div className="hq-record-actions">
      {state === "deleted" ? (
        <>
          <button type="button" className="hq-secondary" disabled={pending} onClick={() => act("restore")}>Restore</button>
          <button type="button" className="hq-danger" disabled={pending} onClick={() => act("purge", kind === "client" ? "Permanently delete this client with all their lessons and notes?" : "Permanently delete this record?")}>Delete forever</button>
        </>
      ) : (
        <>
          <button type="button" className="hq-secondary" disabled={pending} onClick={() => act(state === "archived" ? "unarchive" : "archive")}>{state === "archived" ? "Unarchive" : "Archive"}</button>
          <button type="button" className="hq-danger" disabled={pending} onClick={() => act("delete", "Move this to Deleted? You can restore it later.")}>Delete</button>
        </>
      )}
    </div>
  );
}

// ---------- Request ----------

function RequestPanel({ item }: { item: Booking }) {
  const { data, open, notify, close } = useHq();
  const submit = useSubmit();
  const [converting, start] = useTransition();
  const client = data.clients.find((c) => c.id === item.client_id);
  const state = stateOf(item);

  return (
    <>
      <Info
        rows={[
          ["From", `${item.name} (${label(item.requester)})`],
          ["Contact", <>{item.email}<br />{item.phone}</>],
          ["Student", `${item.grade} · ${item.subject}`],
          ["Preference", `${item.lesson_format} · ${item.preferred_time}`],
          ["Language", item.language === "fr" ? "French" : "English"],
          ["Received", formatDate(item.created_at)],
          ["Message", item.learning_goals],
        ]}
      />
      <form className="hq-form" action={submit(saveRequest)}>
        <input type="hidden" name="id" value={item.id} />
        <Field label="Status">
          <select name="status" defaultValue={item.status}><Options values={["new", "contacted", "scheduled", "closed"]} /></select>
        </Field>
        <Field label="Private notes" wide>
          <textarea name="admin_notes" rows={4} defaultValue={item.admin_notes || ""} />
        </Field>
        <div className="hq-form-actions">
          <Submit>Save</Submit>
          <button type="button" className="hq-secondary" onClick={() => open({ kind: "email", to: item.email, subject: `Math tutoring for ${item.name}`, message: `Hello ${item.name},\n\nThank you for your tutoring request.\n\n\n${SIGNATURE}`, requestId: item.id, back: { kind: "request", item } })}>Email</button>
          {client ? (
            <button type="button" className="hq-secondary" onClick={() => open({ kind: "client", item: client })}>Open client</button>
          ) : (
            <button type="button" className="hq-secondary" disabled={converting} onClick={() => start(async () => { const r = await convertRequest(item.id); notify(r); if (r.ok) close(); })}>Make client</button>
          )}
        </div>
      </form>
      <RecordActions kind="booking" id={item.id} state={state} />
    </>
  );
}

// ---------- Client ----------

function ClientPanel({ item }: { item?: Client }) {
  const { data, open } = useHq();
  const submit = useSubmit();
  const lessons = item ? data.sessions.filter((s) => s.client_id === item.id && !s.deleted_at) : [];
  const notes = item ? data.notes.filter((n) => n.client_id === item.id) : [];
  const owed = lessons.reduce((n, s) => n + (s.payment_status === "waived" ? 0 : Math.max(0, s.amount_due_cents - s.amount_paid_cents)), 0);

  return (
    <>
      {item && (
        <div className="hq-quick">
          <button className="hq-secondary" onClick={() => open({ kind: "lesson", clientId: item.id })}>+ Lesson</button>
          <button className="hq-secondary" onClick={() => open({ kind: "note", clientId: item.id })}>+ Note</button>
          {item.email && (
            <button className="hq-secondary" onClick={() => open({ kind: "email", to: item.email!, subject: "Math tutoring", message: `Hello ${item.guardian_name || item.full_name},\n\n\n${SIGNATURE}`, clientId: item.id, back: { kind: "client", item } })}>Email</button>
          )}
          <span>{lessons.length} lessons · {money(owed)} owed</span>
        </div>
      )}
      <form className="hq-form" action={submit(saveClient)}>
        {item && <input type="hidden" name="id" value={item.id} />}
        <Field label="Student name"><input name="full_name" required autoFocus={!item} defaultValue={item?.full_name} /></Field>
        <Field label="Parent / guardian"><input name="guardian_name" defaultValue={item?.guardian_name || ""} /></Field>
        <Field label="Email"><input type="email" name="email" defaultValue={item?.email || ""} /></Field>
        <Field label="Phone"><input name="phone" inputMode="tel" defaultValue={phone(item?.phone || "")} onInput={(e) => (e.currentTarget.value = phone(e.currentTarget.value))} /></Field>
        <Field label="Grade">
          <select name="grade" defaultValue={item?.grade || ""}>
            <option value="">—</option>
            {item?.grade && !GRADES.includes(item.grade) && <option>{item.grade}</option>}
            {GRADES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Hourly rate"><Money name="hourly_rate" defaultValue={dollars(item?.hourly_rate_cents)} /></Field>
        <Field label="Language">
          <select name="preferred_language" defaultValue={item?.preferred_language || "en"}><option value="en">English</option><option value="fr">French</option></select>
        </Field>
        {item?.status === "archived" ? (
          <input type="hidden" name="status" value="archived" />
        ) : (
          <Field label="Status"><select name="status" defaultValue={item?.status || "active"}><Options values={["lead", "active", "paused"]} /></select></Field>
        )}
        <Field label="Notes" wide><textarea name="notes" rows={3} defaultValue={item?.notes || ""} /></Field>
        <div className="hq-form-actions"><Submit>{item ? "Save" : "Add client"}</Submit></div>
      </form>

      {item && (lessons.length > 0 || notes.length > 0) && (
        <div className="hq-history">
          {lessons.length > 0 && <h3>Recent lessons</h3>}
          {lessons.slice(0, 5).map((s) => (
            <button key={s.id} onClick={() => open({ kind: "lesson", item: s })}>
              <span>{formatDate(s.starts_at)}</span>
              <Badge value={s.status} />
              <Badge value={s.payment_status} />
            </button>
          ))}
          {notes.length > 0 && <h3>Recent notes</h3>}
          {notes.slice(0, 5).map((n) => (
            <button key={n.id} onClick={() => open({ kind: "note", item: n })}>
              <span>{n.title || n.body.slice(0, 60)}</span>
              <Badge value={n.note_type} />
            </button>
          ))}
        </div>
      )}
      {item && <RecordActions kind="client" id={item.id} state={stateOf(item, true)} />}
    </>
  );
}

// ---------- Lesson & payment ----------

function PaymentFields({ item, isNew }: { item?: Session; isNew?: boolean }) {
  return (
    <>
      <Field label="Price"><Money name="amount_due" defaultValue={item ? dollars(item.amount_due_cents) || "0.00" : ""} placeholder={isNew ? "Client's rate" : undefined} /></Field>
      <Field label="Paid"><Money name="amount_paid" defaultValue={dollars(item?.amount_paid_cents)} /></Field>
      <Field label="Payment method">
        <select name="payment_method" defaultValue={item?.payment_method || ""}><option value="">—</option><Options values={["e_transfer", "cash", "card", "cheque", "other"]} /></select>
      </Field>
      <label className="hq-check"><input type="checkbox" name="waived" defaultChecked={item?.payment_status === "waived" && item.amount_due_cents > 0} /> Waive payment</label>
    </>
  );
}

function LessonPanel({ item, clientId, startsAt }: { item?: Session; clientId?: number; startsAt?: string }) {
  const { data } = useHq();
  const submit = useSubmit();
  const clients = activeClients(data.clients);
  if (!clients.length && !item) return <p className="hq-muted">Add a client first, then schedule their lessons.</p>;

  return (
    <>
      <form className="hq-form" action={submit(saveLesson)}>
        {item && <input type="hidden" name="id" value={item.id} />}
        <Field label="Client" wide>
          <select name="client_id" required defaultValue={item?.client_id || clientId || ""}>
            <option value="" disabled>Choose a client</option>
            {item && !clients.some((c) => c.id === item.client_id) && <option value={item.client_id}>{item.clients?.full_name}</option>}
            {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </Field>
        <Field label="Date & time"><input type="datetime-local" name="starts_at" step={900} required defaultValue={item ? localInput(item.starts_at) : startsAt || ""} /></Field>
        <Field label="Length (min)"><input type="number" name="duration_minutes" min={15} max={480} step={15} defaultValue={item?.duration_minutes || 60} /></Field>
        <Field label="Format"><select name="lesson_format" defaultValue={item?.lesson_format || "online"}><Options values={["online", "in_person"]} /></select></Field>
        <Field label="Status"><select name="status" defaultValue={item?.status || "scheduled"}><Options values={["scheduled", "completed", "cancelled", "no_show"]} /></select></Field>
        <Field label="Subject"><input name="subject" placeholder="Mathematics" defaultValue={item?.subject || ""} /></Field>
        <Field label="Location or link"><input name="location_or_link" defaultValue={item?.location_or_link || ""} /></Field>
        <PaymentFields item={item} isNew={!item} />
        <Field label="Lesson notes" wide><textarea name="notes" rows={3} defaultValue={item?.notes || ""} /></Field>
        <div className="hq-form-actions"><Submit>{item ? "Save" : "Schedule"}</Submit></div>
      </form>
      {item && <RecordActions kind="session" id={item.id} state={stateOf(item)} />}
    </>
  );
}

function PaymentPanel({ item }: { item: Session }) {
  const { open } = useHq();
  const submit = useSubmit();
  return (
    <>
      <Info rows={[["Client", item.clients?.full_name], ["Lesson", `${formatDate(item.starts_at)} · ${item.duration_minutes} min`], ["Paid on", item.paid_at && formatDate(item.paid_at, false)]]} />
      <form className="hq-form" action={submit(savePayment)}>
        <input type="hidden" name="id" value={item.id} />
        <PaymentFields item={item} />
        <div className="hq-form-actions">
          <Submit>Save payment</Submit>
          <button type="button" className="hq-secondary" onClick={() => open({ kind: "lesson", item })}>Open lesson</button>
        </div>
      </form>
    </>
  );
}

// ---------- Note ----------

function NotePanel({ item, clientId }: { item?: Note; clientId?: number }) {
  const { data } = useHq();
  const submit = useSubmit();
  const clients = activeClients(data.clients);
  if (!clients.length && !item) return <p className="hq-muted">Add a client first, then keep notes on them.</p>;

  return (
    <>
      <form className="hq-form" action={submit(saveNote)}>
        {item && <input type="hidden" name="id" value={item.id} />}
        <Field label="Client">
          <select name="client_id" required defaultValue={item?.client_id || clientId || ""}>
            <option value="" disabled>Choose a client</option>
            {item && !clients.some((c) => c.id === item.client_id) && <option value={item.client_id}>{item.clients?.full_name}</option>}
            {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </Field>
        <Field label="Type"><select name="note_type" defaultValue={item?.note_type || "general"}><Options values={["general", "lesson", "progress", "email", "phone", "payment"]} /></select></Field>
        <Field label="Title" wide><input name="title" defaultValue={item?.title || ""} /></Field>
        <Field label="Note" wide><textarea name="body" rows={6} required autoFocus={!item} defaultValue={item?.body || ""} /></Field>
        <Field label="Follow-up reminder (optional)" wide><input type="datetime-local" name="follow_up_at" defaultValue={item?.follow_up_at ? localInput(item.follow_up_at) : ""} /></Field>
        <div className="hq-form-actions"><Submit>{item ? "Save" : "Add note"}</Submit></div>
      </form>
      {item && <RecordActions kind="note" id={item.id} state="current" />}
    </>
  );
}

// ---------- Email ----------

function EmailPanel({ panel }: { panel: Extract<Panel, { kind: "email" }> }) {
  const { open } = useHq();
  const submit = useSubmit();
  return (
    <form className="hq-form" action={submit(sendMessage)}>
      {panel.requestId && <input type="hidden" name="request_id" value={panel.requestId} />}
      {panel.clientId && <input type="hidden" name="client_id" value={panel.clientId} />}
      <Field label="To" wide><input type="email" name="to" required defaultValue={panel.to} /></Field>
      <Field label="Subject" wide><input name="subject" required defaultValue={panel.subject} /></Field>
      <Field label="Message" wide><textarea name="message" rows={12} required defaultValue={panel.message} /></Field>
      <div className="hq-form-actions">
        <Submit>Send</Submit>
        <button type="button" className="hq-secondary" onClick={() => open(panel.back)}>Back</button>
      </div>
    </form>
  );
}
