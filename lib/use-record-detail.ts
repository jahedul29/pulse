"use client";

import { useEffect, useState } from "react";

type Result<T> = { id: string; data: T | null; error: boolean };

export function useRecordDetail<T>(
  id: string | null,
  fetcher: (id: string) => Promise<T | null>,
) {
  const [res, setRes] = useState<Result<T> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (id == null) return;
    let alive = true;
    fetcher(id)
      .then((data) => {
        if (alive) setRes({ id, data, error: data == null });
      })
      .catch(() => {
        if (alive) setRes({ id, data: null, error: true });
      });
    return () => {
      alive = false;
    };
  }, [id, attempt, fetcher]);

  const ready = res != null && res.id === id;
  const loading = id != null && !ready;
  const error = ready && res.error;
  const data = ready && !res.error ? res.data : null;
  const reload = () => {
    setRes(null);
    setAttempt((previous) => previous + 1);
  };

  return { data, loading, error, reload };
}
