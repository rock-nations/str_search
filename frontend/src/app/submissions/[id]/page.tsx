import type { Metadata } from "next";

import { ResultsView } from "@/features/results/results-view";

export const metadata: Metadata = { title: "Results" };

export default async function SubmissionPage({ params }: PageProps<"/submissions/[id]">) {
  const { id } = await params;
  return <ResultsView id={Number(id)} />;
}
