import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const sp = await searchParams;
  const returnTo = typeof sp.returnTo === "string" ? sp.returnTo : null;
  return <LoginForm returnTo={returnTo} />;
}
