"use client";

import { useEffect } from "react";

import { PageContainer } from "@/components/page";
import { ErrorState } from "@/components/states";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer className="py-16">
      <ErrorState title="Something went wrong on this page" error={error} onRetry={retry} />
    </PageContainer>
  );
}
