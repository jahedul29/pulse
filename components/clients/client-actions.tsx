"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
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
  const t = useTranslations();
  const router = useRouter();
  const deleteClient = useClientStore((state) => state.deleteClient);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const onDelete = () => {
    deleteClient(client.id);
    setDeleteOpen(false);
    toast.success(t("clients.deletedToast", { name: client.fullName }));
    router.push("/clients");
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil />
        {t("common.edit")}
      </Button>
      <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
        <Trash2 />
        {t("common.delete")}
      </Button>

      <ClientFormDialog mode="edit" client={client} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.deleteTitle", { name: client.fullName })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("clients.deleteBody", { count: client.profiles.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
