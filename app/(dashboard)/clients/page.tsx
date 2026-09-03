import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodToggle } from "@/components/common/period-toggle";
import { KpiGrid } from "@/components/clients/kpi-grid";
import { MetricChartPanel } from "@/components/clients/metric-chart-panel";
import { Donut } from "@/components/clients/donut";
import { TerritoryPanel } from "@/components/clients/territory-panel";
import { ClientTable } from "@/components/clients/client-table";
import {
  cancellationSplit,
  FEATURED_KPI_KEYS,
  kpis,
  packageSplit,
  supervisionSplit,
  territories,
} from "@/lib/mock/data";
import { coercePeriod } from "@/lib/period";
import { I18nText } from "@/components/common/i18n-text";

export const metadata: Metadata = { title: "Clients & Profiles" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const period = coercePeriod((await searchParams).period);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex justify-end">
        <Suspense fallback={<div className="h-8 w-72 rounded-lg border bg-card" />}>
          <PeriodToggle />
        </Suspense>
      </div>

      <section>
        <KpiGrid
          kpis={kpis.filter((kpi) => FEATURED_KPI_KEYS.includes(kpi.key as (typeof FEATURED_KPI_KEYS)[number]))}
          period={period}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MetricChartPanel />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              <I18nText ns="clients" k="activePackages" />
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              <I18nText ns="clients" k="splitByRecurrence" />
            </p>
          </CardHeader>
          <CardContent>
            <Donut data={packageSplit} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <I18nText ns="clients" k="sessionsBySupervision" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Donut data={supervisionSplit} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <I18nText ns="clients" k="cancellationsByReason" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Donut data={cancellationSplit} />
          </CardContent>
        </Card>
      </section>

      <TerritoryPanel territories={territories} />

      <Card>
        <CardHeader>
          <CardTitle>
            <I18nText ns="clients" k="clientAccounts" />
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            <I18nText ns="clients" k="accountsHint" />
          </p>
        </CardHeader>
        <CardContent>
          <ClientTable />
        </CardContent>
      </Card>
    </div>
  );
}
