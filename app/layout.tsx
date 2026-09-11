import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { site } from "../lib/site";
import { LocaleProvider } from "./components/locale-context";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap", axes: ["opsz"] });
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

const description ="One-on-one math tutoring for students from Grade 1 through CEGEP, in Montreal and online, in English or French.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | Mathematics Tutoring`, template: `%s | ${site.name}` },
  description,
  keywords: ["math tutor Montreal", "tutoring Montreal", "CEGEP math tutoring", "bilingual math tutoring", "tutorat mathématiques Montréal"],
  authors: [{ name: site.tutor }],
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "en_CA", alternateLocale: "fr_CA", url: site.url, siteName: site.name, title: "Math tutoring, explained clearly", description },
  twitter: { card: "summary", title: site.name, description },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": ["EducationalOrganization", "LocalBusiness"],
  name: site.name,
  description,
  url: site.url,
  email: site.email,
  founder: { "@type": "Person", name: site.tutor },
  areaServed: { "@type": "City", name: "Montreal" },
  address: { "@type": "PostalAddress", addressLocality: "Montreal", addressRegion: "QC", addressCountry: "CA" },
  availableLanguage: ["English", "French"],
  serviceType: ["Mathematics tutoring", "Homework help", "Exam preparation"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to content / Aller au contenu</a>
        <LocaleProvider>{children}</LocaleProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </body>
    </html>
  );
}
