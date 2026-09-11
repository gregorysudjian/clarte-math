import { emailConfigured, escapeHtml, sendEmail } from "../../../lib/email";
import { site } from "../../../lib/site";
import { insert } from "../../../lib/store";

const REQUIRED = ["name", "email", "phone", "requester", "grade", "subject", "format", "date", "message"] as const;

const clean = (value: unknown, max = 300) => String(value ?? "").trim().slice(0, max);

export async function POST(request: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ code: "INVALID_JSON" }, { status: 400 });
  }

  // Bots fill the hidden "website" field; pretend success and drop it.
  if (clean(raw.website)) return Response.json({ ok: true });

  const data = Object.fromEntries(REQUIRED.map((key) => [key, clean(raw[key], key === "message" ? 3000 : 300)])) as Record<(typeof REQUIRED)[number], string>;
  const language = clean(raw.language, 5) === "fr" ? "fr" : "en";

  const missing = REQUIRED.filter((field) => !data[field]);
  if (missing.length || !/^\S+@\S+\.\S+$/.test(data.email) || data.phone.replace(/\D/g, "").length < 7) {
    return Response.json({ code: "VALIDATION_ERROR", fields: missing }, { status: 422 });
  }

  // Save to the HQ, then email a notification. Either one is enough to not lose the request.
  let saved = false;
  try {
    await insert("bookings", {
      name: data.name, email: data.email, phone: data.phone, requester: data.requester, grade: data.grade, subject: data.subject,
      lesson_format: data.format, preferred_time: data.date, language, learning_goals: data.message,
      status: "new", admin_notes: null, client_id: null, archived_at: null, deleted_at: null,
    });
    saved = true;
  } catch (error) {
    console.error("[booking] Could not save the request", error);
  }

  let emailed = false;
  if (emailConfigured()) {
    const rows: [string, string][] = [
      ["Name", data.name], ["Email", data.email], ["Phone", data.phone], ["Requester", data.requester], ["Grade", data.grade],
      ["Help needed", data.subject], ["Format", data.format], ["Preferred times", data.date], ["Language", language === "fr" ? "French" : "English"], ["Message", data.message],
    ];
    const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
    const html = `<div style="font-family:Arial,sans-serif;color:#1c1a17;max-width:640px"><h2>New tutoring request</h2>${rows.map(([k, v]) => `<p><strong>${k}:</strong><br>${escapeHtml(v).replace(/\n/g, "<br>")}</p>`).join("")}<p style="color:#6b6357;font-size:12px">Sent from ${site.name}. Reply to answer ${escapeHtml(data.name)} directly.</p></div>`;
    try {
      await sendEmail({ to: process.env.BOOKING_TO_EMAIL || site.email, subject: `Tutoring request: ${data.grade} · ${data.name}`, text, html, replyTo: data.email });
      emailed = true;
    } catch (error) {
      console.error("[booking] Notification email failed", error);
    }
  }

  if (!saved && !emailed) return Response.json({ code: "NOT_CONFIGURED" }, { status: 503 });
  return Response.json({ ok: true });
}
