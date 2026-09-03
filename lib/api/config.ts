import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

if (!parsed.success && process.env.NODE_ENV !== "production") {
  console.error(
    "[api/config] Missing or invalid NEXT_PUBLIC_API_BASE_URL. Set it in .env.local (see .env.example).",
    parsed.error.flatten().fieldErrors,
  );
}

export const API_BASE_URL = (
  parsed.success ? parsed.data.NEXT_PUBLIC_API_BASE_URL : process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/+$/, "");

export const isApiConfigured = parsed.success;

export const ADMIN_IDENTITY = "/api/admin-identity";
