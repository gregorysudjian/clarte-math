import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";
export const metadata: Metadata = { title: "Privacy Policy / Politique de confidentialité", description: "How Clarté Math handles personal information." };
export default function PrivacyPage() { return <LegalPage type="privacy"/>; }
