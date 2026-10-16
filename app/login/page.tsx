import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { IDLE_REASON } from "@/lib/auth/idle";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[]; reason?: string | string[] }>;
}) {
  const sp = await searchParams;
  const returnTo = typeof sp.returnTo === "string" ? sp.returnTo : null;
  return <LoginForm returnTo={returnTo} signedOutForInactivity={sp.reason === IDLE_REASON} />;
}
