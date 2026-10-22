import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of [value].flat()) if (item != null) query.append(key, item);
  }
  const suffix = query.toString();
  redirect(suffix ? `/admin/audit/log?${suffix}` : "/admin/audit/log");
}
