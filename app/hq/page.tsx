import { getHqData } from "./data";
import { HqWorkspace } from "./workspace";
import "./hq.css";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  return <HqWorkspace section="overview" data={await getHqData()} />;
}
