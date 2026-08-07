"use client";

import { use } from "react";
import { AccountPanel } from "@/components/clients/account-panel";
import { ProfileTabs } from "@/components/clients/profile-tabs";
import { ClientActions } from "@/components/clients/client-actions";
import { useClientStore } from "@/lib/store";

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const client = useClientStore((s) => s.clients.find((c) => c.id === id));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {client && (
        <div className="sticky top-16 z-10 -mt-2 flex items-center justify-end gap-3 border-b bg-background/90 py-3 backdrop-blur">
          <ClientActions client={client} />
        </div>
      )}

      {!client ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <h2 className="font-heading text-xl font-semibold">Client not found</h2>
          <p className="text-sm text-muted-foreground">
            This account may have been deleted in this session.
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
