"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { formatMoney, formatMoneyInput } from "@/lib/format";
import { parseNumber } from "@/lib/parse";
import {
  LINE_ITEM_COPY,
  checkLineItem,
  lineItemsTotal,
  type LineItemKind,
  type UnderwritingFormValues,
} from "@/lib/underwriting/fields";
import { cn } from "@/lib/utils";

import { FieldErrorText } from "./number-field";

/**
 * Editable list of `{label, amount}` rows. Shared by the optimization list
 * (one-time setup costs) and operating expenses (monthly costs).
 */
export function LineItemsEditor({
  kind,
  suggestions,
  amountSuffix,
  emptyHint,
}: {
  kind: LineItemKind;
  suggestions: string[];
  amountSuffix?: string;
  emptyHint: string;
}) {
  const copy = LINE_ITEM_COPY[kind];
  const listId = useId();
  const { control, register, formState, setFocus, setValue, getValues } = useFormContext<UnderwritingFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: copy.listName });
  const rows = useWatch({ control, name: copy.listName }) ?? [];
  const total = lineItemsTotal(rows, kind);
  const used = new Set(rows.map((row) => row.label.trim().toLowerCase()));
  const remainingSuggestions = suggestions.filter((s) => !used.has(s.toLowerCase()));
  const errors = formState.errors[copy.listName];
  const touched = formState.touchedFields[copy.listName];

  const addRow = (label = "") => {
    append({ label, amount: "" }, { shouldFocus: false });
    const index = getValues(copy.listName).length - 1;
    // Focus the field the trainee needs next: amount when the name came from a chip.
    requestAnimationFrame(() => setFocus(`${copy.listName}.${index}.${label ? "amount" : "label"}`));
  };

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-5 text-center text-[13px] text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <div className="space-y-2" role="list" aria-label={`${copy.labelName} list`}>
          <div className="hidden grid-cols-[minmax(0,1fr)_180px_32px] gap-2 px-0.5 text-xs font-medium text-muted-foreground sm:grid">
            <span>{copy.labelName}</span>
            <span>{copy.amountName}</span>
            <span className="sr-only">Remove</span>
          </div>
          {fields.map((item, index) => {
            // Row problems come from the live values once the trainee has left either
            // input, so "amount but no name" shows up without touching the name field.
            const rowTouched = Boolean(touched?.[index]?.label || touched?.[index]?.amount || errors?.[index]);
            const check = rows[index] ? checkLineItem(rows[index], kind) : null;
            const live = rowTouched && check?.status === "invalid" ? check : null;
            const serverErrors = errors?.[index];
            const labelError = live?.field === "label" ? live.message : serverErrors?.label?.message;
            const amountError = live?.field === "amount" ? live.message : serverErrors?.amount?.message;
            const amountReg = register(`${copy.listName}.${index}.amount`);
            return (
              <div key={item.id} role="listitem" className="space-y-1">
                <div className="grid grid-cols-[minmax(0,1fr)_32px] gap-2 sm:grid-cols-[minmax(0,1fr)_180px_32px]">
                  <Input
                    {...register(`${copy.listName}.${index}.label`)}
                    list={listId}
                    placeholder={kind === "optimization" ? "e.g. Hot tub" : "e.g. Utilities"}
                    aria-label={`${copy.labelName} ${index + 1}`}
                    aria-invalid={labelError ? true : undefined}
                    autoComplete="off"
                    className="h-9 bg-card"
                  />
                  <InputGroup className="order-3 col-span-2 h-9 bg-card sm:order-none sm:col-span-1">
                    <InputGroupAddon>
                      <InputGroupText>$</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      {...amountReg}
                      onBlur={(event) => {
                        const parsed = parseNumber(event.target.value);
                        if (parsed !== null && parsed >= 0) {
                          setValue(`${copy.listName}.${index}.amount`, formatMoneyInput(parsed));
                        }
                        void amountReg.onBlur(event);
                      }}
                      inputMode="decimal"
                      placeholder="0"
                      aria-label={`${copy.amountName} ${index + 1}`}
                      aria-invalid={amountError ? true : undefined}
                      autoComplete="off"
                      className="figure"
                    />
                    {amountSuffix && (
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>{amountSuffix}</InputGroupText>
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 text-muted-foreground hover:text-danger-foreground"
                    onClick={() => remove(index)}
                    aria-label={`Remove ${rows[index]?.label?.trim() || `row ${index + 1}`}`}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
                {(labelError || amountError) && <FieldErrorText>{labelError ?? amountError}</FieldErrorText>}
              </div>
            );
          })}
        </div>
      )}

      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addRow()}>
          <Plus data-icon="inline-start" aria-hidden />
          Add {copy.noun}
        </Button>
        {remainingSuggestions.slice(0, 5).map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => addRow(suggestion)}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full border border-dashed px-2.5 text-xs text-muted-foreground transition-colors",
              "hover:border-solid hover:border-primary/40 hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Plus className="size-3" aria-hidden />
            {suggestion}
          </button>
        ))}
      </div>

      <TotalLine kind={kind} total={total} />
    </div>
  );
}

function TotalLine({ kind, total }: { kind: LineItemKind; total: number }) {
  if (kind === "opex") {
    return (
      <div className="flex flex-wrap items-baseline justify-end gap-x-6 gap-y-1 border-t pt-3 text-sm">
        <span className="text-muted-foreground">
          Monthly <span className="figure ml-1 font-semibold text-foreground">{formatMoney(total)}</span>
        </span>
        <span className="text-muted-foreground">
          Annual <span className="figure ml-1 font-semibold text-foreground">{formatMoney(total * 12)}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-baseline justify-end gap-2 border-t pt-3 text-sm">
      <span className="text-muted-foreground">Setup total</span>
      <span className="figure font-semibold">{formatMoney(total)}</span>
    </div>
  );
}
