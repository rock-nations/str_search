import type { Metadata } from "next";

import { PropertyBriefView } from "@/features/property/property-brief-view";

export const metadata: Metadata = { title: "Property brief" };

export default async function PropertyPage({ params }: PageProps<"/properties/[zpid]">) {
  const { zpid } = await params;
  return <PropertyBriefView zpid={zpid} />;
}
