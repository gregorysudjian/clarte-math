"use client";

import { useState, type FormEvent } from "react";
import { site } from "../../lib/site";
import type { LandingCopy } from "../landing-copy";
import { Icon } from "./icons";
import { useLocale } from "./locale-context";

const FIELDS = ["name", "email", "phone", "requester", "grade", "subject", "format", "date", "message"] as const;
type FieldName = (typeof FIELDS)[number];
type Errors = Partial<Record<FieldName, string>>;
type Status = "idle" | "loading" | "success" | "error" | "not-configured";

const formatPhone = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 10);
  return d.length < 4 ? d : d.length < 7 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

export function BookingForm({ t }: { t: LandingCopy["booking"] }) {
  const { locale } = useLocale();
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");

  function validate(form: FormData) {
    const next: Errors = {};
    for (const field of FIELDS) if (!String(form.get(field) || "").trim()) next[field] = t.required;
    const email = String(form.get("email") || "");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) next.email = t.invalidEmail;
    const phone = String(form.get("phone") || "");
    if (phone && phone.replace(/\D/g, "").length < 7) next.phone = t.invalidPhone;
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const nextErrors = validate(form);
    setErrors(nextErrors);
    const firstInvalid = Object.keys(nextErrors)[0];
    if (firstInvalid) {
      (formElement.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch("/api/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      if (response.ok) {
        setStatus("success");
        formElement.reset();
        return;
      }
      const payload = (await response.json().catch(() => null)) as { code?: string } | null;
      setStatus(payload?.code === "NOT_CONFIGURED" ? "not-configured" : "error");
    } catch {
      setStatus("error");
    }
  }

  const field = (name: FieldName) => ({
    id: `field-${name}`,
    name,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `error-${name}` : undefined,
  });
  const wrap = (name: FieldName, control: React.ReactNode, full = false) => (
    <div className={full ? "form-field full" : "form-field"}>
      <label htmlFor={`field-${name}`}>{t.fields[name]}</label>
      {control}
      {errors[name] && <span className="field-error" id={`error-${name}`}>{errors[name]}</span>}
    </div>
  );
  const select = (name: FieldName, options: (string | [string, string])[]) =>
    wrap(name, (
      <select {...field(name)} defaultValue="">
        <option value="" disabled>{t.options.choose}</option>
        {options.map((o) => {
          const [value, text] = typeof o === "string" ? [o, o] : o;
          return <option key={value} value={value}>{text}</option>;
        })}
      </select>
    ));

  return (
    <form className="booking-form" onSubmit={submit} noValidate>
      <div className="form-grid">
        {wrap("name", <input {...field("name")} autoComplete="name" placeholder={t.placeholders.name} />)}
        {wrap("email", <input {...field("email")} type="email" autoComplete="email" placeholder={t.placeholders.email} />)}
        {wrap("phone", <input {...field("phone")} type="tel" autoComplete="tel" inputMode="tel" maxLength={14} placeholder={t.placeholders.phone} onInput={(e) => (e.currentTarget.value = formatPhone(e.currentTarget.value))} />)}
        {select("requester", t.options.requester)}
        {select("grade", t.options.grades)}
        {select("subject", t.options.subjects)}
        {select("format", t.options.formats)}
        {wrap("date", <input {...field("date")} placeholder={t.placeholders.date} />)}
        {wrap("message", <textarea {...field("message")} rows={4} placeholder={t.placeholders.message} />, true)}
        <input type="hidden" name="language" value={locale} />
        <input name="website" className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      </div>
      <button className="btn btn-primary form-submit" type="submit" disabled={status === "loading"}>
        {status === "loading" ? t.sending : t.submit}
        <span className="chip">{status === "loading" ? <span className="spinner" /> : <Icon name="arrow" />}</span>
      </button>
      <div className={`form-status ${status}`} role="status" aria-live="polite">
        {status === "success" && <><Icon name="check" /><span><strong>{t.successTitle}</strong> {t.success}</span></>}
        {status === "error" && <span>{t.error}</span>}
        {status === "not-configured" && (
          <span>{t.notConfigured} <a href={`mailto:${site.email}?subject=${encodeURIComponent(t.emailSubject)}`}>{t.emailDirectly}</a>.</span>
        )}
      </div>
    </form>
  );
}
