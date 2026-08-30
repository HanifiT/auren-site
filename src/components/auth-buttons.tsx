"use client";

import { signIn, signOut } from "next-auth/react";

/**
 * `plate` is the on-photograph treatment; `ink` is the same button on
 * parchment, where a pale outline would vanish.
 */
type Variant = "plate" | "ink";

export function SignIn({ variant = "plate" }: { variant?: Variant }) {
  return (
    <button
      onClick={() => signIn("discord")}
      className={variant === "ink" ? "act act--rubric" : "act act--primary"}
    >
      Enter
    </button>
  );
}

export function SignOut({ variant = "plate" }: { variant?: Variant }) {
  return (
    <button
      onClick={() => signOut()}
      className={variant === "ink" ? "act act--ink" : "act"}
    >
      Depart
    </button>
  );
}
