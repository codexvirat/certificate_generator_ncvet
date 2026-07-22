"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md border border-black/10 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-black/5 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
    >
      Sign out
    </button>
  );
}
