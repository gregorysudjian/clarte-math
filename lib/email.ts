import nodemailer from "nodemailer";
import { site } from "./site";

type Email = { to: string; subject: string; text: string; html?: string; replyTo?: string };

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c] || c);

export const textToHtml = (text: string) =>
  `<div style="font-family:Arial,sans-serif;color:#15303e;line-height:1.6;white-space:pre-wrap">${escapeHtml(text)}</div>`;

export function emailConfigured() {
  return Boolean((process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) || (process.env.RESEND_API_KEY && process.env.BOOKING_FROM_EMAIL));
}

/** Sends through Gmail when configured, otherwise Resend. Throws on failure. */
export async function sendEmail({ to, subject, text, html = textToHtml(text), replyTo }: Email) {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  const from = `${site.shortName} Learning`;

  if (gmailUser && gmailPassword) {
    const transport = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPassword } });
    await transport.sendMail({ from: `${from} <${gmailUser}>`, to, replyTo: replyTo || gmailUser, subject, text, html });
    return;
  }

  const key = process.env.RESEND_API_KEY;
  const fromEmail = process.env.BOOKING_FROM_EMAIL;
  if (!key || !fromEmail) throw new Error("EMAIL_NOT_CONFIGURED");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ from: `${from} <${fromEmail}>`, to: [to], reply_to: replyTo || process.env.BOOKING_TO_EMAIL || site.email, subject, text, html }),
  });
  if (!response.ok) throw new Error(`EMAIL_DELIVERY_FAILED (${response.status})`);
}
