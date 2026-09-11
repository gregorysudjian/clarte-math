"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { site } from "../../lib/site";
import { copy } from "../landing-copy";
import { Icon } from "./icons";
import { useLocale } from "./locale-context";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={light ? "brand light" : "brand"} aria-label={`${site.name}, home`}>
      <span className="brand-mark">N</span>
      <span className="brand-name">Northstar <em>Learning</em></span>
    </Link>
  );
}

function LanguageSwitch() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="lang" role="group" aria-label="Language / Langue">
      {(["en", "fr"] as const).map((l) => (
        <button key={l} className={locale === l ? "active" : ""} onClick={() => setLocale(l)} aria-pressed={locale === l}>{l.toUpperCase()}</button>
      ))}
    </div>
  );
}

export function Header() {
  const { locale } = useLocale();
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <header className="nav-shell" ref={ref}>
      <nav className="nav" aria-label="Main">
        <Brand />
        <div className="nav-links">
          {t.nav.map(([name, hash]) => <Link key={hash} href={`/${hash}`}>{name}</Link>)}
        </div>
        <div className="nav-end">
          <LanguageSwitch />
          <Link className="btn btn-solid btn-sm nav-cta" href="/#book">{t.cta}</Link>
          <button className="hamburger" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-menu" aria-label="Menu">
            <Icon name={open ? "x" : "menu"} />
          </button>
        </div>
      </nav>
      <div id="mobile-menu" className={open ? "mobile-menu open" : "mobile-menu"}>
        {t.nav.map(([name, hash]) => <Link key={hash} href={`/${hash}`} onClick={() => setOpen(false)}>{name}</Link>)}
        <Link className="btn btn-solid" href="/#book" onClick={() => setOpen(false)}>{t.cta}</Link>
      </div>
    </header>
  );
}

export function Footer() {
  const { locale } = useLocale();
  const t = copy[locale];
  return (
    <footer className="footer">
      <div className="wrap footer-top">
        <div className="footer-intro">
          <Brand />
          <p>{t.footer.tagline}</p>
        </div>
        <nav className="footer-col" aria-label="Sections">
          {t.nav.map(([name, hash]) => <Link key={hash} href={`/${hash}`}>{name}</Link>)}
        </nav>
        <div className="footer-col">
          <a href={`mailto:${site.email}`}><Icon name="mail" />{site.email}</a>
          {site.phone && <a href={`tel:${site.phone.replace(/[^+\d]/g, "")}`}><Icon name="phone" />{site.phone}</a>}
          <span><Icon name="location" />Montréal, QC</span>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <nav aria-label="Legal">
          <Link href="/privacy">{t.footer.privacy}</Link>
          <Link href="/terms">{t.footer.terms}</Link>
          <Link href="/hq/login" prefetch={false}>{t.footer.owner}</Link>
        </nav>
      </div>
    </footer>
  );
}
