"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDayLabel, formatTimeRange } from "@timetable-afdhal/schedule/schedule-utils";
import { Button } from "@timetable-afdhal/ui/components/button";
import { Skeleton } from "@timetable-afdhal/ui/components/skeleton";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

import { getErrorMessage } from "./personal-event-form";

/** wa.me wants an international number; Malaysian numbers are often typed with a leading 0. */
function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? `6${digits}` : digits}`;
}

export function MeetingRequestsInbox() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const requestsQuery = useQuery(trpc.meetingRequests.list.queryOptions());

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.meetingRequests.list.pathKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.personalEvents.listMine.pathKey() }),
    ]);

  const acceptMutation = useMutation({
    ...trpc.meetingRequests.accept.mutationOptions(),
    onSuccess: async () => {
      await refresh();
      toast.success("Accepted. The time now shows as busy, so reply to confirm it.");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const declineMutation = useMutation({
    ...trpc.meetingRequests.decline.mutationOptions(),
    onSuccess: async () => {
      await refresh();
      toast.success("Declined");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const pending = requestsQuery.data?.filter(({ status }) => status === "pending") ?? [];
  const isBusy = acceptMutation.isPending || declineMutation.isPending;

  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-bold tracking-tight">
        Meeting requests{pending.length > 0 && ` (${pending.length})`}
      </h2>

      {requestsQuery.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : requestsQuery.isError ? (
        <div className="flex items-center justify-between gap-4 rounded-md bg-destructive/10 p-4">
          <p className="text-sm">{getErrorMessage(requestsQuery.error)}</p>
          <Button variant="outline" size="sm" onClick={() => requestsQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No requests waiting. New ones will appear here.
        </p>
      ) : (
        <ul className="space-y-3">
          {pending.map((request) => (
            <li key={request.id} className="space-y-2 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <p className="font-semibold">{request.name}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {formatDayLabel(request.dateISO)},{" "}
                  {formatTimeRange(request.startTime, request.endTime)}
                </p>
              </div>
              <p className="text-sm break-words whitespace-pre-wrap">{request.message}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  disabled={isBusy}
                  onClick={() => acceptMutation.mutate({ id: request.id })}
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => declineMutation.mutate({ id: request.id })}
                >
                  Decline
                </Button>
                <a
                  className="ml-auto text-sm font-semibold text-primary underline underline-offset-2"
                  href={
                    request.contactType === "email"
                      ? `mailto:${encodeURIComponent(request.contactValue)}`
                      : whatsappUrl(request.contactValue)
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Reply to {request.contactValue}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
