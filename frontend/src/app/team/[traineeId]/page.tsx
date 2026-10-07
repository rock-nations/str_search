import type { Metadata } from "next";

import { TraineeView } from "@/features/team/trainee-view";

export const metadata: Metadata = { title: "Trainee" };

export default async function TraineePage({ params }: PageProps<"/team/[traineeId]">) {
  const { traineeId } = await params;
  return <TraineeView traineeId={traineeId} />;
}
