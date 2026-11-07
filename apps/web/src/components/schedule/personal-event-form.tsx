"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@timetable-afdhal/ui/components/button";
import { Input } from "@timetable-afdhal/ui/components/input";
import { Label } from "@timetable-afdhal/ui/components/label";
import { toast } from "sonner";
import z from "zod";

import { timeToMinutes } from "@timetable-afdhal/schedule/schedule-utils";
import { useTRPC } from "@/utils/trpc";

export type OwnerPersonalEvent = {
  id: string;
  dateISO: string;
  startTime: string;
  endTime: string;
  title: string;
};

type EventInput = Omit<OwnerPersonalEvent, "id">;

/** Typed access to the owner-only personalEvents procedures (real AppRouter). */
export function usePersonalEventsApi() {
  const trpc = useTRPC();
  return trpc.personalEvents;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Something went wrong";
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

const titleSchema = z.string().trim().min(1, "Title is required");
const dateSchema = z
  .string()
  .min(1, "Date is required")
  .regex(DATE_PATTERN, "Use the YYYY-MM-DD format");
const startTimeSchema = z
  .string()
  .min(1, "Start time is required")
  .regex(TIME_PATTERN, "Use the HH:mm format");
const endTimeSchema = z
  .string()
  .min(1, "End time is required")
  .regex(TIME_PATTERN, "Use the HH:mm format");

function firstIssue(schema: z.ZodType<string>, value: string): string | undefined {
  const result = schema.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

function validateEndTime(endTime: string, startTime: string): string | undefined {
  const endError = firstIssue(endTimeSchema, endTime);
  if (endError) return endError;
  if (!TIME_PATTERN.test(startTime)) return undefined; // Start time's own error is shown on its field.
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    return "End time must be after start time";
  }
  return undefined;
}

const EMPTY_VALUES: EventInput = { title: "", dateISO: "", startTime: "", endTime: "" };

type PersonalEventFormProps = {
  initialValues?: OwnerPersonalEvent | null;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function PersonalEventForm({ initialValues, onSuccess, onCancel }: PersonalEventFormProps) {
  const api = usePersonalEventsApi();
  const queryClient = useQueryClient();
  const editingId = initialValues?.id;
  const isEditing = Boolean(editingId);

  const createMutation = useMutation(api.create.mutationOptions());
  const updateMutation = useMutation(api.update.mutationOptions());
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const form = useForm({
    defaultValues: initialValues
      ? {
          title: initialValues.title,
          dateISO: initialValues.dateISO,
          startTime: initialValues.startTime,
          endTime: initialValues.endTime,
        }
      : EMPTY_VALUES,
    onSubmit: async ({ value }) => {
      const input: EventInput = {
        title: value.title.trim(),
        dateISO: value.dateISO,
        startTime: value.startTime,
        endTime: value.endTime,
      };

      try {
        if (editingId) {
          await updateMutation.mutateAsync({ id: editingId, ...input });
          toast.success("Event updated");
        } else {
          await createMutation.mutateAsync(input);
          toast.success("Event created");
        }

        await queryClient.invalidateQueries({ queryKey: api.listMine.pathKey() });
        form.reset();
        onSuccess?.();
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field
        name="title"
        validators={{
          onBlur: ({ value }) => firstIssue(titleSchema, value),
          onSubmit: ({ value }) => firstIssue(titleSchema, value),
        }}
      >
        {(field) => {
          const error = field.state.meta.errors[0];
          const errorId = `${field.name}-error`;
          return (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Title</Label>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                placeholder="e.g. Part-time shift"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
              />
              {error ? (
                <p id={errorId} className="text-xs text-red-500">
                  {String(error)}
                </p>
              ) : null}
            </div>
          );
        }}
      </form.Field>

      <form.Field
        name="dateISO"
        validators={{
          onBlur: ({ value }) => firstIssue(dateSchema, value),
          onSubmit: ({ value }) => firstIssue(dateSchema, value),
        }}
      >
        {(field) => {
          const error = field.state.meta.errors[0];
          const errorId = `${field.name}-error`;
          return (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Date</Label>
              <Input
                id={field.name}
                name={field.name}
                type="date"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
              />
              {error ? (
                <p id={errorId} className="text-xs text-red-500">
                  {String(error)}
                </p>
              ) : null}
            </div>
          );
        }}
      </form.Field>

      <div className="grid grid-cols-2 gap-4">
        <form.Field
          name="startTime"
          validators={{
            onBlur: ({ value }) => firstIssue(startTimeSchema, value),
            onSubmit: ({ value }) => firstIssue(startTimeSchema, value),
          }}
        >
          {(field) => {
            const error = field.state.meta.errors[0];
            const errorId = `${field.name}-error`;
            return (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Start time</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="time"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                />
                {error ? (
                  <p id={errorId} className="text-xs text-red-500">
                    {String(error)}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <form.Field
          name="endTime"
          validators={{
            onBlur: ({ value, fieldApi }) =>
              validateEndTime(value, fieldApi.form.getFieldValue("startTime")),
            onSubmit: ({ value, fieldApi }) =>
              validateEndTime(value, fieldApi.form.getFieldValue("startTime")),
          }}
        >
          {(field) => {
            const error = field.state.meta.errors[0];
            const errorId = `${field.name}-error`;
            return (
              <div className="space-y-2">
                <Label htmlFor={field.name}>End time</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="time"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                />
                {error ? (
                  <p id={errorId} className="text-xs text-red-500">
                    {String(error)}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" className="flex-1" disabled={isSaving}>
          {isEditing
            ? isSaving
              ? "Updating..."
              : "Update event"
            : isSaving
              ? "Saving..."
              : "Create event"}
        </Button>
        {isEditing ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
