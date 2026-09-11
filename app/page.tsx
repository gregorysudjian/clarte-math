"use client";

import { site } from "../lib/site";
import { BookingForm } from "./components/booking-form";
import { Icon, type IconName } from "./components/icons";
import { useLocale } from "./components/locale-context";
import { Footer, Header } from "./components/site-chrome";
import { copy } from "./landing-copy";

const FACT_ICONS: IconName[] = ["globe", "users", "location"];

function Sparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0c.7 6.2 2.9 10.7 12 12-9.1 1.3-11.3 5.8-12 12-.7-6.2-2.9-10.7-12-12C9.1 10.7 11.3 6.2 12 0Z" />
    </svg>
  );
}

export default function Home() {
  const { locale } = useLocale();
  const t = copy[locale];
  const { hero } = t;

  return (
    <>
      <Header />
      <main id="main-content">
        {/* ---------- Hero ---------- */}
        <section className="hero">
          <Sparkle className="doodle d1" />
          <Sparkle className="doodle d2" />
          <Sparkle className="doodle d3" />
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">{hero.eyebrow}</p>
              <h1>{hero.title[0]}<span className="swash">{hero.title[1]}</span>{hero.title[2]}</h1>
              <p className="lede">{hero.body}</p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="#book">{hero.primary}<span className="chip"><Icon name="arrow" /></span></a>
                <a className="link-arrow" href="#levels">{hero.secondary}<Icon name="arrow" /></a>
              </div>
              <p className="hero-note"><Icon name="check" />{hero.note}</p>
            </div>

            <div className="hero-art">
              <article className="art-card tutor-card">
                <span className="avatar">G</span>
                <h2>{hero.tutor.name}</h2>
                <p>{hero.tutor.role}</p>
                <a className="card-link" href="#about">{hero.tutor.link}<span className="chip-sm"><Icon name="arrow" /></span></a>
              </article>
              <article className="art-card lesson-card" aria-hidden="true">
                <span className="lesson-label">{hero.lesson.label}</span>
                <ol>
                  {hero.lesson.lines.map((line, i) => (
                    <li key={line}>{line}{i === hero.lesson.lines.length - 1 && <Icon name="check" />}</li>
                  ))}
                </ol>
                <small>{hero.lesson.note}</small>
              </article>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...t.marquee, ...t.marquee].map((item, i) => <span key={i}>{item}<Sparkle /></span>)}
          </div>
        </div>

        {/* ---------- Approach ---------- */}
        <section className="section" id="approach">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">{t.intro.eyebrow}</p>
              <h2>{t.intro.title}</h2>
            </div>
            <dl className="stats">
              {t.intro.stats.map(([value, text]) => (
                <div key={value}>
                  <dt>{value}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
            <div className="service-grid">
              {t.services.items.map((s, i) => (
                <article key={s.title} className={`service tone-${i}`}>
                  <span className="icon-chip"><Icon name={s.icon} /></span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Levels ---------- */}
        <section className="section tinted" id="levels">
          <div className="wrap">
            <div className="section-head split">
              <div>
                <p className="eyebrow">{t.levels.eyebrow}</p>
                <h2>{t.levels.title}</h2>
              </div>
              <a className="btn btn-ghost" href="#book">{t.levels.ask}</a>
            </div>
            <div className="level-grid">
              {t.levels.items.map((level, i) => (
                <article key={level.title} className={`level tone-${i}`}>
                  <span className="level-num">0{i + 1}</span>
                  <h3>{level.title}</h3>
                  <p>{level.text}</p>
                  <ul className="tags">{level.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- About ---------- */}
        <section className="section" id="about">
          <div className="wrap about-grid">
            <div className="about-copy">
              <p className="eyebrow">{t.about.eyebrow}</p>
              <h2>{t.about.title}</h2>
              <p className="lede">{t.about.body}</p>
              <ul className="facts">
                {t.about.facts.map((fact, i) => <li key={fact}><Icon name={FACT_ICONS[i]} />{fact}</li>)}
              </ul>
              <a className="link-arrow" href={site.linkedin} target="_blank" rel="noopener noreferrer">{t.about.linkedin}<Icon name="external" /></a>
            </div>
            <div className="approach">
              <h3>{t.about.approach}</h3>
              <ol className="step-grid">
                {t.about.steps.map((step) => (
                  <li key={step.title}>
                    <Sparkle className="step-star" />
                    <h4>{step.title}</h4>
                    <p>{step.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section className="section tinted" id="faq">
          <div className="wrap faq-grid">
            <div className="section-head">
              <p className="eyebrow">{t.faq.eyebrow}</p>
              <h2>{t.faq.title}</h2>
              <p className="faq-more">{t.faq.more} <a href={`mailto:${site.email}`}>{site.email}</a></p>
            </div>
            <div className="faq-list">
              {t.faq.items.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}<span className="faq-toggle" aria-hidden="true" /></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Booking ---------- */}
        <section className="section" id="book">
          <div className="wrap">
            <div className="book-panel">
              <Sparkle className="doodle d4" />
              <div className="book-intro">
                <p className="eyebrow">{t.booking.eyebrow}</p>
                <h2>{t.booking.title}</h2>
                <p>{t.booking.body}</p>
                <ol className="book-steps">
                  {t.booking.steps.map((step, i) => <li key={step}><span>{i + 1}</span>{step}</li>)}
                </ol>
                <small><Icon name="lock" />{t.booking.privacy}</small>
              </div>
              <BookingForm t={t.booking} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
