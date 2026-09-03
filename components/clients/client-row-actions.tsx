"use client";

import { useState } from "react";
import { Eye, Fingerprint, Lock, LockOpen, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

function IconAction({
  label,
  icon: Icon,
  onClick,
  danger,
}: {
  label: string;
  icon: typeof Eye;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
            className={cn(
              "size-8 text-muted-foreground hover:text-foreground",
              danger && "hover:bg-danger-muted hover:text-danger",
            )}
          />
        }
      >
        <Icon className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ClientRowActions({ client }: { client: Client }) {
  const t = useTranslations();
  const router = useRouter();
  const updateClient = useClientStore((state) => state.updateClient);
  const deleteClient = useClientStore((state) => state.deleteClient);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const suspended = client.status === "suspended";

  const toggleSuspend = () => {
    updateClient(client.id, { status: suspended ? "active" : "suspended" });
    toast.success(
      t(suspended ? "clients.reactivatedToast" : "clients.suspendedToast", { name: client.fullName }),
    );
  };
  const toggleBiometrics = () => {
    updateClient(client.id, { biometrics: !client.biometrics });
    toast.success(t("clients.biometricsToast", { name: client.fullName }));
  };
  const onDelete = () => {
    deleteClient(client.id);
    setDeleteOpen(false);
    toast.success(t("clients.deletedToast", { name: client.fullName }));
  };

  return (
    <div className="flex items-center justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
      <TooltipProvider>
        <IconAction
          label={t("common.view")}
          icon={Eye}
          onClick={() => router.push(`/clients/${client.id}`)}
        />
        <IconAction label={t("common.edit")} icon={Pencil} onClick={() => setEditOpen(true)} />
        <IconAction
          label={t(suspended ? "clients.reactivate" : "clients.suspend")}
          icon={suspended ? LockOpen : Lock}
          onClick={toggleSuspend}
        />
        <IconAction
          label={t("clients.biometrics")}
          icon={Fingerprint}
          onClick={toggleBiometrics}
        />
        <IconAction label={t("common.delete")} icon={Trash2} onClick={() => setDeleteOpen(true)} danger />
      </TooltipProvider>

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
