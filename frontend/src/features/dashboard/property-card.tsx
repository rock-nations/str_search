import { ArrowRight, Bath, BedDouble, Ruler } from "lucide-react";
import Link from "next/link";

import { PropertyImage } from "@/components/property-image";
import { RatingBadge, StatusBadge } from "@/components/rating-badge";
import { Button } from "@/components/ui/button";
import type { DashboardProperty } from "@/lib/api/schemas";
import { formatMoney, formatNumber } from "@/lib/format";
import { parseNumber } from "@/lib/parse";

export function streetOf(address: string | null | undefined): string {
  return address?.split(",")[0]?.trim() || "Untitled property";
}

export function primaryAction(property: DashboardProperty): { label: string; href: string } {
  if (property.status === "in_progress" && property.active_underwriting_id) {
    return { label: "Resume draft", href: `/underwritings/${property.active_underwriting_id}` };
  }
  if (property.status === "submitted" && property.latest_submission_id) {
    return { label: "View results", href: `/submissions/${property.latest_submission_id}` };
  }
  return { label: "Review & start", href: `/properties/${property.zpid}` };
}

export function PropertyCard({ property }: { property: DashboardProperty }) {
  const street = streetOf(property.address);
  const action = primaryAction(property);
  const price = parseNumber(property.unformatted_price);

  return (
    <article
      data-testid={`property-card-${property.zpid}`}
      aria-label={street}
      className="group/card flex flex-col overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07] transition-shadow hover:shadow-raised"
    >
      <Link href={`/properties/${property.zpid}`} className="relative block outline-none" tabIndex={-1} aria-hidden>
        <PropertyImage src={property.img_src} alt="" className="aspect-[2/1] w-full" />
        <div className="absolute top-3 left-3">
          <StatusBadge status={property.status} className="bg-card/95 shadow-card backdrop-blur" />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-1">
          <h3 className="text-[15px] leading-snug font-semibold tracking-tight">
            <Link
              href={`/properties/${property.zpid}`}
              className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {street}
            </Link>
          </h3>
          <p className="text-[13px] text-muted-foreground">
            {[property.city, property.state].filter(Boolean).join(", ")}
            {property.market_name && <> · {property.market_name}</>}
          </p>
        </div>

        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          <div className="figure text-[15px] font-semibold text-foreground">
            <dt className="sr-only">List price</dt>
            <dd>{formatMoney(price)}</dd>
          </div>
          <div className="flex items-center gap-1">
            <BedDouble className="size-3.5" aria-hidden />
            <dt className="sr-only">Bedrooms</dt>
            <dd className="figure">{property.beds ?? "—"} bd</dd>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="size-3.5" aria-hidden />
            <dt className="sr-only">Bathrooms</dt>
            <dd className="figure">{property.baths ?? "—"} ba</dd>
          </div>
          <div className="flex items-center gap-1">
            <Ruler className="size-3.5" aria-hidden />
            <dt className="sr-only">Square feet</dt>
            <dd className="figure">{formatNumber(property.area)} sqft</dd>
          </div>
        </dl>

        <div className="mt-auto flex min-h-6 flex-wrap items-center gap-x-3 gap-y-2 border-t pt-4 text-[13px]">
          {property.latest_rating ? (
            <>
              <span className="text-muted-foreground">Latest</span>
              <RatingBadge rating={property.latest_rating} withScore />
              {property.best_rating && property.attempts > 1 && (
                <span className="text-muted-foreground">
                  Best <span className="figure font-medium text-foreground">{property.best_accuracy?.toFixed(0)}</span>
                </span>
              )}
              <span className="ml-auto text-muted-foreground">
                {property.attempts} {property.attempts === 1 ? "attempt" : "attempts"}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">
              {property.status === "in_progress" ? "Draft saved · not graded yet" : "No attempts yet"}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button asChild className="flex-1" variant={property.status === "in_progress" ? "default" : "outline"}>
            <Link href={action.href}>
              {action.label}
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
          {property.status === "submitted" && (
            <Button asChild variant="ghost">
              <Link href={`/properties/${property.zpid}`}>Try again</Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
