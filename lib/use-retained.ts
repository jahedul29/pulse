"use client";

import { useState } from "react";

export function useRetained<T>(value: T | null | undefined): T | null {
  const [retained, setRetained] = useState<T | null>(value ?? null);
  if (value != null && value !== retained) setRetained(value);
  return value != null ? value : retained;
}
