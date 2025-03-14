// app/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role === "ADMIN") {
        redirect("/dashboard");
      } else if (session?.user?.role === "TRAFFIC_ENFORCER") {
        redirect("/violations");
      }
    } else if (status === "unauthenticated") {
      redirect("/auth/signin");
    }
  }, [status, session]);

  return <div>Loading...</div>;
}