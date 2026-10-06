"use client";

import { ArrowRight, CircleCheck, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageContainer } from "@/components/page";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useProperty, useStartUnderwriting, useSubmissions, useUnderwriting } from "@/lib/api/hooks";
import type { Underwriting } from "@/lib/api/schemas";
import { formatRelativeTime } from "@/lib/format";

import { UnderwritingWorkspace } from "./underwriting-workspace";

const COMPLETED_STATUS = "analyst_completed";

export function WorkspaceView({ id }: { id: number }) {
  const underwriting = useUnderwriting(Number.isFinite(id) ? id : null);
  const property = useProperty(underwriting.data?.zpid);

  if (!Number.isFinite(id)) {
    return (
      <PageContainer className="py-10">
        <ErrorState title="Underwriting not found" error={new ApiError(404, "That link doesn't point to an underwriting.")} />
      </PageContainer>
    );
  }
  if (underwriting.isPending) return <WorkspaceSkeleton />;
  if (underwriting.isError) {
    const notFound = underwriting.error instanceof ApiError && underwriting.error.status === 404;
    return (
      <PageContainer className="py-10">
        <ErrorState
          title={notFound ? "Underwriting not found" : "Couldn't load this underwriting"}
          error={underwriting.error}
          onRetry={notFound ? undefined : () => underwriting.refetch()}
        />
      </PageContainer>
    );
  }

  const data = underwriting.data;
  // Never render the analyst's answer key in the workspace.
  if (data.is_reference) return <ReferenceGuard />;
  if (data.deal_status === COMPLETED_STATUS || data.deal_submitted) return <SubmittedNotice underwriting={data} />;

  return <UnderwritingWorkspace key={data.id} underwriting={data} property={property.data} />;
}

function Notice({
  icon,
  title,
  children,
  actions,
  testId,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
  testId: string;
}) {
  return (
    <PageContainer className="py-16">
      <div
        data-testid={testId}
        className="mx-auto max-w-lg rounded-xl bg-card p-8 text-center shadow-card ring-1 ring-foreground/[0.07]"
      >
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6">
          {icon}
        </div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>
      </div>
    </PageContainer>
  );
}

function ReferenceGuard() {
  return (
    <Notice
      testId="reference-guard"
      icon={<EyeOff />}
      title="The analyst's underwriting is hidden"
      actions={
        <Button asChild>
          <Link href="/">Back to dashboard</Link>
        </Button>
      }
    >
      This is the reference answer for a training case. You&apos;ll see it side by side with your own numbers on the
      results page after you submit an attempt.
    </Notice>
  );
}

function SubmittedNotice({ underwriting }: { underwriting: Underwriting }) {
  const router = useRouter();
  const submissions = useSubmissions(underwriting.zpid);
  const start = useStartUnderwriting();
  const submission = submissions.data?.find((s) => s.underwriting_id === underwriting.id);

  return (
    <Notice
      testId="submitted-notice"
      icon={<CircleCheck />}
      title="This attempt has been submitted"
      actions={
        <>
          {submission && (
            <Button asChild>
              <Link href={`/submissions/${submission.id}`}>
                View results
                <ArrowRight data-icon="inline-end" aria-hidden />
              </Link>
            </Button>
          )}
          {underwriting.zpid && (
            <Button
              variant="outline"
              disabled={start.isPending}
              onClick={() =>
                start.mutate(underwriting.zpid as string, {
                  onSuccess: (next) => router.push(`/underwritings/${next.id}`),
                  onError: (error) => toast.error("Couldn't start a new attempt", { description: errorMessage(error) }),
                })
              }
            >
              {start.isPending && <LoaderCircle className="animate-spin" data-icon="inline-start" aria-hidden />}
              Start a new attempt
            </Button>
          )}
        </>
      }
    >
      {underwriting.deal_submitted && <>Submitted {formatRelativeTime(underwriting.deal_submitted)}. </>}
      Graded attempts are locked so the score stays meaningful. Start a new attempt to practise this property again.
    </Notice>
  );
}

function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading underwriting">
      <div className="border-b bg-card">
        <PageContainer className="space-y-2 py-4">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-7 w-80" />
        </PageContainer>
      </div>
      <PageContainer className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[208px_minmax(0,1fr)_320px]">
        <Skeleton className="hidden h-72 rounded-xl xl:block" />
        <div className="space-y-6">
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="hidden h-[420px] rounded-xl lg:block" />
      </PageContainer>
    </div>
  );
}
