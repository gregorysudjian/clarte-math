import { redirect } from "next/navigation";
import { readAll, type Booking, type Client, type Lesson, type Note as NoteRow } from "../../lib/store";
import { isSignedIn } from "./session";

type WithClient = { clients: { full_name: string } | null };
export type { Booking, Client };
export type Session = Lesson & WithClient;
export type Note = NoteRow & WithClient;
export type HqData = { clients: Client[]; bookings: Booking[]; sessions: Session[]; notes: Note[] };

const newestFirst = <K extends string>(key: K) => (a: Record<K, string>, b: Record<K, string>) => b[key].localeCompare(a[key]);

export async function getHqData(): Promise<HqData> {
  if (!(await isSignedIn())) redirect("/hq/login");
  const db = await readAll();
  const names = new Map(db.clients.map((c) => [c.id, c.full_name]));
  const withClient = <T extends { client_id: number }>(row: T) => ({ ...row, clients: names.has(row.client_id) ? { full_name: names.get(row.client_id)! } : null });
  return {
    clients: [...db.clients].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    bookings: [...db.bookings].sort(newestFirst("created_at")),
    sessions: db.lessons.map(withClient).sort(newestFirst("starts_at")),
    notes: db.notes.map(withClient).sort(newestFirst("created_at")),
  };
}
