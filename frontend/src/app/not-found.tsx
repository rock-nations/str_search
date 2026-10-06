import { Compass } from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/page";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageContainer className="py-16">
      <EmptyState
        icon={<Compass />}
        title="Page not found"
        description="That page doesn't exist. Head back to your training dashboard to pick a case."
        action={
          <Button asChild>
            <Link href="/">Go to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
