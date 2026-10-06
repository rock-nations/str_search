"use client";

import { CircleAlert } from "lucide-react";
import { useId, type ReactNode } from "react";
import { useController, useFormContext, type FieldPath as RhfFieldPath } from "react-hook-form";

import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { formatMoneyInput } from "@/lib/format";
import { parseNumber } from "@/lib/parse";
import type { NumberKind, UnderwritingFormValues } from "@/lib/underwriting/fields";
import { cn } from "@/lib/utils";

type FieldPath = RhfFieldPath<UnderwritingFormValues>;

export function FieldErrorText({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-[13px] leading-5 text-danger-foreground">
      <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/**
 * A labelled number input bound to React Hook Form. Money gets a $ prefix and
 * thousands separators on blur; percentages a % suffix. The raw text is kept
 * while typing so "6." or "1,2" never jump around under the cursor.
 */
export function NumberField({
  name,
  label,
  kind,
  description,
  badge,
  placeholder,
  emphasis = false,
  className,
  inputClassName,
  disabled,
  hideLabel = false,
}: {
  name: FieldPath;
  label: string;
  kind: NumberKind;
  description?: ReactNode;
  badge?: ReactNode;
  placeholder?: string;
  emphasis?: boolean;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  hideLabel?: boolean;
}) {
  const id = useId();
  const { control } = useFormContext<UnderwritingFormValues>();
  const {
    field: { ref, name: fieldName, value, onChange, onBlur },
    fieldState,
  } = useController({ name, control });
  const error = fieldState.error?.message;
  const describedBy = error ? `${id}-error` : description ? `${id}-description` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)} data-field={name}>
      <div className={cn("flex min-h-5 items-center justify-between gap-2", hideLabel && "sr-only")}>
        <Label htmlFor={id} className="text-[13px] font-medium">
          {label}
        </Label>
        {badge}
      </div>
      <InputGroup
        className={cn(
          "h-9 bg-card",
          emphasis && "ring-2 ring-primary/25 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50",
          disabled && "opacity-60",
        )}
      >
        {kind === "money" && (
          <InputGroupAddon>
            <InputGroupText>$</InputGroupText>
          </InputGroupAddon>
        )}
        <InputGroupInput
          id={id}
          ref={ref}
          name={fieldName}
          value={(value as string) ?? ""}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            if (kind === "money") {
              const parsed = parseNumber(value as string);
              if (parsed !== null && parsed >= 0) onChange(formatMoneyInput(parsed));
            }
            onBlur();
          }}
          inputMode={kind === "years" ? "numeric" : "decimal"}
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("figure text-[15px]", emphasis && "font-semibold", inputClassName)}
        />
        {kind === "percent" && (
          <InputGroupAddon align="inline-end">
            <InputGroupText>%</InputGroupText>
          </InputGroupAddon>
        )}
        {kind === "years" && (
          <InputGroupAddon align="inline-end">
            <InputGroupText>years</InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>
      {error ? (
        <FieldErrorText id={`${id}-error`}>{error}</FieldErrorText>
      ) : description ? (
        <p id={`${id}-description`} className="figure text-[13px] leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
