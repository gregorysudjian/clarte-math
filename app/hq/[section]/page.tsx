import { notFound } from "next/navigation";
import { getHqData } from "../data";
import { isSection } from "../sections";
import { HqWorkspace } from "../workspace";
import "../hq.css";

export const dynamic = "force-dynamic";

export default async function HqSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "overview" || !isSection(section)) notFound();
  return <HqWorkspace section={section} data={await getHqData()} />;
}
