"use client";

import { House } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Listing photo with a calm placeholder when the image is missing or fails.
 * Rendered as a plain <img>: the seed photos come from an external
 * placeholder service and optimising them server-side buys nothing here.
 */
export function PropertyImage({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 grid place-items-center bg-gradient-to-br from-muted to-surface text-muted-foreground/60 transition-opacity",
          showImage && loaded && "opacity-0",
        )}
      >
        <House className="size-8" />
      </div>
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? undefined}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
