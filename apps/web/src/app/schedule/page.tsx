import { ClassCalendar } from "@/components/schedule/class-calendar";

export default function SchedulePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 pt-4 pb-10">
      <ClassCalendar />
    </main>
  );
}
