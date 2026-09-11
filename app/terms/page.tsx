import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";
export const metadata: Metadata = { title: "Terms of Service / Conditions de service", description: "Terms for tutoring services from Clarté Math." };
export default function TermsPage() { return <LegalPage type="terms"/>; }
