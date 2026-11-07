"use client";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();

  return (
    <header className="flex flex-row items-center justify-between gap-4 px-4 py-3">
      <nav className="flex items-baseline gap-5">
        <Link href="/schedule" className="font-display text-lg font-bold tracking-tight">
          Afdhal&apos;s timetable
        </Link>
        {session && (
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
