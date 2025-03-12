"use client"; // Mark this as a Client Component

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <nav className="p-4">
      <Button onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
        Logout
      </Button>
    </nav>
  );
}