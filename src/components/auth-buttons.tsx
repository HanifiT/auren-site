"use client";

import { signIn, signOut } from "next-auth/react";

const base =
  "rounded-sm border px-7 py-3 text-sm uppercase tracking-[0.25em] transition-colors";

export function SignIn() {
  return (
    <button
      onClick={() => signIn("discord")}
      className={`${base} border-[#f0b429]/60 text-[#f0b429] hover:bg-[#f0b429] hover:text-[#0b0f0c]`}
    >
      Enter
    </button>
  );
}

export function SignOut() {
  return (
    <button
      onClick={() => signOut()}
      className={`${base} border-[#6e8b74]/50 text-[#6e8b74] hover:bg-[#6e8b74]/10`}
    >
      Depart
    </button>
  );
}
