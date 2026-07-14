import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AccountPanel } from "@/components/clients/account-panel";
import { ProfileTabs } from "@/components/clients/profile-tabs";
import { clients, getClient } from "@/lib/mock/data";

export function generateStaticParams() {
  return clients.map((c) => ({ id: c.id }));
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const client = getClient((await params).id);
  if (!client) notFound();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <Link
        href="/clients"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        All clients
      </Link>

      <AccountPanel client={client} />

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-lg font-semibold">Profiles</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {client.profiles.length} on this account
          </span>
        </div>
        <ProfileTabs profiles={client.profiles} />
      </section>
    </div>
  );
}
