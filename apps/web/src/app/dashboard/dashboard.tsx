"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@timetable-afdhal/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@timetable-afdhal/ui/components/empty";
import { Skeleton } from "@timetable-afdhal/ui/components/skeleton";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  getErrorMessage,
  type OwnerPersonalEvent,
  PersonalEventForm,
  usePersonalEventsApi,
} from "@/components/schedule/personal-event-form";
import { authClient } from "@/lib/auth-client";
import { formatTimeRange } from "@timetable-afdhal/schedule/schedule-utils";

export default function Dashboard(_props: { session: typeof authClient.$Infer.Session }) {
  const api = usePersonalEventsApi();
  const queryClient = useQueryClient();
  const [editingEvent, setEditingEvent] = useState<OwnerPersonalEvent | null>(null);

  const eventsQuery = useQuery(api.listMine.queryOptions());

  const removeMutation = useMutation({
    ...api.remove.mutationOptions(),
    onSuccess: async (_result, { id }) => {
      if (editingEvent?.id === id) {
        setEditingEvent(null);
      }
      await queryClient.invalidateQueries({ queryKey: api.listMine.pathKey() });
      toast.success("Event deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleDelete = (event: OwnerPersonalEvent) => {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    removeMutation.mutate({ id: event.id });
  };

  const events = eventsQuery.data;

  return (
    <div className="mt-6 space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">
          {editingEvent ? "Edit personal event" : "Add personal event"}
        </h2>
        <div className="max-w-md">
          <PersonalEventForm
            key={editingEvent?.id ?? "new"}
            initialValues={editingEvent}
            onSuccess={() => setEditingEvent(null)}
            onCancel={() => setEditingEvent(null)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">My personal events</h2>

        {eventsQuery.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : eventsQuery.isError ? (
          <div className="flex items-center justify-between gap-4 border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-xs text-destructive">{getErrorMessage(eventsQuery.error)}</p>
            <Button variant="outline" size="sm" onClick={() => eventsQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : events && events.length > 0 ? (
          <ul className="divide-y divide-border border border-border">
            {events.map((event) => {
              const isRemoving =
                removeMutation.isPending && removeMutation.variables?.id === event.id;
              return (
                <li key={event.id} className="flex items-center justify-between gap-4 p-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-xs font-semibold">{event.title}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {event.dateISO} · {formatTimeRange(event.startTime, event.endTime)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingEvent(event)}
                      disabled={isRemoving}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(event)}
                      disabled={isRemoving}
                    >
                      {isRemoving ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarPlus />
              </EmptyMedia>
              <EmptyTitle>No personal events yet</EmptyTitle>
              <EmptyDescription>Add your first event with the form above.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </div>
  );
}
