import { promises as fs } from "node:fs";
import path from "node:path";

// The HQ keeps its records in one JSON file on the server's disk (no external
// database). Writes are serialized and atomic, and the previous version is kept
// as a .bak file.

export type Client = { id: number; created_at: string; updated_at: string; full_name: string; email: string | null; phone: string | null; guardian_name: string | null; grade: string | null; preferred_language: string; status: string; hourly_rate_cents: number; notes: string | null; deleted_at: string | null };
export type Booking = { id: number; created_at: string; updated_at: string; name: string; email: string; phone: string; requester: string; grade: string; subject: string; lesson_format: string; preferred_time: string; language: string; learning_goals: string; status: string; admin_notes: string | null; client_id: number | null; archived_at: string | null; deleted_at: string | null };
export type Lesson = { id: number; created_at: string; updated_at: string; client_id: number; starts_at: string; duration_minutes: number; lesson_format: string; location_or_link: string | null; subject: string | null; status: string; amount_due_cents: number; amount_paid_cents: number; payment_status: string; payment_method: string | null; paid_at: string | null; notes: string | null; archived_at: string | null; deleted_at: string | null };
export type Note = { id: number; created_at: string; updated_at: string; client_id: number; title: string | null; body: string; note_type: string; follow_up_at: string | null };

type Tables = { clients: Client; bookings: Booking; lessons: Lesson; notes: Note };
export type TableName = keyof Tables;
type Database = { [T in TableName]: Tables[T][] } & { seq: Record<TableName, number> };
type NewRow<T extends TableName> = Omit<Tables[T], "id" | "created_at" | "updated_at">;

const DIR = process.env.HQ_DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DIR, "hq.json");

const empty = (): Database => ({ clients: [], bookings: [], lessons: [], notes: [], seq: { clients: 0, bookings: 0, lessons: 0, notes: 0 } });

async function load(): Promise<Database> {
  try {
    return { ...empty(), ...JSON.parse(await fs.readFile(FILE, "utf8")) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw error;
  }
}

async function save(db: Database) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.copyFile(FILE, `${FILE}.bak`).catch(() => {});
  const temp = `${FILE}.tmp`;
  await fs.writeFile(temp, JSON.stringify(db, null, 1));
  await fs.rename(temp, FILE);
}

let queue: Promise<unknown> = Promise.resolve();

/** Runs a change against the latest data and saves it, one change at a time. */
function change<R>(mutate: (db: Database) => R): Promise<R> {
  const run = queue.then(async () => {
    const db = await load();
    const result = mutate(db);
    await save(db);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export const readAll = () => queue.then(load);

export function insert<T extends TableName>(table: T, values: NewRow<T>) {
  return change((db) => {
    const now = new Date().toISOString();
    const row = { ...values, id: ++db.seq[table], created_at: now, updated_at: now } as Tables[T];
    (db[table] as Tables[T][]).push(row);
    return row;
  });
}

export function update<T extends TableName>(table: T, id: number, values: Partial<NewRow<T>>) {
  return change((db) => {
    const row = (db[table] as Tables[T][]).find((r) => r.id === id);
    if (!row) throw new Error(`${table} #${id} not found`);
    Object.assign(row, values, { updated_at: new Date().toISOString() });
    return row;
  });
}

/** Deletes the matching rows and returns how many were removed. */
export function remove<T extends TableName>(table: T, match: (row: Tables[T]) => boolean) {
  return change((db) => {
    const rows = db[table] as Tables[T][];
    const kept = rows.filter((r) => !match(r));
    (db as unknown as Record<TableName, unknown[]>)[table] = kept;
    return rows.length - kept.length;
  });
}

/** Several related changes saved together (e.g. deleting a client and their records). */
export const transaction = change;

export const isReadOnlyError = (error: unknown) => ["EROFS", "EACCES", "EPERM"].includes((error as NodeJS.ErrnoException)?.code || "");
