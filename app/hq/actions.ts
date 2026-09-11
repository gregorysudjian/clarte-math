"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, passwordConfigured } from "../../lib/auth";
import { sendEmail } from "../../lib/email";
import { insert, isReadOnlyError, readAll, transaction, update, remove, type TableName } from "../../lib/store";
import { formatDate, montrealToIso, toCents } from "./format";
import { endSession, isSignedIn, startSession } from "./session";

export type Result = { ok: boolean; message: string };
export type RecordKind = "booking" | "client" | "session" | "note";
export type RecordOp = "archive" | "unarchive" | "delete" | "restore" | "purge";

/** A user-facing validation problem (as opposed to an unexpected failure). */
class Invalid extends Error {}

const TABLES: Record<RecordKind, TableName> = { booking: "bookings", client: "clients", session: "lessons", note: "notes" };
const REQUEST_STATUS = ["new", "contacted", "scheduled", "closed"];
const CLIENT_STATUS = ["lead", "active", "paused", "archived"];
const LESSON_STATUS = ["scheduled", "completed", "cancelled", "no_show"];
const NOTE_TYPES = ["general", "lesson", "progress", "email", "phone", "payment"];
const PAY_METHODS = ["cash", "e_transfer", "card", "cheque", "other"];

const text = (form: FormData, name: string, max = 10000) => String(form.get(name) ?? "").trim().slice(0, max);
const optional = (form: FormData, name: string, max = 300) => text(form, name, max) || null;
const numberField = (form: FormData, name = "id") => Number(text(form, name, 20)) || 0;
const pick = (value: string, allowed: string[], fallback: string) => (allowed.includes(value) ? value : fallback);
const now = () => new Date().toISOString();

