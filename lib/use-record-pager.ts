"use client";

import { useEffect, useMemo, useState } from "react";

export type PagerDirection = 1 | -1;

export type ServerPage = {
  index: number;
  size: number;
  total: number;
  loaded: number;
  failed?: boolean;
  go: (index: number) => void;
  prefetch?: (index: number) => void;
};

export type RecordPager = {
  position: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  pending: PagerDirection | null;
  step: (direction: PagerDirection) => void;
};

type Pending = { page: number; direction: PagerDirection; fromId: string };

export function useRecordPager<T>({
  rows,
  getId,
  activeId,
  onSelect,
  page,
  disabled = false,
}: {
  rows: T[];
  getId: (row: T) => string;
  activeId: string | null;
  onSelect: (row: T) => void;
  page?: ServerPage;
  disabled?: boolean;
}): RecordPager {
  const [pending, setPending] = useState<Pending | null>(null);
  const index = activeId == null ? -1 : rows.findIndex((row) => getId(row) === activeId);
  const offset = page ? page.loaded * page.size : 0;
  const total = page ? page.total : rows.length;
  const landed = pending != null && page != null && page.loaded === pending.page && pending.fromId === activeId;
  const landingPosition = landed && rows.length > 0 ? offset + (pending.direction === 1 ? 1 : rows.length) : 0;
  const position = index >= 0 ? offset + index + 1 : landingPosition;
  const waiting = pending != null && pending.fromId === activeId && !page?.failed && !(landed && rows.length === 0);
  const ready = !disabled && !waiting && position > 0;
  const canPrev = ready && position > 1;
  const canNext = ready && position < total;

  const step = (direction: PagerDirection) => {
    if (direction === 1 ? !canNext : !canPrev) return;
    const target = index + direction;
    if (target >= 0 && target < rows.length) {
      onSelect(rows[target]);
      return;
    }
    if (!page || activeId == null) return;
    const nextPage = page.loaded + direction;
    setPending({ page: nextPage, direction, fromId: activeId });
    page.go(nextPage);
  };

  const loadedPage = page?.loaded;
  const failed = page?.failed ?? false;
  useEffect(() => {
    if (!pending) return;
    const settle = () => setPending(null);
    if (pending.fromId !== activeId || failed) {
      settle();
      return;
    }
    if (loadedPage !== pending.page) return;
    if (rows.length > 0) onSelect(pending.direction === 1 ? rows[0] : rows[rows.length - 1]);
    settle();
  }, [pending, activeId, failed, loadedPage, rows, onSelect]);

  const prefetch = page?.prefetch;
  const pageIndex = page?.loaded ?? 0;
  const lastOnPage = index >= 0 && index === rows.length - 1 && position < total;
  const firstOnPage = index === 0 && pageIndex > 0;
  useEffect(() => {
    if (!prefetch) return;
    if (lastOnPage) prefetch(pageIndex + 1);
    if (firstOnPage) prefetch(pageIndex - 1);
  }, [prefetch, pageIndex, lastOnPage, firstOnPage]);

  return { position, total, canPrev, canNext, pending: waiting && pending ? pending.direction : null, step };
}

export function useOrderedRows<T>(rows: T[], getId: (row: T) => string) {
  const [ids, setIds] = useState<string[]>([]);
  const ordered = useMemo(() => {
    const byId = new Map(rows.map((row) => [getId(row), row]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }, [ids, rows, getId]);
  return [ordered, setIds] as const;
}

