"use client";

import { CloudCheck, CloudOff, LoaderCircle, PencilLine, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { errorMessage } from "@/lib/api/client";
import { formatRelativeTime } from "@/lib/format";
import { SECTIONS } from "@/lib/underwriting/fields";

import { useWorkspace } from "./context";

/** Re-renders periodically so "Saved 2 minutes ago" stays honest. */
function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function SaveIndicator() {
  const { autosave } = useWorkspace();
  const { state } = autosave;
  const now = useNow();
  const pending = state.pendingSections;

  return (
    <div className="flex items-center gap-2 text-[13px]" aria-live="polite" data-testid="save-status" data-status={state.status}>
      {state.status === "saving" && (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Saving…
        </span>
      )}
      {state.status === "saved" && (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <CloudCheck className="size-4 text-success-foreground" aria-hidden />
          Saved {state.savedAt ? formatRelativeTime(new Date(state.savedAt), Math.max(now, state.savedAt)) : ""}
        </span>
      )}
      {state.status === "idle" && (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <PencilLine className="size-4" aria-hidden />
          Draft
        </span>
      )}
      {state.status === "error" && (
        <span className="inline-flex items-center gap-1.5 text-danger-foreground" role="alert">
          <CloudOff className="size-4" aria-hidden />
          <Tooltip>
            <TooltipTrigger className="underline decoration-dotted underline-offset-2">Couldn&apos;t save</TooltipTrigger>
            <TooltipContent className="max-w-64">{errorMessage(state.error)}</TooltipContent>
          </Tooltip>
          <Button variant="outline" size="xs" onClick={() => void autosave.flush()}>
            Retry
          </Button>
        </span>
      )}
      {pending.length > 0 && state.status !== "error" && (
        <Tooltip>
          <TooltipTrigger
            className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2 py-0.5 text-xs font-medium text-warning-foreground"
            data-testid="save-pending"
          >
            <TriangleAlert className="size-3.5" aria-hidden />
            {pending.length} not saved yet
          </TooltipTrigger>
          <TooltipContent className="max-w-72">
            Saved once complete and valid: {pending.map((id) => SECTIONS[id].title).join(", ")}.
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
