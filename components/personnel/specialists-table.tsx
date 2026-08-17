"use client";

import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROLE_BADGE, useSpecialistStore } from "@/lib/specialists";

export function SpecialistsTable() {
  const t = useTranslations();
  const specialists = useSpecialistStore((s) => s.specialists);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("personnel.title")}</CardTitle>
        <CardDescription>{t("personnel.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("personnel.colSpecialist")}</TableHead>
              <TableHead>{t("personnel.colRole")}</TableHead>
              <TableHead>{t("personnel.colBusinessHours")}</TableHead>
              <TableHead className="text-end">{t("personnel.colAction")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {specialists.map((s) => {
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-full bg-primary/12 font-heading text-xs font-semibold text-primary ring-1 ring-primary/20">
                        {s.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        ROLE_BADGE[s.role],
                      )}
                    >
                      {t(`common.role.${s.role}`)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {s.defined ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-success">
                        <span className="size-1.5 rounded-full bg-success" /> {t("personnel.defined")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("personnel.notDefined")}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <Link
                      href={`/personnel/${s.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      <CalendarClock className="size-3.5" /> {t("personnel.editAvailability")}
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
