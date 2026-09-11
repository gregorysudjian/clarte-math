import { createXlsx } from "../../../lib/xlsx";
import { getHqData } from "../data";
import { dayKey, formatTime, label } from "../format";

const asDate = (value: string) => new Date(`${dayKey(value)}T00:00:00Z`);
const language = (value: string) => (value === "fr" ? "French" : "English");
const recordState = (row: { deleted_at: string | null; archived_at?: string | null; status?: string }) =>
  row.deleted_at ? "Deleted" : row.archived_at || row.status === "archived" ? "Archived" : "Current";

export async function GET() {
  const { clients, bookings, sessions } = await getHqData();
  const workbook = createXlsx([
    {
      name: "Clients",
      headers: ["Student", "Parent / guardian", "Email", "Phone", "Grade", "Language", "Status", "Hourly rate", "Created", "Notes", "Record"],
      moneyColumns: [7],
      dateColumns: [8],
      rows: clients.map((c) => [c.full_name, c.guardian_name, c.email, c.phone, c.grade, language(c.preferred_language), label(c.status), c.hourly_rate_cents / 100, asDate(c.created_at), c.notes, recordState(c)]),
    },
    {
      name: "Requests",
      headers: ["Received", "Name", "Email", "Phone", "Requester", "Grade", "Need", "Format", "Preferred time", "Language", "Status", "Message", "Private notes", "Record"],
      dateColumns: [0],
      rows: bookings.map((b) => [asDate(b.created_at), b.name, b.email, b.phone, label(b.requester), b.grade, b.subject, b.lesson_format, b.preferred_time, language(b.language), label(b.status), b.learning_goals, b.admin_notes, recordState(b)]),
    },
    {
      name: "Lessons",
      headers: ["Date", "Time", "Client", "Subject", "Minutes", "Format", "Location / link", "Status", "Charged", "Paid", "Balance", "Payment", "Method", "Paid on", "Notes", "Record"],
      moneyColumns: [8, 9, 10],
      dateColumns: [0, 13],
      rows: sessions.map((s) => [
        asDate(s.starts_at), formatTime(s.starts_at), s.clients?.full_name || "", s.subject || "Mathematics", s.duration_minutes, label(s.lesson_format), s.location_or_link, label(s.status),
        s.amount_due_cents / 100, s.amount_paid_cents / 100, Math.max(0, s.amount_due_cents - s.amount_paid_cents) / 100, label(s.payment_status),
        s.payment_method ? label(s.payment_method) : "", s.paid_at ? asDate(s.paid_at) : null, s.notes, recordState(s),
      ]),
    },
  ]);
  return new Response(workbook, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="northstar-hq-${dayKey(Date.now())}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
