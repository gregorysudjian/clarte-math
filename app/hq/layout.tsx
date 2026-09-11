import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tutoring HQ",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default function HqLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
