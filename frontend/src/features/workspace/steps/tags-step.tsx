"use client";

import { Tags, TriangleAlert } from "lucide-react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { Switch } from "@/components/ui/switch";
import { DEAL_TAGS, DEAL_TAG_GROUPS } from "@/lib/underwriting/defaults";
import type { UnderwritingFormValues } from "@/lib/underwriting/fields";

import { SectionCard } from "../section-card";

export function TagsStep() {
  const { control } = useFormContext<UnderwritingFormValues>();
  const tags = useWatch({ control, name: "tags" });
  const selected = DEAL_TAGS.filter((tag) => tags?.[tag.key]).length;
  const conflicting = Boolean(tags?.high_cash_on_cash && tags?.low_cash_on_cash);

  return (
    <SectionCard
      anchor="section-tags"
      icon={<Tags />}
      title="Deal tags"
      description="Yes/no labels that describe the deal at a glance. They don't affect your score."
      action={
        <span className="figure rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {selected} of {DEAL_TAGS.length} selected
        </span>
      }
    >
      <div className="space-y-6">
        {conflicting && (
          <p className="flex items-center gap-2 rounded-lg bg-warning/12 px-3 py-2 text-[13px] text-warning-foreground">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            Both High and Low cash-on-cash are on. Pick the one that fits.
          </p>
        )}
        {DEAL_TAG_GROUPS.map((group) => (
          <fieldset key={group} className="space-y-2.5">
            <legend className="mb-2.5 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              {group}
            </legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {DEAL_TAGS.filter((tag) => tag.group === group).map((tag) => (
                <Controller
                  key={tag.key}
                  control={control}
                  name={`tags.${tag.key}`}
                  render={({ field }) => (
                    <label
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-primary/35 has-[[data-state=checked]]:bg-accent/50"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{tag.label}</span>
                        <span className="block text-xs text-muted-foreground">{tag.hint}</span>
                      </span>
                      <Switch
                        checked={Boolean(field.value)}
                        onCheckedChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        aria-label={tag.label}
                      />
                    </label>
                  )}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </SectionCard>
  );
}
