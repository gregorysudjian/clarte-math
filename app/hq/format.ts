// Formatting and time-zone helpers shared by the HQ UI, server actions, and export.
// All lesson times are shown and entered in Montreal time.

const TZ = "America/Toronto";

export const money = (cents: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
export const toCents = (value: string) => Math.max(0, Math.round((Number(value) || 0) * 100));
export const dollars = (cents: number | null | undefined) => (cents ? (cents / 100).toFixed(2) : "");

export const label = (value: string) =>
  value === "lead" ? "Potential client" : value === "e_transfer" ? "E-transfer" : value.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());

export const formatDate = (value: string, withTime = true) =>
  new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}), timeZone: TZ }).format(new Date(value));

export const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit", timeZone: TZ }).format(new Date(value));

function parts(value: string | number | Date) {
  const list = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const get = (type: string) => list.find((p) => p.type === type)?.value || "00";
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** "YYYY-MM-DD" in Montreal time. */
export const dayKey = (value: string | number | Date) => {
  const p = parts(value);
  return `${p.year}-${p.month}-${p.day}`;
};

/** "YYYY-MM-DDTHH:mm" in Montreal time, for datetime inputs. */
export const localInput = (value: string) => {
  const p = parts(value);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

/** Converts a Montreal wall-clock "YYYY-MM-DDTHH:mm" into an ISO timestamp. */
export function montrealToIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  const offsetAt = (instant: number) => {
    const p = parts(instant);
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - instant;
  };
  let instant = wanted - offsetAt(wanted);
  instant = wanted - offsetAt(instant);
  return new Date(instant).toISOString();
}

export const phone = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};
