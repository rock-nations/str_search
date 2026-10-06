"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useFormContext } from "react-hook-form";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { parseNumber } from "@/lib/parse";
import type { UnderwritingFormValues } from "@/lib/underwriting/fields";

export function SubmitDialog({
  open,
  onOpenChange,
  onConfirm,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const { getValues } = useFormContext<UnderwritingFormValues>();
  const revenue = open ? getValues("revenue") : null;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Submit this underwriting for grading?</AlertDialogTitle>
          <AlertDialogDescription>
            Your Mid forecast is compared with the analyst&apos;s. After you submit, this attempt is locked and the
            analyst&apos;s underwriting is revealed on your results page.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {revenue && (
          <dl className="grid grid-cols-3 overflow-hidden rounded-lg border text-center">
            {(["low", "mid", "high"] as const).map((key) => (
              <div key={key} className={key === "mid" ? "bg-accent px-3 py-3" : "px-3 py-3"}>
                <dt className={key === "mid" ? "text-xs font-medium text-accent-foreground" : "text-xs text-muted-foreground"}>
                  {key === "mid" ? "Mid · graded" : key === "low" ? "Low" : "High"}
                </dt>
                <dd className={key === "mid" ? "figure mt-0.5 text-base font-semibold" : "figure mt-0.5 text-sm"}>
                  {formatMoney(parseNumber(revenue[key]))}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Keep editing</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={submitting} data-testid="confirm-submit">
            {submitting ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" aria-hidden />
            ) : (
              <Send data-icon="inline-start" aria-hidden />
            )}
            {submitting ? "Grading…" : "Submit for grading"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
