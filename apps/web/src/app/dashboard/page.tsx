"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { MeetingRequestsInbox } from "@/components/schedule/meeting-requests-inbox";
import { authClient } from "@/lib/auth-client";

import Dashboard from "./dashboard";

export default function DashboardPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  if (isPending || !session?.user) {
    return (
      <div className="flex min-h-40 items-center justify-center" role="status" aria-live="polite">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 pt-4 pb-10">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Dashboard</h1>
      <MeetingRequestsInbox />
      <Dashboard session={session} />
    </main>
  );
}
