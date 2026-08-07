"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
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
import { ROLE_BADGE, ROLE_LABEL, useSpecialistStore } from "@/lib/specialists";

export function SpecialistsTable() {
  const specialists = useSpecialistStore((s) => s.specialists);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Specialists</CardTitle>
        <CardDescription>
          Set each specialist&apos;s weekly availability and calendar rules.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Specialist</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Business hours</TableHead>
              <TableHead className="text-right">Action</TableHead>
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
                      {ROLE_LABEL[s.role]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {s.defined ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-success">
                        <span className="size-1.5 rounded-full bg-success" /> Defined
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not defined</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/personnel/${s.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      <CalendarClock className="size-3.5" /> Edit availability
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