/** Verifies the owner, runs the change, refreshes the HQ, and reports a message. */
async function run(work: () => Promise<string>): Promise<Result> {
  if (!(await isSignedIn())) redirect("/hq/login");
  try {
    const message = await work();
    revalidatePath("/hq", "layout");
    return { ok: true, message };
  } catch (error) {
    if (error instanceof Invalid) return { ok: false, message: error.message };
    console.error("[hq/action]", error);
    if (isReadOnlyError(error)) return { ok: false, message: "This server can't save files. Run the site on a computer or server with a disk." };
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

// ---------- Auth ----------

const attempts = new Map<string, { count: number; since: number }>();

function tooManyAttempts(ip: string) {
  const entry = attempts.get(ip);
  if (!entry || Date.now() - entry.since > 15 * 60_000) {
    attempts.set(ip, { count: 1, since: Date.now() });
    return false;
  }
  return ++entry.count > 8;
}

export async function login(form: FormData) {
  const fail = (message: string): never => redirect(`/hq/login?error=${encodeURIComponent(message)}`);
  if (!passwordConfigured()) fail("The dashboard password isn't set. Add HQ_PASSWORD to the environment.");

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (tooManyAttempts(ip)) fail("Too many attempts. Try again in 15 minutes.");
  if (!checkPassword(text(form, "password", 200))) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    fail("Incorrect password.");
  }
  attempts.delete(ip);
  await startSession();
  redirect("/hq");
}

export async function logout() {
  await endSession();
  redirect("/hq/login");
}

// ---------- Records ----------

export async function saveClient(form: FormData) {
  return run(async () => {
    const full_name = text(form, "full_name", 300);
    if (!full_name) throw new Invalid("Add the client's name.");
    const id = numberField(form);
    const values = {
      full_name,
      guardian_name: optional(form, "guardian_name"),
      email: optional(form, "email"),
      phone: optional(form, "phone", 100),
      grade: optional(form, "grade", 100),
      preferred_language: pick(text(form, "preferred_language", 5), ["en", "fr"], "en"),
      status: pick(text(form, "status", 20), CLIENT_STATUS, "active"),
      hourly_rate_cents: toCents(text(form, "hourly_rate")),
      notes: optional(form, "notes", 10000),
    };
    if (id) {
      await update("clients", id, values);
      return "Client saved.";
    }
    await insert("clients", { ...values, deleted_at: null });
    return "Client added.";
  });
}

function paymentFields(form: FormData, amount_due_cents: number) {
  const amount_paid_cents = toCents(text(form, "amount_paid"));
  const payment_status = form.get("waived") || amount_due_cents === 0
    ? "waived"
    : amount_paid_cents >= amount_due_cents
      ? "paid"
      : amount_paid_cents > 0
        ? "partial"
        : "unpaid";
  return { amount_due_cents, amount_paid_cents, payment_status, payment_method: pick(text(form, "payment_method", 20), PAY_METHODS, "") || null };
}

/** Keeps the original payment date when a paid lesson is edited again. */
async function paidAt(id: number, amountPaid: number) {
  if (amountPaid <= 0) return null;
  const existing = id ? (await readAll()).lessons.find((l) => l.id === id)?.paid_at : null;
  return existing || now();
}

export async function saveLesson(form: FormData) {
  return run(async () => {
    const id = numberField(form);
    const client_id = numberField(form, "client_id");
    const starts_at = montrealToIso(text(form, "starts_at", 20));
    if (!client_id || !starts_at) throw new Invalid("Choose a client, date, and time.");
    const duration_minutes = Math.min(480, Math.max(15, Number(text(form, "duration_minutes")) || 60));

    // A blank price on a new lesson is filled from the client's hourly rate.
    let amountDue = toCents(text(form, "amount_due"));
    if (!id && text(form, "amount_due") === "") {
      const rate = (await readAll()).clients.find((c) => c.id === client_id)?.hourly_rate_cents || 0;
      amountDue = Math.round((rate * duration_minutes) / 60);
    }
    const payment = paymentFields(form, amountDue);
    const values = {
      client_id,
      starts_at,
      duration_minutes,
      lesson_format: pick(text(form, "lesson_format", 20), ["online", "in_person"], "online"),
      location_or_link: optional(form, "location_or_link", 1000),
      subject: optional(form, "subject"),
      status: pick(text(form, "status", 20), LESSON_STATUS, "scheduled"),
      ...payment,
      paid_at: await paidAt(id, payment.amount_paid_cents),
      notes: optional(form, "notes", 10000),
    };
    if (id) {
      await update("lessons", id, values);
      return "Lesson saved.";
    }
    await insert("lessons", { ...values, archived_at: null, deleted_at: null });
    return "Lesson scheduled.";
  });
}

export async function savePayment(form: FormData) {
  return run(async () => {
    const id = numberField(form);
    if (!id) throw new Invalid("Could not find that lesson.");
    const payment = paymentFields(form, toCents(text(form, "amount_due")));
    await update("lessons", id, { ...payment, paid_at: await paidAt(id, payment.amount_paid_cents) });
    return "Payment saved.";
  });
}

export async function saveNote(form: FormData) {
  return run(async () => {
    const id = numberField(form);
    const client_id = numberField(form, "client_id");
    const body = text(form, "body");
    if (!client_id || !body) throw new Invalid("Choose a client and write the note.");
    const values = {
      client_id,
      title: optional(form, "title"),
      body,
      note_type: pick(text(form, "note_type", 20), NOTE_TYPES, "general"),
      follow_up_at: montrealToIso(text(form, "follow_up_at", 20)),
    };
    if (id) {
      await update("notes", id, values);
      return "Note saved.";
    }
    await insert("notes", values);
    return "Note added.";
  });
}

export async function saveRequest(form: FormData) {
  return run(async () => {
    const id = numberField(form);
    if (!id) throw new Invalid("Could not find that request.");
    await update("bookings", id, { status: pick(text(form, "status", 20), REQUEST_STATUS, "new"), admin_notes: optional(form, "admin_notes", 10000) });
    return "Request saved.";
  });
}

export async function convertRequest(rawId: number) {
  return run(() =>
    transaction((db) => {
      const request = db.bookings.find((b) => b.id === Number(rawId));
      if (!request) throw new Invalid("Could not find that request.");
      if (request.client_id) throw new Invalid("This request is already linked to a client.");
      const at = now();
      const client = {
        id: ++db.seq.clients, created_at: at, updated_at: at,
        full_name: request.name, guardian_name: null, email: request.email, phone: request.phone, grade: request.grade,
        preferred_language: request.language === "fr" ? "fr" : "en", status: "active", hourly_rate_cents: 0, notes: request.learning_goals, deleted_at: null,
      };
      db.clients.push(client);
      Object.assign(request, { client_id: client.id, status: "scheduled", updated_at: at });
      return "Client created from the request.";
    }),
  );
}

export async function changeRecord(op: RecordOp, kind: RecordKind, rawId: number) {
  return run(async () => {
    const id = Number(rawId);
    if (!Object.hasOwn(TABLES, kind) || !id) throw new Invalid("Could not find that record.");
    const table = TABLES[kind];
    const isClient = kind === "client";

    switch (op) {
      case "archive":
        await update(table, id, isClient ? { status: "archived", deleted_at: null } : { archived_at: now(), deleted_at: null });
        return "Archived.";
      case "unarchive":
        await update(table, id, isClient ? { status: "active" } : { archived_at: null });
        return "Moved back to current.";
      case "delete":
        if (kind === "note") {
          await remove("notes", (n) => n.id === id);
          return "Note deleted.";
        }
        await update(table, id, isClient ? { deleted_at: now() } : { deleted_at: now(), archived_at: null });
        return "Moved to Deleted.";
      case "restore":
        await update(table, id, isClient ? { deleted_at: null, status: "active" } : { deleted_at: null, archived_at: null });
        return "Restored.";
      case "purge":
        await transaction((db) => {
          if (isClient) {
            db.notes = db.notes.filter((n) => n.client_id !== id);
            db.lessons = db.lessons.filter((l) => l.client_id !== id);
            for (const b of db.bookings) if (b.client_id === id) b.client_id = null;
          }
          (db as unknown as Record<TableName, { id: number }[]>)[table] = (db[table] as { id: number }[]).filter((r) => r.id !== id);
        });
        return "Permanently deleted.";
      default:
        throw new Invalid("Unknown action.");
    }
  });
}

// ---------- Email ----------

export async function sendMessage(form: FormData) {
  return run(async () => {
    const to = text(form, "to", 300);
    const subject = text(form, "subject", 300);
    const message = text(form, "message");
    if (!/^\S+@\S+\.\S+$/.test(to) || !subject || !message) throw new Invalid("Add a recipient, subject, and message.");

    try {
      await sendEmail({ to, subject, text: message });
    } catch (error) {
      console.error("[hq/email]", error);
      throw new Invalid("The email could not be sent. Add GMAIL_USER and GMAIL_APP_PASSWORD to the environment.");
    }

    const requestId = numberField(form, "request_id");
    const clientId = numberField(form, "client_id");
    if (requestId) {
      const request = (await readAll()).bookings.find((b) => b.id === requestId);
      await update("bookings", requestId, {
        status: !request || request.status === "new" ? "contacted" : request.status,
        admin_notes: [request?.admin_notes, `Email sent ${formatDate(now())}: ${subject}`].filter(Boolean).join("\n"),
      });
    }
    if (clientId) await insert("notes", { client_id: clientId, title: subject, body: message, note_type: "email", follow_up_at: null });
    return clientId ? "Email sent and saved to the client's notes." : "Email sent.";
  });
}
