"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { useClientStore } from "@/lib/store";
import type { Client } from "@/lib/types";

export function ClientActions({ client }: { client: Client }) {
  const router = useRouter();
  const deleteClient = useClientStore((s) => s.deleteClient);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const onDelete = () => {
    deleteClient(client.id);
    setDeleteOpen(false);
    toast.success(`${client.fullName} deleted`);
    router.push("/clients");
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil />
        Edit
      </Button>
      <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
        <Trash2 />
        Delete
      </Button>

      <ClientFormDialog mode="edit" client={client} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {client.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the account and its {client.profiles.length} profile(s). This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
