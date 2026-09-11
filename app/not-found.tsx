"use client";

import Link from "next/link";
import { Icon } from "./components/icons";
import { useLocale } from "./components/locale-context";
import { Footer, Header } from "./components/site-chrome";

export default function NotFound() {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <>
      <Header />
      <main id="main-content" className="not-found">
        <span className="error-code">404</span>
        <h1>{en ? "This page isn’t on the lesson plan." : "Cette page n’est pas au programme."}</h1>
        <Link className="btn btn-solid" href="/">{en ? "Back to home" : "Retour à l’accueil"}<Icon name="arrow" /></Link>
      </main>
      <Footer />
    </>
  );
}
