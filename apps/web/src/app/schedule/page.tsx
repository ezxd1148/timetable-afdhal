import { ClassCalendar } from "@/components/schedule/class-calendar";

export default function SchedulePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Universiti Kebangsaan Malaysia · 1CS1</p>

        <h1 className="text-3xl font-semibold tracking-tight">Weekly Class Schedule</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Recurring weekly timetable · Malaysia Time
        </p>
      </header>

      <ClassCalendar />
    </main>
  );
}
