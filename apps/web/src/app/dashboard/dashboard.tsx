"use client";

import { useQuery } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";

export default function Dashboard(_props: { session: typeof authClient.$Infer.Session }) {
  const trpc = useTRPC();
  const privateData = useQuery(trpc.privateData.queryOptions());

  return (
    <>
      <p>API: {privateData.data?.message}</p>
    </>
  );
}
