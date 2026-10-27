import { collection } from "@/lib/store";
import Portfolio from "./components/Portfolio";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { settings } = await collection();
  return {
    title: `${settings.name} — Photography`,
    description: settings.tagline,
  };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const p = await searchParams;
  return <Portfolio initial={await collection(p.preview === "1")} />;
}
