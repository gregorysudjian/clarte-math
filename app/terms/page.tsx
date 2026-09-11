import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";
export const metadata: Metadata = { title: "Terms of Service / Conditions de service", description: "Terms for tutoring services from Northstar Learning Montreal." };
export default function TermsPage() { return <LegalPage type="terms"/>; }
