"use client";

import { formatFreeDuration, formatFreeSlot, type FreeSlot } from "@/lib/schedule/free-time";

type FreeTimePanelProps = {
  dateISO: string;
  slots: FreeSlot[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
};

/** Long-form weekday/date label, computed in UTC so the ISO date never shifts. */
function formatDayLabel(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function FreeTimePanel({
  dateISO,
  slots,
  isLoading = false,
  isError = false,
  onRetry,
}: FreeTimePanelProps) {
  return (
    <section aria-labelledby="free-time-heading" className="rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="free-time-heading" className="text-sm font-semibold">
          Free time
        </h2>
        <p className="text-xs tabular-nums text-muted-foreground">{formatDayLabel(dateISO)}</p>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground" aria-live="polite">
          Loading…
        </p>
      ) : isError ? (
        <div className="flex flex-col items-center gap-1 py-6 text-center text-sm">
          <p className="text-destructive">Couldn&apos;t load personal events for this day.</p>
          <button
            type="button"
            className="text-xs underline underline-offset-2 hover:text-foreground"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      ) : slots.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Fully booked</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => (
            <li
              key={`${slot.startTime}-${slot.endTime}`}
              className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2"
            >
              <span className="text-xs font-medium tabular-nums">{formatFreeSlot(slot)}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {formatFreeDuration(slot)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
