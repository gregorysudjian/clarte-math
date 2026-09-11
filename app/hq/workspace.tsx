"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "../components/icons";
import { logout, type Result } from "./actions";
import type { HqData } from "./data";
import { Drawer } from "./drawer";
import { SECTION_TITLES, type Section } from "./sections";
import { HqContext, type Panel } from "./ui";
import { Clients, Lessons, Notes, Overview, Payments, Requests } from "./views";

const VIEWS = { overview: Overview, requests: Requests, clients: Clients, lessons: Lessons, payments: Payments, notes: Notes } satisfies Record<Section, () => React.ReactNode>;
const ICONS: Record<Section, IconName> = { overview: "home", requests: "inbox", clients: "users", lessons: "calendar", payments: "wallet", notes: "file" };

export function HqWorkspace({ section, data }: { section: Section; data: HqData }) {
  const [drawer, setDrawer] = useState<{ panel: Panel; key: number } | null>(null);
  const [toast, setToast] = useState<Result | null>(null);
  const [today] = useState(() => new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Toronto" }).format(new Date()));
  const timer = useRef<number>(undefined);

  const open = useCallback((panel: Panel) => setDrawer((d) => ({ panel, key: (d?.key ?? 0) + 1 })), []);
  const close = useCallback(() => setDrawer(null), []);
  const notify = useCallback((result: Result) => {
    setToast(result);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);
  const context = useMemo(() => ({ data, open, close, notify }), [data, open, close, notify]);

  const newRequests = data.bookings.filter((b) => b.status === "new" && !b.archived_at && !b.deleted_at).length;
  const View = VIEWS[section];

  return (
    <HqContext.Provider value={context}>
      <div className="hq-app">
        <aside className="hq-sidebar">
          <Link className="hq-brand" href="/hq"><span>C</span><b>Clarté <em>HQ</em></b></Link>
          <nav aria-label="HQ">
            {(Object.keys(SECTION_TITLES) as Section[]).map((id) => (
              <Link key={id} href={id === "overview" ? "/hq" : `/hq/${id}`} aria-current={section === id ? "page" : undefined}>
                <Icon name={ICONS[id]} />
                <span>{SECTION_TITLES[id]}</span>
                {id === "requests" && newRequests > 0 && <i>{newRequests}</i>}
              </Link>
            ))}
          </nav>
          <div className="hq-sidebar-foot">
            <a href="/hq/export" download><Icon name="download" /><span>Export to Excel</span></a>
            <Link href="/" target="_blank"><Icon name="external" /><span>View website</span></Link>
            <form action={logout}><button><Icon name="logout" /><span>Sign out</span></button></form>
          </div>
        </aside>

        <main className="hq-main">
          <header className="hq-topbar">
            <div>
              <p>{today}</p>
              <h1>{SECTION_TITLES[section]}</h1>
            </div>
            <div className="hq-topbar-actions">
              <button className="hq-secondary" onClick={() => open({ kind: "note" })}><Icon name="plus" />Note</button>
              <button className="hq-secondary" onClick={() => open({ kind: "client" })}><Icon name="plus" />Client</button>
              <button className="hq-primary" onClick={() => open({ kind: "lesson" })}><Icon name="plus" />Lesson</button>
            </div>
          </header>
          <View key={section} />
        </main>

        {drawer && <Drawer key={drawer.key} panel={drawer.panel} />}
        {toast && <div className={toast.ok ? "hq-toast" : "hq-toast hq-toast-error"} role="status"><Icon name={toast.ok ? "check" : "x"} />{toast.message}</div>}
      </div>
    </HqContext.Provider>
  );
}
