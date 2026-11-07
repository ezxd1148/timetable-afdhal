"use client";

import { useEffect, useRef, useState } from "react";

import { useForm, useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import {
  getBookableSlots,
  getStartOptions,
  MEETING_DURATIONS,
  MEETING_MAX_DAYS_AHEAD,
  PHONE_PATTERN,
  type ZonedNow,
} from "@timetable-afdhal/schedule/availability";
import { addDays, formatDayLabel, formatTime } from "@timetable-afdhal/schedule/schedule-utils";
import { Button } from "@timetable-afdhal/ui/components/button";
import { Input } from "@timetable-afdhal/ui/components/input";
import { Label } from "@timetable-afdhal/ui/components/label";
import { Textarea } from "@timetable-afdhal/ui/components/textarea";
import { X } from "lucide-react";
import z from "zod";

import { useTRPC } from "@/utils/trpc";

import type { PublicPersonalEvent } from "./personal-event";

export type MeetingDraft = {
  dateISO: string;
  startTime: string;
};

const SELECT_CLASS =
  "h-8 w-full border border-input bg-card px-2 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring";

const formSchema = z
  .object({
    dateISO: z.string().min(1, "Pick a date"),
    startTime: z.string().min(1, "Pick a start time"),
    durationMinutes: z.number(),
    name: z.string().trim().min(1, "Enter your name").max(80),
    contactType: z.enum(["email", "whatsapp"]),
    contactValue: z.string().trim().min(1, "Enter how to reach you"),
    message: z.string().trim().min(1, "Say what the meeting is about").max(500),
    website: z.string(),
  })
  .superRefine(({ contactType, contactValue }, context) => {
    const valid =
      contactType === "email"
        ? z.email().safeParse(contactValue).success
        : PHONE_PATTERN.test(contactValue);
    if (contactValue && !valid) {
      context.addIssue({
        code: "custom",
        path: ["contactValue"],
        message:
          contactType === "email" ? "Enter a valid email address" : "Enter a valid phone number",
      });
    }
  });

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  return minutes % 60 === 0 ? `${minutes / 60} hr` : `${minutes / 60} hrs`;
}

function FieldError({ errors }: { errors: readonly ({ message?: string } | undefined)[] }) {
  const message = errors[0]?.message;
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function MeetingRequestDialog({
  draft,
  now,
  events,
  onClose,
}: {
  draft: MeetingDraft;
  now: ZonedNow;
  events: readonly PublicPersonalEvent[];
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const createRequest = useMutation(trpc.meetingRequests.create.mutationOptions());

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const startOptionsFor = (dateISO: string, durationMinutes: number) =>
    getStartOptions(getBookableSlots(dateISO, events, now), durationMinutes);

  const form = useForm({
    defaultValues: {
      dateISO: draft.dateISO,
      startTime: draft.startTime,
      durationMinutes: startOptionsFor(draft.dateISO, 60).includes(draft.startTime) ? 60 : 30,
      name: "",
      contactType: "email" as "email" | "whatsapp",
      contactValue: "",
      message: "",
      website: "",
    },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      await createRequest.mutateAsync(value);
      setSentTo(value.contactType === "email" ? "by email" : "on WhatsApp");
    },
  });

  const dateISO = useStore(form.store, (state) => state.values.dateISO);
  const durationMinutes = useStore(form.store, (state) => state.values.durationMinutes);
  const contactType = useStore(form.store, (state) => state.values.contactType);
  const startOptions = startOptionsFor(dateISO, durationMinutes);

  // Changing the date or length can rule out the chosen start time.
  const keepStartValid = (nextDateISO: string, nextDuration: number) => {
    const options = startOptionsFor(nextDateISO, nextDuration);
    if (!options.includes(form.state.values.startTime)) {
      form.setFieldValue("startTime", options[0] ?? "");
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="meeting-request-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-md overflow-y-auto bg-card p-0 text-card-foreground backdrop:bg-foreground/40"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2
            id="meeting-request-title"
            className="font-display text-3xl leading-tight font-extrabold tracking-tight"
          >
            {sentTo ? "Request sent" : "Request a meeting"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
          >
            <X />
          </Button>
        </div>

        {sentTo ? (
          <>
            <p>This isn&apos;t confirmed yet. Afdhal will reply {sentTo}.</p>
            <Button onClick={() => dialogRef.current?.close()}>Back to the timetable</Button>
          </>
        ) : (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              form.handleSubmit();
            }}
            className="flex flex-col gap-4"
          >
            <p className="text-sm text-muted-foreground">
              Sending a request doesn&apos;t book the time. Afdhal will confirm it with you.
            </p>

            <form.Field name="dateISO">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Date</Label>
                  <Input
                    id={field.name}
                    type="date"
                    min={now.iso}
                    max={addDays(now.iso, MEETING_MAX_DAYS_AHEAD)}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      if (event.target.value) {
                        keepStartValid(event.target.value, durationMinutes);
                      }
                    }}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-3">
              <form.Field name="startTime">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Start</Label>
                    <select
                      id={field.name}
                      className={SELECT_CLASS}
                      value={field.state.value}
                      disabled={startOptions.length === 0}
                      onChange={(event) => field.handleChange(event.target.value)}
                    >
                      {startOptions.map((time) => (
                        <option key={time} value={time}>
                          {formatTime(time)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </form.Field>

              <form.Field name="durationMinutes">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Length</Label>
                    <select
                      id={field.name}
                      className={SELECT_CLASS}
                      value={field.state.value}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        field.handleChange(next);
                        keepStartValid(dateISO, next);
                      }}
                    >
                      {MEETING_DURATIONS.map((minutes) => (
                        <option
                          key={minutes}
                          value={minutes}
                          disabled={startOptionsFor(dateISO, minutes).length === 0}
                        >
                          {formatDuration(minutes)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </form.Field>
            </div>

            {dateISO && startOptions.length === 0 && (
              <p role="status" className="text-sm text-destructive">
                No free time on {formatDayLabel(dateISO)}. Pick another date.
              </p>
            )}

            <form.Field name="name">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Your name</Label>
                  <Input
                    id={field.name}
                    autoComplete="name"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>

            <form.Field name="contactType">
              {(field) => (
                <fieldset className="space-y-1.5">
                  <legend className="text-sm font-medium">Reply to me by</legend>
                  <div className="flex gap-4 text-sm">
                    {(["email", "whatsapp"] as const).map((type) => (
                      <label key={type} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={field.name}
                          className="accent-primary"
                          checked={field.state.value === type}
                          onChange={() => field.handleChange(type)}
                        />
                        {type === "email" ? "Email" : "WhatsApp"}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </form.Field>

            <form.Field name="contactValue">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>
                    {contactType === "email" ? "Email address" : "WhatsApp number"}
                  </Label>
                  <Input
                    id={field.name}
                    type={contactType === "email" ? "email" : "tel"}
                    autoComplete={contactType === "email" ? "email" : "tel"}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>

            <form.Field name="message">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>What is it about?</Label>
                  <Textarea
                    id={field.name}
                    rows={3}
                    maxLength={500}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>

            {/* Honeypot: invisible to people, tempting to bots. */}
            <form.Field name="website">
              {(field) => (
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label>
                    Website
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  </label>
                </div>
              )}
            </form.Field>

            {createRequest.error && (
              <p role="alert" className="text-sm text-destructive">
                {createRequest.error.message}
              </p>
            )}

            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || startOptions.length === 0}
                >
                  {isSubmitting ? "Sending…" : "Send request"}
                </Button>
              )}
            </form.Subscribe>
          </form>
        )}
      </div>
    </dialog>
  );
}
