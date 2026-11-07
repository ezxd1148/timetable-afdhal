"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {session.user.name}</p>
      <Dashboard session={session} />
    </div>
  );
}
