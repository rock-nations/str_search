import type { Metadata } from "next";
import { Suspense } from "react";

import { WorkspaceView } from "@/features/workspace/workspace-view";

export const metadata: Metadata = { title: "Underwriting workspace" };

export default async function UnderwritingPage({ params }: PageProps<"/underwritings/[id]">) {
  const { id } = await params;
  return (
    // The workspace reads the active step from the URL, which needs a Suspense boundary.
    <Suspense>
      <WorkspaceView id={Number(id)} />
    </Suspense>
  );
}
